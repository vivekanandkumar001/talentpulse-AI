'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMediaSource } from '@/lib/media/MediaSourceProvider';
import {
  Video,
  Mic,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Smartphone,
} from 'lucide-react';
import type { MediaErrorKind } from '@/lib/media/deviceProbe';

interface CameraMicPreviewProps {
  onCameraStateChange?: (passed: boolean, selectedDevice: string) => void;
  onMicStateChange?: (passed: boolean, selectedDevice: string) => void;
  onSpeakerStateChange?: (passed: boolean) => void;
}

export const CameraMicPreview: React.FC<CameraMicPreviewProps> = ({
  onCameraStateChange,
  onMicStateChange,
  onSpeakerStateChange,
}) => {
  const {
    source,
    stream,
    status,
    cameraError,
    micError,
    probeResult,
    setLocalDevices,
    retryLocal,
    audioUnlocked,
    unlockAudio,
    enableMediaAndAudio,
  } = useMediaSource();


  // SSR Hydration Safety State
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => setMounted(true), []);

  // Selected device IDs
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');

  // Audio Meter States
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [segmentsActive, setSegmentsActive] = useState<number>(0);

  // Speaker Test State
  const [speakerTested, setSpeakerTested] = useState<boolean>(false);
  const [isPlayingChime, setIsPlayingChime] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Video track info
  const videoTrack = useMemo(() => stream?.getVideoTracks()[0], [stream]);
  const audioTrack = useMemo(() => stream?.getAudioTracks()[0], [stream]);

  const hasLiveVideo = !!videoTrack && videoTrack.readyState === 'live';
  const hasLiveAudio = !!audioTrack && audioTrack.readyState === 'live';

  // Attach active MediaStream to preview video element with mobile play attempt
  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    if (!stream) {
      currentVideo.srcObject = null;
      return;
    }

    currentVideo.srcObject = stream;
    currentVideo.muted = true;
    currentVideo.playsInline = true;
    currentVideo.autoplay = true;

    const handleMetadata = () => {
      currentVideo.play().catch((err) => {
        console.warn('[CameraMicPreview] Mobile play notice:', err);
      });
    };

    if (currentVideo.readyState >= 1) {
      handleMetadata();
    } else {
      currentVideo.addEventListener('loadedmetadata', handleMetadata, { once: true });
    }

    return () => {
      currentVideo.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [stream]);

  // Sync callbacks with parent
  useEffect(() => {
    const videoLabel =
      source === 'phone'
        ? 'Phone Companion Camera'
        : videoTrack?.label || (hasLiveVideo ? 'Local Camera' : 'None');

    const audioLabel =
      source === 'phone'
        ? 'Phone Companion Microphone'
        : audioTrack?.label || (hasLiveAudio ? 'Local Microphone' : 'None');

    onCameraStateChange?.(hasLiveVideo, videoLabel);
    onMicStateChange?.(hasLiveAudio, audioLabel);
  }, [hasLiveVideo, hasLiveAudio, videoTrack, audioTrack, source, onCameraStateChange, onMicStateChange]);

  // Determine Video Resolution Label
  const resolutionLabel = useMemo(() => {
    if (!videoTrack) return 'No Camera';
    const settings = videoTrack.getSettings();
    if (settings.height && settings.height >= 1080) return '1080p Full HD';
    if (settings.height && settings.height >= 720) return '720p HD';
    if (settings.height && settings.height > 0) return `${settings.height}p SD`;
    return 'Camera Active';
  }, [videoTrack]);

  // Web Audio API Audio Level Meter
  useEffect(() => {
    if (!stream || !hasLiveAudio) {
      return;
    }

    let isCancelled = false;
    let animationFrameId: number;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      sourceNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioMeter = () => {
        if (isCancelled) return;
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(level);

        // 12 segments
        const active = Math.min(12, Math.round((level / 100) * 12));
        setSegmentsActive(active);

        animationFrameId = requestAnimationFrame(updateAudioMeter);
      };

      updateAudioMeter();
    } catch {
      // AudioContext may be blocked before user gesture
    }

    return () => {
      isCancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [stream, hasLiveAudio]);

  // Handle local device switches
  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    await setLocalDevices(deviceId, selectedAudioId);
  };

  const handleAudioDeviceChange = async (deviceId: string) => {
    setSelectedAudioId(deviceId);
    await setLocalDevices(selectedVideoId, deviceId);
  };

  // Speaker Output Test (440Hz / 880Hz Two-Tone Chime)
  const playTestChime = () => {
    setIsPlayingChime(true);
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Tone 1: 440Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Tone 2: 880Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.9);

      setTimeout(() => {
        setIsPlayingChime(false);
        setSpeakerTested(true);
      }, 1000);
    } catch (e) {
      console.warn('[CameraMicPreview] Speaker chime playback notice:', e);
      setIsPlayingChime(false);
      setSpeakerTested(true);
    }
  };

  const confirmSpeaker = (passed: boolean) => {
    onSpeakerStateChange?.(passed);
  };

  const renderCameraErrorOverlay = (err: MediaErrorKind | null) => {
    if (err === 'secure_context') {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const port = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';
      const secureUrl = `http://localhost:${port}${path}`;
      const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      return (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20 overflow-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-100">
            Secure Connection Required for Camera &amp; Microphone
          </h4>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            This page is open on <span className="font-mono text-slate-300">{origin}</span>. Browsers
            only expose camera and microphone access over <strong>HTTPS</strong> or on{' '}
            <strong>localhost</strong> / <strong>127.0.0.1</strong>. Your devices are fine — they are
            simply blocked on this plain-HTTP network address.
          </p>
          {!isLoopback && (
            <div className="w-full max-w-md text-left rounded-xl border border-slate-700 bg-slate-900/80 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-200">
                Two ways to enable media on this device:
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-200">1. HTTPS (recommended):</strong> run the frontend
                with <code className="rounded bg-slate-800 px-1 text-cyan-300">npm run dev:https</code>{' '}
                and open <code className="rounded bg-slate-800 px-1 text-cyan-300">https://{host}:{port}</code>.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed break-words">
                <strong className="text-slate-200">2. Treat this origin as secure (Chrome):</strong>{' '}
                launch Chrome with
                <code className="mt-1 block rounded bg-slate-800 px-1 py-0.5 text-cyan-300 break-all">
                  --unsafely-treat-insecure-origin-as-secure={origin}
                </code>
                (use <code className="rounded bg-slate-800 px-1 text-cyan-300">frontend/web/scripts/open-lan-chrome.ps1</code>).
              </p>
            </div>
          )}
          {typeof window !== 'undefined' && (
            <a
              href={secureUrl}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
            >
              Open on localhost instead
            </a>
          )}
        </div>
      );
    }

    let title = 'Webcam Unavailable';
    let message = 'Your camera could not be started.';
    let actionText = 'Retry Camera';

    switch (err) {
      case 'no_device':
        title = 'No Webcam Detected on Desktop';
        message = 'No camera hardware was found on this computer. You can plug in a webcam or pair your phone below.';
        actionText = 'Scan for Devices';
        break;
      case 'permission_denied':
        title = 'Camera & Microphone Access Required';
        message = 'Camera or microphone access was blocked or dismissed in your browser. Open site settings in your browser address bar and allow Camera + Microphone, then click Retry below.';
        actionText = 'Allow Camera & Microphone';
        break;
      case 'in_use':
        title = 'Camera in Use by Another Application';
        message = 'Another app (such as Zoom, Microsoft Teams, or another tab) is currently using your webcam. Please close it and retry.';
        actionText = 'Try Again';
        break;
      default:
        title = 'Webcam Access Error';
        message = 'Could not initialize desktop webcam. You can pair your smartphone as a camera below.';
        actionText = 'Retry';
        break;
    }

    return (
      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-100">{title}</h4>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => retryLocal()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      </div>
    );
  };

  const [speakerConfirmed, setSpeakerConfirmed] = useState<boolean>(false);
  const [speakerNeedsChange, setSpeakerNeedsChange] = useState<boolean>(false);
  const [isEnablingMedia, setIsEnablingMedia] = useState<boolean>(false);


  const handleEnableAllMedia = async () => {
    setIsEnablingMedia(true);
    try {
      await enableMediaAndAudio();
    } finally {
      setIsEnablingMedia(false);
    }
  };

  const handleConfirmSpeaker = (passed: boolean) => {
    if (passed) {
      setSpeakerConfirmed(true);
      setSpeakerNeedsChange(false);
    } else {
      setSpeakerConfirmed(false);
      setSpeakerNeedsChange(true);
    }
    confirmSpeaker(passed);
  };

  return (
    <div className="space-y-6">
      {/* UNIFIED PRIMARY PREFLIGHT CTA GATE */}
      {(!hasLiveVideo || !hasLiveAudio || !audioUnlocked) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/40 shadow-xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Initialize Interview Media &amp; Audio
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Browser privacy policies require a single explicit user tap to authorize your camera, microphone, and browser audio playback for the AI interviewer.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleEnableAllMedia()}
              disabled={isEnablingMedia}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isEnablingMedia ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span>
                {isEnablingMedia
                  ? 'Authorizing Media & Audio...'
                  : 'Enable Camera, Microphone & Interview Audio'}
              </span>
            </button>
            {!audioUnlocked && hasLiveVideo && hasLiveAudio && (
              <button
                type="button"
                onClick={() => void unlockAudio()}
                className="px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/40 hover:bg-indigo-500/20 text-accent-indigo text-xs font-bold transition-all cursor-pointer"
              >
                Enable Interviewer Audio
              </button>
            )}
          </div>
        </div>
      )}

      {/* 16:9 LIVE CAMERA VIEWPORT */}
      <div className="relative aspect-video w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex items-center justify-center group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${source === 'local' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Ambient Top Glow */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60" />

        {/* Top-Right Status Chip */}
        <div className="absolute top-3 right-3 z-10">
          {hasLiveVideo ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 text-emerald-400 font-mono text-xs shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>
                {source === 'phone' ? '📱 Phone Camera' : `HD Camera (${resolutionLabel})`}
              </span>
            </span>
          ) : status === 'probing' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 font-mono text-xs backdrop-blur-md">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              Initializing Camera...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-rose-500/30 text-rose-400 font-mono text-xs backdrop-blur-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              No Video Feed
            </span>
          )}
        </div>

        {/* Camera Error Overlay (shown if camera missing and not using phone) */}
        {!hasLiveVideo && status !== 'probing' && source !== 'phone' && (
          renderCameraErrorOverlay(cameraError)
        )}
      </div>

      {/* THREE EXPLICIT MEDIA READINESS ROWS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Camera Status */}
        <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-semibold text-ink">Camera</span>
          </div>
          {hasLiveVideo ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent-emerald font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-accent-rose font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-rose" />
              <span>Inactive</span>
            </span>
          )}
        </div>

        {/* Microphone Status */}
        <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-semibold text-ink">Microphone</span>
          </div>
          {hasLiveAudio ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent-emerald font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-accent-rose font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-rose" />
              <span>Inactive</span>
            </span>
          )}
        </div>

        {/* Interviewer Audio Status */}
        <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-semibold text-ink">Interviewer Audio</span>
          </div>
          {mounted && audioUnlocked ? (
            <span className="inline-flex items-center gap-1 text-xs text-accent-emerald font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Unlocked</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-accent-amber font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
              <span>Needs Tap</span>
            </span>
          )}
        </div>
      </div>

      {/* DEVICE SELECTOR DROPDOWNS (LOCAL ONLY) */}
      {source === 'phone' ? (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-accent-cyan flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-accent-cyan shrink-0" />
          <span>Device selection disabled: Currently streaming via paired Smartphone.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Camera Select */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
              <Video className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Camera Device</span>
            </label>
            <div className="relative">
              <select
                value={selectedVideoId}
                onChange={(e) => handleVideoDeviceChange(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer pr-10"
              >
                {(probeResult?.videoInputs || []).length > 0 ? (
                  probeResult?.videoInputs.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">No Camera Detected</option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Microphone Select */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
              <Mic className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Microphone Input</span>
            </label>
            <div className="relative">
              <select
                value={selectedAudioId}
                onChange={(e) => handleAudioDeviceChange(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer pr-10"
              >
                {(probeResult?.audioInputs || []).length > 0 ? (
                  probeResult?.audioInputs.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">No Microphone Detected</option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-ink-muted absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME 12-SEGMENT AUDIO INPUT METER */}
      <div className="p-4 rounded-xl bg-inset border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-accent-cyan" />
            <span className="text-xs font-semibold text-ink">Microphone Level Test</span>
          </div>
          <span className="text-xs font-mono text-accent-cyan font-bold">{audioLevel}% Sensitivity</span>
        </div>

        {/* 12 Segment Visualizer */}
        <div className="grid grid-cols-12 gap-1.5 h-3.5 items-center">
          {Array.from({ length: 12 }).map((_, idx) => {
            const isActive = idx < segmentsActive;
            const isHigh = idx >= 9;
            const isMid = idx >= 6 && idx < 9;
            return (
              <div
                key={idx}
                className={`h-full rounded-md transition-all duration-75 ${
                  isActive
                    ? isHigh
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : isMid
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-surface border border-line'
                }`}
              />
            );
          })}
        </div>

        <p className="text-[11px] text-ink-muted flex items-center justify-between">
          <span>
            {hasLiveAudio
              ? audioLevel > 0
                ? 'Microphone ready — Listening...'
                : 'Microphone active — Speak to test sensitivity.'
              : 'No microphone input detected.'}
          </span>
        </p>
      </div>

      {/* SPEAKER OUTPUT DIAGNOSTIC */}
      <div className="p-4 rounded-xl bg-inset border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-accent-cyan" />
            <div>
              <span className="text-xs font-semibold text-ink block">Audio Output &amp; Speaker Check</span>
              {speakerConfirmed ? (
                <span className="text-[11px] text-accent-emerald flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-accent-emerald" />
                  <span>Speaker check confirmed</span>
                </span>
              ) : (
                <span className="text-[11px] text-ink-muted">
                  Test your speaker or confirm audio output is working.
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playTestChime}
              disabled={isPlayingChime}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                speakerConfirmed
                  ? 'bg-surface-2 hover:bg-surface-3 text-ink border border-line'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isPlayingChime ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isPlayingChime ? 'Playing Chime...' : speakerConfirmed ? 'Re-test Chime' : 'Play Test Chime'}</span>
            </button>
          </div>
        </div>

        {/* ALWAYS SHOW SPEAKER CONFIRMATION BUTTONS UNLESS CONFIRMED */}
        {!speakerConfirmed && (
          <div className="pt-2 border-t border-line flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-ink font-medium">Is your speaker/audio working?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConfirmSpeaker(true)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-accent-emerald hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                <span>Yes, Sounds Good</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSpeaker(false)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-line text-ink-muted hover:text-accent-rose text-xs font-medium transition-colors cursor-pointer"
              >
                No, Change Speaker
              </button>
            </div>
          </div>
        )}

        {speakerNeedsChange && (
          <div className="pt-2 border-t border-line space-y-2 text-xs">
            <p className="text-accent-amber font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Mobile / Browser Output Guidance</span>
            </p>
            <p className="text-ink-muted text-[11px] leading-relaxed">
              Speaker selection is controlled by your device/browser on mobile Chrome. Please adjust your phone volume keys or choose output in Android device settings.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmSpeaker(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-accent-emerald text-xs font-bold transition-colors cursor-pointer"
              >
                Sound is Working Now 
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
