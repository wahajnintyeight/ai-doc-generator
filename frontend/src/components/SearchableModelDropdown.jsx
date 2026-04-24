import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Loader2, AlertCircle, Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SearchableModelDropdown({
  value,
  onChange,
  models = [],
  isLoading = false,
  error = null,
  placeholder = 'Select or type a model...',
  allowCustom = true,
  onRefresh = null,
  className = '',
  grouped = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const [dropdownStyle, setDropdownStyle] = useState({});

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  const findModelInGroups = (groups, targetValue) => {
    for (const group of groups) {
      const found = group.models?.find((model) => {
        const modelId = typeof model === 'string' ? model : model.id;
        return modelId === targetValue;
      });
      if (found) return found;
    }
    return null;
  };

  const selectedModel = grouped
    ? findModelInGroups(models, value)
    : models.find((model) => {
        const modelId = typeof model === 'string' ? model : model.id;
        return modelId === value;
      });
  const selectedLabel =
    typeof selectedModel === 'string'
      ? selectedModel
      : selectedModel?.name || selectedModel?.id || '';

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const computeDropdownStyle = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 380;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    computeDropdownStyle();

    const handleScroll = () => computeDropdownStyle();
    const handleResize = () => computeDropdownStyle();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, computeDropdownStyle]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedTrigger = triggerRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = grouped
    ? models
        .map((group) => ({
          ...group,
          models: group.models.filter((model) => {
            const query = searchQuery.toLowerCase();
            const modelId = typeof model === 'string' ? model : model.id;
            const modelName = typeof model === 'string' ? model : model.name || model.id;
            return modelId.toLowerCase().includes(query) || modelName.toLowerCase().includes(query);
          }),
        }))
        .filter((group) => group.models.length > 0)
    : models.filter((model) => {
        const query = searchQuery.toLowerCase();
        const modelId = typeof model === 'string' ? model : model.id;
        const modelName = typeof model === 'string' ? model : model.name || model.id;
        return modelId.toLowerCase().includes(query) || modelName.toLowerCase().includes(query);
      });

  const handleSelect = (modelId) => {
    setInputValue(modelId);
    onChange(modelId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (allowCustom) onChange(newValue);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && allowCustom && inputValue.trim()) {
      onChange(inputValue.trim());
      setIsOpen(false);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) computeDropdownStyle();
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={dropdownStyle}
          className="rounded-2xl border border-primary/20 bg-primary/10 shadow-[0_8px_32px_rgba(6,182,212,0.18)] backdrop-blur-xl"
        >
          {/* Search header */}
          <div className="border-b border-white/10 bg-white/5 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models"
                className="w-full rounded-lg border border-white/10 bg-primary/10 py-2 pl-10 pr-10 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-colors focus:border-primary/50 focus:bg-primary/10"
              />
              <Settings className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {error ? (
              <div className="flex items-center gap-2 p-4 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading models...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                {searchQuery ? 'No models found' : 'No models available'}
                {allowCustom && searchQuery && (
                  <div className="mt-2 text-xs text-primary/80">
                    Press Enter to use "{searchQuery}"
                  </div>
                )}
              </div>
            ) : grouped ? (
              <div className="p-2">
                {filteredModels.map((group) => (
                  <div key={group.id} className="mb-3 last:mb-0">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {group.name}
                    </div>
                    {group.models.map((model) => {
                      const modelId = typeof model === 'string' ? model : model.id;
                      const modelName =
                        typeof model === 'string' ? model : model.name || model.id;
                      const modelDesc = typeof model === 'string' ? null : model.description;
                      const isFree = typeof model === 'object' && model.free === true;
                      const isSelected = modelId === value;

                      const tier =
                        modelName.includes('Mini') || modelName.includes('Flash')
                          ? 'Medium'
                          : 'Medium';
                      const pricing =
                        modelName.includes('Mini') || modelName.includes('Flash')
                          ? '0.33x'
                          : '1x';

                      return (
                        <button
                          key={modelId}
                          onClick={() => handleSelect(modelId)}
                          className={`group relative w-full rounded-lg px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isSelected && (
                                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                                )}
                                <span className="text-sm font-medium break-words">{modelName}</span>
                                {isFree && (
                                  <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/30">
                                    Free
                                  </span>
                                )}
                              </div>
                              {modelDesc && (
                                <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                  {modelDesc}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs text-slate-400">{tier}</div>
                                <div className="text-xs font-medium text-slate-300">{pricing}</div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2">
                {filteredModels.map((model) => {
                  const modelId = typeof model === 'string' ? model : model.id;
                  const modelName =
                    typeof model === 'string' ? model : model.name || model.id;
                  const modelDesc = typeof model === 'string' ? null : model.description;
                  const isFree = typeof model === 'object' && model.free === true;
                  const isSelected = modelId === value;

                  const tier =
                    modelName.includes('Mini') || modelName.includes('Flash')
                      ? 'Medium'
                      : 'Medium';
                  const pricing =
                    modelName.includes('Mini') || modelName.includes('Flash')
                      ? '0.33x'
                      : '1x';

                  return (
                    <button
                      key={modelId}
                      onClick={() => handleSelect(modelId)}
                      className={`group relative w-full rounded-lg px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isSelected && (
                                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                            )}
                            <span className="text-sm font-medium break-words">{modelName}</span>
                            {isFree && (
                              <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/30">
                                Free
                              </span>
                            )}
                          </div>
                          {modelDesc && (
                            <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {modelDesc}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-slate-400">{tier}</div>
                            <div className="text-xs font-medium text-slate-300">{pricing}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other models footer */}
          {!searchQuery && filteredModels.length > 0 && (
            <div className="border-t border-white/10 bg-white/5">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
                <span>Other Models</span>
              </button>
            </div>
          )}

          {/* Custom model footer */}
          {allowCustom && (
            <div className="border-t border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-500">Type a custom model ID and press Enter</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={allowCustom ? inputValue : selectedLabel || value || ''}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            computeDropdownStyle();
            setIsOpen(true);
          }}
          readOnly={!allowCustom}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-white/5 bg-[#121b27] px-4 py-2 text-sm font-medium text-slate-200 outline-none ring-1 ring-inset ring-white/5 transition-all focus:border-primary/50 focus:ring-primary/20 hover:bg-[#16212e] ${
            allowCustom ? '' : 'cursor-pointer'
          } ${className}`}
        />
        <button
          type="button"
          onClick={toggleDropdown}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 transition-colors hover:text-primary"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}