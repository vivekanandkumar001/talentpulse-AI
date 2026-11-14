'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  fetchInterviewRecording,
  fetchInterviewReport,
  isValidSessionId,
  type InterviewRecordingResponse,
  type CandidateEvaluationReport,
} from '@/lib/api';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Video,
  VideoOff,
  Award,
  ShieldAlert,
  Code2,
} from 'lucide-react';

export default function RecruiterRecordingViewPage() {
  const params = useParams();
  const rawId = (params?.id as string) || '';
  const sessionId = isValidSessionId(rawId) ? rawId : '';

  // Data states
  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [error, setError] = useState<string | null>(sessionId ? null : 'Invalid or missing interview session ID.');
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const [recordingData, setRecordingData] = useState<InterviewRecordingResponse | null>(null);
  const [reportData, setReportData] = useState<CandidateEvaluationReport | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  // 1. Fetch Recording & Report
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    async function loadRecordingAndReport() {
      try {
        setLoading(true);
        setError(null);

        const [recRes, repRes] = await Promise.allSettled([
          fetchInterviewRecording(sessionId),
          fetchInterviewReport(sessionId),
        ]);

        if (!isMounted) return;

        if (recRes.status === 'fulfilled') {
          setRecordingData(recRes.value);
        } else {
          const recErr = recRes.reason;
          if (recErr?.status_code === 403 || recErr?.status_code === 404) {
            setErrorCode(recErr.status_code);
            setError(recErr.status_code === 403
              ? 'Access denied. You are not authorized to view this interview recording.'
              : 'Interview session not found.');
            setLoading(false);
            return;
          }
          setRecordingData({ status: 'unavailable', message: 'Recording not available' });
        }

        if (repRes.status === 'fulfilled' && repRes.value) {
          setReportData(repRes.value);
          // Expand all turns by default
          if (repRes.value.turnReviews) {
            const initialExpanded: Record<number, boolean> = {};
            repRes.value.turnReviews.forEach((_, idx) => {
              initialExpanded[idx] = true;
            });
            setExpandedTurns(initialExpanded);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load recorded interview.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadRecordingAndReport();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Video Event Handlers
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || recordingData?.durationSec || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleTurnExpanded = (idx: number) => {
    setExpandedTurns((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getTurnTime = useCallback((turn: { timestampSec?: number; turnIndex: number }, idx: number): number => {
    if (typeof turn.timestampSec === 'number') return turn.timestampSec;
    const totalSec = duration > 0 ? duration : (recordingData?.durationSec || 1620);
    const count = Math.max(reportData?.turnReviews?.length || 1, 1);
    return Math.round(idx * (totalSec / count));
  }, [duration, recordingData?.durationSec, reportData?.turnReviews?.length]);

  const jumpToVideoTime = useCallback((timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
    playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const activeTurnIndex = React.useMemo(() => {
    if (!reportData?.turnReviews || reportData.turnReviews.length === 0) return -1;
    return reportData.turnReviews.reduce((active, turn, idx, arr) => {
      const tTime = getTurnTime(turn, idx);
      const nextTime = idx < arr.length - 1 ? getTurnTime(arr[idx + 1], idx + 1) : Infinity;
      return currentTime >= tTime && currentTime < nextTime ? idx : active;
    }, -1);
  }, [currentTime, getTurnTime, reportData?.turnReviews]);

  const formatSeconds = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Fast Audit Moments: Filter weak turns & proctoring alerts
  const weakTurns = React.useMemo(() => {
    if (!reportData?.turnReviews) return [];
    return reportData.turnReviews.filter((turn) => {
      if (turn.isWeakAnswer) return true;
      if (!turn.scores) return false;
      const scores = Object.values(turn.scores).filter((v): v is number => typeof v === 'number');
      if (scores.length === 0) return false;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return (avg <= 10 && avg < 7.0) || (avg > 10 && avg < 70);
    });
  }, [reportData?.turnReviews]);

  const suspiciousEvents = React.useMemo(() => {
    return reportData?.proctoringIntegritySummary?.suspiciousEvents || [];
  }, [reportData?.proctoringIntegritySummary?.suspiciousEvents]);

  const hasMomentsOfConcern = weakTurns.length > 0 || suspiciousEvents.length > 0;

  const getRecommendationBadge = (rec: string | null | undefined) => {
    const r = (rec || '').toUpperCase();
    if (r.includes('STRONG_HIRE')) {
      return (
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-accent-emerald font-bold text-xs font-mono">
          Strong Hire
        </span>
      );
    }
    if (r.includes('HIRE') && !r.includes('LEAN')) {
      return (
        <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-accent-cyan font-bold text-xs font-mono">
          Hire
        </span>
      );
    }
    if (r.includes('LEAN')) {
      return (
        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-accent-amber font-bold text-xs font-mono">
          Lean Hire
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-accent-rose font-bold text-xs font-mono">
        Reject
      </span>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-xl bg-surface border border-line text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-accent-rose">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ink">
              {errorCode === 403 ? 'Access Denied' : 'Recording Unavailable'}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-accent-indigo animate-spin" />
        <p className="text-sm font-mono text-ink-muted">Loading recorded interview and evaluation dossier…</p>
      </div>
    );
  }

  const hasPlayback = recordingData?.status === 'available' && !!recordingData.playbackUrl;
  const isProcessing = recordingData?.status === 'processing';
  const candidateName = reportData?.candidate.fullName || 'Candidate';
  const roleTitle = reportData?.jobContext.roleTitle || 'Technical Role';
  const companyName = reportData?.jobContext.companyName || 'Organization';

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans select-none">
      {/* TOP HEADER & BREADCRUMBS */}
      <header className="h-16 shrink-0 border-b border-line bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/recruiter/dashboard"
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors shrink-0"
            title="Back to Dashboard"
          >
            <span className="text-xs font-semibold">Back</span>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-ink truncate">{candidateName}</h1>
              <span className="text-xs text-ink-muted font-mono hidden sm:inline">•</span>
              <span className="text-xs text-accent-indigo font-medium truncate hidden sm:inline">
                {roleTitle}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted font-mono truncate">
              {companyName} • Dossier: {reportData?.verificationDossierId || `TP-${sessionId.substring(0, 8)}`}
            </p>
          </div>
        </div>

        {/* Header Badges & Export */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-accent-indigo text-xs font-mono font-semibold">
            <Video className="w-3.5 h-3.5" />
            <span>Recorded Session</span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-semibold border border-line transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-cyan" />
            <span className="hidden sm:inline">Export Dossier</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VIDEO PLAYER + TURN-BY-TURN TRANSCRIPT (7 COLS) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. ENTERPRISE RECORDING VIDEO PLAYER */}
          <div
            ref={playerContainerRef}
            className="relative w-full rounded-2xl border border-line bg-canvas overflow-hidden shadow-2xl flex flex-col group aspect-video min-h-[260px] sm:min-h-[340px]"
          >
            {hasPlayback ? (
              <>
                <video
                  ref={videoRef}
                  src={recordingData?.playbackUrl || ''}
                  playsInline
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={togglePlay}
                />

                {/* Big Center Play/Pause Overlay */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`absolute inset-0 m-auto w-16 h-16 rounded-full bg-canvas/70 border border-line-strong/80 backdrop-blur-md flex items-center justify-center text-white transition-all transform hover:scale-110 cursor-pointer ${
                    isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                </button>

                {/* Bottom Custom Video Controls */}
                <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-canvas via-slate-950/80 to-transparent flex flex-col gap-2 z-10">
                  {/* Seek Bar */}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 accent-cyan-400 bg-surface-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Player Toolbar */}
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-1 hover:text-ink transition-colors cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="p-1 hover:text-ink transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-accent-rose" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-14 sm:w-18 accent-cyan-400 h-1 bg-surface-2 rounded-lg cursor-pointer hidden sm:block"
                        />
                      </div>

                      <span className="font-mono text-[11px] text-ink-muted">
                        {formatSeconds(currentTime)} / {formatSeconds(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Speed selector */}
                      <div className="flex items-center bg-surface-2/80 rounded-lg border border-line text-[11px] font-mono px-1">
                        {[1, 1.25, 1.5].map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${
                              playbackRate === speed ? 'text-accent-cyan font-bold' : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-1 hover:text-ink transition-colors cursor-pointer"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <RefreshCw className="w-10 h-10 text-accent-cyan animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-ink">Recording is Processing</h3>
                  <p className="text-xs text-ink-muted max-w-sm">
                    The session video stream is being encoded and finalized in media storage. Please refresh
                    shortly to watch the playback.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center text-ink-muted">
                  <VideoOff className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold text-ink">Video Recording Not Retained</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    A media stream was not persisted for this interview session. The full AI scorecard,
                    candidate transcripts, and competency evaluations below remain fully accessible.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FAST AUDIT: MOMENTS OF CONCERN (TIMESTAMPS SEEKING) */}
          {hasMomentsOfConcern && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 p-4 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-accent-amber">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-ink flex items-center gap-2">
                      <span>Fast Audit: Jump to Moments of Concern</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-accent-amber border border-amber-500/30">
                        One-Click Seek
                      </span>
                    </h3>
                    <p className="text-[11px] text-ink-muted">
                      Skip watching 45 minutes — click any item below to jump the video directly to that critical moment.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-ink-muted">
                  {weakTurns.length} Weak Answer{weakTurns.length === 1 ? '' : 's'} · {suspiciousEvents.length} Proctoring Flag{suspiciousEvents.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Weak Answers */}
                {weakTurns.map((turn) => {
                  const turnTime = getTurnTime(turn, turn.turnIndex - 1);
                  const formatted = turn.formattedTime || formatSeconds(turnTime);
                  const scoresList = turn.scores ? Object.values(turn.scores).filter((v): v is number => typeof v === 'number') : [];
                  const avgScore = scoresList.length > 0
                    ? Math.round(scoresList[0] <= 10 ? (scoresList.reduce((a, b) => a + b, 0) / scoresList.length) * 10 : scoresList.reduce((a, b) => a + b, 0) / scoresList.length)
                    : 65;
                  const qNum = turn.turnIndex > 0 && turn.turnIndex <= 20 ? turn.turnIndex : 'Weak';
                  return (
                    <button
                      key={`weak-${turn.turnIndex}`}
                      type="button"
                      onClick={() => jumpToVideoTime(turnTime)}
                      className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/10 transition-all text-xs text-left cursor-pointer shadow-sm"
                      title={`Jump to Q${qNum} at ${formatted} (${avgScore}% score)`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-400 group-hover:animate-ping" />
                      <span className="font-semibold text-accent-rose">
                        Q{qNum} Weak Answer ({avgScore}%)
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-accent-cyan bg-inset px-2 py-0.5 rounded border border-line">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        {formatted}
                      </span>
                    </button>
                  );
                })}

                {/* Proctoring Suspicious Events */}
                {suspiciousEvents.map((event) => (
                  <button
                    key={`proc-${event.id}`}
                    type="button"
                    onClick={() => jumpToVideoTime(event.timestampSec)}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10 transition-all text-xs text-left cursor-pointer shadow-sm"
                    title={`Jump to proctoring alert: ${event.title} at ${event.formattedTime}`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-accent-amber" />
                    <span className="font-medium text-ink truncate max-w-[200px]">
                      {event.title}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-accent-cyan bg-inset px-2 py-0.5 rounded border border-line">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      {event.formattedTime}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. TURN-BY-TURN TRANSCRIPT & EVALUATION REVIEWS */}
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-3 gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-indigo" />
                <div>
                  <h2 className="text-sm font-bold text-ink">Interview Questions & Spoken Answers</h2>
                  <p className="text-[11px] text-accent-cyan flex items-center gap-1 font-mono">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Click any question, timestamp, or answer to jump video</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-ink-muted">
                {reportData?.turnReviews?.length || 0} Questions Evaluated
              </span>
            </div>

            {(!reportData?.turnReviews || reportData.turnReviews.length === 0) ? (
              <p className="text-xs text-ink-muted italic py-4 text-center">
                No turn-by-turn question records available for this session.
              </p>
            ) : (
              <div className="space-y-3">
                {reportData.turnReviews.map((turn, idx) => {
                  const turnTime = getTurnTime(turn, idx);
                  const formattedTurnTime = turn.formattedTime || formatSeconds(turnTime);
                  const isActive = activeTurnIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-all text-xs overflow-hidden ${
                        isActive
                          ? 'bg-inset border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                          : 'bg-inset border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="w-full px-4 py-3 flex items-center justify-between text-left gap-2.5 hover:bg-surface-2 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Jump to Video Timestamp Pill */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToVideoTime(turnTime);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                              isActive
                                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/50 animate-pulse'
                                : 'bg-surface hover:bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 hover:border-cyan-500/60'
                            }`}
                            title={`Jump video playback to ${formattedTurnTime}`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{formattedTurnTime}</span>
                          </button>

                          <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-mono font-bold text-ink-muted shrink-0">
                            Q{turn.turnIndex > 0 && turn.turnIndex <= 20 ? turn.turnIndex : idx + 1}
                          </span>

                          {turn.isWeakAnswer && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-accent-rose font-mono font-bold text-[10px] shrink-0">
                              <AlertCircle className="w-3 h-3 text-accent-rose" />
                              <span className="hidden sm:inline">Weak Answer</span>
                            </span>
                          )}

                          <span
                            onClick={() => jumpToVideoTime(turnTime)}
                            className="font-semibold text-ink truncate cursor-pointer hover:text-accent-cyan transition-colors"
                            title="Click to jump video to this question"
                          >
                            {turn.questionAsked}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isActive && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-accent-cyan font-mono text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>PLAYING</span>
                            </span>
                          )}

                          {turn.scores.relevance != null && (
                            <span className="font-mono text-accent-indigo font-bold text-[11px] hidden sm:inline">
                              Score: {turn.scores.relevance}%
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleTurnExpanded(idx)}
                            className="p-1 rounded text-ink-muted hover:text-ink cursor-pointer"
                            aria-label={expandedTurns[idx] ? 'Collapse question' : 'Expand question'}
                          >
                            {expandedTurns[idx] ? (
                              <ChevronUp className="w-4 h-4 text-ink-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-ink-muted" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedTurns[idx] && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-line/60 bg-surface/30">
                          {/* Spoken Answer with Click-to-Jump functionality */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted uppercase">
                              <span>Candidate Answer</span>
                              <button
                                type="button"
                                onClick={() => jumpToVideoTime(turnTime)}
                                className="text-[10px] text-accent-cyan hover:underline inline-flex items-center gap-1 cursor-pointer font-sans normal-case"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Seek video ({formattedTurnTime})</span>
                              </button>
                            </div>
                            <div
                              onClick={() => jumpToVideoTime(turnTime)}
                              className="p-3 rounded-lg bg-surface hover:bg-surface-2 border border-line hover:border-cyan-500/50 text-xs text-ink leading-relaxed cursor-pointer transition-colors group relative"
                              title="Click to jump video to candidate answer"
                            >
                              <p>{turn.candidateAnswerSummary ? `"${turn.candidateAnswerSummary}"` : 'No spoken answer captured.'}</p>
                              <span className="text-[10px] text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 flex items-center gap-1 font-mono">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Jump video to {formattedTurnTime}</span>
                              </span>
                            </div>
                          </div>

                          {/* Candidate Code Submitted in this Turn */}
                          {turn.candidate_code && turn.candidate_code.trim().length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted uppercase">
                                <span className="inline-flex items-center gap-1.5 text-accent-cyan">
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>Live Candidate Code ({turn.code_language || 'python'})</span>
                                </span>
                                <span className="text-[10px] text-ink-muted lowercase font-sans">
                                  {turn.candidate_code.split('\n').length} lines
                                </span>
                              </div>
                              <pre className="p-3 rounded-lg bg-canvas border border-line/80 font-mono text-xs text-ink overflow-x-auto max-h-56 leading-relaxed selection:bg-cyan-500/30 selection:text-accent-cyan">
                                <code>{turn.candidate_code}</code>
                              </pre>
                            </div>
                          )}

                          {/* Scores breakdown if present */}
                          {turn.scores && Object.keys(turn.scores).length > 0 && (
                            <div className="grid grid-cols-3 gap-2 text-center font-mono">
                              <div className="p-2 rounded bg-surface border border-line">
                                <span className="text-[10px] text-ink-muted block">Relevance</span>
                                <span className="text-xs font-bold text-accent-cyan">{turn.scores.relevance ?? '—'}%</span>
                              </div>
                              <div className="p-2 rounded bg-surface border border-line">
                                <span className="text-[10px] text-ink-muted block">Depth</span>
                                <span className="text-xs font-bold text-accent-indigo">{turn.scores.depth ?? '—'}%</span>
                              </div>
                              <div className="p-2 rounded bg-surface border border-line">
                                <span className="text-[10px] text-ink-muted block">Correctness</span>
                                <span className="text-xs font-bold text-accent-emerald">{turn.scores.correctness ?? '—'}%</span>
                              </div>
                            </div>
                          )}

                          {/* Evaluator Notes */}
                          {turn.evaluatorFeedback && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono text-ink-muted uppercase">AI Evaluator Feedback</span>
                              <p className="text-xs text-ink-muted italic pl-3 border-l-2 border-indigo-500/40">
                                {turn.evaluatorFeedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: EVALUATION SCORECARD & INTEGRITY DOSSIER (5 COLS) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* 1. OVERALL MATCH SCORE CARD */}
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-accent-indigo" />
                <h3 className="text-sm font-bold text-ink">Scorecard Assessment</h3>
              </div>
              {getRecommendationBadge(reportData?.hiringRecommendation)}
            </div>

            {/* Match Score Display */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-inset">
              <div>
                <span className="text-xs text-ink-muted font-medium">Overall AI Match Score</span>
                <p className="text-[11px] text-ink-muted font-mono mt-0.5">Weighted composite rating</p>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-accent-indigo">
                {reportData?.overallScore != null ? `${Math.round(reportData.overallScore)}%` : '—'}
              </div>
            </div>

            {/* Competency Pillars */}
            {reportData?.competencyPillars && Object.keys(reportData.competencyPillars).length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-ink block">Competency Pillars</span>
                {Object.entries(reportData.competencyPillars).map(([name, score]) => (
                  <div key={name} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-mono font-bold text-accent-cyan">{Math.round(score)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Executive Summary */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-indigo" />
                Executive Summary
              </span>
              <p className="text-xs text-ink-muted leading-relaxed bg-inset p-3.5 rounded-xl">
                {reportData?.executiveSummary || 'Scorecard evaluation pending.'}
              </p>
            </div>

            {/* Strengths */}
            {reportData?.verifiedStrengths && reportData.verifiedStrengths.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                  Demonstrated Strengths
                </span>
                <ul className="space-y-1.5">
                  {reportData.verifiedStrengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-ink">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Growth Areas */}
            {reportData?.targetedGrowthAreas && reportData.targetedGrowthAreas.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-accent-amber" />
                  Targeted Growth Areas
                </span>
                <ul className="space-y-1.5">
                  {reportData.targetedGrowthAreas.map((concern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-ink-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 2. PROCTORING & INTEGRITY SUMMARY CARD */}
          <div className="rounded-2xl bg-surface border border-line p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-emerald" />
                <h3 className="text-sm font-bold text-ink">Integrity & Proctoring Audit</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                reportData?.proctoringIntegritySummary.flagged
                  ? 'bg-rose-500/10 text-accent-rose border border-rose-500/30'
                  : 'bg-emerald-500/10 text-accent-emerald border border-emerald-500/30'
              }`}>
                {reportData?.proctoringIntegritySummary.flagged ? 'Flagged for Review' : 'Verified Normal'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Warning Events</span>
                <span className="text-sm font-bold text-ink block mt-0.5">
                  {reportData?.proctoringIntegritySummary.warningCount || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-inset">
                <span className="text-[11px] text-ink-muted block font-mono">Warning Threshold</span>
                <span className="text-sm font-bold text-ink block mt-0.5">
                  {reportData?.proctoringIntegritySummary.threshold || 5}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Real-time video gaze, multi-face presence, and fullscreen enforcement logs were audited during
              this session.
            </p>

            {/* AUDITED FLAGGED MOMENTS LIST */}
            {suspiciousEvents.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-line">
                <span className="text-[11px] font-bold text-ink flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-accent-amber font-mono uppercase">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Audited Flagged Moments
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted">
                    {suspiciousEvents.length} event{suspiciousEvents.length === 1 ? '' : 's'}
                  </span>
                </span>
                <div className="space-y-2">
                  {suspiciousEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-inset hover:bg-surface-2 transition-colors flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            evt.severity === 'high' ? 'bg-rose-400' : evt.severity === 'medium' ? 'bg-amber-400' : 'bg-cyan-400'
                          }`} />
                          <span className="font-semibold text-ink truncate">{evt.title}</span>
                        </div>
                        {evt.reason && (
                          <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-1">{evt.reason}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => jumpToVideoTime(evt.timestampSec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-cyan-500/30 text-accent-cyan hover:bg-cyan-500/20 text-[11px] font-mono font-bold shrink-0 transition-colors cursor-pointer"
                        title={`Jump video to ${evt.formattedTime}`}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{evt.formattedTime}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}