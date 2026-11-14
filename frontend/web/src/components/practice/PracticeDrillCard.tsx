'use client';

import React from 'react';
import { PracticeDrillItem, DrillDifficulty } from '@/types/practice';
import { Clock, Play, Award } from 'lucide-react';

interface PracticeDrillCardProps {
  drill: PracticeDrillItem;
  onStartDrill: (drill: PracticeDrillItem) => void;
}

export const PracticeDrillCard: React.FC<PracticeDrillCardProps> = ({ drill, onStartDrill }) => {
  const getDifficultyChip = (difficulty: DrillDifficulty) => {
    switch (difficulty) {
      case 'BEGINNER':
        return { label: 'Beginner', style: 'bg-emerald-500/10 text-accent-emerald border-emerald-500/30' };
      case 'INTERMEDIATE':
        return { label: 'Intermediate', style: 'bg-cyan-500/10 text-accent-cyan border-cyan-500/30' };
      case 'ADVANCED':
        return { label: 'Advanced', style: 'bg-rose-500/10 text-accent-rose border-rose-500/30' };
      default:
        return { label: difficulty, style: 'bg-surface-2 text-ink border-line-strong' };
    }
  };

  const diffChip = getDifficultyChip(drill.difficulty);

  return (
    <div className="rounded-2xl bg-surface border border-line p-6 flex flex-col justify-between space-y-4 backdrop-blur-md hover:border-line-strong transition-all shadow-xl group">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <span className="text-caption font-mono text-accent-cyan text-xs font-semibold uppercase tracking-wider">
          {drill.category.replace('_', ' ')}
        </span>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${diffChip.style}`}>
          {diffChip.label}
        </span>
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <h3 className="text-body font-bold text-ink text-base group-hover:text-accent-cyan transition-colors leading-snug">
          {drill.title}
        </h3>
        <p className="text-body text-ink-muted text-xs leading-relaxed line-clamp-2">
          {drill.description}
        </p>

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {drill.coreSkillsTested.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded bg-inset border border-line text-ink-muted text-[10px] font-mono"
            >
              #{skill}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-caption text-ink-muted text-xs flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-ink-muted" />
            <span>~{drill.estimatedMinutes} Mins</span>
          </p>
          <p className="text-caption font-mono text-[11px]">
            {drill.userBestScore !== undefined ? (
              <span className="text-accent-emerald font-bold">Best: {drill.userBestScore}/100</span>
            ) : (
              <span className="text-ink-muted">Not Attempted Yet</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onStartDrill(drill)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface hover:bg-cyan-500/10 border border-line-strong hover:border-cyan-500/30 text-ink hover:text-accent-cyan text-xs font-semibold transition-all cursor-pointer group-hover:scale-[1.02]"
        >
          <span>Start Drill </span>
        </button>
      </div>
    </div>
  );
};
