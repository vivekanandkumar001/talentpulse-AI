'use client';

import React, { useState } from 'react';
import { Sparkles, ChevronUp, ChevronDown, User, Bot, History } from 'lucide-react';

export type CaptionSpeaker = string;

export interface CaptionEntry {
  id: string;
  speaker: CaptionSpeaker;
  text: string;
  timestamp?: string;
}

interface LiveClosedCaptionsProps {
  subtitles: CaptionEntry[];
}

const DEFAULT_INTERVIEWER_NAME = 'Sarah Chen';

export const LiveClosedCaptions: React.FC<LiveClosedCaptionsProps> = ({ subtitles }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // No invented dialogue when there is nothing to show yet.
  const activeSubtitle = subtitles[subtitles.length - 1];
  const isCandidateSpeaking = activeSubtitle?.speaker === 'You' || activeSubtitle?.speaker === 'Candidate';
  const speakerDisplayName = activeSubtitle?.speaker
    ? (activeSubtitle.speaker === 'AI Interviewer' ? DEFAULT_INTERVIEWER_NAME : activeSubtitle.speaker)
    : DEFAULT_INTERVIEWER_NAME;

  return (
    <div className="w-full rounded-2xl bg-surface border border-line backdrop-blur-md overflow-hidden shadow-2xl transition-all">
      
      {/* HEADER / SINGLE LINE LIVE STRIP */}
      <div className="p-3 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Speaker Tag */}
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium shrink-0 flex items-center gap-1.5 ${
              !isCandidateSpeaking
                ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/30'
                : 'bg-indigo-500/15 text-accent-indigo border border-indigo-500/30'
            }`}
          >
            {!isCandidateSpeaking ? (
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            ) : (
              <User className="w-3.5 h-3.5 text-accent-indigo" />
            )}
            <span>{speakerDisplayName}</span>
          </span>

          {/* Subtitle Text */}
          <p className="text-xs text-ink font-medium truncate flex-1 leading-tight">
            {activeSubtitle ? `“${activeSubtitle.text}”` : 'Waiting for interviewer…'}
          </p>
        </div>

        {/* Expand / Collapse Transcript History Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-inset border border-line hover:border-line-strong text-ink hover:text-accent-cyan text-xs font-mono transition-colors cursor-pointer shrink-0"
        >
          <History className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Collapse' : 'Full Transcript'}</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* EXPANDED FULL TRANSCRIPT DRAWER */}
      {isExpanded && (
        <div className="border-t border-line p-4 bg-inset max-h-48 overflow-y-auto space-y-2.5 animate-fadeIn">
          {subtitles.map((sub) => (
            <div key={sub.id} className="flex items-start gap-2.5 text-xs">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono shrink-0 font-medium ${
                  sub.speaker !== 'You' && sub.speaker !== 'Candidate'
                    ? 'text-accent-cyan bg-cyan-500/10'
                    : 'text-accent-indigo bg-indigo-500/10'
                }`}
              >
                {sub.speaker}:
              </span>
              <p className="text-ink flex-1 leading-relaxed">{sub.text}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
