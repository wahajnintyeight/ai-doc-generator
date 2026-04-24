import React from 'react';
import { 
  FolderOpen, 
  FilePlus2, 
  Minus, 
  Square, 
  X, 
  Settings2, 
  Monitor, 
  Moon, 
  Sun,
  Laptop,
  XCircle
} from 'lucide-react';

export function Toolbar({
  onOpen,
  onImport,
  onMinimise,
  onToggleMaximise,
  onQuit,
  onOpenSettings,
  onCloseWorkspace,
  isMaximised,
  theme,
  setTheme,
  selectionHint,
  sessionStarted,
}) {
  const themes = [
    { name: 'Dark', value: 'dark', icon: Moon },
    { name: 'Light', value: 'light', icon: Sun },
    { name: 'Dracula', value: 'dracula', icon: Laptop },
  ];

  return (
    <header 
      className="flex h-14 items-stretch border-b border-white/5 bg-[#07090d]/80 px-4 backdrop-blur-md" 
      style={{ '--wails-draggable': 'drag' }}
    >
      {/* Brand & Status */}
      <div className="flex flex-1 items-center gap-6" style={{ '--wails-draggable': 'drag' }}>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
            Synthesis
          </p>
          <h1 className="text-xs font-semibold text-slate-200">Doc Architect</h1>
        </div>

        {selectionHint && (
          <div className="hidden h-6 w-px bg-white/10 xl:block" />
        )}
        
        <div className="hidden xl:block">
          <p className="text-[11px] font-medium text-slate-500 transition-all">
            {selectionHint}
          </p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2" style={{ '--wails-draggable': 'none' }}>
        <div className="mr-4 flex items-center gap-1.5 rounded-2xl border border-white/5 bg-white/5 p-1">
          <button
            onClick={onOpen}
            className="group flex h-8 items-center gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            title="Open Document"
          >
            <FolderOpen className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            <span>Open</span>
          </button>
          <div className="h-4 w-px bg-white/5" />
          <button
            onClick={onImport}
            className="group flex h-8 items-center gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            title="Import Documents"
          >
            <FilePlus2 className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
            <span>Import</span>
          </button>
          {sessionStarted && (
            <>
              <div className="h-4 w-px bg-white/5" />
              <button
                onClick={onCloseWorkspace}
                className="group flex h-8 items-center gap-2 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-white/5 hover:text-orange-300"
                title="Close Workspace"
              >
                <XCircle className="h-4 w-4 text-orange-400 transition-transform group-hover:scale-110" />
                <span>Close</span>
              </button>
            </>
          )}
        </div>

        {/* Theme & Settings */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-white/5 p-1">
          <div className="flex items-center gap-0.5 px-1">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    theme === t.value 
                        ? 'bg-primary/10 text-primary shadow-sm shadow-primary/20' 
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                  }`}
                  title={`${t.name} Theme`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <div className="h-4 w-px bg-white/5" />
          <button
            onClick={onOpenSettings}
            className="flex h-7 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/5 hover:text-white"
            title="AI Configuration"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Window Controls */}
        <div className="ml-4 flex items-center gap-2 border-l border-white/5 pl-4">
          <button
            onClick={onMinimise}
            className="flex h-9 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            aria-label="Minimise window"
            title="Minimise"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleMaximise}
            className="flex h-9 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:bg-white/10 hover:text-white"
            aria-label={isMaximised ? 'Restore window' : 'Maximise window'}
            title={isMaximised ? 'Restore' : 'Maximise'}
          >
            <Square className={`h-3.5 w-3.5 ${isMaximised ? 'border-2 border-slate-500 group-hover:border-white' : ''}`} />
          </button>
          <button
            onClick={onQuit}
            className="flex h-9 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-400 transition-all hover:bg-red-500/15 hover:text-red-300"
            aria-label="Close window"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
