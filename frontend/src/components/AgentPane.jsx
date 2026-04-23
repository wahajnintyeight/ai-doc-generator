import { Bot, MessageSquareText, Settings2, AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromptComposer } from './PromptComposer';
import { MessageActions } from './MessageActions';
import { TypingIndicator } from './TypingIndicator';

function MessageBubble({ message, onRegenerate, canRegenerate }) {
  const user = message.role === 'user';
  const error = message.role === 'error';
  const assistant = message.role === 'assistant';

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex justify-start"
      >
        <div className="max-w-[88%] rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm leading-6">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">
            <AlertCircle className="h-3 w-3" />
            Error
          </p>
          <p className="whitespace-pre-wrap text-red-200">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${user ? 'justify-end' : 'justify-start'}`}
    >
      <div className="relative max-w-[88%]">
        <div className={`rounded-2xl border px-3 py-2 text-sm leading-6 transition-all ${
          user 
            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100' 
            : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20'
        }`}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {user ? 'You' : 'Agent'}
          </p>
          <p className="whitespace-pre-wrap">{message.content}</p>

          <div className={`mt-3 flex ${user ? 'justify-end' : 'justify-start'} opacity-100 transition-opacity duration-200`}>
            <MessageActions
              content={message.content}
              onRegenerate={assistant && canRegenerate ? onRegenerate : null}
              canRegenerate={assistant && canRegenerate}
              showCopyLabel={!user}
              className="flex-wrap"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AgentPane({
  messages,
  isGenerating,
  provider,
  model,
  modelOptions = [],
  onProviderChange,
  onModelChange,
  onSendPrompt,
  onOpenSettings,
  onRegenerateLastMessage,
}) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  const canRegenerateLastMessage = messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' &&
    !isGenerating;

  // Auto-scroll to bottom when messages change or when generating
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full min-h-0 flex-col overflow-hidden border-l border-white/10 bg-[#0b1016]"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Agent Pane</p>
          <button
            onClick={onOpenSettings}
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            title="AI Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200">
            <Bot className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-medium">Doc Assistant</span>
          </div>
          {isGenerating ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200"
            >
              Working
            </motion.span>
          ) : null}
        </div>
      </div>

      <div ref={scrollContainerRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length ? (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={
                  index === messages.length - 1 && canRegenerateLastMessage
                    ? onRegenerateLastMessage
                    : null
                }
                canRegenerate={index === messages.length - 1 && canRegenerateLastMessage}
              />
            ))}
            
            {/* Typing Indicator */}
            <AnimatePresence>
              {isGenerating && <TypingIndicator />}
            </AnimatePresence>
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"
          >
            <p className="mb-2 inline-flex items-center gap-2 text-slate-200">
              <MessageSquareText className="h-4 w-4 text-cyan-300" />
              No conversation yet
            </p>
            <p>Start prompt from landing screen. Agent pane stays here after first conversation.</p>
          </motion.div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <PromptComposer
          compact
          disabled={isGenerating}
          onSubmit={onSendPrompt}
          provider={provider}
          model={model}
          modelOptions={modelOptions}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          placeholder="Ask follow-up..."
          submitLabel={isGenerating ? 'Wait' : 'Send'}
        />
      </div>
    </motion.aside>
  );
}
