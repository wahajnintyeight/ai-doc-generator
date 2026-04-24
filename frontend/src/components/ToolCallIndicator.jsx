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

const TOOL_GROUPS = {
  write_document_file: 'Writes',
  read_document_file: 'Reads',
  create_document_outline: 'Outline',
  get_active_document: 'Context',
};

function getToolStatusLabel(toolCall, isCompleted) {
  if (isCompleted) {
    return 'Done';
  }

  if (toolCall?.toolName === 'write_document_file') {
    return 'Saving';
  }

  if (toolCall?.toolName === 'read_document_file') {
    return 'Reading';
  }

  if (toolCall?.toolName === 'create_document_outline') {
    return 'Planning';
  }

  return 'Working';
}

function getToolResultText(toolCall) {
  const result = toolCall?.result;

  if (!result || typeof result !== 'object') {
    return '';
  }

  return result.relativePath || result.absolutePath || result.note || result.message || '';
}

function StatBadge({ label, value, tone, icon: Icon }) {
  return (
    <div
      className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        tone === 'green'
          ? 'border-green-500/30 bg-green-500/10 text-green-200'
          : tone === 'amber'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            : tone === 'blue'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-white/10 bg-white/[0.03] text-slate-300'
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
      <span className="text-[11px]">{value}</span>
    </div>
  );
}

function ToolCallItem({ toolCall, isCompleted }) {
  const Icon = TOOL_ICONS[toolCall.toolName] || Wrench;
  const label = TOOL_LABELS[toolCall.toolName] || toolCall.toolName;
  const group = TOOL_GROUPS[toolCall.toolName] || 'Other';
  const args = toolCall.args || {};
  
  // Extract relevant info from args
  const path = args.relativePath || args.path;
  const title = args.title;
  const statusLabel = getToolStatusLabel(toolCall, isCompleted);
  const resultText = getToolResultText(toolCall);

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
        <div className="flex items-center justify-between gap-2">
          <p className={`font-medium ${isCompleted ? 'text-green-200' : 'text-primary'}`}>
            {label}
          </p>
          <span
            className={`flex-shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${
              isCompleted
                ? 'border-green-500/30 bg-green-500/10 text-green-200'
                : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        {(path || title) && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {path || title}
          </p>
        )}
        {resultText && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {resultText}
          </p>
        )}
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {group}
        </p>
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
  const completedWrites = completedToolCalls.filter((toolCall) => toolCall.toolName === 'write_document_file').length;
  const completedReads = completedToolCalls.filter((toolCall) => toolCall.toolName === 'read_document_file').length;
  const completedOutlines = completedToolCalls.filter((toolCall) => toolCall.toolName === 'create_document_outline').length;
  const latestToolCall = activeToolCalls[activeToolCalls.length - 1] || completedToolCalls[completedToolCalls.length - 1];
  const latestToolLabel = latestToolCall
    ? `${TOOL_LABELS[latestToolCall.toolName] || latestToolCall.toolName}${
        latestToolCall.args?.relativePath || latestToolCall.args?.path
          ? ` · ${latestToolCall.args?.relativePath || latestToolCall.args?.path}`
          : ''
      }`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Wrench className="h-3 w-3" />
              Tool Activity
            </p>
            {latestToolLabel && (
              <p className="mt-1 text-xs text-slate-500">
                Latest: {latestToolLabel}
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-1.5">
            <StatBadge label="Active" value={activeToolCalls.length} tone={activeToolCalls.length > 0 ? 'blue' : 'neutral'} icon={Wrench} />
            <StatBadge label="Done" value={completedToolCalls.length} tone={completedToolCalls.length > 0 ? 'green' : 'neutral'} icon={CheckCircle2} />
            <StatBadge label="Reads" value={completedReads} tone={completedReads > 0 ? 'neutral' : 'neutral'} icon={Eye} />
            <StatBadge label="Writes" value={completedWrites} tone={completedWrites > 0 ? 'amber' : 'neutral'} icon={FileText} />
            <StatBadge label="Outline" value={completedOutlines} tone={completedOutlines > 0 ? 'neutral' : 'neutral'} icon={Sparkles} />
          </div>
        </div>
        
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
