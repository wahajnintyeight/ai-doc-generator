import { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MessageActions({ content, onRegenerate, canRegenerate = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1"
    >
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="group relative rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-cyan-400"
        title={copied ? 'Copied!' : 'Copy message'}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Copy className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Regenerate Button */}
      {canRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="group relative rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-cyan-400"
          title="Regenerate response"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
