'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Lock, LogIn } from 'lucide-react';
import type { ProctoringHealthState } from '@/lib/proctoring/proctoringHealth';

interface SessionExpiredScreenProps {
  redirectPath?: string;
  onReturnDashboard?: () => void;
}

export const SessionExpiredScreen: React.FC<SessionExpiredScreenProps> = ({
  redirectPath,
  onReturnDashboard,
}) => {
  const loginUrl = redirectPath
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : '/login';

  return (
    <div className="min-h-dvh w-full overflow-y-auto flex flex-col items-center justify-center bg-canvas text-ink p-8">
      <div className="max-w-xl text-center p-8 rounded-2xl bg-surface border border-line shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-accent-amber flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-ink">Session Expired</h2>
        <p className="text-sm text-ink-muted">
          Your session has expired. Please <a href="/login" className="font-medium text-accent-cyan hoverunderline">log in</a> to continue your interview.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={loginUrl}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all text-center inline-flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Log In to Continue</span>
          </Link>
          {onReturnDashboard ? (
            <button
              onClick={onReturnDashboard}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink font-semibold text-xs transition-all text-center cursor-pointer"
            >
              Return to Dashboard
            </button>
          ) : (
            <Link
              href="/candidate/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-raised border border-line text-ink-muted hover:text-ink font-semibold text-xs transition-all text-center"
            >
              Return to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

interface InvalidSessionScreenProps {
  onReturnDashboard: () => void;
}

export const InvalidSessionScreen: React.FC<InvalidSessionScreenProps> = ({ onReturnDashboard }) => (
  <div className="min-h-dvh w-full overflow-y-auto flex flex-col items-center justify-center bg-canvas text-ink p-8">
    <div className="max-w-xl text-center p-8 rounded-2xl bg-surface border border-line shadow-2xl space-y-4 backdrop-blur-xl">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-accent-rose flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-ink">Invalid Interview Session</h2>
      <p className="text-sm text-ink-muted">
        The interview session ID provided in the URL is missing or invalid. Please check your interview invitations or return to your dashboard.
      </p>
      <button
        onClick={onReturnDashboard}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
      >
        Return to Candidate Dashboard
      </button>
    </div>
  </div>
);

interface MediaPreparingScreenProps {
  bindProctoringVideo: (video: HTMLVideoElement | null) => (() => void) | undefined;
  sessionMode: string;
  mediaStatus: string;
  onRetry: () => void;
}

export const MediaPreparingScreen: React.FC<MediaPreparingScreenProps> = ({
  bindProctoringVideo,
  sessionMode,
  mediaStatus,
  onRetry,
}) => (
  <div className="min-h-dvh w-full overflow-y-auto flex flex-col items-center justify-center bg-canvas text-ink p-8">
    <video ref={bindProctoringVideo} muted playsInline autoPlay className="hidden" aria-hidden="true" />
    <div className="max-w-xl text-center">
      <div className="text-lg font-black">Preparing your interview media…</div>
      {sessionMode === 'practice' ? (
        <p className="mt-3 text-sm text-ink-muted">Your camera and microphone are being prepared for this practice drill.</p>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          The realtime interview session must be connected through LiveKit before the interview can start. A local camera preview alone is not a connected interview.
        </p>
      )}
      {mediaStatus === 'error' && (
        <p className="mt-4 text-sm text-accent-rose">
          Media setup failed. Please check camera/microphone permissions and the LiveKit connection, then retry.
        </p>
      )}
      <button onClick={onRetry} className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950">
        Retry media setup
      </button>
    </div>
  </div>
);

interface ProctoringWaitingScreenProps {
  bindProctoringVideo: (video: HTMLVideoElement | null) => (() => void) | undefined;
  proctoringHealthState: ProctoringHealthState;
  proctoringUnavailable: boolean;
  onRetry: () => void;
}

export const ProctoringWaitingScreen: React.FC<ProctoringWaitingScreenProps> = ({
  bindProctoringVideo,
  proctoringHealthState,
  proctoringUnavailable,
  onRetry,
}) => (
  <div className="min-h-dvh w-full overflow-y-auto flex flex-col items-center justify-center bg-canvas text-ink p-8">
    <video ref={bindProctoringVideo} muted playsInline autoPlay className="hidden" aria-hidden="true" />
    <div className="max-w-xl text-center">
      <div className="text-lg font-black">Proctoring preflight is not ready</div>
      <p className="mt-3 text-sm text-ink-muted">
        Interview integrity monitoring is required. The interview cannot start until the proctoring detector is running on a live camera feed.
      </p>
      {proctoringHealthState === 'INITIALIZING' && (
        <p className="mt-4 text-sm text-accent-cyan font-mono">Initializing MediaPipe detector & WASM modules…</p>
      )}
      {proctoringHealthState === 'CAMERA_WAITING' && (
        <p className="mt-4 text-sm text-accent-amber font-mono">Detector ready. Waiting for live camera frames…</p>
      )}
      {proctoringHealthState === 'READY' && (
        <p className="mt-4 text-sm text-accent-amber font-mono">Camera feed live — analysing the first frames…</p>
      )}
      {proctoringUnavailable && (
        <p className="mt-4 text-sm text-accent-rose">
          Proctoring is not active. The detector or camera could not be started, so integrity checks cannot run.
        </p>
      )}
      {!proctoringUnavailable &&
        proctoringHealthState !== 'INITIALIZING' &&
        proctoringHealthState !== 'CAMERA_WAITING' &&
        proctoringHealthState !== 'READY' && (
          <p className="mt-4 text-sm text-ink-muted">Waiting for the first camera frames to be analysed…</p>
        )}
      <button onClick={onRetry} className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950">
        Retry proctoring setup
      </button>
    </div>
  </div>
);

interface FullscreenStartGateScreenProps {
  bindProctoringVideo: (video: HTMLVideoElement | null) => (() => void) | undefined;
  proctoringHealthState: ProctoringHealthState;
  facesObserved: number;
  apiError: string | null;
  onBeginInterview: () => void;
}

export const FullscreenStartGateScreen: React.FC<FullscreenStartGateScreenProps> = ({
  bindProctoringVideo,
  proctoringHealthState,
  facesObserved,
  apiError,
  onBeginInterview,
}) => (
  <div className="min-h-dvh w-full overflow-y-auto flex flex-col items-center justify-center bg-canvas text-ink p-8">
    <video ref={bindProctoringVideo} muted playsInline autoPlay className="hidden" aria-hidden="true" />
    <div className="max-w-xl text-center p-8 rounded-2xl bg-surface border border-line shadow-2xl space-y-4 backdrop-blur-xl">
      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-ink">Ready to begin in fullscreen</h2>
      <p className="text-sm text-ink-muted">
        This real interview requires fullscreen so integrity monitoring stays active for the whole session.
        Press Begin Interview and allow fullscreen when your browser asks.
      </p>
      <p className="text-xs font-mono text-ink-muted">
        Proctoring: {proctoringHealthState} &bull; faces observed: {facesObserved}
      </p>
      {apiError && <p className="text-sm text-accent-rose">{apiError}</p>}
      <button
        type="button"
        onClick={onBeginInterview}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
      >
        Begin Interview
      </button>
    </div>
  </div>
);
