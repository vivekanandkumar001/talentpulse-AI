'use client';

import React from 'react';
import { PracticeDrillItem } from '@/types/practice';
import { Sparkles, Zap, Target } from 'lucide-react';

interface PracticeHeroBannerProps {
  recommendedDrill?: PracticeDrillItem;
  onLaunchWarmup: (drill: PracticeDrillItem) => void;
}

export const PracticeHeroBanner: React.FC<PracticeHeroBannerProps> = ({
  recommendedDrill,
  onLaunchWarmup
}) => {
  // No invented fallback drill: if the backend has not recommended one yet we
  // render the pitch without a launch card rather than showing a fake drill
  // with a fabricated best score.
  const showLaunchStrip = Boolean(recommendedDrill);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface via-surface to-indigo-950/50 border border-line p-6 md:p-8 backdrop-blur-md shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* LEFT HERO INFO (COL SPAN 7) */}
      <div className="lg:col-span-7 space-y-3 relative z-10">
        <p className="text-caption font-mono uppercase text-accent-cyan text-xs tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent-cyan" />
          <span>SELF-PACED SKILL ACCELERATION</span>
        </p>
        <h1 className="text-heading font-bold text-ink text-2xl sm:text-3xl tracking-tight">
          Interview Practice & Skill Drills
        </h1>
        <p className="text-body text-ink text-sm leading-relaxed max-w-2xl">
          Sharpen your articulation with 5-to-15 minute targeted AI technical drills. Receive instant scoring and model answer breakdowns.
        </p>
      </div>

      {/* RIGHT QUICK-LAUNCH STRIP (COL SPAN 5) */}
      {showLaunchStrip && recommendedDrill && (
        <div className="lg:col-span-5 relative z-10">
          <div className="p-5 rounded-xl bg-inset/90 border border-line space-y-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="bg-amber-500/10 text-accent-amber border border-amber-500/30 text-caption font-semibold px-2.5 py-0.5 rounded-full text-[11px] inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent-amber" />
                <span>AI Recommended For You</span>
              </span>
              <span className="text-[11px] font-mono text-ink-muted">
                ~{recommendedDrill.estimatedMinutes} Mins
              </span>
            </div>

            <h3 className="text-body font-bold text-ink text-sm leading-snug">
              {recommendedDrill.title}
            </h3>

            {recommendedDrill.recommendedReason && (
              <p className="text-caption font-mono text-accent-cyan text-[11px]">
                {recommendedDrill.recommendedReason}
              </p>
            )}

            <p className="text-caption text-ink-muted text-xs line-clamp-2">
              {recommendedDrill.description}
            </p>

            <button
              type="button"
              onClick={() => onLaunchWarmup(recommendedDrill)}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer group"
            >
              <span>Launch {recommendedDrill.estimatedMinutes}-Min Warmup </span>
              </button>
          </div>
        </div>
      )}
    </section>
  );
};
