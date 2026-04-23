import { Bot, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PromptComposer } from './PromptComposer';

export function LandingScreen({
  onStartConversation,
  isGenerating,
  onOpenSettings,
}) {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#07090d] px-6 py-16 text-slate-100 selection:bg-cyan-900/30">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-900/20 blur-[120px]"></div>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl"
      >
        

        {/* Header Section */}
        <header className="mb-16 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_50px_rgba(34,211,238,0.15)]"
          >
            <Bot className="h-10 w-10 text-cyan-400" strokeWidth={1.5} />
          </motion.div>
          <h1 className="mb-6 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-6xl font-extrabold leading-[1.1] tracking-tight text-transparent sm:text-7xl">
            What do you want <br /> to build today?
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-400">
            A specialized document agent for project architecture, API documentation, and technical specs.
          </p>
        </header>

        {/* Form Container */}
        <div className="w-full">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl">
            <PromptComposer
              disabled={isGenerating}
              onSubmit={onStartConversation}
              placeholder="Describe what you want to generate (e.g. 'Standard library documentation for a Go CLI')"
            />
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full border border-cyan-500/20 bg-cyan-500 animate-pulse"></span>
            Ready for synthesis
          </p>
        </footer>
      </motion.main>
    </div>
  );
}

