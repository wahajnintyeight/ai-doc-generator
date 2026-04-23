import { ChevronDown, ChevronRight, FolderTree, FileCode2, Palette, FileText } from 'lucide-react';
import clsx from 'clsx';

function fileKindFromName(name) {
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.css')) return Palette;
  if (lowerName.endsWith('.jsx') || lowerName.endsWith('.js') || lowerName.endsWith('.ts') || lowerName.endsWith('.tsx')) return FileCode2;
  return FileText;
}

function TreeRow({ item, depth = 0, activePath, onSelect }) {
  const Icon = item.icon ?? FolderTree;

  if (item.type === 'folder') {
    return (
      <div>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-200/85 transition hover:bg-white/5 hover:text-white">
          <span className="flex w-4 justify-center">
            {item.open ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
          </span>
          <FolderTree className="h-4 w-4 text-cyan-300/80" />
          <span>{item.name}</span>
        </button>
        {item.open && item.children ? (
          <div className="ml-5 border-l border-white/8 pl-2">
            {item.children.map((child) => (
              <TreeRow key={`${depth}-${child.name}`} item={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} />
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
        item.path === activePath ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-inset ring-cyan-500/20' : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
      )}
      onClick={() => onSelect?.(item)}
    >
      <span className="flex w-4 justify-center" />
      <Icon className={clsx('h-4 w-4', item.active ? 'text-cyan-200' : 'text-slate-400')} />
      <span className="truncate">{item.name}</span>
    </button>
  );
}

export function FileExplorer({ tree = [], activePath, onSelect }) {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-[#0d1117]/95">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Document Library</p>
        <p className="mt-1 text-sm text-slate-200">doc-gen-ai</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-1">
          {tree.map((item) => (
            <TreeRow key={item.path ?? item.name} item={item} activePath={activePath} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </aside>
  );
}

export function makeExplorerTree(files, activePath) {
  const grouped = files.reduce(
    (accumulator, file) => {
      if (file.kind === 'folder') {
        accumulator.folders.push(file);
        return accumulator;
      }

      if (file.group === 'src') {
        accumulator.src.push(file);
        return accumulator;
      }

      accumulator.root.push(file);
      return accumulator;
    },
    { root: [], src: [], folders: [] }
  );

  return [
    ...grouped.root,
    {
      type: 'folder',
      name: 'src',
      open: true,
      children: grouped.src.map((file) => ({
        type: 'file',
        name: file.name,
        path: file.path,
        icon: fileKindFromName(file.name),
      })),
    },
    ...grouped.folders,
  ].map((item) => ({
    ...item,
    active: item.path === activePath,
  }));
}
