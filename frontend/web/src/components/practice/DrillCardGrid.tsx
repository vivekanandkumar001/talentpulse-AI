'use client';

import React from 'react';
import { PracticeDrillItem, DrillDifficulty } from '@/types/practice';
import { Clock, Play, Award, Zap, CheckCircle2, Sparkles } from 'lucide-react';

interface DrillCardGridProps {
  drills: PracticeDrillItem[];
  onStartDrill: (drill: PracticeDrillItem) => void;
}

export const DrillCardGrid: React.FC<DrillCardGridProps> = ({ drills, onStartDrill }) => {
  const getDifficultyBadge = (difficulty: DrillDifficulty) => {
    switch (difficulty) {
      case 'BEGINNER':
        return { label: 'Beginner', bg: 'bg-emerald-500/10 border-emerald-500/30 text-accent-emerald' };
      case 'INTERMEDIATE':
        return { label: 'Intermediate', bg: 'bg-cyan-500/10 border-cyan-500/30 text-accent-cyan' };
      case 'ADVANCED':
        return { label: 'Advanced', bg: 'bg-indigo-500/10 border-indigo-500/30 text-accent-indigo' };
      default:
        return { label: difficulty, bg: 'bg-surface-2 text-ink border-line-strong' };
    }
  };

  if (drills.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-surface border border-line space-y-3">
        <p className="text-ink-muted text-sm">No practice drills found matching your active filter criteria.</p>
        <button
          type="button"
          onClick={() => window.location.href = '/candidate/practice'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-accent-indigo font-semibold text-xs transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" /> View All Drills
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drills.map((drill, idx) => {
        const diffBadge = getDifficultyBadge(drill.difficulty);
        return (
          <div
            key={`${drill.id}-${idx}`}
            className="rounded-2xl bg-surface border border-line p-6 flex flex-col justify-between space-y-4 backdrop-blur-md hover:border-line-strong transition-all shadow-xl group"
          >
            <div className="space-y-3">
              {/* Header Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${diffBadge.bg}`}>
                  {diffBadge.label}
                </span>

                <span className="text-xs text-ink-muted font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-ink-muted" />
                  {drill.estimatedMinutes} mins
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-bold text-ink group-hover:text-accent-cyan transition-colors leading-snug">
                  {drill.title}
                </h3>
                <p className="text-xs text-ink-muted mt-1.5 leading-relaxed line-clamp-3">
                  {drill.description}
                </p>
              </div>

              {/* Starter Question Preview Box */}
              <div className="p-3 rounded-xl bg-inset/80 space-y-1">
                <span className="text-[10px] font-mono text-accent-cyan font-bold uppercase tracking-wider">
                  Sample Starter Scenario:
                </span>
                <p className="text-[11px] text-ink italic line-clamp-2">
                  &quot;{drill.sampleStarterQuestion}&quot;
                </p>
              </div>

              {/* Core Skills Tags */}
              <div className="flex flex-wrap gap-1.5">
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

            {/* Bottom Progress & Action Row */}
            <div className="pt-3 border-t border-line space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted font-mono text-[11px]">
                  {drill.totalAttempts > 0 ? `${drill.totalAttempts} Attempts` : 'Not Attempted'}
                </span>
                {drill.userBestScore !== undefined && (
                  <span className="font-mono text-accent-emerald font-bold">
                    Best: {drill.userBestScore}%
                  </span>
                )}
              </div>

              {drill.userBestScore !== undefined && (
                <div className="w-full h-1.5 rounded-full bg-inset border border-line overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                    style={{ width: `${drill.userBestScore}%` }}
                  ></div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onStartDrill(drill)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface hover:bg-surface-2 border border-line-strong text-ink font-medium text-xs transition-all cursor-pointer group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 group-hover:text-accent-cyan"
              >
                <Play className="w-3.5 h-3.5 text-accent-cyan fill-cyan-400" />
                <span>Start Practice Drill</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};