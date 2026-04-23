import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export function PromptComposer({ disabled, onSubmit, placeholder = 'Type a message...', submitLabel }) {
  const [prompt, setPrompt] = useState('');

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

  return (
    <form onSubmit={handleSubmit} className="group relative flex w-full flex-col">
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-25 blur transition duration-500 group-focus-within:opacity-50"></div>
      <div className="relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0e151f] p-2 shadow-2xl sm:p-4">
        <textarea
          className="max-h-[250px] min-h-[80px] w-full resize-none border-none bg-transparent px-4 py-2 text-base leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none"
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={3}
        />
        <div className="mt-2 flex items-center justify-end px-2">
           <button
            type="submit"
            disabled={disabled || !prompt.trim()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 font-bold text-black shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0e151f] disabled:opacity-50 disabled:shadow-none sm:px-8"
            aria-label={submitLabel || 'Start Generation'}
          >
            <span className="hidden sm:inline">{submitLabel || 'Start'}</span>
            {disabled ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

