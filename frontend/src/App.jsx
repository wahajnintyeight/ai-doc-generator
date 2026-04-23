import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Group as PanelGroup, Panel } from 'react-resizable-panels';
import { FilePlus2, FileText, FolderOpen, Minus, Square, X } from 'lucide-react';
import { FileExplorer, makeExplorerTree } from './components/FileExplorer';
import { MarkdownViewer } from './components/MarkdownViewer';
import { ResizeHandle } from './components/ResizeHandle';
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
    const [selectionHint, setSelectionHint] = useState('Open a document to read it, or import multiple local docs.');
    const openInputId = 'open-doc-input';
    const importInputId = 'import-doc-input';

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

    useEffect(() => {
        setMounted(true);

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

    if (!mounted) {
        return null;
    }

    const explorerTree = useMemo(() => makeExplorerTree(files, activePath), [files, activePath]);

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-base text-base-foreground">
            <header className="flex h-14 items-stretch border-b border-white/8 bg-[#0c1016]/92 backdrop-blur" style={{ '--wails-draggable': 'drag' }}>
                <div className="flex flex-1 items-center gap-4 px-4" style={{ '--wails-draggable': 'drag' }}>
                    <div className="select-none">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-accent-foreground">Doc Reader</p>
                        <p className="mt-0.5 text-sm text-base-foreground/90">Local markdown and document preview</p>
                    </div>
                    <div className="hidden xl:block text-[11px] text-accent-foreground/80">
                        {selectionHint}
                    </div>
                </div>

                <div className="flex items-center gap-3 px-4" style={{ '--wails-draggable': 'none' }}>
                    <div className="flex items-center gap-2 rounded-xl border border-panel-border/70 bg-black/20 p-1">
                        <button
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-foreground transition hover:bg-white/5"
                            onClick={() => document.getElementById(openInputId)?.click()}
                            type="button"
                        >
                            <FolderOpen className="h-4 w-4 text-cyan-300" />
                            Open
                        </button>
                        <button
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-foreground transition hover:bg-white/5"
                            onClick={() => document.getElementById(importInputId)?.click()}
                            type="button"
                        >
                            <FilePlus2 className="h-4 w-4 text-cyan-300" />
                            Import
                        </button>
                    </div>

                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="rounded-lg border border-panel-border bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-foreground outline-none"
                    >
                        {themes.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.name}
                            </option>
                        ))}
                    </select>

                    <div className="ml-2 flex items-center gap-1 rounded-xl border border-panel-border/70 bg-black/20 p-1" style={{ '--wails-draggable': 'none' }}>
                        <button
                            aria-label="Minimise window"
                            className="rounded-lg p-2 text-accent-foreground transition hover:bg-white/5 hover:text-base-foreground"
                            onClick={handleMinimise}
                            type="button"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <button
                            aria-label={isMaximised ? 'Restore window' : 'Maximise window'}
                            className="rounded-lg p-2 text-accent-foreground transition hover:bg-white/5 hover:text-base-foreground"
                            onClick={handleToggleMaximise}
                            type="button"
                        >
                            {isMaximised ? <Square className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                        <button
                            aria-label="Close window"
                            className="rounded-lg p-2 text-accent-foreground transition hover:bg-red-500/15 hover:text-red-300"
                            onClick={handleQuit}
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            <input id={openInputId} accept=".md,.markdown,.txt,.doc,.docx" className="hidden" onChange={handleOpenFile} type="file" />
            <input id={importInputId} accept=".md,.markdown,.txt,.doc,.docx" className="hidden" multiple onChange={handleImportFiles} type="file" />

            <div className="flex min-h-0 flex-1">
                <PanelGroup direction="horizontal" className="min-h-0 w-full">
                    <Panel defaultSize={22} minSize={12}>
                        <FileExplorer tree={explorerTree} activePath={activePath} onSelect={selectFile} />
                    </Panel>
                    <ResizeHandle />
                    <Panel defaultSize={78} minSize={45}>
                        <div className="flex h-full flex-col">
                            <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151d] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
                                <FileText className="h-4 w-4 text-cyan-300" />
                                {activeFile?.name ?? 'Document'}
                            </div>
                            <MarkdownViewer content={activeFile?.content} fileName={activeFile?.name} />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
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
