import { ChevronDown, ChevronRight, FolderOpen, FolderTree, FileCode2, Palette, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export function fileKindFromName(name) {
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.css')) return Palette;
  if (lowerName.endsWith('.jsx') || lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.tsx')) return FileCode2;
  return FileText;
}

function TreeRow({ item, depth = 0, activePath, onSelect, onToggleFolder }) {
  const Icon = item.icon ?? FolderTree;

  if (item.type === 'folder') {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder?.(item.path)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-200/85 transition hover:bg-white/5 hover:text-white"
        >
          <span className="flex w-4 justify-center">
            {item.open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          </span>
          <FolderTree className="h-4 w-4 text-primary/80" />
          <span>{item.name}</span>
        </button>
        {item.open && item.children ? (
          <div className="ml-5 border-l border-white/8 pl-2">
            {item.children.map((child) => (
              <TreeRow
                key={`${child.path ?? child.name}`}
                item={child}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition',
        item.path === activePath ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
      )}
      onClick={() => onSelect?.(item)}
    >
      <span className="flex w-4 justify-center" />
      <Icon className={clsx('h-4 w-4', item.path === activePath ? 'text-primary' : 'text-slate-400')} />
      <span className="truncate">{item.name}</span>
    </button>
  );
}

export function FileExplorer({
  tree = [],
  activePath,
  onSelect,
  onChooseFolder,
  onToggleFolder,
  selectedFolder = '',
  isLoading = false,
}) {
  const folderLabel = selectedFolder ? selectedFolder.split(/[\\/]/).pop() || selectedFolder : 'No folder selected';

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-[#0d1117]/95"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Folder Sidebar</p>
            <p className="mt-1 text-sm text-slate-200">{folderLabel}</p>
          </div>
          <button
            type="button"
            onClick={onChooseFolder}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/20"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Select Folder
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {!selectedFolder ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center">
            <div className="max-w-xs space-y-4">
              <FolderTree className="mx-auto h-10 w-10 text-primary/80" />
              <div>
                <p className="text-sm font-medium text-slate-100">Choose a folder to browse</p>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  The sidebar will show every file and folder inside the selected directory.
                </p>
              </div>
              <button
                type="button"
                onClick={onChooseFolder}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/20"
              >
                <FolderOpen className="h-4 w-4" />
                Select Folder
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-sm text-slate-400">
            Loading folder contents...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center">
            <div className="max-w-xs space-y-3">
              <p className="text-sm font-medium text-slate-100">This folder is empty</p>
              <p className="text-xs leading-6 text-slate-400">
                Add files here or choose another folder to display its contents.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((item) => (
              <TreeRow
                key={item.path ?? item.name}
                item={item}
                activePath={activePath}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
