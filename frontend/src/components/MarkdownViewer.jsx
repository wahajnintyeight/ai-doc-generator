import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

function fallbackContent(fileName) {
  return `# ${fileName}\n\nOpen or import a document to preview it here.`;
}

export function MarkdownViewer({
  content,
  fileName = 'API_DOCS.md',
  onContentChange,
  onSaveContent,
  isEditable = false,
  isSyncing = false,
}) {
  const initialMarkdown = useMemo(() => String(content || fallbackContent(fileName)), [content, fileName]);
  const [viewMode, setViewMode] = useState('preview');
  const [draftMarkdown, setDraftMarkdown] = useState(initialMarkdown);

  useEffect(() => {
    setDraftMarkdown(initialMarkdown);
  }, [initialMarkdown]);

  const markdown = draftMarkdown;
  const isSourceMode = viewMode === 'source';

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setDraftMarkdown(nextValue);
  };

  const handleSave = async () => {
    await onSaveContent?.(draftMarkdown);
    setViewMode('preview');
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0f141b]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Markdown Doc Viewer</p>
          <h1 className="mt-1 text-base font-semibold text-slate-100">{fileName}</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`rounded-none border px-2 py-1 uppercase tracking-[0.2em] transition-colors ${
              !isSourceMode ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setViewMode('source')}
            className={`rounded-none border px-2 py-1 uppercase tracking-[0.2em] transition-colors ${
              isSourceMode ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-400'
            }`}
            disabled={!isEditable}
            title={isEditable ? 'Edit markdown source' : 'Source editing is unavailable for this file'}
          >
            Code
          </button>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary">GFM</span>
          {isSyncing ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-primary"
            >
              Applying changes...
            </motion.span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <article className="mx-auto max-w-3xl rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-inset ring-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Document Preview</p>
              <p className="text-sm text-slate-300">Rendered markdown with GFM support</p>
            </div>
          </div>

          {isSourceMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                <span>Source Editor</span>
                {isEditable ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-none border border-primary/30 bg-primary/10 px-3 py-1 text-primary transition-colors hover:bg-primary/20"
                  >
                    Save Changes
                  </button>
                ) : null}
              </div>
              <div className={`relative overflow-hidden rounded-none border bg-[#0b1016] ${isSyncing ? 'border-primary/40' : 'border-white/10'}`}>
                {isSyncing ? (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-primary/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.08, 0.18, 0.08] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : null}
                <textarea
                  value={markdown}
                  onChange={handleChange}
                  spellCheck={false}
                  className={`relative min-h-[55vh] w-full resize-y rounded-none bg-transparent px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none transition-shadow focus:border-primary/30 ${
                    isSyncing ? 'shadow-[0_0_0_1px_rgba(6,182,212,0.35)]' : ''
                  }`}
                />
                {isSyncing ? (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-4 right-4 h-5 w-2 bg-primary"
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className={`space-y-4 ${isSyncing ? 'animate-pulse' : ''}`}>
              <MarkdownRenderer content={markdown} tone="viewer" />
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
