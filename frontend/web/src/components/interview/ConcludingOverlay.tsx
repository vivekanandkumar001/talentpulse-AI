'use client';

import React from 'react';
import { RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ConcludingOverlayProps {
  isConcluding: boolean;
  concludingMessage: string;
}

export const ConcludingOverlay: React.FC<ConcludingOverlayProps> = ({
  isConcluding,
  concludingMessage,
}) => {
  if (!isConcluding) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl space-y-6 text-center animate-fadeIn select-none">
      <div className="w-20 h-20 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-inverse-cyan shadow-2xl shadow-cyan-500/20">
        <Sparkles className="w-10 h-10 text-cyan-400 animate-pulse" />
      </div>

      <div className="space-y-3 max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-inverse-cyan text-xs font-mono font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Interview Concluded</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Thank You!</h2>
        <p className="text-sm text-cyan-300 font-medium">
          {concludingMessage || 'Thank you for your time and responses! Generating your scorecard...'}
        </p>
        <div className="flex items-center justify-center gap-2 pt-3 text-xs font-mono text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Aggregating technical marks, evaluation metrics & scorecard report...</span>
        </div>
      </div>
    </div>
  );
};
