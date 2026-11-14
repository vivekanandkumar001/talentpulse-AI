'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  createAudioAnalyser,
} from 'livekit-client';
import {
  isInAppBrowser,
  getInAppBrowserName,
  checkIsSecureContext,
  classifyCompanionError,
  type ErrorClassification,
} from '@/lib/companion-utils';
import { apiFetch } from '@/lib/api';
import {
  Camera,
  FlipHorizontal,
  Mic,
  Video,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Smartphone,
  Sparkles,
  WifiOff,
} from 'lucide-react';

interface RedeemResponse {
  livekitUrl: string;
  jwt: string;
  room: string;
  sessionId: string;
}

export default function PhoneCompanionPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  // Initial environment states (lazy initializers avoid synchronous setState in effects)
  const [isSecure] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return checkIsSecureContext();
  });

  const [inAppBrowserName] = useState<string | null>(() => {
    if (typeof navigator === 'undefined') return null;
    return isInAppBrowser(navigator.userAgent) ? getInAppBrowserName(navigator.userAgent) : null;
  });

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Pairing lifecycle state: 'checking' | 'ready' | 'starting' | 'live' | 'error'
  const [pageState, setPageState] = useState<'checking' | 'ready' | 'starting' | 'live' | 'error'>(() => {
    return !token ? 'error' : 'checking';
  });
  const [redeemData, setRedeemData] = useState<RedeemResponse | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorClassification | null>(() => {
    return !token ? classifyCompanionError(404, 'No pairing token provided in URL.') : null;
  });

  // Connection & media state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [micVolume, setMicVolume] = useState<number>(0);

  // Visibility & WakeLock state
  const [appSwitchWarning, setAppSwitchWarning] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  // Refs for WebRTC & Audio
  const roomRef = useRef<Room | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const analyserCleanupRef = useRef<(() => Promise<void>) | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Token Redemption on Mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    async function redeemToken() {
      try {
        const res = await apiFetch('/api/v1/companion/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile Companion',
          }),
        });

        if (isCancelled) return;

        if (!res.ok) {
          const classified = classifyCompanionError(res.status, 'Invalid or expired token.');
          setErrorDetails(classified);
          setPageState('error');
          return;
        }

        const data: RedeemResponse = await res.json();
        if (isCancelled) return;

        setRedeemData(data);
        sessionIdRef.current = data.sessionId;
        setPageState('ready');
      } catch (err) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Network error';
        setErrorDetails(classifyCompanionError(null, msg));
        setPageState('error');
      }
    }

    redeemToken();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  // ---------------------------------------------------------------------------
  // 2. Telemetry Helper (POST /api/v1/interview-sessions/${sessionId}/companion/event)
  // ---------------------------------------------------------------------------
  const sendCompanionEvent = useCallback(
    async (type: 'phone_connected' | 'phone_disconnected' | 'phone_reconnected') => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;

      try {
        await apiFetch(`/api/v1/interview-sessions/${currentSessionId}/companion/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            details: {
              facingMode,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            },
          }),
        });
      } catch {
        // Non-blocking telemetry
      }
    },
    [facingMode]
  );

  // ---------------------------------------------------------------------------
  // 3. Screen Wake Lock Management & Visibility Monitoring
  // ---------------------------------------------------------------------------
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch {
      // WakeLock may be rejected if battery saver is on; silently degrade
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {
        // Ignore
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-acquire wake lock when candidate returns
        requestWakeLock();
      } else if (document.visibilityState === 'hidden') {
        // Candidate backgrounded or switched apps
        setAppSwitchWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // ---------------------------------------------------------------------------
  // 4. Audio Analyser Volume Polling
  // ---------------------------------------------------------------------------
  const startAudioMeter = useCallback((audioTrack: LocalAudioTrack) => {
    try {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      if (analyserCleanupRef.current) {
        analyserCleanupRef.current();
        analyserCleanupRef.current = null;
      }

      const analyser = createAudioAnalyser(audioTrack, {
        cloneTrack: false,
        fftSize: 512,
        smoothingTimeConstant: 0.7,
      });

      analyserCleanupRef.current = analyser.cleanup;

      volumeIntervalRef.current = setInterval(() => {
        try {
          const vol = analyser.calculateVolume();
          const boosted = Math.min(1, vol * 2.8);
          setMicVolume(boosted);
        } catch {
          setMicVolume(0);
        }
      }, 70);
    } catch {
      setMicVolume(0);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 5. Connect to LiveKit Room & Publish Camera + Mic (Explicit User Gesture)
  // ---------------------------------------------------------------------------
  const handleStartCapture = async () => {
    if (!redeemData) return;

    setPageState('starting');
    setErrorDetails(null);

    try {
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          facingMode: 'user',
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        setConnectionStatus(state);
      });

      room.on(RoomEvent.Connected, () => {
        setConnectionStatus(ConnectionState.Connected);
        sendCompanionEvent('phone_connected');
        requestWakeLock();
      });

      room.on(RoomEvent.Reconnecting, () => {
        setConnectionStatus(ConnectionState.Reconnecting);
      });

      room.on(RoomEvent.Reconnected, () => {
        setConnectionStatus(ConnectionState.Connected);
        sendCompanionEvent('phone_reconnected');
        requestWakeLock();
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnectionStatus(ConnectionState.Disconnected);
        sendCompanionEvent('phone_disconnected');
      });

      // Connect to LiveKit SFU server
      await room.connect(redeemData.livekitUrl, redeemData.jwt);

      // Publish Camera (user facing, 720p, 24-30fps)
      await room.localParticipant.setCameraEnabled(true, {
        facingMode: 'user',
        resolution: { width: 1280, height: 720, frameRate: 30 },
      });

      // Attach local camera video track to preview element
      const camPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPublication?.videoTrack && videoElementRef.current) {
        camPublication.videoTrack.attach(videoElementRef.current);
      }

      // Publish Microphone (echo cancellation, noise suppression, auto gain)
      await room.localParticipant.setMicrophoneEnabled(true, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      // Start mic audio visualizer
      const micPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPublication?.audioTrack) {
        startAudioMeter(micPublication.audioTrack as LocalAudioTrack);
      }

      // Transition UI to live streaming state
      setPageState('live');
      setConnectionStatus(ConnectionState.Connected);
      requestWakeLock();
    } catch (err) {
      console.error('[Companion] Start error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorDetails(classifyCompanionError(null, msg));
      setPageState('error');
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Camera Flip (Front <-> Back)
  // ---------------------------------------------------------------------------
  const handleFlipCamera = async () => {
    const room = roomRef.current;
    if (!room) return;

    const nextFacing = facingMode === 'user' ? 'environment' : 'user';

    try {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const localVideoTrack = camPub?.videoTrack as LocalVideoTrack | undefined;

      if (localVideoTrack) {
        await localVideoTrack.restartTrack({
          facingMode: nextFacing,
          resolution: { width: 1280, height: 720, frameRate: 30 },
        });

        if (videoElementRef.current) {
          localVideoTrack.attach(videoElementRef.current);
        }
        setFacingMode(nextFacing);
      }
    } catch (flipErr) {
      console.warn('[Companion] Camera flip failed, falling back:', flipErr);
      try {
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setCameraEnabled(true, {
          facingMode: nextFacing,
          resolution: { width: 1280, height: 720, frameRate: 30 },
        });
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.videoTrack && videoElementRef.current) {
          camPub.videoTrack.attach(videoElementRef.current);
        }
        setFacingMode(nextFacing);
      } catch (err) {
        console.error('[Companion] Fallback flip error:', err);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Manual Reconnect
  // ---------------------------------------------------------------------------
  const handleManualReconnect = async () => {
    if (redeemData) {
      await handleStartCapture();
    } else {
      window.location.reload();
    }
  };

  // ---------------------------------------------------------------------------
  // 8. Cleanup Everything on Unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      if (analyserCleanupRef.current) {
        analyserCleanupRef.current();
        analyserCleanupRef.current = null;
      }
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {
          // Ignore
        }
        wakeLockRef.current = null;
      }
      if (roomRef.current) {
        try {
          void roomRef.current.disconnect().catch(() => {});
        } catch {}
        roomRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Copy Link Helper
  // ---------------------------------------------------------------------------
  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // ---------------------------------------------------------------------------
  // Connection Chip Status Config
  // ---------------------------------------------------------------------------
  const renderConnectionChip = () => {
    switch (connectionStatus) {
      case ConnectionState.Connected:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-inverse-emerald text-xs font-mono font-medium shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </div>
        );
      case ConnectionState.Connecting:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-inverse-amber text-xs font-mono font-medium">
            <RefreshCw className="w-3 h-3 animate-spin text-inverse-amber" />
            <span>Connecting</span>
          </div>
        );
      case ConnectionState.Reconnecting:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-inverse-amber text-xs font-mono font-medium">
            <RefreshCw className="w-3 h-3 animate-spin text-inverse-amber" />
            <span>Reconnecting</span>
          </div>
        );
      case ConnectionState.Disconnected:
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-inverse-surface-2/80 border border-inverse-line-strong text-inverse-ink-muted text-xs font-mono font-medium">
            <WifiOff className="w-3 h-3 text-inverse-ink-muted" />
            <span>Disconnected</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-inverse-ink flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0A0F1D]/90 border-b border-inverse-line/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-inverse-cyan">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-tight text-inverse-ink">
                Progeni<span className="text-inverse-cyan"> Atlas</span>
              </div>
              <div className="text-[10px] text-inverse-ink-muted font-mono">Companion Feed</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pageState === 'live' && renderConnectionChip()}
            {wakeLockActive && (
              <span
                title="Screen wake lock active"
                className="text-[10px] px-2 py-0.5 rounded bg-inverse-surface-2/80 border border-inverse-line-strong/60 text-inverse-ink-muted font-mono"
              >
                Wake Lock ON
              </span>
            )}
          </div>
        </div>
      </header>

      {/* WARNING / NOTIFICATION BANNERS */}
      <div className="w-full max-w-md mx-auto px-4 pt-3 space-y-2">
        {/* 1. Insecure Context Warning */}
        {!isSecure && (
          <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-inverse-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-inverse-amber">HTTPS Connection Required</div>
              <p className="text-amber-200/90 leading-relaxed">
                Mobile browsers require a secure HTTPS connection to stream camera &amp; microphone audio.
                Please ensure you open this URL over HTTPS or via a secure tunnel.
              </p>
            </div>
          </div>
        )}

        {/* 2. In-App Browser Warning */}
        {inAppBrowserName && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs space-y-2.5 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-inverse-rose shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-inverse-rose">
                  {inAppBrowserName} Browser Detected
                </div>
                <p className="text-rose-200/90 leading-relaxed">
                  In-app browsers frequently block WebRTC camera and microphone permissions. For a reliable interview feed, open this link in Chrome or Safari.
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-lg bg-rose-900/60 hover:bg-rose-900/80 border border-rose-500/40 text-white font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-inverse-emerald" />
                  <span>Link Copied! Open Chrome / Safari</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-inverse-rose" />
                  <span>Copy Link to Open in Safari/Chrome</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 3. App Switch / Background Warning */}
        {appSwitchWarning && (
          <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-start justify-between gap-2 shadow-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-inverse-amber shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-inverse-amber">Dhyan dein:</strong> Interview ke dauran app switch mat karo; camera ruk sakta hai. (Please keep this screen open).
              </p>
            </div>
            <button
              onClick={() => setAppSwitchWarning(false)}
              className="text-inverse-amber hover:text-amber-200 font-mono text-[11px] shrink-0 underline"
            >
              Theek hai
            </button>
          </div>
        )}
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4 flex flex-col justify-between space-y-4">
        {/* STATE: CHECKING / REDEEMING */}
        {pageState === 'checking' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-inverse-cyan animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/10 blur-xl"></div>
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-inverse-ink">Pairing with Desktop...</h2>
              <p className="text-xs text-inverse-ink-muted max-w-xs">
                Verifying single-use pairing token with Progeni Atlas interview session.
              </p>
            </div>
          </div>
        )}

        {/* STATE: ERROR / EXPIRED / INVALID */}
        {pageState === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-2 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-inverse-rose shadow-xl">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-xs">
              <h2 className="text-lg font-bold text-inverse-ink">
                {errorDetails?.title || 'Pairing Token Expired'}
              </h2>
              <p className="text-xs text-inverse-ink-muted leading-relaxed">
                {errorDetails?.message || 'Ask the desktop to show a new QR code.'}
              </p>
            </div>

            {errorDetails?.isExpiredOrUsed ? (
              <div className="p-4 rounded-xl bg-inverse-surface-2/80 border border-inverse-line text-left space-y-2 max-w-xs w-full text-xs text-inverse-ink-muted">
                <div className="font-semibold text-inverse-cyan flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Next Steps:
                </div>
                <p className="text-inverse-ink-muted leading-relaxed">
                  1. Return to your desktop interview screen.<br />
                  2. Click &quot;Phone as Camera&quot; to generate a fresh QR code.<br />
                  3. Scan the new QR code with your mobile camera.
                </p>
              </div>
            ) : (
              <button
                onClick={handleManualReconnect}
                className="w-full max-w-xs py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        )}

        {/* STATE: READY TO START (BIG USER GESTURE BUTTON REQUIRED) */}
        {pageState === 'ready' && (
          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 text-inverse-cyan mb-2">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-inverse-ink">Phone Companion Ready</h2>
              <p className="text-xs text-inverse-ink-muted max-w-xs mx-auto leading-relaxed">
                Pairing verified. Tap the button below to turn your phone into your interview camera and microphone.
              </p>
            </div>

            {/* BIG USER GESTURE BUTTON */}
            <button
              onClick={handleStartCapture}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold text-base flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Start Camera &amp; Mic</span>
            </button>

            {/* SETUP TIPS CARD */}
            <div className="p-4 rounded-2xl bg-inverse-surface-2/70 border border-inverse-line space-y-3">
              <div className="text-xs font-semibold text-inverse-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-inverse-cyan" />
                <span>Setup Guidelines</span>
              </div>
              <ul className="text-xs text-inverse-ink-muted space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-inverse-cyan">📱</span>
                  <span><strong>Stand &amp; Position:</strong> Phone ko stand pe rakho (horizontal/landscape).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-inverse-cyan">💡</span>
                  <span><strong>Lighting:</strong> Face clearly visible rahe, lighting samne se ho.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-inverse-cyan">⚡</span>
                  <span><strong>Battery:</strong> Charger laga do taaki interview ke dauran phone band na ho.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-inverse-cyan">🎧</span>
                  <span><strong>Headphones:</strong> Headphones use karo (echo aur feedback se bachne ke liye).</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STATE: STARTING / CONNECTING */}
        {pageState === 'starting' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-inverse-cyan shadow-xl">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-inverse-ink">Activating Camera &amp; Mic...</h2>
              <p className="text-xs text-inverse-ink-muted max-w-xs">
                Establishing LiveKit WebRTC peer connection. Please approve camera/mic permissions if prompted.
              </p>
            </div>
          </div>
        )}

        {/* STATE: LIVE STREAMING */}
        {pageState === 'live' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* SELF PREVIEW VIDEO CONTAINER */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-inverse-canvas border border-inverse-line shadow-2xl">
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* OVERLAY BADGES */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {renderConnectionChip()}
              </div>

              {/* FLIP CAMERA BUTTON */}
              <button
                onClick={handleFlipCamera}
                title="Flip Camera (Front/Back)"
                className="absolute top-3 right-3 p-2.5 rounded-full bg-inverse-surface-2/80 hover:bg-inverse-surface-2 backdrop-blur-md border border-inverse-line-strong/70 text-inverse-ink active:scale-90 transition-all shadow-md"
              >
                <FlipHorizontal className="w-4 h-4 text-inverse-cyan" />
              </button>

              {/* BOTTOM BAR INSIDE PREVIEW */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-[11px] text-inverse-ink-muted font-mono bg-inverse-canvas/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-inverse-line/80">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-inverse-cyan" />
                  <span>{facingMode === 'user' ? 'Front Camera' : 'Rear Camera'}</span>
                </span>
                <span>720p HD</span>
              </div>
            </div>

            {/* LIVE AUDIO LEVEL METER */}
            <div className="p-3.5 rounded-2xl bg-inverse-surface-2/80 border border-inverse-line/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-inverse-ink-muted font-medium">
                  {micVolume > 0.05 ? (
                    <Mic className="w-4 h-4 text-inverse-cyan animate-pulse" />
                  ) : (
                    <Mic className="w-4 h-4 text-inverse-ink-muted" />
                  )}
                  <span>Microphone Feed</span>
                </div>
                <span className="font-mono text-[10px] text-inverse-ink-muted">
                  {micVolume > 0.05 ? 'Capturing Voice' : 'Silent'}
                </span>
              </div>

              {/* Volume Bar Visualizer */}
              <div className="w-full h-2 rounded-full bg-inverse-canvas overflow-hidden flex">
                <div
                  className="h-full rounded-full transition-all duration-75 ease-out bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400"
                  style={{ width: `${Math.round(micVolume * 100)}%` }}
                />
              </div>
            </div>

            {/* ACTION / RECONNECT CONTROLS */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleFlipCamera}
                className="flex-1 py-3 px-4 rounded-xl bg-inverse-surface-2 hover:bg-inverse-surface-2 active:scale-[0.98] border border-inverse-line-strong/80 text-inverse-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <FlipHorizontal className="w-4 h-4 text-inverse-cyan" />
                <span>Flip Camera</span>
              </button>

              <button
                onClick={handleManualReconnect}
                className="flex-1 py-3 px-4 rounded-xl bg-inverse-surface-2 hover:bg-inverse-surface-2 active:scale-[0.98] border border-inverse-line-strong/80 text-inverse-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-inverse-amber" />
                <span>Reconnect</span>
              </button>
            </div>

            {/* SUMMARY TIPS REMINDER */}
            <div className="p-3.5 rounded-xl bg-inverse-surface-2/50 border border-inverse-line/60 text-[11px] text-inverse-ink-muted space-y-1.5">
              <div className="font-semibold text-inverse-ink-muted flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-inverse-cyan" />
                <span>Interview In Progress</span>
              </div>
              <p className="leading-relaxed">
                Phone ko stand pe rakho, landscape orientation me. Screen ko chalu rakhein aur switch na karein.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-inverse-line py-3 text-center text-[10px] text-inverse-ink-faint font-mono">
        Progeni Atlas Companion &bull; End-to-End Encrypted Peer Relay
      </footer>
    </div>
  );
}
