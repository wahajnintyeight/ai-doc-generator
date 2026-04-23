import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Group as PanelGroup, Panel } from 'react-resizable-panels';
import { FilePlus2, FileText, FolderOpen, Minus, Square, X } from 'lucide-react';
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
    return lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.txt');
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

    const [isGenerating, setIsGenerating] = useState(false);
    const [agentError, setAgentError] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const openInputId = 'open-doc-input';
    const importInputId = 'import-doc-input';
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

    const handleOpenFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !isDocFile(file.name)) {
            if (file) {
                setSelectionHint('Open accepts document files only: .md, .markdown, .txt.');
            }
            return;
        }

        const content = await readFileAsText(file);
        const path = `imported/${file.name}`;
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
            setSelectionHint('Import accepts document files only: .md, .markdown, .txt.');
            return;
        }

        const importedFiles = await Promise.all(
            acceptedFiles.map(async (file) => ({
                name: file.name,
                path: `imported/${file.name}`,
                group: 'root',
                content: await readFileAsText(file),
            }))
        );

        setFiles((currentFiles) => [...importedFiles, ...currentFiles.filter((item) => !importedFiles.some((imported) => imported.path === item.path))]);
        setActivePath(importedFiles[0].path);
        setActiveFile(importedFiles[0]);
        setSelectionHint(`Imported ${importedFiles.length} document file${importedFiles.length > 1 ? 's' : ''}.`);
    };

    const runAgentPrompt = async (prompt) => {
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
            const response = await generateDocumentResponse({
                provider,
                apiKey,
                model,
                messages: nextMessages,
                activeDocument: activeFile,
            });

            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response,
            };

            setMessages((currentMessages) => [...currentMessages, assistantMessage]);

            const generatedId = `generated-${Date.now()}`;
            const generatedFile = {
                name: `${generatedId}.md`,
                path: `generated/${generatedId}.md`,
                group: 'root',
                content: response,
            };

            setFiles((currentFiles) => [generatedFile, ...currentFiles.filter((item) => item.path !== generatedFile.path)]);
            setActivePath(generatedFile.path);
            setActiveFile(generatedFile);
            setSelectionHint('Generated document loaded.');
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
                isMaximised={isMaximised}
                theme={theme}
                setTheme={updateTheme}
                selectionHint={selectionHint}
            />

            <input id={openInputId} accept=".md,.markdown,.txt" className="hidden" onChange={handleOpenFile} type="file" />
            <input id={importInputId} accept=".md,.markdown,.txt" className="hidden" multiple onChange={handleImportFiles} type="file" />

            {sessionStarted ? (
                <div className="flex min-h-0 flex-1">
                    <PanelGroup direction="horizontal" className="min-h-0 w-full">
                        <Panel defaultSize={20} minSize={12}>
                            <FileExplorer tree={explorerTree} activePath={activePath} onSelect={selectFile} />
                        </Panel>
                        <ResizeHandle />
                        <Panel defaultSize={52} minSize={35}>
                            <div className="flex h-full flex-col">
                                <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151d] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                                    <FileText className="h-4 w-4 text-cyan-300" />
                                    {activeFile?.name ?? 'Document'}
                                </div>
                                <MarkdownViewer content={activeFile?.content} fileName={activeFile?.name} />
                            </div>
                        </Panel>
                        <ResizeHandle />
                        <Panel defaultSize={28} minSize={22}>
                            <AgentPane
                                provider={provider}
                                apiKey={apiKey}
                                isGenerating={isGenerating}
                                messages={messages}
                                model={model}
                                modelOptions={modelOptions}
                                onProviderChange={updateProvider}
                                onApiKeyChange={updateApiKey}
                                onModelChange={updateModel}
                                onSendPrompt={runAgentPrompt}
                                onOpenSettings={() => setIsSettingsOpen(true)}
                            />
                        </Panel>
                    </PanelGroup>
                </div>
            ) : (
                <LandingScreen
                    isGenerating={isGenerating}
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
