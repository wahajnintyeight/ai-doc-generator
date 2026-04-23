import { Bot, KeyRound, Sparkles, X, Settings2, ShieldCheck, Cpu, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { providerOptions } from '../lib/modelCatalog';
import { SearchableModelDropdown } from './SearchableModelDropdown';
import { fetchOpenRouterModels, sortModelsByPopularity } from '../lib/openRouterClient';

export function SettingsModal({
  isOpen,
  onClose,
  provider,
  apiKey,
  model,
  modelOptions = [],
  onProviderChange,
  onApiKeyChange,
  onModelChange,
}) {
  const [openRouterModels, setOpenRouterModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);

  const loadOpenRouterModels = async () => {
    if (!apiKey) {
      setModelsError('API key required to fetch models');
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const models = await fetchOpenRouterModels(apiKey);
      const sortedModels = sortModelsByPopularity(models);
      setOpenRouterModels(sortedModels);
    } catch (error) {
      setModelsError(error.message || 'Failed to load models');
      console.error('Failed to load OpenRouter models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (isOpen && provider === 'openrouter' && apiKey && openRouterModels.length === 0) {
      loadOpenRouterModels();
    }
  }, [isOpen, provider, apiKey]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#0e151f] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
                <Settings2 className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Environment Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 px-6 py-8">
            {/* Provider Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Sparkles className="h-3 w-3 text-cyan-500" />
                AI Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                {providerOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onProviderChange(opt.value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                      provider === opt.value
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                        : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <Cpu className="h-3 w-3 text-cyan-500" />
                    Model Selection
                  </label>
                  {provider === 'openrouter' && (
                    <button
                      onClick={loadOpenRouterModels}
                      disabled={!apiKey || isLoadingModels}
                      className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh models"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                
                {provider === 'openrouter' ? (
                  <SearchableModelDropdown
                    value={model}
                    onChange={onModelChange}
                    models={openRouterModels.length > 0 ? openRouterModels : modelOptions}
                    isLoading={isLoadingModels}
                    error={modelsError}
                    placeholder="Select or type model ID..."
                    allowCustom={true}
                  />
                ) : (
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 outline-none transition-colors focus:border-cyan-500/30"
                    onChange={(e) => onModelChange(e.target.value)}
                    value={model}
                  >
                    {modelOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0e151f]">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <KeyRound className="h-3 w-3 text-cyan-500" />
                  Secret API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-slate-200 outline-none transition-colors focus:border-cyan-500/30"
                />
              </div>
            </div>

            {/* Footer security note */}
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
              <p className="text-[11px] leading-relaxed text-emerald-500/80">
                Your keys are stored only in your local memory. We never transmit them to our servers or use them for training.
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 bg-white/5 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-cyan-500 px-6 py-2 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95"
            >
              Save Configuration
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
