'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ShieldCheck, AlertTriangle, PhoneOff, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

interface InterviewRoomHeaderProps {
  sessionId: string;
  currentStageIndex: number;
  stages: string[];
  remainingSeconds: number | null;
  proctoringStatus: 'secure' | 'face_warning' | 'tab_warning';
  proctoringHealthState?:
    | 'INITIALIZING'
    | 'CAMERA_WAITING'
    | 'READY'
    | 'DETECTING'
    | 'NO_FACE'
    | 'MULTIPLE_FACES'
    | 'ERROR';
  faceCount?: number;
  mediaSource?: 'local' | 'phone' | 'none';
  onEndSessionClick: () => void;
  isConcluding?: boolean;
}

export const InterviewRoomHeader: React.FC<InterviewRoomHeaderProps> = ({
  sessionId,
  currentStageIndex,
  stages,
  remainingSeconds,
  proctoringStatus,
  proctoringHealthState,
  faceCount,
  mediaSource = 'local',
  onEndSessionClick,
  isConcluding = false,
}) => {
  const [elapsedRecSeconds, setElapsedRecSeconds] = useState<number>(0);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  // Recording timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedRecSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(Math.max(0, totalSec) / 60);
    const secs = Math.max(0, totalSec) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds !== null && remainingSeconds < 5 * 60;

  return (
    <header
      data-session-id={sessionId}
      className="sticky top-0 z-50 shrink-0 min-h-14 w-full max-w-full bg-surface/95 border-b border-line px-2.5 sm:px-4 lg:px-6 py-2 backdrop-blur-md select-none flex flex-col justify-center overflow-x-clip"
    >
      <div className="w-full max-w-full flex items-center justify-between gap-1.5 sm:gap-3 lg:gap-4">
        {/* LEFT: BRAND & REC BEACON */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 whitespace-nowrap">
          <BrandLogo href="/candidate/dashboard" hideTextOnMobile={true} />

          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-accent-rose font-mono text-[10px] sm:text-xs shrink-0 whitespace-nowrap">
            <Circle className="w-2 h-2 fill-rose-500 animate-pulse text-rose-500 shrink-0" />
            <span className="whitespace-nowrap font-medium">
              <span className="hidden sm:inline">REC </span>
              {formatTimer(elapsedRecSeconds)}
            </span>
          </div>
        </div>

        {/* CENTER: RESPONSIVE STAGE STEPPER (Desktop/Tablet >= md) */}
        {stages && stages.length > 0 && (
          <div className="min-w-0 flex-1 hidden md:flex items-center justify-center px-2">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-xl bg-inset border border-line text-xs font-mono shadow-xs max-w-full overflow-hidden"
              title={stages.map((s, i) => `${i + 1}. ${s}`).join(' → ')}
            >
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-accent-cyan font-bold text-[11px] border border-cyan-500/30 shrink-0">
                Stage {Math.min(currentStageIndex + 1, stages.length)}/{stages.length}
              </span>

              <span className="font-semibold text-accent-cyan truncate max-w-[160px] sm:max-w-[220px] lg:max-w-[280px] xl:max-w-[360px]">
                {stages[currentStageIndex] || 'Interview Stage'}
              </span>

              {stages.length > 1 && (
                <div className="hidden lg:flex items-center gap-1 pl-1.5 border-l border-line/60 shrink-0">
                  {stages.map((stageName, idx) => {
                    const isActive = idx === currentStageIndex;
                    const isPassed = idx < currentStageIndex;
                    return (
                      <span
                        key={idx}
                        title={`Stage ${idx + 1}: ${stageName} (${isActive ? 'Current' : isPassed ? 'Completed' : 'Upcoming'})`}
                        className={`h-1.5 rounded-full transition-all ${
                          isActive
                            ? 'w-4 bg-cyan-400'
                            : isPassed
                            ? 'w-1.5 bg-emerald-400'
                            : 'w-1.5 bg-line'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT: PROCTORING INTEGRITY, TIMER & ACTION BUTTONS */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 whitespace-nowrap ml-auto">
          {/* Proctoring Status Pill */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors shrink-0 whitespace-nowrap ${
              proctoringStatus === 'tab_warning'
                ? 'bg-rose-500/10 border-rose-500/30 text-accent-rose'
                : proctoringHealthState === 'DETECTING'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-accent-emerald'
                : proctoringHealthState === 'CAMERA_WAITING'
                ? 'bg-amber-500/10 border-amber-500/30 text-accent-amber'
                : proctoringHealthState === 'NO_FACE'
                ? 'bg-amber-500/10 border-amber-500/30 text-accent-amber'
                : proctoringHealthState === 'MULTIPLE_FACES'
                ? 'bg-rose-500/10 border-rose-500/30 text-accent-rose'
                : proctoringHealthState === 'ERROR'
                ? 'bg-rose-500/10 border-rose-500/30 text-accent-rose'
                : 'bg-indigo-500/10 border-indigo-500/30 text-accent-indigo'
            }`}
            title={
              proctoringStatus === 'tab_warning'
                ? 'Focus Warning'
                : proctoringHealthState === 'DETECTING'
                ? 'Proctoring Active — Face Detected'
                : proctoringHealthState === 'NO_FACE'
                ? 'No Face Detected'
                : proctoringHealthState === 'MULTIPLE_FACES'
                ? 'Multiple Faces Detected'
                : proctoringHealthState === 'CAMERA_WAITING'
                ? 'Waiting for Camera Frames'
                : proctoringHealthState === 'READY'
                ? 'Camera Pipeline Ready — Awaiting First Classification'
                : proctoringHealthState === 'INITIALIZING'
                ? 'Initializing Proctoring Detector'
                : 'Proctoring Status'
            }
          >
            {proctoringStatus === 'tab_warning' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" />
                <span className="font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">Focus Warning</span>
                  <span className="inline sm:hidden text-[10px]">Warning</span>
                </span>
              </>
            ) : proctoringHealthState === 'DETECTING' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald shrink-0" />
                <span className="hidden md:inline font-medium whitespace-nowrap">Proctoring Active</span>
              </>
            ) : proctoringHealthState === 'NO_FACE' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0" />
                <span className="hidden sm:inline font-medium whitespace-nowrap">No Face</span>
              </>
            ) : proctoringHealthState === 'MULTIPLE_FACES' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" />
                <span className="font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">Multiple Faces ({faceCount ?? '>1'})</span>
                  <span className="inline sm:hidden text-[10px]">{faceCount ?? '>1'} Faces</span>
                </span>
              </>
            ) : proctoringHealthState === 'INITIALIZING' ? (
              <>
                <Circle className="w-2.5 h-2.5 fill-indigo-400 animate-pulse text-indigo-400 shrink-0" />
                <span className="hidden sm:inline font-medium whitespace-nowrap">Initializing…</span>
              </>
            ) : proctoringHealthState === 'CAMERA_WAITING' ? (
              <>
                <Circle className="w-2.5 h-2.5 fill-amber-400 animate-pulse text-amber-400 shrink-0" />
                <span className="hidden sm:inline font-medium whitespace-nowrap">Camera Waiting…</span>
              </>
            ) : proctoringHealthState === 'READY' ? (
              <>
                <Circle className="w-2.5 h-2.5 fill-cyan-400 animate-pulse text-cyan-400 shrink-0" />
                <span className="hidden sm:inline font-medium whitespace-nowrap">Camera Ready</span>
              </>
            ) : proctoringHealthState === 'ERROR' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-accent-rose shrink-0" />
                <span className="hidden sm:inline font-medium whitespace-nowrap">Detector Error</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald shrink-0" />
                <span className="hidden md:inline font-medium whitespace-nowrap">Proctoring Active</span>
              </>
            )}
          </div>

          {/* Remaining Time Counter */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-colors shrink-0 whitespace-nowrap ${
              isLowTime
                ? 'bg-amber-500/15 border-amber-500/40 text-accent-amber animate-pulse'
                : 'bg-inset border-line text-ink'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
            <span className="whitespace-nowrap">{remainingSeconds === null ? '--:--' : formatTimer(remainingSeconds)}</span>
          </div>

          {/* Diagnostics Toggle (Desktop Only >= xl) */}
          <button
            type="button"
            onClick={() => setShowTechDetails((prev) => !prev)}
            aria-label="Toggle technical details"
            className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-inset border border-line text-[11px] text-ink-muted hover:text-ink transition-colors shrink-0 whitespace-nowrap cursor-pointer"
          >
            <span className="whitespace-nowrap">Tech</span>
            {showTechDetails ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
          </button>

          {/* End Session Button */}
          <button
            type="button"
            disabled={isConcluding}
            onClick={onEndSessionClick}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            title="End Session"
          >
            <PhoneOff className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{isConcluding ? 'Ending...' : 'End Session'}</span>
            <span className="hidden sm:inline md:hidden whitespace-nowrap">{isConcluding ? 'End' : 'End'}</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE DIAGNOSTICS SECTION */}
      {showTechDetails && (
        <div className="w-full mt-2 pt-2 border-t border-line flex flex-wrap items-center justify-between text-[11px] font-mono text-ink-muted gap-2 shrink-0">
          <span>Session ID: {sessionId ? `${sessionId.substring(0, 8)}...` : 'N/A'}</span>
          <span>Media Source: {mediaSource === 'phone' ? 'Smartphone Companion' : 'Webcam'}</span>
          <span>Transport: LiveKit WebRTC</span>
        </div>
      )}
    </header>
  );
};
