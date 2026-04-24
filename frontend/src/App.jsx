import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Group as PanelGroup, Panel } from 'react-resizable-panels';
import { AnimatePresence } from 'framer-motion';
import { FilePlus2, FileText, FolderOpen, Minus, Square, X, MessageSquareText } from 'lucide-react';
import { FileExplorer, fileKindFromName } from './components/FileExplorer';
import { MarkdownViewer } from './components/MarkdownViewer';
import { AgentPane } from './components/AgentPane';
import { LandingScreen } from './components/LandingScreen';
import { SettingsModal } from './components/SettingsModal';
import { Toolbar } from './components/Toolbar';
import { ResizeHandle } from './components/ResizeHandle';
import { generateDocumentResponse } from './lib/agentClient';
import { getDefaultModelForProvider, getModelsForProvider } from './lib/modelCatalog';
import { configManager } from './lib/config';
import { fetchOpenRouterModels, sortModelsByPopularity } from './lib/openRouterClient';
import { listGeneratedFiles, loadSession, readGeneratedFile, saveSession, selectOutputFolder, writeGeneratedFile } from './lib/nativeAppClient';
import { Quit, WindowIsMaximised, WindowMinimise, WindowToggleMaximise } from '../wailsjs/runtime/runtime';

const themes = [
    { name: 'Dark', value: 'dark' },
    { name: 'Light', value: 'light' },
    { name: 'Dracula', value: 'dracula' },
];

const initialFiles = [
    { name: 'README.md', path: 'README.md', group: 'root', content: '# README\n\nOpen a document to start.' },
    { name: 'API_DOCS.md', path: 'API_DOCS.md', group: 'root', content: '# API Docs\n\nRendered markdown preview goes here.' },
    { name: 'App.jsx', path: 'src/App.jsx', group: 'src', content: 'export default function App() {}' },
    { name: 'main.jsx', path: 'src/main.jsx', group: 'src', content: 'import React from "react";' },
    { name: 'index.css', path: 'src/index.css', group: 'src', content: ':root {}' },
    { name: 'docs', path: 'docs', kind: 'folder', open: false },
];

function isDocFile(name) {
    const lowerName = name.toLowerCase();
    return lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.txt') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function findActiveFile(nextFiles, nextActivePath) {
    return (
        nextFiles.find((file) => file.path === nextActivePath && file.kind !== 'folder') ||
        nextFiles.find((file) => file.kind !== 'folder') ||
        initialFiles[1]
    );
}

function findFirstTreeFile(nodes) {
    for (const node of nodes) {
        if (node.type === 'file') {
            return node;
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            const child = findFirstTreeFile(node.children);
            if (child) {
                return child;
            }
        }
    }

    return null;
}

function findTreeFileByPath(nodes, targetPath) {
    for (const node of nodes) {
        if (node.type === 'file' && node.path === targetPath) {
            return node;
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            const child = findTreeFileByPath(node.children, targetPath);
            if (child) {
                return child;
            }
        }
    }

    return null;
}

function treeContainsPath(nodes, targetPath) {
    for (const node of nodes) {
        if (node.path === targetPath) {
            return true;
        }

        if (Array.isArray(node.children) && node.children.length > 0 && treeContainsPath(node.children, targetPath)) {
            return true;
        }
    }

    return false;
}

async function buildWorkspaceTree(folderPath, relativePath = '') {
    const entries = await listGeneratedFiles(folderPath, relativePath);

    const sortedEntries = [...entries].sort((left, right) => {
        if (left.isDir !== right.isDir) {
            return left.isDir ? -1 : 1;
        }

        return String(left.name).localeCompare(String(right.name));
    });

    const nodes = [];
    for (const entry of sortedEntries) {
        if (entry.isDir) {
            nodes.push({
                type: 'folder',
                name: entry.name,
                path: entry.path,
                open: true,
                children: await buildWorkspaceTree(folderPath, entry.path),
            });
            continue;
        }

        nodes.push({
            type: 'file',
            name: entry.name,
            path: entry.path,
            icon: fileKindFromName(entry.name),
        });
    }

    return nodes;
}

