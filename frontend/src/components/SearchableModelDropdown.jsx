import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Loader2, AlertCircle } from 'lucide-react';
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = models.filter(model => {
    const query = searchQuery.toLowerCase();
    const modelId = typeof model === 'string' ? model : model.id;
    const modelName = typeof model === 'string' ? model : (model.name || model.id);
    
    return modelId.toLowerCase().includes(query) || 
           modelName.toLowerCase().includes(query);
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
    
    if (allowCustom) {
      onChange(newValue);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && allowCustom && inputValue.trim()) {
      onChange(inputValue.trim());
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Main Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm font-medium text-slate-200 outline-none transition-colors focus:border-cyan-500/30"
        />
        <button
          onClick={toggleDropdown}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0e151f] shadow-2xl"
          >
            {/* Search Input */}
            <div className="border-b border-white/5 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-slate-200 outline-none transition-colors focus:border-cyan-500/30"
                />
              </div>
            </div>

            {/* Models List */}
            <div className="max-h-64 overflow-y-auto">
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
                    <div className="mt-2 text-xs text-cyan-400">
                      Press Enter to use "{searchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                filteredModels.map((model) => {
                  const modelId = typeof model === 'string' ? model : model.id;
                  const modelName = typeof model === 'string' ? model : (model.name || model.id);
                  const modelDesc = typeof model === 'string' ? null : model.description;
                  const isSelected = modelId === value;

                  return (
                    <button
                      key={modelId}
                      onClick={() => handleSelect(modelId)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-200'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-medium text-sm">{modelName}</div>
                      {modelDesc && (
                        <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                          {modelDesc}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {allowCustom && (
              <div className="border-t border-white/5 bg-white/5 p-3">
                <p className="text-xs text-slate-500">
                  Type a custom model ID and press Enter
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
