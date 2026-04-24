import { motion } from 'framer-motion';
import { Wrench, FileText, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

const TOOL_ICONS = {
  write_document_file: FileText,
  read_document_file: Eye,
  create_document_outline: Sparkles,
  get_active_document: Eye,
};

const TOOL_LABELS = {
  write_document_file: 'Writing Document',
  read_document_file: 'Reading Document',
  create_document_outline: 'Creating Outline',
  get_active_document: 'Getting Active Document',
};

function ToolCallItem({ toolCall, isCompleted }) {
  const Icon = TOOL_ICONS[toolCall.toolName] || Wrench;
  const label = TOOL_LABELS[toolCall.toolName] || toolCall.toolName;
  const args = toolCall.args || {};
  
  // Extract relevant info from args
  const path = args.relativePath || args.path;
  const title = args.title;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isCompleted
          ? 'border-green-500/30 bg-green-500/10'
          : 'border-primary/30 bg-primary/10'
      }`}
    >
      <div className="mt-0.5">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className="h-4 w-4 text-primary" />
          </motion.div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isCompleted ? 'text-green-200' : 'text-primary'}`}>
          {label}
        </p>
        {(path || title) && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {path || title}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function ToolCallIndicator({ toolCalls = [], completedToolCalls = [] }) {
  if (toolCalls.length === 0 && completedToolCalls.length === 0) {
    return null;
  }

  const activeToolCalls = toolCalls.filter(
    tc => !completedToolCalls.some(ctc => ctc.toolCallId === tc.toolCallId)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Wrench className="h-3 w-3" />
          Tool Activity
        </p>
        
        <div className="space-y-2">
          {/* Show completed tool calls */}
          {completedToolCalls.slice(-3).map((toolCall) => (
            <ToolCallItem
              key={toolCall.toolCallId}
              toolCall={toolCall}
              isCompleted={true}
            />
          ))}
          
          {/* Show active tool calls */}
          {activeToolCalls.map((toolCall) => (
            <ToolCallItem
              key={toolCall.toolCallId}
              toolCall={toolCall}
              isCompleted={false}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