function buildSessionPayload({
    messages,
    files,
    activePath,
    outputFolder,
    selectionHint,
    sessionStarted,
    isFileExplorerOpen,
    isAgentPaneOpen,
}) {
    return {
        messages,
        files,
        activePath,
        outputFolder,
        selectionHint,
        sessionStarted,
        isFileExplorerOpen,
        isAgentPaneOpen,
    };
}

function AppShell() {
    const { theme, setTheme } = useTheme();
    const [provider, setProvider] = useState('openrouter');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(getDefaultModelForProvider('openrouter'));
    const [openRouterModels, setOpenRouterModels] = useState([]);
    const [messages, setMessages] = useState([]);
    const [files, setFiles] = useState(initialFiles);
    const [activePath, setActivePath] = useState('API_DOCS.md');
    const [activeFile, setActiveFile] = useState(initialFiles[1]);
    const [outputFolder, setOutputFolder] = useState('');
    const [selectionHint, setSelectionHint] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
    const [isAgentPaneOpen, setIsAgentPaneOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeToolCalls, setActiveToolCalls] = useState([]);
    const [completedToolCalls, setCompletedToolCalls] = useState([]);
    const [isMaximised, setIsMaximised] = useState(false);
    const [workspaceTree, setWorkspaceTree] = useState([]);
    const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
    const [syncOperationCount, setSyncOperationCount] = useState(0);
    const [agentError, setAgentError] = useState('');
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const openInputId = 'open-file-input';
    const importInputId = 'import-files-input';

    const loadConfig = async () => {
        try {
            const config = await configManager.init();
            if (config) {
                if (config.theme) {
                    setTheme(config.theme);
                    configManager.applyTheme();
                }
                if (config.provider) setProvider(config.provider);
                if (config.apiKey) setApiKey(config.apiKey);
                if (config.model) setModel(config.model);
            }
        } catch (err) {
            console.error('Config init error:', err);
        }
    };

    const updateTheme = (nextTheme) => {
        setTheme(nextTheme);
        configManager.set('theme', nextTheme);
    };

    const updateProvider = (nextProvider) => {
        setProvider(nextProvider);
        const nextModel = getDefaultModelForProvider(nextProvider);
        setModel(nextModel);
        configManager.update({ provider: nextProvider, model: nextModel });
    };

    const updateApiKey = (nextKey) => {
        setApiKey(nextKey);
        configManager.set('apiKey', nextKey);
    };

    const updateModel = (nextModel) => {
        setModel(nextModel);
        configManager.set('model', nextModel);
    };

    const loadOpenRouterModelsIfNeeded = async () => {
        if (provider === 'openrouter' && apiKey && openRouterModels.length === 0) {
            try {
                const models = await fetchOpenRouterModels(apiKey);
                const sortedModels = sortModelsByPopularity(models);
                setOpenRouterModels(sortedModels);
            } catch (error) {
                console.error('Failed to load OpenRouter models:', error);
            }
        }
    };

    const modelOptions = useMemo(() => {
        if (provider === 'openrouter' && openRouterModels.length > 0) {
            return openRouterModels;
        }

        return getModelsForProvider(provider);
    }, [provider, openRouterModels]);

    const hasRuntime = typeof window !== 'undefined' && typeof window.runtime !== 'undefined';

    const refreshWindowState = async () => {
        if (!hasRuntime) {
            return;
        }

        const maximised = await WindowIsMaximised();
        setIsMaximised(maximised);
    };

    const handleQuit = () => {
        if (!hasRuntime) {
            return;
        }

        Quit();
    };

    const handleMinimise = () => {
        if (!hasRuntime) {
            return;
        }

        WindowMinimise();
    };

    const handleToggleMaximise = async () => {
        if (!hasRuntime) {
            return;
        }

        WindowToggleMaximise();
        window.setTimeout(() => {
            refreshWindowState();
        }, 50);
    };

    const selectFile = (file) => {
        if (file.kind === 'folder') {
            return;
        }

        setActivePath(file.path);
        setActiveFile(file);
        setSelectionHint(`Loaded ${file.name}.`);
    };

    const updateFileContent = (targetPath, nextContent) => {
        const content = String(nextContent ?? '');

        setFiles((currentFiles) => currentFiles.map((file) => (file.path === targetPath ? { ...file, content } : file)));
        setActiveFile((currentFile) => (currentFile?.path === targetPath ? { ...currentFile, content } : currentFile));
    };

    const updateActiveFileContent = (nextContent) => {
        updateFileContent(activePath, nextContent);
    };

    const saveActiveFileContent = async (nextContent) => {
        const content = String(nextContent ?? '');

        setSyncOperationCount((count) => count + 1);
        updateActiveFileContent(content);

        try {
            if (outputFolder && activeFile?.path) {
                await writeGeneratedFile(outputFolder, activeFile.path, content);
                setSelectionHint(`Saved ${activeFile.name} to ${outputFolder}.`);
            } else {
                setSelectionHint(`Updated ${activeFile.name} in the preview.`);
            }
        } catch (error) {
            console.error('Failed to save markdown source:', error);
            setSelectionHint(`Updated ${activeFile.name} locally, but could not save it to disk.`);
        } finally {
            setSyncOperationCount((count) => Math.max(0, count - 1));
        }
    };

    const selectWorkspaceFolder = async () => {
        const selectedFolder = await selectOutputFolder();
        if (!selectedFolder) {
            setSelectionHint('Folder selection cancelled.');
            return;
        }

        setOutputFolder(selectedFolder);
        setSelectionHint(`Folder selected: ${selectedFolder}`);
        setSessionStarted(true);
    };

    const selectWorkspaceFile = async (fileNode) => {
        if (!outputFolder || fileNode.type !== 'file') {
            return;
        }

        try {
            const content = await readGeneratedFile(outputFolder, fileNode.path);
            const nextFile = { name: fileNode.name, path: fileNode.path, group: 'workspace', content };

            setFiles((currentFiles) => [nextFile, ...currentFiles.filter((item) => item.path !== nextFile.path)]);
            setActivePath(nextFile.path);
            setActiveFile(nextFile);
            setSelectionHint(`Loaded ${fileNode.name} from ${outputFolder}.`);
        } catch (error) {
            console.error('Workspace file load error:', error);
            setSelectionHint(`Unable to open ${fileNode.name}.`);
        }
    };

    const toggleWorkspaceFolder = (folderPath) => {
        setWorkspaceTree((currentTree) => {
            const toggleNode = (nodes) => nodes.map((node) => {
                if (node.type !== 'folder') {
                    return node;
                }

                if (node.path === folderPath) {
                    return { ...node, open: !node.open };
                }

                if (!Array.isArray(node.children) || node.children.length === 0) {
                    return node;
                }

                return { ...node, children: toggleNode(node.children) };
            });

            return toggleNode(currentTree);
        });
    };

    const loadWorkspaceFolder = async (folderPath, preferredActivePath = activePath) => {
        if (!folderPath) {
            setWorkspaceTree([]);
            return [];
        }

        setIsWorkspaceLoading(true);

        try {
            const nextTree = await buildWorkspaceTree(folderPath);
            setWorkspaceTree(nextTree);

            const nextFileNode = findTreeFileByPath(nextTree, preferredActivePath) || findFirstTreeFile(nextTree);

            if (nextFileNode) {
                const content = await readGeneratedFile(folderPath, nextFileNode.path);
                const nextFile = { name: nextFileNode.name, path: nextFileNode.path, group: 'workspace', content };

                setFiles((currentFiles) => [nextFile, ...currentFiles.filter((item) => item.path !== nextFile.path)]);
                setActivePath(nextFile.path);
                setActiveFile(nextFile);
            }

            return nextTree;
        } catch (error) {
            console.error('Workspace folder load error:', error);
            setWorkspaceTree([]);
            setSelectionHint('Unable to read the selected folder.');
            return [];
        } finally {
            setIsWorkspaceLoading(false);
        }
    };

    const handleOpenFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !isDocFile(file.name)) {
            if (file) {
                setSelectionHint('Open accepts document files only: .md, .markdown, .txt, .doc, .docx.');
            }
            return;
        }

        const path = `imported/${file.name}`;
        const content = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')
            ? 'Office document imported. Preview is limited in the browser, but the file has been loaded into the workspace.'
            : await readFileAsText(file);
        const nextFile = { name: file.name, path, group: 'root', content };

        setFiles((currentFiles) => [nextFile, ...currentFiles.filter((item) => item.path !== path)]);
        setActivePath(path);
        setActiveFile(nextFile);
        setSelectionHint(`Opened ${file.name}.`);
    };

    const handleImportFiles = async (event) => {
        const pickedFiles = Array.from(event.target.files ?? []);
        event.target.value = '';

        const acceptedFiles = pickedFiles.filter((file) => isDocFile(file.name));

        if (!acceptedFiles.length) {
            setSelectionHint('Import accepts document files only: .md, .markdown, .txt, .doc, .docx.');
            return;
        }

        const importedFiles = await Promise.all(
            acceptedFiles.map(async (file) => ({
                name: file.name,
                path: `imported/${file.name}`,
                group: 'root',
                content: file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')
                    ? 'Office document imported. Preview is limited in the browser, but the file has been loaded into the workspace.'
                    : await readFileAsText(file),
            }))
        );

        setFiles((currentFiles) => [...importedFiles, ...currentFiles.filter((item) => !importedFiles.some((imported) => imported.path === item.path))]);
        setActivePath(importedFiles[0].path);
        setActiveFile(importedFiles[0]);
        setSelectionHint(`Imported ${importedFiles.length} document file${importedFiles.length > 1 ? 's' : ''}.`);
    };

    const runAgentPrompt = async (prompt) => {
        const ensureOutputFolder = async () => {
            if (outputFolder) {
                return outputFolder;
            }
            const selectedFolder = await selectWorkspaceFolder();
            if (!selectedFolder) {
                throw new Error('Generation cancelled: choose an output folder first.');
            }

            return selectedFolder;
        };

        const mergeWrittenFilesIntoWorkspace = (writtenFiles, selectedFolder, successPrefix) => {
            const generatedFiles = writtenFiles.map((writtenFile, index) => {
                const normalizedRelativePath = String(writtenFile.relativePath || '').replace(/\\\\/g, '/');
                const fileName = normalizedRelativePath.split('/').pop() || `generated-${Date.now()}-${index + 1}.md`;

                return {
                    name: fileName,
                    path: `generated/${normalizedRelativePath}`,
                    group: 'root',
                    content: writtenFile.content,
                };
            });

            if (!generatedFiles.length) {
                return;
            }

            setFiles((currentFiles) => [
                ...generatedFiles,
                ...currentFiles.filter((item) => !generatedFiles.some((generatedFile) => generatedFile.path === item.path)),
            ]);
            setActivePath(generatedFiles[0].path);
            setActiveFile(generatedFiles[0]);
            setSelectionHint(`${successPrefix} ${generatedFiles.length} file${generatedFiles.length > 1 ? 's' : ''} to ${selectedFolder}.`);
            void loadWorkspaceFolder(selectedFolder, generatedFiles[0].path);
        };

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
        };

        const nextMessages = [...messages, userMessage];
        setMessages(nextMessages);
        setSessionStarted(true); // Start session immediately to show messages
        setAgentError('');
        setIsGenerating(true);
        setActiveToolCalls([]);
        setCompletedToolCalls([]);

        try {
            const selectedFolder = await ensureOutputFolder();
            const response = await generateDocumentResponse({
                provider,
                apiKey,
                model,
                messages: nextMessages,
                activeDocument: activeFile,
                outputFolder: selectedFolder,
                readFile: ({ relativePath }) => readGeneratedFile(selectedFolder, relativePath),
                writeFile: async ({ relativePath, content }) => {
                    const targetPath = String(relativePath || '');
                    const nextContent = String(content ?? '');

                    setSyncOperationCount((count) => count + 1);
                    updateFileContent(targetPath, nextContent);

                    try {
                        return await writeGeneratedFile(selectedFolder, targetPath, nextContent);
                    } finally {
                        setSyncOperationCount((count) => Math.max(0, count - 1));
                    }
                },
                onToolCall: (toolCall) => {
                    setActiveToolCalls((prev) => [...prev, toolCall]);
                },
                onToolResult: (toolResult) => {
                    setActiveToolCalls((prev) => prev.filter(tc => tc.toolCallId !== toolResult.toolCallId));
                    setCompletedToolCalls((prev) => [...prev, toolResult]);
                },
            });

            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.text,
            };

            setMessages((currentMessages) => [...currentMessages, assistantMessage]);
            mergeWrittenFilesIntoWorkspace(response.writtenFiles, selectedFolder, 'Generated and wrote');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate document.';
            
            // Add error as an agent message with error role
            const errorAgentMessage = {
                id: `error-${Date.now()}`,
                role: 'error',
                content: errorMessage,
            };

            setMessages((currentMessages) => [...currentMessages, errorAgentMessage]);
            setAgentError(errorMessage); // Keep for potential other uses
        } finally {
            setIsGenerating(false);
            // Clear tool calls after a delay to show completion
            setTimeout(() => {
                setActiveToolCalls([]);
                setCompletedToolCalls([]);
            }, 2000);
        }
    };

    const regenerateLastMessage = async () => {
        if (messages.length < 2) return;
        
        // Remove the last assistant message
        const messagesWithoutLast = messages.slice(0, -1);
        setMessages(messagesWithoutLast);
        
        // Get the last user message
        const lastUserMessage = [...messagesWithoutLast].reverse().find(m => m.role === 'user');
        if (!lastUserMessage) return;
        
        setIsGenerating(true);
        setAgentError('');
        setActiveToolCalls([]);
        setCompletedToolCalls([]);

        try {
            const selectedFolder = outputFolder || await selectOutputFolder();
            if (!selectedFolder) {
                throw new Error('Regeneration cancelled: choose an output folder first.');
            }

            setOutputFolder(selectedFolder);
            setSelectionHint(`Folder selected: ${selectedFolder}`);

            const response = await generateDocumentResponse({
                provider,
                apiKey,
                model,
                messages: messagesWithoutLast,
                activeDocument: activeFile,
                outputFolder: selectedFolder,
                readFile: ({ relativePath }) => readGeneratedFile(selectedFolder, relativePath),
                writeFile: async ({ relativePath, content }) => {
                    const targetPath = String(relativePath || '');
                    const nextContent = String(content ?? '');

                    setSyncOperationCount((count) => count + 1);
                    updateFileContent(targetPath, nextContent);

                    try {
                        return await writeGeneratedFile(selectedFolder, targetPath, nextContent);
                    } finally {
                        setSyncOperationCount((count) => Math.max(0, count - 1));
                    }
                },
                onToolCall: (toolCall) => {
                    setActiveToolCalls((prev) => [...prev, toolCall]);
                },
                onToolResult: (toolResult) => {
                    setActiveToolCalls((prev) => prev.filter(tc => tc.toolCallId !== toolResult.toolCallId));
                    setCompletedToolCalls((prev) => [...prev, toolResult]);
                },
            });

            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.text,
            };

            setMessages((currentMessages) => [...currentMessages, assistantMessage]);

            const generatedFiles = response.writtenFiles.map((writtenFile, index) => {
                const normalizedRelativePath = String(writtenFile.relativePath || '').replace(/\\\\/g, '/');
                const fileName = normalizedRelativePath.split('/').pop() || `generated-${Date.now()}-${index + 1}.md`;

                return {
                    name: fileName,
                    path: `generated/${normalizedRelativePath}`,
                    group: 'root',
                    content: writtenFile.content,
                };
            });

            if (generatedFiles.length > 0) {
                setFiles((currentFiles) => [
                    ...generatedFiles,
                    ...currentFiles.filter((item) => !generatedFiles.some((generatedFile) => generatedFile.path === item.path)),
                ]);
                setActivePath(generatedFiles[0].path);
                setActiveFile(generatedFiles[0]);
                setSelectionHint(`Regenerated and wrote ${generatedFiles.length} file${generatedFiles.length > 1 ? 's' : ''} to ${selectedFolder}.`);
                void loadWorkspaceFolder(selectedFolder, generatedFiles[0].path);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate document.';
            
            const errorAgentMessage = {
                id: `error-${Date.now()}`,
                role: 'error',
                content: errorMessage,
            };

            setMessages((currentMessages) => [...currentMessages, errorAgentMessage]);
            setAgentError(errorMessage);
        } finally {
            setIsGenerating(false);
            // Clear tool calls after a delay to show completion
            setTimeout(() => {
                setActiveToolCalls([]);
                setCompletedToolCalls([]);
            }, 2000);
        }
    };

    const handleCloseWorkspace = () => {
        // Reset to initial state
        setSessionStarted(false);
        setMessages([]);
        setFiles(initialFiles);
        setActivePath('API_DOCS.md');
        setActiveFile(initialFiles[1]);
        setOutputFolder('');
        setWorkspaceTree([]);
        setAgentError('');
        setSelectionHint('Workspace closed. Start a new session.');
    };

    useEffect(() => {
        const initialize = async () => {
            await loadConfig();

            try {
                const session = await loadSession();
                if (session && typeof session === 'object') {
                    const nextFiles = Array.isArray(session.files) && session.files.length > 0 ? session.files : initialFiles;
                    const nextActivePath = typeof session.activePath === 'string' && session.activePath.trim() ? session.activePath : 'API_DOCS.md';
                    const nextActiveFile = findActiveFile(nextFiles, nextActivePath);

                    setFiles(nextFiles);
                    setActivePath(nextActiveFile.path);
                    setActiveFile(nextActiveFile);
                    setMessages(Array.isArray(session.messages) ? session.messages : []);
                    setOutputFolder(typeof session.outputFolder === 'string' ? session.outputFolder : '');
                    setSelectionHint(typeof session.selectionHint === 'string' ? session.selectionHint : '');
                    setSessionStarted(Boolean(session.sessionStarted || (Array.isArray(session.messages) && session.messages.length > 0)));
                    if (typeof session.isFileExplorerOpen === 'boolean') {
                        setIsFileExplorerOpen(session.isFileExplorerOpen);
                    }
                    if (typeof session.isAgentPaneOpen === 'boolean') {
                        setIsAgentPaneOpen(session.isAgentPaneOpen);
                    }
                }
            } catch (error) {
                console.error('Session load error:', error);
            }

            setSessionLoaded(true);
            setMounted(true);
        };

        initialize();

        if (!hasRuntime) {
            return;
        }

        refreshWindowState();

        const handleResize = () => {
            refreshWindowState();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (isSettingsOpen) {
            loadOpenRouterModelsIfNeeded();
        }
    }, [isSettingsOpen, provider, apiKey]);

    useEffect(() => {
        if (!sessionLoaded) {
            return;
        }

        if (!outputFolder) {
            setWorkspaceTree([]);
            return;
        }

        void loadWorkspaceFolder(outputFolder, activePath);
    }, [outputFolder, sessionLoaded]);

    useEffect(() => {
        if (!sessionLoaded) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void saveSession(
                buildSessionPayload({
                    messages,
                    files,
                    activePath,
                    outputFolder,
                    selectionHint,
                    sessionStarted,
                    isFileExplorerOpen,
                    isAgentPaneOpen,
                })
            ).catch((error) => {
                console.error('Session save error:', error);
            });
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [
        activePath,
        files,
        isAgentPaneOpen,
        isFileExplorerOpen,
        messages,
        outputFolder,
        selectionHint,
        sessionLoaded,
        sessionStarted,
    ]);

    const explorerTree = useMemo(() => workspaceTree, [workspaceTree]);

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-base text-base-foreground">
            <Toolbar 
                onOpen={() => document.getElementById(openInputId)?.click()}
                onImport={() => document.getElementById(importInputId)?.click()}
                onMinimise={handleMinimise}
                onToggleMaximise={handleToggleMaximise}
                onQuit={handleQuit}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onCloseWorkspace={handleCloseWorkspace}
                isMaximised={isMaximised}
                theme={theme}
                setTheme={updateTheme}
                selectionHint={selectionHint}
                sessionStarted={sessionStarted}
            />

            <input id={openInputId} accept=".md,.markdown,.txt,.doc,.docx" className="hidden" onChange={handleOpenFile} type="file" />
            <input id={importInputId} accept=".md,.markdown,.txt,.doc,.docx" className="hidden" multiple onChange={handleImportFiles} type="file" />

            {sessionStarted ? (
                <div className="flex min-h-0 flex-1">
                    <PanelGroup direction="horizontal" className="min-h-0 w-full">
                        <AnimatePresence mode="wait">
                            {isFileExplorerOpen && (
                                <>
                                    <Panel defaultSize={20} minSize={12}>
                                        <FileExplorer
                                            tree={explorerTree}
                                            activePath={activePath}
                                            onChooseFolder={selectWorkspaceFolder}
                                            onSelect={selectWorkspaceFile}
                                            onToggleFolder={toggleWorkspaceFolder}
                                            selectedFolder={outputFolder}
                                            isLoading={isWorkspaceLoading}
                                        />
                                    </Panel>
                                    <ResizeHandle />
                                </>
                            )}
                        </AnimatePresence>
                        <Panel defaultSize={isFileExplorerOpen && isAgentPaneOpen ? 52 : isFileExplorerOpen || isAgentPaneOpen ? 72 : 100} minSize={35}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b border-white/10 bg-[#10151d] px-4 py-2">
                                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                                        <FileText className="h-4 w-4 text-primary" />
                                        {activeFile?.name ?? 'Document'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
                                            className={`rounded-lg p-1.5 transition-colors ${
                                                isFileExplorerOpen 
                                                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-primary'
                                            }`}
                                            title={isFileExplorerOpen ? 'Hide File Explorer' : 'Show File Explorer'}
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsAgentPaneOpen(!isAgentPaneOpen)}
                                            className={`rounded-lg p-1.5 transition-colors ${
                                                isAgentPaneOpen 
                                                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20' 
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-primary'
                                            }`}
                                            title={isAgentPaneOpen ? 'Hide Agent Pane' : 'Show Agent Pane'}
                                        >
                                            <MessageSquareText className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <MarkdownViewer
                                    content={activeFile?.content}
                                    fileName={activeFile?.name}
                                    isEditable={Boolean(activeFile?.path)}
                                    isSyncing={isGenerating || activeToolCalls.length > 0 || syncOperationCount > 0}
                                    onContentChange={updateActiveFileContent}
                                    onSaveContent={saveActiveFileContent}
                                />
                            </div>
                        </Panel>
                        <AnimatePresence mode="wait">
                            {isAgentPaneOpen && (
                                <>
                                    <ResizeHandle />
                                    <Panel defaultSize={28} minSize={22}>
                                        <AgentPane
                                            isGenerating={isGenerating}
                                            messages={messages}
                                            provider={provider}
                                            model={model}
                                            modelOptions={modelOptions}
                                            onProviderChange={updateProvider}
                                            onModelChange={updateModel}
                                            onSendPrompt={runAgentPrompt}
                                            onOpenSettings={() => setIsSettingsOpen(true)}
                                            onRegenerateLastMessage={regenerateLastMessage}
                                            activeToolCalls={activeToolCalls}
                                            completedToolCalls={completedToolCalls}
                                        />
                                    </Panel>
                                </>
                            )}
                        </AnimatePresence>
                    </PanelGroup>
                </div>
            ) : (
                <LandingScreen
                    isGenerating={isGenerating}
                    provider={provider}
                    model={model}
                    modelOptions={modelOptions}
                    onProviderChange={updateProvider}
                    onModelChange={updateModel}
                    onStartConversation={runAgentPrompt}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />
            )}

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                provider={provider}
                apiKey={apiKey}
                model={model}
                modelOptions={modelOptions}
                onProviderChange={updateProvider}
                onApiKeyChange={updateApiKey}
                onModelChange={updateModel}
            />
        </div>
    );
}


function App() {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={['dark', 'light', 'dracula']}>
            <AppShell />
        </ThemeProvider>
    );
}

export default App
