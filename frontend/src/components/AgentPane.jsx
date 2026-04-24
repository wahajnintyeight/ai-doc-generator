import {
  Bot, MessageSquareText, Settings2, AlertCircle,
  Zap, Cpu, BrainCircuit, ChevronDown, Activity,
  Clock, Terminal, CheckCircle2, Loader2
} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { PromptComposer } from './PromptComposer';
import { ToolCallIndicator } from './ToolCallIndicator';

function MessageBubble({ message, onRegenerate, canRegenerate }) {
  const [showReasoning, setShowReasoning] = useState(true);
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isAssistant = message.role === 'assistant';

  console.log('[MESSAGE]:', message);
  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex flex-col ${isUser ? 'items-end ml-8' : 'items-start mr-8'} mb-6 group`}
    >
      {/* Metadata Header */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        {!isUser && <Bot className="h-3 w-3 text-primary animate-pulse" />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {isUser ? 'Operator' : message.model || 'Intelligence'}
        </span>
        <span className="text-[9px] text-slate-600 font-mono">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className={`relative max-w-[98%] rounded-2xl border transition-all duration-300 ${isUser
        ? 'border-violet-500/30 bg-violet-500/5 text-slate-200 shadow-[0_4px_20px_-12px_rgba(139,92,246,0.3)]'
        : isError
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-white/10 bg-white/[0.03] backdrop-blur-md'
        }`}>

        {/* Advanced: Reasoning/Thought Block */}
        {message.reasoning && (
          <div className="border-b border-white/5 bg-black/20 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Reasoning
                </span>
              </div>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-200 transition-colors"
              >
                {showReasoning ? 'Hide' : 'Show'}
              </button>
            </div>

            {showReasoning && (
              <div className="border-l-2 border-primary/50 pl-3 text-xs leading-relaxed text-slate-400">
                {message.reasoning}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3">
          <MarkdownRenderer
            content={message.content}
            tone={isUser ? 'user' : 'assistant'}
            className="prose prose-invert prose-sm max-w-none"
          />
        </div>

        {/* Message Telemetry (Footer) */}
        {!isUser && !isError && (
          <div className="flex items-center gap-3 border-t border-white/5 px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
              <Zap className="h-2.5 w-2.5" /> {message.tokensPerSec || '42'} t/s
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
              <Clock className="h-2.5 w-2.5" /> {message.latency || '0.8'}s
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions overlay */}
      <div className={`mt-2 w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <MessageActions content={message.content} showCopyLabel={false} />
      </div>
    </motion.div>
  );
}

export function AgentPane({
  messages,
  isGenerating,
  stats = { tokens: 1240, limit: 128000 },
  onSendPrompt,
  provider,
  model,
  modelOptions = [],
  onProviderChange,
  onModelChange,
  activeToolCalls = [],
  completedToolCalls = [],
}) {
  const scrollRef = useRef(null);

  // Advanced feature: Context Window Progress
  const contextUsage = (stats.tokens / stats.limit) * 100;

  useLayoutEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  return (
    <motion.div className="flex h-full  flex-col border-l border-white/10 bg-[#07090d] shadow-2xl">
      {/* Advanced Header with Telemetry */}
      <div className="z-10 border-b border-white/10 bg-[#07090d]/80 backdrop-blur-xl px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">Neural Interface</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] text-slate-400 font-mono">Session: Active</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"><Activity className="h-4 w-4" /></button>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"><Settings2 className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Context Usage Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>CONTEXT UTILIZATION</span>
            <span>{stats.tokens.toLocaleString()} / {stats.limit / 1000}k</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${contextUsage}%` }}
              className={`h-full ${contextUsage > 80 ? 'bg-amber-500' : 'bg-primary'}`}
            />
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
            <Cpu className="h-12 w-12 mb-4" />
            <p className="text-xs uppercase tracking-tighter text-center">Awaiting sequence initialization...</p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <AnimatePresence>
          {(activeToolCalls.length > 0 || completedToolCalls.length > 0) && (
            <ToolCallIndicator
              toolCalls={activeToolCalls}
              completedToolCalls={completedToolCalls}
            />
          )}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {/* Advanced Input Area */}
      <div className="border-t border-white/10 p-4 bg-gradient-to-t from-black/40 to-transparent">
        <div className="mb-3">
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
              >
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
                  Synthesizing Response...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <PromptComposer
          disabled={isGenerating}
          onSubmit={onSendPrompt}
          provider={provider}
          model={model}
          modelOptions={modelOptions}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          placeholder="Type a prompt for the document agent..."
        />
      </div>
    </motion.div>
  );
}