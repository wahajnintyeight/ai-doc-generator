import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Group as PanelGroup, Panel } from 'react-resizable-panels';
import { AnimatePresence } from 'framer-motion';
import { FilePlus2, FileText, FolderOpen, Minus, Square, X, MessageSquareText } from 'lucide-react';
import { FileExplorer, makeExplorerTree } from './components/FileExplorer';
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
import { selectOutputFolder, writeGeneratedFile } from './lib/nativeAppClient';
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

function AppShell() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isMaximised, setIsMaximised] = useState(false);
    const [files, setFiles] = useState(initialFiles);
    const [activePath, setActivePath] = useState('API_DOCS.md');
    const [activeFile, setActiveFile] = useState(initialFiles[1]);
    const [selectionHint, setSelectionHint] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const [provider, setProvider] = useState('openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(getDefaultModelForProvider('openai'));
    const [messages, setMessages] = useState([]);
    const [openRouterModels, setOpenRouterModels] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [agentError, setAgentError] = useState('');
    const [outputFolder, setOutputFolder] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
    const [isAgentPaneOpen, setIsAgentPaneOpen] = useState(true);
    const openInputId = 'open-doc-input';
    const importInputId = 'import-doc-input';
    const modelOptions = useMemo(() => {
        if (provider === 'openrouter' && openRouterModels.length > 0) {
            return openRouterModels;
        }
        return getModelsForProvider(provider);
    }, [provider, openRouterModels]);

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

            const selectedFolder = await selectOutputFolder();
            if (!selectedFolder) {
                throw new Error('Generation cancelled: choose an output folder first.');
            }

            setOutputFolder(selectedFolder);
            setSelectionHint(`Output folder selected: ${selectedFolder}`);
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

        try {
            const selectedFolder = await ensureOutputFolder();
            const response = await generateDocumentResponse({
                provider,
                apiKey,
                model,
                messages: nextMessages,
                activeDocument: activeFile,
                writeFile: ({ relativePath, content }) =>
                    writeGeneratedFile(selectedFolder, relativePath, content),
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

        try {
            const selectedFolder = outputFolder || await selectOutputFolder();
            if (!selectedFolder) {
                throw new Error('Regeneration cancelled: choose an output folder first.');
            }
            if (!outputFolder) {
                setOutputFolder(selectedFolder);
                setSelectionHint(`Output folder selected: ${selectedFolder}`);
            }

            const response = await generateDocumentResponse({
                provider,
                apiKey,
                model,
                messages: messagesWithoutLast,
                activeDocument: activeFile,
                writeFile: ({ relativePath, content }) =>
                    writeGeneratedFile(selectedFolder, relativePath, content),
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
        setAgentError('');
        setSelectionHint('Workspace closed. Start a new session.');
    };

    useEffect(() => {
        const initialize = async () => {
            await loadConfig();
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

    const explorerTree = useMemo(() => makeExplorerTree(files, activePath), [files, activePath]);

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
                                        <FileExplorer tree={explorerTree} activePath={activePath} onSelect={selectFile} />
                                    </Panel>
                                    <ResizeHandle />
                                </>
                            )}
                        </AnimatePresence>
                        <Panel defaultSize={isFileExplorerOpen && isAgentPaneOpen ? 52 : isFileExplorerOpen || isAgentPaneOpen ? 72 : 100} minSize={35}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between border-b border-white/10 bg-[#10151d] px-4 py-2">
                                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                                        <FileText className="h-4 w-4 text-cyan-300" />
                                        {activeFile?.name ?? 'Document'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
                                            className={`rounded-lg p-1.5 transition-colors ${
                                                isFileExplorerOpen 
                                                    ? 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20' 
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-cyan-300'
                                            }`}
                                            title={isFileExplorerOpen ? 'Hide File Explorer' : 'Show File Explorer'}
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsAgentPaneOpen(!isAgentPaneOpen)}
                                            className={`rounded-lg p-1.5 transition-colors ${
                                                isAgentPaneOpen 
                                                    ? 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20' 
                                                    : 'text-slate-400 hover:bg-white/5 hover:text-cyan-300'
                                            }`}
                                            title={isAgentPaneOpen ? 'Hide Agent Pane' : 'Show Agent Pane'}
                                        >
                                            <MessageSquareText className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <MarkdownViewer content={activeFile?.content} fileName={activeFile?.name} />
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
