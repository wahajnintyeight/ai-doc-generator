import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { PromptComposerControls } from './PromptComposerControls';

export function PromptComposer({
  disabled,
  onSubmit,
  placeholder = 'Type a message...',
  submitLabel,
  provider,
  model,
  modelOptions = [],
  onProviderChange,
  onModelChange,
  history = [],
}) {
  const [prompt, setPrompt] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const textareaRef = useRef(null);

  // Auto-scroll textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
      setPrompt('');
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' && (textareaRef.current?.selectionStart === 0 || !prompt)) {
      e.preventDefault();
      const userMessages = history.filter(m => m.role === 'user');
      if (userMessages.length > 0) {
        const newIndex = historyIndex === -1 ? userMessages.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setPrompt(userMessages[newIndex].content);
      }
    } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
      const userMessages = history.filter(m => m.role === 'user');
      if (historyIndex < userMessages.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setPrompt(userMessages[newIndex].content);
      } else {
        setHistoryIndex(-1);
        setPrompt('');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleToolSelect = (tool) => {
    if (!tool?.token) {
      return;
    }

    setPrompt((currentPrompt) => {
      const nextPrompt = currentPrompt.trim();
      const tokenText = `${tool.token} `;
      return nextPrompt ? `${tokenText}${nextPrompt}` : tokenText;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="group relative flex w-full flex-col">
      <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-primary/20 via-primary/20 to-primary/20 opacity-0 blur-2xl transition duration-500 group-focus-within:opacity-100"></div>
      
      <div className="relative flex w-full flex-col rounded-[2rem] border border-white/10 bg-[#0c0e14]/60 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 group-focus-within:border-purple-500/30 group-focus-within:bg-[#0c0e14]/80 sm:p-4">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

        <textarea
          ref={textareaRef}
          className="custom-scrollbar relative max-h-[250px] min-h-[100px] w-full resize-none border-none bg-transparent px-4 py-2 text-lg leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
        />

        <div className="mt-4 flex items-center justify-between gap-4 px-2">
          <div className="flex-1 overflow-hidden">
            <PromptComposerControls
              provider={provider}
              model={model}
              modelOptions={modelOptions}
              onProviderChange={onProviderChange}
              onModelChange={onModelChange}
              onToolSelect={handleToolSelect}
            />
          </div>
          
          <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className="group/btn relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-primary to-primary/80 text-white shadow-lg transition-all hover:scale-110 hover:shadow-primary/40 active:scale-90 disabled:scale-100 disabled:opacity-30 disabled:grayscale sm:h-14 sm:w-14"
            aria-label={submitLabel || 'Send Message'}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-primary/80 opacity-0 transition-opacity group-hover/btn:opacity-100"></div>
            
            <div className="relative flex items-center justify-center">
              {disabled ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6 transition-all duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 group-active:scale-125" />
              )}
            </div>
          </button>
        </div>
      </div>
    </form>
  );
}

