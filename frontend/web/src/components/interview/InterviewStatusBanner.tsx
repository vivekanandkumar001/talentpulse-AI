'use client';

import React from 'react';
import { Volume2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

export interface InterviewStatusBannerProps {
  proctoringAlertBanner: string | null;
  proctoringWarningCount: number;
  apiError: string | null;
  audioUnlocked: boolean;
  retryTarget: string | null;
  onEnableInterviewerAudio: () => void;
  onRetryStage: () => void;
  onRetryPreflight: () => void;
  remainingSeconds?: number | null;
  questionRemainingSeconds?: number | null;
}

export const InterviewStatusBanner: React.FC<InterviewStatusBannerProps> = ({
  proctoringAlertBanner,
  proctoringWarningCount,
  apiError,
  audioUnlocked,
  retryTarget,
  onEnableInterviewerAudio,
  onRetryStage,
  onRetryPreflight,
  remainingSeconds = null,
  questionRemainingSeconds = null,
}) => {
  if (!proctoringAlertBanner && !apiError && audioUnlocked && remainingSeconds === null && questionRemainingSeconds === null) {
    return null;
  }

  return (
    <div className="w-full shrink-0 border-b border-line bg-surface/95 px-3 py-1.5 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {!audioUnlocked ? (
            <span className="text-accent-amber flex items-center gap-1.5 font-medium">
              <Volume2 className="w-4 h-4 text-accent-amber shrink-0" aria-hidden="true" />
              Interviewer audio is waiting for browser audio unlock
            </span>
          ) : ((
            <span className="text-accent-emerald flex items-center gap-1.5 font-medium">
              <Volume2 className="w-4 h-4 text-accent-emerald shrink-0" aria-hidden="true" />
              Interviewer audio ready
            </span>
          ))}

          {proctoringAlertBanner && (
            <span className="text-accent-amber flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0" aria-hidden="true" />
              {proctoringWarningCount > 0 && <strong>[{proctoringWarningCount}]</strong>}
              {proctoringAlertBanner}
            </span>
          )}

          {apiError && (
            <span className="text-accent-rose flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-accent-rose shrink-0" aria-hidden="true" />
              {apiError}
            </span>
          )}

          {remainingSeconds !== null && remainingSeconds >= 0 && (
            <span className="text-accent-cyan flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" aria-hidden="true" />
              {remainingSeconds > 60 ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}` : remainingSeconds} min interview remaining
            </span>
          )}

          {questionRemainingSeconds !== null && questionRemainingSeconds >= 0 && (
            <span className="text-accent-rose flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" aria-hidden="true" />
              {questionRemainingSeconds > 60 ? `${String(Math.floor(questionRemainingSeconds / 60)).padStart(2, '0')}:${String(questionRemainingSeconds % 60).padStart(2, '0')}` : questionRemainingSeconds} min question remaining
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!audioUnlocked && (
            <button
              type="button"
              aria-label="Enable interviewer audio voice"
              onClick={onEnableInterviewerAudio}
              className="px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-accent-indigo font-bold text-xs transition-all cursor-pointer"
            >
              Enable Interviewer Voice
            </button>
          )}
          {apiError && (
            <button
              type="button"
              aria-label="Retry failed interview stage"
              onClick={retryTarget ? onRetryStage : onRetryPreflight}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
