import { CheckCircle2, Play, TerminalSquare, Wrench, XCircle } from 'lucide-react';
import clsx from 'clsx';

const steps = [
  { name: 'read_file', target: '/src/components/MarkdownViewer.jsx', status: 'success', detail: 'Read the current markdown view to confirm layout shape before any edits.' },
  { name: 'list_dir', target: '/src/components', status: 'success', detail: 'Confirmed the split component structure for the workspace shell.' },
  { name: 'edit_file', target: '/src/App.jsx', status: 'success', detail: 'Replaced the stock greeting view with the IDE-style document workspace.' },
];

function StepRow({ step }) {
  const success = step.status === 'success';
  return (
    <div className={clsx('rounded-2xl border p-3', success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5')}>
      <div className="flex items-center gap-3">
        <div className={clsx('flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-inset', success ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-300 ring-rose-500/20')}>
          {success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[13px] font-medium text-slate-100">{step.name}</p>
            <span className={clsx('text-[10px] font-semibold uppercase tracking-[0.24em]', success ? 'text-emerald-300' : 'text-rose-300')}>
              {step.status}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{step.target}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-6 text-slate-300">{step.detail}</p>
    </div>
  );
}

export function AgentPane() {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-white/10 bg-[#0b1016]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Agent Console</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Document Agent</h2>
            <p className="text-[12px] text-slate-400">Mode: build</p>
          </div>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Running
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
            Ensure the viewer is split into reusable components and the app shell feels like a real document IDE, not a demo form.
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <StepRow key={step.name} step={step} />
            ))}
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-[12px] leading-6 text-slate-300">
            <p className="mb-2 flex items-center gap-2 text-cyan-200">
              <TerminalSquare className="h-4 w-4" />
              Summary
            </p>
            The shell now uses a sidebar, markdown document pane, and agent log pane with a dark IDE-inspired visual language.
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-slate-400">
          <Wrench className="h-4 w-4" />
          <input
            type="text"
            placeholder="Ask the agent to edit the document..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          <button className="rounded-xl bg-cyan-500/15 p-2 text-cyan-200 transition hover:bg-cyan-500/25">
            <Play className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
