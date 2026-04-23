import { FileCode2, Hash, Info, Quote, Sparkles } from 'lucide-react';

function fallbackContent(fileName) {
  return `# ${fileName}\n\nOpen or import a document to preview it here.`;
}

function renderInline(text) {
  return String(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function parseMarkdown(content) {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: 'code', value: codeLines.join('\n') });
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', value: line.slice(2) });
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', value: line.slice(3) });
      index += 1;
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*] /.test(lines[index])) {
        items.push(lines[index].replace(/^[-*] /, ''));
        index += 1;
      }
      blocks.push({ type: 'list', value: items });
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ type: 'quote', value: quoteLines.join('\n') });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(# |## |```|[-*] |> )/.test(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'p', value: paragraphLines.join(' ') });
  }

  return blocks;
}

function MarkdownBlocks({ content }) {
  const blocks = parseMarkdown(content);

  return blocks.map((block, index) => {
    if (block.type === 'h1') {
      return <h1 key={index} className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-white"><Hash className="h-6 w-6 text-cyan-300" /><span dangerouslySetInnerHTML={{ __html: renderInline(block.value) }} /></h1>;
    }

    if (block.type === 'h2') {
      return <h2 key={index} className="mt-8 flex items-center gap-2 text-xl font-semibold text-slate-100"><Info className="h-5 w-5 text-cyan-300/80" /><span dangerouslySetInnerHTML={{ __html: renderInline(block.value) }} /></h2>;
    }

    if (block.type === 'quote') {
      return <blockquote key={index} className="border-l-2 border-cyan-400/40 bg-cyan-500/8 px-4 py-3 text-slate-200"><div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cyan-200/80"><Quote className="h-4 w-4" />Note</div><div dangerouslySetInnerHTML={{ __html: renderInline(block.value) }} /></blockquote>;
    }

    if (block.type === 'list') {
      return <ul key={index} className="ml-6 list-disc space-y-2 text-slate-300">{block.value.map((item, itemIndex) => <li key={itemIndex} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />)}</ul>;
    }

    if (block.type === 'code') {
      return <pre key={index} className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-sm leading-7 text-cyan-100"><code>{block.value}</code></pre>;
    }

    return <p key={index} className="leading-7 text-slate-300" dangerouslySetInnerHTML={{ __html: renderInline(block.value) }} />;
  });
}

export function MarkdownViewer({ content, fileName = 'API_DOCS.md' }) {
  const markdown = String(content || fallbackContent(fileName));

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0f141b]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Markdown Doc Viewer</p>
          <h1 className="mt-1 text-base font-semibold text-slate-100">{fileName}</h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Rendered</span>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-200">GFM</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <article className="mx-auto max-w-3xl rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="rounded-2xl bg-cyan-500/10 p-2 text-cyan-200 ring-1 ring-inset ring-cyan-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Document Preview</p>
              <p className="text-sm text-slate-300">Rendered markdown with GFM support</p>
            </div>
          </div>

          <article className="space-y-4">
            <MarkdownBlocks content={markdown} />
          </article>
        </article>
      </div>
    </section>
  );
}
