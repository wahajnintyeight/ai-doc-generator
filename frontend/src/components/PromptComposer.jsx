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
}) {
  const [prompt, setPrompt] = useState('');
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
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
      <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 opacity-0 blur-2xl transition duration-500 group-focus-within:opacity-100"></div>
      
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
          <PromptComposerControls
            provider={provider}
            model={model}
            modelOptions={modelOptions}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            onToolSelect={handleToolSelect}
          />
          
          <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className="group/btn relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg transition-all hover:scale-105 hover:shadow-purple-500/25 active:scale-95 disabled:scale-100 disabled:opacity-30 disabled:grayscale sm:h-12 sm:w-auto sm:rounded-2xl sm:px-8"
            aria-label={submitLabel || 'Send Message'}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-cyan-400 opacity-0 transition-opacity group-hover/btn:opacity-100"></div>
            
            <div className="relative flex items-center gap-2 font-bold tracking-tight">
              <span className="hidden sm:inline">{submitLabel || 'Send'}</span>
              {disabled ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              )}
            </div>
          </button>
        </div>
      </div>
    </form>
  );
}

