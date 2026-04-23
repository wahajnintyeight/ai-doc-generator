import { useEffect, useMemo, useRef, useState } from 'react';
import { WandSparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchableModelDropdown } from './SearchableModelDropdown';
import { normalizeModelOptions, providerOptions, modelsByProvider } from '../lib/modelCatalog';

const defaultToolOptions = [
  {
    id: 'active-document',
    label: 'Active Document',
    token: '@document',
    helper: 'Sync with the current workspace context',
  },
  {
    id: 'outline',
    label: 'Architect Mode',
    token: '@outline',
    helper: 'Generate structural hierarchy before content',
  },
  {
    id: 'refine',
    label: 'Logic Refinement',
    token: '@refine',
    helper: 'Optimize prompt for technical clarity',
  },
];

// Build grouped model options with providers as headers
function buildGroupedModelOptions() {
  return providerOptions.map((provider) => ({
    id: provider.value,
    name: provider.label,
    models: normalizeModelOptions(modelsByProvider[provider.value] || []),
  }));
}

export function PromptComposerControls({
  provider,
  model,
  modelOptions = [],
  onProviderChange,
  onModelChange,
  onToolSelect,
  toolOptions = defaultToolOptions,
}) {
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const resolvedToolOptions = useMemo(
    () => (toolOptions.length ? toolOptions : defaultToolOptions),
    [toolOptions],
  );
  const groupedModelOptions = useMemo(() => buildGroupedModelOptions(), []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setToolMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tool Selection Menu */}
      <div className="relative" ref={menuRef}>
        {/* <button
          type="button"
          onClick={() => setToolMenuOpen(!toolMenuOpen)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
            toolMenuOpen
              ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:bg-white/10 hover:text-slate-200'
          }`}
          title="Add context or tools"
        >
          <WandSparkles
            className={`h-5 w-5 transition-transform duration-300 ${
              toolMenuOpen ? 'rotate-12 scale-110' : ''
            }`}
          />
        </button> */}

        <AnimatePresence>
          {toolMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full left-0 z-[101] mb-3 w-64 rounded-2xl border border-white/10 bg-[#161b22] p-1 shadow-2xl backdrop-blur-xl"
            >
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Assistants & Context
              </div>
              {resolvedToolOptions.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    onToolSelect?.(tool);
                    setToolMenuOpen(false);
                  }}
                  className="group flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-purple-400">
                      {tool.label}
                    </span>
                    <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      {tool.token}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">{tool.helper}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unified Model Selector with Provider Groups */}
      <div className="min-w-[280px] sm:min-w-[360px]">
        <SearchableModelDropdown
          value={model}
          onChange={(selectedModel) => {
            // Find which provider this model belongs to
            for (const group of groupedModelOptions) {
              const modelExists = group.models.find((m) => m.id === selectedModel);
              if (modelExists) {
                onProviderChange?.(group.id);
                break;
              }
            }
            onModelChange?.(selectedModel);
          }}
          models={groupedModelOptions}
          placeholder="Select model..."
          grouped={true}
          className="h-10 !bg-white/5 hover:!bg-white/10 !border-white/5 !rounded-xl !text-xs sm:!text-sm"
        />
      </div>
    </div>
  );
}