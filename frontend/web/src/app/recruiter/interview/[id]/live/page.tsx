'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';
import {
  fetchRecruiterLiveToken,
  isValidSessionId,
  apiFetch,
  type RecruiterLiveTokenResponse,
} from '@/lib/api';
import { AIAvatarViewport, type AIState } from '@/components/interview/AIAvatarViewport';
import {
  User,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Clock,
  FileText,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Headphones,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function RecruiterLiveMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || '';
  const sessionId = isValidSessionId(rawId) ? rawId : '';

  // Room & Stream States
  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [error, setError] = useState<string | null>(sessionId ? null : 'Invalid or missing interview session ID.');
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Session & Metadata
  const [sessionData, setSessionData] = useState<{
    status: string;
    jobTitle?: string;
    companyName?: string;
    candidateName?: string;
    candidateEmail?: string;
    currentStage?: string;
    currentQuestion?: string;
    turnIndex?: number;
    totalTurns?: number;
    elapsedSeconds?: number;
    proctoringStatus?: string;
    history?: Array<{ turn_index: number; question: string; answer?: string | null; stage: string }>;
  } | null>(null);

  // LiveKit Connection
  const [roomState, setRoomState] = useState<string>('connecting');
  const [hasCandidateVideo, setHasCandidateVideo] = useState<boolean>(false);
  const [hasCandidateAudio, setHasCandidateAudio] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [aiState, setAiState] = useState<AIState>('listening');
  const [elapsedTimer, setElapsedTimer] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const roomRef = useRef<Room | null>(null);
  const candidateVideoRef = useRef<HTMLVideoElement>(null);
  const candidateAudioRef = useRef<HTMLAudioElement>(null);
  const activeVideoTrackRef = useRef<RemoteTrack | null>(null);
  const activeAudioTrackRef = useRef<RemoteTrack | null>(null);
  const monitorContainerRef = useRef<HTMLDivElement>(null);

  // 1. Initial Authentication & LiveKit Connection Setup
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isSubscribed = true;

    async function initializeMonitor() {
      try {
        setLoading(true);
        setError(null);

        // Fetch Room Metadata & State first
        const [roomDataRes, stateRes] = await Promise.all([
          apiFetch(`/api/v1/interview-sessions/${sessionId}/room-data`, { credentials: 'include' }),
          apiFetch(`/api/interview/${sessionId}/state`, { credentials: 'include' }).catch(() => null),
        ]);

        if (!roomDataRes.ok) {
          if (roomDataRes.status === 404 || roomDataRes.status === 403) {
            setErrorCode(roomDataRes.status);
            setError(roomDataRes.status === 403
              ? 'Access denied. You do not have permission to monitor this organization interview.'
              : 'Interview session not found.');
            setLoading(false);
            return;
          }
        }

        const roomInfo = roomDataRes.ok ? await roomDataRes.json() : {};
        const stateInfo = stateRes && stateRes.ok ? await stateRes.json() : null;

        if (!isSubscribed) return;

        const currentTurn = stateInfo?.turn_index ?? 0;
        const total = stateInfo?.total_turns ?? 5;
        const qText = stateInfo?.question || roomInfo?.activeProblem?.title || 'Initial Technical Introduction';

        setSessionData({
          status: stateInfo?.status || roomInfo?.status || 'in_progress',
          jobTitle: roomInfo?.jobTitle || 'Technical Role',
          companyName: roomInfo?.companyName || 'Progeni Atlas Org',
          candidateName: roomInfo?.candidateName || 'Candidate',
          candidateEmail: roomInfo?.candidateEmail,
          currentStage: stateInfo?.current_stage || roomInfo?.currentStage || 'Intro',
          currentQuestion: qText,
          turnIndex: currentTurn,
          totalTurns: total,
          elapsedSeconds: roomInfo?.elapsedSeconds || 0,
          proctoringStatus: stateInfo?.proctoring_status || 'active',
          history: stateInfo?.history || [],
        });

        if (roomInfo?.elapsedSeconds) {
          setElapsedTimer(roomInfo.elapsedSeconds);
        }

        // Map AI Lifecycle State to AIState
        const lState = (stateInfo?.state || '').toUpperCase();
        if (lState.includes('SPEAK')) setAiState('speaking');
        else if (lState.includes('EVALUAT')) setAiState('evaluating');
        else if (lState.includes('TRANSCRIB')) setAiState('transcribing');
        else if (lState.includes('LISTEN')) setAiState('listening');
        else setAiState('idle');

        // Request Recruiter LiveKit Token
        let tokenData: RecruiterLiveTokenResponse;
        try {
          tokenData = await fetchRecruiterLiveToken(sessionId);
        } catch (tokenErr: unknown) {
          const errStatus = (tokenErr as { status_code?: number })?.status_code;
          if (errStatus === 404 || errStatus === 403) {
            setErrorCode(errStatus);
            setError('Unauthorized or session not accessible.');
            setLoading(false);
            return;
          }
          throw tokenErr;
        }

        if (!isSubscribed) return;

        // Connect to LiveKit Room as silent observer
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.on(RoomEvent.Connected, () => {
          if (!isSubscribed) return;
          setRoomState('connected');
        });

        room.on(RoomEvent.Reconnecting, () => {
          if (!isSubscribed) return;
          setRoomState('reconnecting');
        });

        room.on(RoomEvent.Reconnected, () => {
          if (!isSubscribed) return;
          setRoomState('connected');
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          if (!isSubscribed) return;
          setRoomState('disconnected');
          setHasCandidateVideo(false);
          setHasCandidateAudio(false);
        });

        // Track Subscription handler
        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (!isSubscribed) return;

            if (track.kind === Track.Kind.Video) {
              activeVideoTrackRef.current = track;
              if (candidateVideoRef.current) {
                track.attach(candidateVideoRef.current);
                setHasCandidateVideo(true);
              }
            } else if (track.kind === Track.Kind.Audio) {
              activeAudioTrackRef.current = track;
              if (candidateAudioRef.current) {
                track.attach(candidateAudioRef.current);
                candidateAudioRef.current.volume = audioVolume;
                candidateAudioRef.current.muted = isAudioMuted;
                setHasCandidateAudio(true);
              }
            }
          }
        );

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (!isSubscribed) return;
          track.detach();
          if (track.kind === Track.Kind.Video) {
            activeVideoTrackRef.current = null;
            setHasCandidateVideo(false);
          } else if (track.kind === Track.Kind.Audio) {
            activeAudioTrackRef.current = null;
            setHasCandidateAudio(false);
          }
        });

        await room.connect(tokenData.livekitUrl, tokenData.jwt);
        setRoomState('connected');
      } catch (err: unknown) {
        if (!isSubscribed) return;
        console.error('[RecruiterLive] Monitor connection error:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to live interview monitor.');
        setRoomState('failed');
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    void initializeMonitor();

    return () => {
      isSubscribed = false;
      if (roomRef.current) {
        try {
          void roomRef.current.disconnect().catch(() => {});
        } catch {}
        roomRef.current = null;
      }
    };
  }, [sessionId, audioVolume, isAudioMuted]);

  // 2. Elapsed Timer
  useEffect(() => {
    if (loading || error || roomState === 'disconnected') return;
    const interval = setInterval(() => {
      setElapsedTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error, roomState]);

  // 3. Periodic Poll for Question/Answer Lifecycle state changes
  useEffect(() => {
    if (!sessionId || loading || error) return;
    let cancelled = false;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/interview/${sessionId}/state`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        setSessionData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status || prev.status,
            currentStage: data.current_stage || prev.currentStage,
            currentQuestion: data.question || prev.currentQuestion,
            turnIndex: data.turn_index ?? prev.turnIndex,
            totalTurns: data.total_turns ?? prev.totalTurns,
            proctoringStatus: data.proctoring_status || prev.proctoringStatus,
            history: data.history || prev.history,
          };
        });

        const lState = (data.state || '').toUpperCase();
        if (lState.includes('SPEAK')) setAiState('speaking');
        else if (lState.includes('EVALUAT')) setAiState('evaluating');
        else if (lState.includes('TRANSCRIB')) setAiState('transcribing');
        else if (lState.includes('LISTEN')) setAiState('listening');
        else if (data.status === 'completed') setAiState('idle');
      } catch {}
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [sessionId, loading, error]);

  // 4. Attach tracks to DOM elements if elements render after track arrival
  useEffect(() => {
    if (activeVideoTrackRef.current && candidateVideoRef.current && hasCandidateVideo) {
      activeVideoTrackRef.current.attach(candidateVideoRef.current);
    }
  }, [hasCandidateVideo]);

  useEffect(() => {
    if (activeAudioTrackRef.current && candidateAudioRef.current) {
      activeAudioTrackRef.current.attach(candidateAudioRef.current);
      candidateAudioRef.current.volume = audioVolume;
      candidateAudioRef.current.muted = isAudioMuted;
    }
  }, [hasCandidateAudio, audioVolume, isAudioMuted]);

  // Toggle Mute audio playout for observer
  const handleToggleMute = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      if (candidateAudioRef.current) {
        candidateAudioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // Adjust observer playback volume
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    if (candidateAudioRef.current) {
      candidateAudioRef.current.volume = val;
      candidateAudioRef.current.muted = val === 0;
    }
    if (val === 0) setIsAudioMuted(true);
    else setIsAudioMuted(false);
  }, []);

  // Format Elapsed Seconds
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe Exit without terminating candidate interview
  const handleLeaveMonitoring = () => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch {}
    }
    router.push('/recruiter/dashboard');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!monitorContainerRef.current) return;
    if (!document.fullscreenElement) {
      monitorContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Error State Render
  if (error) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-xl bg-surface border border-line text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-accent-rose">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ink">
              {errorCode === 403 ? 'Access Denied' : 'Session Unavailable'}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">{error}</p>
          </div>
          <Link
            href="/recruiter/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-semibold transition-all"
          >
            <span>Return to Recruiter Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Loading Skeleton Render
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin" />
        <p className="text-sm font-mono text-ink-muted">Establishing secure LiveKit monitoring transport...</p>
      </div>
    );
  }

  const isCompleted = sessionData?.status === 'completed';

  return (
    <div
      ref={monitorContainerRef}
      className="min-h-screen bg-canvas text-ink flex flex-col overflow-hidden font-sans select-none"
    >
      {/* Hidden audio element for candidate sound playout */}
      <audio ref={candidateAudioRef} autoPlay playsInline />

      {/* TOP HEADER & MONITORING STATUS BAR */}
      <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-line bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleLeaveMonitoring}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors cursor-pointer shrink-0"
            title="Leave Monitoring"
          >
            <span className="text-xs font-semibold">Back</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-ink truncate">
                {sessionData?.candidateName || 'Candidate'}
              </h1>
              <span className="text-xs text-ink-muted font-mono hidden sm:inline"> · </span>
              <span className="text-xs text-accent-cyan font-medium truncate hidden sm:inline">
                {sessionData?.jobTitle}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted font-mono truncate">
              {sessionData?.companyName}  ·  Stage: {sessionData?.currentStage}
            </p>
          </div>
        </div>

        {/* Live Indicator, Turn Stepper & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Status Badge */}
          {isCompleted ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-accent-emerald text-xs font-mono font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Interview Concluded</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-accent-rose text-xs font-mono font-semibold shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>LIVE MONITOR</span>
            </div>
          )}

          {/* Elapsed Timer */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-inset border border-line text-xs font-mono text-ink">
            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
            <span>{formatTime(elapsedTimer)}</span>
          </div>

          {/* Turn Stepper */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-inset border border-line text-xs font-mono text-ink-muted">
            <span>Question</span>
            <span className="font-bold text-ink">
              #{(sessionData?.turnIndex && sessionData.turnIndex > 0 ? sessionData.turnIndex : 1)}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors cursor-pointer hidden sm:block"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Monitor'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Leave Monitor Button */}
          <button
            type="button"
            onClick={handleLeaveMonitoring}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-rose-500/20 text-ink hover:text-accent-rose border border-line text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave Monitor</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT: 3-VIEW RESPONSIVE LAYOUT */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 sm:p-5 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-4">
        {/* COLUMN 1: LIVE VIDEO STREAMS (Candidate Camera & AI Interviewer Viewport) */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col gap-4">
          {/* VIEW 1: CANDIDATE LIVE VIDEO FEED */}
          <div className="relative w-full h-[220px] sm:h-[260px] rounded-2xl border border-line bg-canvas overflow-hidden shadow-xl flex items-center justify-center group">
            <video
              ref={candidateVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasCandidateVideo ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Placeholder when candidate video track is waiting/disconnected */}
            {!hasCandidateVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center text-ink-muted">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink">
                    {roomState === 'reconnecting'
                      ? 'Reconnecting to Candidate Feed...'
                      : 'Waiting for Candidate Stream...'}
                  </p>
                  <p className="text-[11px] text-ink-muted font-mono">
                    Candidate video will stream live via LiveKit SFU once camera is active.
                  </p>
                </div>
              </div>
            )}

            {/* Candidate Stream Tag & Audio Playout Status */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-canvas/85 border border-line text-[11px] font-mono text-ink backdrop-blur-md">
              <span className={`w-2 h-2 rounded-full ${hasCandidateVideo ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>Candidate Feed</span>
            </div>

            {/* Audio Volume & Mute Controls Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-auto">
              <div className="flex items-center gap-2 bg-canvas/85 px-2.5 py-1.5 rounded-xl border border-line backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1 rounded text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-accent-rose" /> : <Volume2 className="w-4 h-4 text-accent-cyan" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isAudioMuted ? 0 : audioVolume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 accent-cyan-400 h-1 cursor-pointer"
                  title="Audio Volume"
                />
              </div>

              <span className="text-[10px] font-mono text-ink-muted bg-canvas/85 px-2 py-1 rounded-lg border border-line">
                LiveKit SFU Connected
              </span>
            </div>
          </div>

          {/* VIEW 2: AI INTERVIEWER VIEWPORT */}
          <div className="w-full h-[200px] sm:h-[240px] shrink-0">
            <AIAvatarViewport
              aiState={aiState}
              name="Progeni Atlas Evaluator"
              role={`Question ${(sessionData?.turnIndex && sessionData.turnIndex > 0 ? sessionData.turnIndex : 1)}`}
              className="border-line shadow-xl"
            />
          </div>
        </div>

        {/* COLUMN 2: VIEW 3 - HR RECRUITER MONITORING STATION (The 3rd View) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
          {/* 3A: HR MONITORING CONTROL & TELEMETRY PANEL */}
          <div className="rounded-2xl bg-surface border border-line p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-accent-cyan" />
                <h2 className="text-sm font-bold text-ink">HR Monitoring Station</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan font-semibold">
                  Observer View
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-accent-emerald">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Candidate Uninterrupted</span>
              </div>
            </div>

            {/* Silent Mode Explanatory Notice */}
            <div className="p-3 rounded-xl bg-inset flex items-start gap-3 text-xs text-ink-muted">
              <Eye className="w-4 h-4 text-accent-indigo shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-ink">Silent Real-Time Observation</p>
                <p className="text-[11px] leading-relaxed mt-0.5">
                  You are observing the live interview as an authorized recruiter. Your audio and camera are
                  strictly muted; the candidate only sees the AI Evaluator and their own feed.
                </p>
              </div>
            </div>

            {/* Candidate & Job Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Position</span>
                <span className="font-bold text-ink truncate block mt-0.5">{sessionData?.jobTitle}</span>
              </div>
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Stage</span>
                <span className="font-bold text-accent-cyan truncate block mt-0.5">{sessionData?.currentStage}</span>
              </div>
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Candidate Audio</span>
                <span className={`font-bold block mt-0.5 ${hasCandidateAudio ? 'text-accent-emerald' : 'text-accent-amber'}`}>
                  {hasCandidateAudio ? 'Streaming' : 'Waiting'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Proctoring</span>
                <span className="font-bold text-accent-emerald flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active
                </span>
              </div>
            </div>
          </div>

          {/* 3B: ACTIVE QUESTION & REAL-TIME TRANSCRIPT ACCORDION */}
          <div className="flex-1 rounded-2xl bg-surface border border-line p-4 sm:p-5 shadow-xl flex flex-col overflow-hidden min-h-[280px]">
            <div className="flex items-center justify-between border-b border-line pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-indigo" />
                <h3 className="text-xs sm:text-sm font-bold text-ink">Active Evaluation & Transcript Stream</h3>
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                Turn {(sessionData?.turnIndex && sessionData.turnIndex > 0 ? sessionData.turnIndex : 1)}
              </span>
            </div>

            {/* Current Active Question Callout */}
            <div className="mt-3 p-3.5 rounded-xl bg-cyan-500/10 shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent-cyan font-bold block mb-1">
                CURRENT PROMPT / QUESTION
              </span>
              <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed">
                {sessionData?.currentQuestion || 'Loading interview question...'}
              </p>
            </div>

            {/* Prior Question History / Transcripts */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1">
              <span className="text-[11px] font-mono text-ink-muted block">
                COMPLETED TURNS ({sessionData?.history?.length || 0})
              </span>

              {(!sessionData?.history || sessionData.history.length === 0) ? (
                <div className="p-6 text-center text-xs text-ink-muted italic bg-inset/50 rounded-xl">
                  Candidate is currently on the opening turn. Responses will record and appear here in real time.
                </div>
              ) : (
                sessionData.history.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-inset space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <span className="text-accent-cyan font-bold">Turn {item.turn_index > 0 ? item.turn_index : 1}  ·  {item.stage}</span>
                      <span>Answered</span>
                    </div>
                    <p className="font-semibold text-ink">{item.question}</p>
                    {item.answer ? (
                      <div className="pl-3 border-l-2 border-indigo-500/40 text-ink-muted text-xs leading-relaxed">
                        &ldquo;{item.answer}&rdquo;
                      </div>
                    ) : (
                      <p className="text-ink-muted italic text-[11px]">No spoken answer recorded.</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Concluded Quick Link */}
            {isCompleted && (
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between shrink-0">
                <span className="text-xs text-accent-emerald font-medium">Session has ended.</span>
                <Link
                  href={`/recruiter/interview/${sessionId}/recording`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <span>View Recording &amp; Scorecard →</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}