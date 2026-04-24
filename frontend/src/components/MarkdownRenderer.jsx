import { Hash, Info, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const toneClasses = {
  viewer: {
    text: 'text-slate-300',
    heading: 'text-white',
    accent: 'text-primary',
    border: 'border-white/10',
    muted: 'text-slate-400',
    codeText: 'text-primary/90',
    codeBackground: 'bg-black/40',
    inlineCodeBackground: 'bg-black/30',
    quoteBackground: 'bg-primary/10',
    tableHeader: 'bg-white/5',
  },
  assistant: {
    text: 'text-slate-200',
    heading: 'text-slate-100',
    accent: 'text-primary',
    border: 'border-white/10',
    muted: 'text-slate-400',
    codeText: 'text-primary/90',
    codeBackground: 'bg-black/40',
    inlineCodeBackground: 'bg-black/30',
    quoteBackground: 'bg-primary/10',
    tableHeader: 'bg-white/5',
  },
  user: {
    text: 'text-primary',
    heading: 'text-primary',
    accent: 'text-primary',
    border: 'border-primary/20',
    muted: 'text-primary/70',
    codeText: 'text-primary',
    codeBackground: 'bg-primary/10',
    inlineCodeBackground: 'bg-primary/10',
    quoteBackground: 'bg-primary/10',
    tableHeader: 'bg-primary/10',
  },
  error: {
    text: 'text-red-200',
    heading: 'text-red-100',
    accent: 'text-red-300',
    border: 'border-red-500/30',
    muted: 'text-red-300/70',
    codeText: 'text-red-100',
    codeBackground: 'bg-red-500/10',
    inlineCodeBackground: 'bg-red-500/10',
    quoteBackground: 'bg-red-500/10',
    tableHeader: 'bg-red-500/10',
  },
};

function getToneClasses(tone) {
  return toneClasses[tone] || toneClasses.viewer;
}

export function MarkdownRenderer({ content, className = '', tone = 'viewer' }) {
  const styles = getToneClasses(tone);

  return (
    <div className={`${styles.text} ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1({ children }) {
            return (
              <h1 className={`flex items-center gap-2 text-3xl font-semibold tracking-tight ${styles.heading}`}>
                <Hash className={`h-6 w-6 ${styles.accent}`} />
                <span>{children}</span>
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className={`mt-8 flex items-center gap-2 text-xl font-semibold ${styles.heading}`}>
                <Info className={`h-5 w-5 ${styles.accent}`} />
                <span>{children}</span>
              </h2>
            );
          },
          h3({ children }) {
            return <h3 className={`mt-6 text-lg font-semibold ${styles.heading}`}>{children}</h3>;
          },
          p({ children }) {
            return <p className="whitespace-pre-wrap leading-7">{children}</p>;
          },
          blockquote({ children }) {
            return (
              <blockquote className={`border-l-2 ${styles.border} ${styles.quoteBackground} px-4 py-3`}>
                <div className={`mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] ${styles.muted}`}>
                  <Quote className="h-4 w-4" />
                  Note
                </div>
                <div className="space-y-3 leading-7">{children}</div>
              </blockquote>
            );
          },
          ul({ children }) {
            return <ul className="ml-6 list-disc space-y-2 leading-7">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="ml-6 list-decimal space-y-2 leading-7">{children}</ol>;
          },
          li({ children }) {
            return <li className="marker:font-semibold">{children}</li>;
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={`underline decoration-dotted underline-offset-4 ${styles.accent}`}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre({ children }) {
            return <pre className={`overflow-x-auto rounded-none border ${styles.border} ${styles.codeBackground} text-sm leading-7`}>{children}</pre>;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');

            if (match) {
              return (
                <code
                  className={`block whitespace-pre px-4 py-4 font-mono text-sm leading-7 ${styles.codeText}`}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </code>
              );
            }

            return (
              <code
                className={`rounded-none border ${styles.border} ${styles.inlineCodeBackground} px-1.5 py-0.5 font-mono text-[0.9em] ${styles.codeText}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          hr() {
            return <hr className={`my-6 border-t ${styles.border}`} />;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className={`w-full border-collapse border ${styles.border} text-left text-sm`}>
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className={styles.tableHeader}>{children}</thead>;
          },
          th({ children }) {
            return <th className={`border ${styles.border} px-3 py-2 font-semibold ${styles.heading}`}>{children}</th>;
          },
          td({ children }) {
            return <td className={`border ${styles.border} px-3 py-2 align-top`}>{children}</td>;
          },
          tr({ children }) {
            return <tr className="align-top">{children}</tr>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}