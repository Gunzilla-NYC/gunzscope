'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type TransitionStyle = 'A' | 'B' | 'C' | 'D';

/* ── Placeholder chart panels ──────────────────────────────────────── */
function PanelA() {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-3 border border-[var(--gs-purple)]/20 bg-[var(--gs-purple)]/[0.04]">
      <svg width="120" height="60" viewBox="0 0 120 60" className="text-[var(--gs-purple)]">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points="0,50 20,40 40,45 60,20 80,30 100,10 120,15" />
      </svg>
      <span className="font-mono text-label uppercase tracking-widest text-[var(--gs-purple)]">Timeline</span>
    </div>
  );
}

function PanelB() {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-3 border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04]">
      <svg width="120" height="60" viewBox="0 0 120 60" className="text-[var(--gs-lime)]">
        <circle cx="20" cy="40" r="4" fill="currentColor" opacity="0.6" />
        <circle cx="45" cy="20" r="6" fill="currentColor" opacity="0.8" />
        <circle cx="70" cy="35" r="5" fill="currentColor" opacity="0.5" />
        <circle cx="95" cy="15" r="7" fill="currentColor" />
        <circle cx="60" cy="50" r="3" fill="currentColor" opacity="0.4" />
      </svg>
      <span className="font-mono text-label uppercase tracking-widest text-[var(--gs-lime)]">Cost vs Value</span>
    </div>
  );
}

/* ── A: Fade through black ─────────────────────────────────────────── */
function TransitionA({ active }: { active: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={active ? 'a' : 'b'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
      >
        {active ? <PanelA /> : <PanelB />}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── B: Spring scale ───────────────────────────────────────────────── */
function TransitionB({ active }: { active: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={active ? 'a' : 'b'}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {active ? <PanelA /> : <PanelB />}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── C: Clip reveal (top→bottom wipe) ──────────────────────────────── */
function TransitionC({ active }: { active: boolean }) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={active ? 'a' : 'b'}
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(100% 0 0 0)' }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          {active ? <PanelA /> : <PanelB />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── D: Blur dissolve ──────────────────────────────────────────────── */
function TransitionD({ active }: { active: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={active ? 'a' : 'b'}
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(6px)' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {active ? <PanelA /> : <PanelB />}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Demo card wrapper ─────────────────────────────────────────────── */
function DemoCard({
  label,
  desc,
  active,
  onToggle,
  children,
}: {
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
        <div>
          <p className="font-mono text-sm font-semibold text-[var(--gs-white)]">{label}</p>
          <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-0.5">{desc}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={active ? undefined : onToggle}
            className={`font-mono text-label uppercase tracking-widest px-2 py-0.5 border transition-colors cursor-pointer ${
              active
                ? 'border-[var(--gs-purple)]/30 text-[var(--gs-purple)] bg-[var(--gs-purple)]/10'
                : 'border-transparent text-[var(--gs-gray-4)] hover:text-[var(--gs-gray-3)]'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={active ? onToggle : undefined}
            className={`font-mono text-label uppercase tracking-widest px-2 py-0.5 border transition-colors cursor-pointer ${
              !active
                ? 'border-[var(--gs-lime)]/30 text-[var(--gs-lime)] bg-[var(--gs-lime)]/10'
                : 'border-transparent text-[var(--gs-gray-4)] hover:text-[var(--gs-gray-3)]'
            }`}
          >
            Scatter
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── Main demo ─────────────────────────────────────────────────────── */
export default function TransitionDemo() {
  const [states, setStates] = useState({ A: true, B: true, C: true, D: true });

  const toggle = (key: TransitionStyle) =>
    setStates((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <section id="transitions" className="py-16 px-6 lg:px-10">
      <h2 className="font-display font-bold text-2xl sm:text-3xl uppercase tracking-tight mb-2">
        Chart Transitions
      </h2>
      <p className="font-body text-body text-[var(--gs-gray-3)] mb-8 max-w-[600px]">
        Click the tab buttons to compare each transition style. All use compositor&#8209;only properties where possible.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DemoCard
          label="A) Fade Through Black"
          desc="Sequential fade out → pause → fade in. Zero spatial movement."
          active={states.A}
          onToggle={() => toggle('A')}
        >
          <TransitionA active={states.A} />
        </DemoCard>

        <DemoCard
          label="B) Spring Scale"
          desc="Scale 0.96→1 with spring physics. Apple keynote feel."
          active={states.B}
          onToggle={() => toggle('B')}
        >
          <TransitionB active={states.B} />
        </DemoCard>

        <DemoCard
          label="C) Clip Reveal"
          desc="Top→bottom wipe via clipPath. Tactical HUD scan sweep."
          active={states.C}
          onToggle={() => toggle('C')}
        >
          <TransitionC active={states.C} />
        </DemoCard>

        <DemoCard
          label="D) Blur Dissolve"
          desc="Blur out 6px + fade, sharpen in. macOS/iOS feel."
          active={states.D}
          onToggle={() => toggle('D')}
        >
          <TransitionD active={states.D} />
        </DemoCard>
      </div>
    </section>
  );
}
