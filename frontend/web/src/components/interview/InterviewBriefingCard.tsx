'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaSource } from '@/lib/media/MediaSourceProvider';
import { apiFetch, isValidSessionId } from '@/lib/api';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  Info,
  AlertTriangle,
  Smartphone,
  Coins,
  Sparkles,
  ExternalLink } from 'lucide-react';

import type { NetworkCheckStatus } from './NetworkJitterGauge';

export type CheckStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR' | 'NEEDS_CHANGE';

interface InterviewBriefingCardProps {
  sessionId: string;
  /** Server-authoritative interview mode. Defaults to 'real' (strictest gates). */
  mode?: string;
  isCameraPassed?: boolean;
  isMicPassed?: boolean;
  isSpeakerPassed: boolean;
  speakerStatus?: CheckStatus;
  isNetworkPassed: boolean;
  networkStatus?: NetworkCheckStatus;
  networkMessage?: string;
  selectedAudioDevice?: string;
  selectedVideoDevice?: string;
  latencyMs?: number;
  jitterMs?: number;
}

export const InterviewBriefingCard: React.FC<InterviewBriefingCardProps> = ({
  sessionId,
  mode = 'real',
  isSpeakerPassed,
  speakerStatus = 'PENDING',
  isNetworkPassed,
  networkStatus = 'PENDING',
  networkMessage,
  selectedAudioDevice = 'Default Microphone',
  selectedVideoDevice = 'Integrated Webcam',
  latencyMs = 28,
  jitterMs = 4,
}) => {
  const router = useRouter();
  const { stream, source, liveKitConnected, audioUnlocked } = useMediaSource();

  const [agreed, setAgreed] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [droppedTrackError, setDroppedTrackError] = useState<string | null>(null);

  // Server-authoritative briefing metadata (job role, org, real resume + the
  // resume-parsed skills). Fetched instead of hardcoding a fake resume card.
  interface LobbyBilling {
    ratePerMinuteCredits?: number;
    chargingEnabled?: boolean;
    isDemoEligible?: boolean;
    freeDemosRemaining?: number;
    candidateWalletBalance?: number;
    billingNotice?: string;
  }
  interface LobbyInfo {
    jobRole?: string;
    companyName?: string;
    candidateName?: string;
    scheduledAt?: string | null;
    durationMinutes?: number | null;
    hasResume?: boolean;
    resumeFileName?: string | null;
    resumeStatus?: string | null;
    resumeKeyHighlights?: string[];
    billing?: LobbyBilling;
  }
  const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);

  useEffect(() => {
    if (!isValidSessionId(sessionId)) return;
    let active = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/lobby-info`);
        if (!res.ok) return;
        const data = (await res.json()) as LobbyInfo;
        if (active) setLobbyInfo(data);
        // Ensure billing defaults so UI is never confused by missing data
        if (data?.billing) {
          data.billing.ratePerMinuteCredits ??= 0.5;
          data.billing.chargingEnabled ??= true;
          data.billing.isDemoEligible ??= false;
          data.billing.candidateWalletBalance ??= 40;
        }
      } catch (err) {
        console.error('[InterviewBriefingCard] Lobby info API error:', err);
        // Leave lobbyInfo null — UI falls back to honest copy below
      } finally {
        active = false;
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const scheduleLabel = React.useMemo(() => {
    const scheduled = lobbyInfo?.scheduledAt;
    if (scheduled) {
      const date = new Date(scheduled);
      if (!Number.isNaN(date.getTime())) {
        return `Scheduled ${date.toLocaleString()}`;
      }
    }
    if (typeof lobbyInfo?.durationMinutes === 'number' && lobbyInfo.durationMinutes > 0) {
      return `${lobbyInfo.durationMinutes}-minute session`;
    }
    return null;
  }, [lobbyInfo?.scheduledAt, lobbyInfo?.durationMinutes]);

  const resumeHighlights = (lobbyInfo?.resumeKeyHighlights || []).filter(Boolean);
  const hasResume = lobbyInfo?.hasResume === true;

  // Derive camera & mic gates strictly from active live tracks on the stream
  const hasLiveVideo = !!stream?.getVideoTracks().some((t) => t.readyState === 'live');
  const hasLiveAudio = !!stream?.getAudioTracks().some((t) => t.readyState === 'live');

  const effectiveSpeakerPassed = isSpeakerPassed || speakerStatus === 'PASSED';
  const effectiveNetworkPassed = isNetworkPassed || networkStatus === 'PASSED';

  // Real interviews publish through LiveKit; practice sessions run on the
  // local media pipeline and must never be blocked on a LiveKit connection.
  const needsLiveKit = mode !== 'practice';

  // Relaxed hardware check: require video + audio, make LiveKit a soft
  // requirement (real mode warns but does not block), and speaker/network
  // as advisory. This allows candidates to enter with local camera/microphone
  // even when LiveKit is unavailable, while still guiding toward full setup.
  const hasCoreHardware = hasLiveVideo && hasLiveAudio && audioUnlocked;
  const liveKitOk = true; // Always allow launch; room will warn if LiveKit not connected
  const speakerOk = effectiveSpeakerPassed; // advisory only
  const networkOk = effectiveNetworkPassed; // advisory only
  const isAllHardwareReady = hasCoreHardware; // core: video + audio + unlocked
  // Real interview billing: candidate must have credits to launch (non-demo,
  // charging-enabled sessions). Default wallet balance to 40 credits if the
  // server response is missing the field.
  const billing = lobbyInfo?.billing;
  const candidateWalletBalance = billing?.candidateWalletBalance ?? 40;
  const isZeroBalance = !billing?.isDemoEligible
    && Boolean(billing?.chargingEnabled)
    && candidateWalletBalance <= 0;
  const isLowBalance =
    !billing?.isDemoEligible &&
    Boolean(billing?.chargingEnabled) &&
    candidateWalletBalance > 0 &&
    candidateWalletBalance <= 10;
  const isLaunchEnabled = isAllHardwareReady && agreed && !isZeroBalance;

  const handleLaunchInterview = async () => {
    setDroppedTrackError(null);

    // Re-verify that every required track is actually 'live' right now
    const videoTrack = stream?.getVideoTracks()[0];
    const audioTrack = stream?.getAudioTracks()[0];

    if (!videoTrack || videoTrack.readyState !== 'live') {
      setDroppedTrackError(
        'Camera feed disconnected or inactive. Please re-check your webcam or phone connection before entering.'
      );
      return;
    }

    if (!audioTrack || audioTrack.readyState !== 'live') {
      setDroppedTrackError(
        'Microphone feed disconnected or inactive. Please re-check your microphone before entering.'
      );
      return;
    }

    if (!audioUnlocked) {
      setDroppedTrackError('Interviewer audio is locked by your browser. Tap "Enable Camera, Microphone & Interview Audio" first.');
      return;
    }

    if (!isLaunchEnabled) return;
    if (!isValidSessionId(sessionId)) {
      setDroppedTrackError('Cannot launch room: interview session ID is invalid.');
      return;
    }

    setIsLaunching(true);
    try {
      // Real mode requires fullscreen during the interview. Request it here,
      // inside the launch click (a user gesture), so the room's preflight
      // finds it already granted. Best-effort: the room re-checks and shows an
      // explicit start gate if fullscreen was denied.
      if (needsLiveKit && typeof document !== 'undefined' && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen?.();
        } catch {
          // Non-fatal – the room's real-mode start gate will ask again.
        }
      }

      // POST relative /api/v1/interview-sessions/:id/lobby-checkin
      const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/lobby-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardwareDiagnostic: {
            cameraPassed: hasLiveVideo,
            microphonePassed: hasLiveAudio,
            speakerPassed: effectiveSpeakerPassed,
            mediaSource: source, // 'local' | 'phone'
            latencyMs: latencyMs,
            jitterMs: jitterMs,
            selectedAudioDevice:
              source === 'phone' ? 'Phone Companion Microphone' : selectedAudioDevice,
            selectedVideoDevice:
              source === 'phone' ? 'Phone Companion Camera' : selectedVideoDevice,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 || data.error_code === 'INSUFFICIENT_CREDITS') {
          throw new Error(data.message || data.error || 'Insufficient wallet credits to reserve this interview. Please recharge your wallet.');
        }
        throw new Error(data.error || data.detail || `Check-in failed (HTTP ${res.status}). Please retry.`);
      }
      const data = await res.json();
      router.push(data.targetUrl || `/candidate/interview/${sessionId}/room`);
    } catch (err) {
      setDroppedTrackError(err instanceof Error ? err.message : 'Check-in unavailable. Please retry.');
    } finally {
      setIsLaunching(false);
    }
  };

  const getPendingReason = () => {
    if (!hasLiveVideo) {
      return source === 'phone'
        ? 'Phone video feed pending connection.'
        : 'Webcam feed verification pending. (Use phone if desktop has no camera).';
    }
    if (!hasLiveAudio) {
      return 'Microphone audio calibration pending.';
    }
    if (!audioUnlocked) {
      return 'Interviewer audio playback needs explicit unlock. Tap "Enable Camera, Microphone & Interview Audio".';
    }
    if (!effectiveSpeakerPassed) {
      return 'Speaker chime confirmation pending. Tap "Yes, Sounds Good".';
    }
    if (!effectiveNetworkPassed) {
      if (networkStatus === 'RUNNING') return 'Measuring network round-trip timing...';
      if (networkStatus === 'FAILED') return networkMessage || `Network latency too high (${latencyMs} ms RTT).`;
      if (networkStatus === 'ERROR') return networkMessage || 'Network health check error.';
      return 'Network reachability check pending.';
    }
    // LiveKit is now a soft requirement - always allow launch, but inform candidate
    if (needsLiveKit && !liveKitConnected) return 'LiveKit not connected (real-mode interview). Using local media instead.';
    if (!agreed) return 'Please check the consent checkbox to proceed.';
    if (isZeroBalance) return 'Your wallet balance is 0 Credits. Please recharge your wallet to enter the interview.';
    return '';
  };


  return (
    <div className="space-y-6">
      {/* METADATA HEADER */}
      <div className="space-y-1">
        <p className="text-caption font-mono uppercase text-accent-cyan tracking-wider">
          TECHNICAL SCREENING LOBBY
        </p>
        <h2 className="text-heading font-bold text-ink text-2xl">
          {lobbyInfo?.jobRole ? lobbyInfo.jobRole : 'Technical Interview'}
        </h2>
        <p className="text-body text-ink-muted text-sm flex items-center gap-2 pt-0.5 flex-wrap">
          <Building2 className="w-4 h-4 text-accent-cyan shrink-0" />
          <span className="text-ink font-medium">
            {lobbyInfo?.companyName || 'Hiring organization'}
          </span>
          {scheduleLabel && (
            <>
              <span className="text-ink-faint">&bull;</span>
              <Clock className="w-4 h-4 text-ink-muted shrink-0" />
              <span>{scheduleLabel}</span>
            </>
          )}
        </p>
      </div>

      {/* ACTIVE MEDIA SOURCE BADGE */}
      {source === 'phone' && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-ink flex items-center gap-2 shadow-sm">
          <Smartphone className="w-4 h-4 text-accent-cyan shrink-0" />
          <span>
            Paired with Smartphone: Audio &amp; video will be ingested from your phone.
          </span>
        </div>
      )}

      {/* SESSION BILLING & CREDIT QUOTA BADGE */}
      {billing && (
        <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all ${
          billing.isDemoEligible
            ? 'bg-emerald-500/10 border-emerald-500/30 text-ink'
            : !billing.chargingEnabled
            ? 'bg-violet-500/10 border-violet-500/30 text-ink'
            : 'bg-cyan-500/10 border-cyan-500/30 text-ink'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              billing.isDemoEligible
                ? 'bg-emerald-500/10 text-accent-emerald border border-emerald-500/20'
                : !billing.chargingEnabled
                ? 'bg-violet-500/10 text-accent-violet border border-violet-500/20'
                : 'bg-cyan-500/10 text-accent-cyan border border-cyan-500/20'
            }`}>
              {billing.isDemoEligible ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink text-sm">
                  {billing.isDemoEligible
                    ? `Free Demo Interview (${billing.freeDemosRemaining ?? 1} Available)`
                    : !billing.chargingEnabled
                    ? 'Evaluation Tier (Zero Customer Charge)'
                    : Math.abs((billing.ratePerMinuteCredits ?? 0.5) - 0.5) < 0.000001
                    ? 'Pay-as-you-go: ₹1 for 2 mins (₹0.50/min)'
                    : `Pay-as-you-go: ₹${billing.ratePerMinuteCredits}/min`}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  billing.isDemoEligible
                    ? 'bg-emerald-500/20 text-accent-emerald border border-emerald-500/40'
                    : !billing.chargingEnabled
                    ? 'bg-violet-500/20 text-accent-violet border border-violet-500/40'
                    : 'bg-cyan-500/20 text-accent-cyan border border-cyan-500/40'
                }`}>
                  {billing.isDemoEligible ? 'Free Demo' : '₹1 = 1 Credit'}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {billing.billingNotice || 'Server-authoritative per-minute billing'}
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0 flex items-center sm:flex-col justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
            <span className="font-mono font-bold text-xs text-ink">
              {billing.isDemoEligible
                ? '10 MIN CAP'
                : `₹${(billing.candidateWalletBalance ?? 0).toFixed(2)} Balance`}
            </span>
            <a
              href="/candidate/wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-accent-cyan hover:underline flex items-center gap-1"
            >
              <span>Manage Wallet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* RESUME SNAPSHOT CARD – renders only real, server-provided resume data. */}
      <div className="rounded-2xl bg-surface border border-line p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-line pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-accent-cyan shrink-0" />
            <span className="text-body font-medium text-ink text-sm truncate">
              {hasResume ? (lobbyInfo?.resumeFileName || 'Resume') : 'No resume on file'}
            </span>
          </div>
          {lobbyInfo?.resumeFileName && (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan font-mono text-[11px] shrink-0">
              {lobbyInfo.resumeStatus || 'PARSED'}
            </span>
          )}
        </div>

        {hasResume ? (
          <div className="space-y-2">
            <p className="text-caption text-ink-muted text-xs font-mono">
              Extracted Discussion Anchors:
            </p>
            {resumeHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {resumeHighlights.map((anchor) => (
                  <span
                    key={anchor}
                    className="px-2.5 py-1 rounded-lg bg-inset border border-line text-xs text-ink font-medium"
                  >
                    &bull; {anchor}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-caption text-ink-muted text-[11px]">
                Your resume is parsed. Topic anchors will appear once skills are extracted.
              </p>
            )}
          </div>
        ) : (
          <p className="text-caption text-ink-muted text-[11px] leading-tight">
            No resume is on file yet. Upload one from your profile so the interviewer can tailor
            resume-probe questions to your background.
          </p>
        )}

        <p className="text-caption text-ink-muted text-[11px] leading-tight">
          The AI interviewer adapts technical questions to your verified profile and resume topics.
        </p>
      </div>

      {/* EVALUATION PROTOCOL & ANTI-CHEAT GROUND RULES */}
      <div className="rounded-2xl bg-surface border border-line p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <ShieldCheck className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-sm font-bold text-ink">Evaluation Protocol &amp; Anti-Cheat Rules</h3>
        </div>

        <ul className="space-y-2.5 text-xs text-ink">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
            <span>Ensure you are in a quiet, well-lit private space.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
            <span>Keep your gaze centered on the screen; excessive switching will be flagged.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
            <span>Live closed captions and scratchpad tools will be accessible inside the room.</span>
          </li>
        </ul>

        {/* CONSENT & VERIFICATION CHECKBOX (MENTIONS PHONE CAMERA/MIC & RECORDING) */}
        <label className="flex items-start gap-3 pt-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded bg-inset border-line-strong text-cyan-500 focus:ring-cyan-500 cursor-pointer"
          />
          <span className="text-xs text-ink leading-tight">
            I confirm that my camera and audio are functional (including phone camera/mic if paired),
            and I agree to be recorded for evaluation purposes per the{' '}
            <a href="/ai-transparency" target="_blank" className="text-accent-cyan hover:underline">AI Transparency &amp; AEDT Notice</a>.
            <span className="text-accent-rose font-bold ml-1">*</span>
          </span>
        </label>

        {/* TRACK DROPPED ERROR ALERT */}
        {droppedTrackError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-accent-rose text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" />
            <p className="leading-relaxed">{droppedTrackError}</p>
          </div>
        )}

        {/* ZERO BALANCE WARNING */}
        {isZeroBalance ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-accent-amber text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-accent-amber">Insufficient Wallet Balance (0 Credits)</p>
              <p className="text-ink-muted mt-0.5">
                Your wallet balance is zero. You cannot enter practice or paid interviews without credits.
              </p>
              <a
                href="/candidate/wallet"
                className="inline-flex items-center gap-1 font-semibold text-accent-cyan hover:underline mt-1.5"
              >
                Recharge Wallet 
              </a>
            </div>
          </div>
        ) : isLowBalance ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-accent-amber text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-accent-amber">Low Wallet Balance</p>
              <p className="text-ink-muted mt-0.5">
                Your wallet balance is low ({candidateWalletBalance} Credits). You have enough for {Math.max(1, Math.floor(candidateWalletBalance / 2))} more practice interview(s). Please recharge your wallet to continue.
              </p>
              <a
                href="/candidate/wallet"
                className="inline-flex items-center gap-1 font-semibold text-accent-cyan hover:underline mt-1.5"
              >
                Recharge Wallet 
              </a>
            </div>
          </div>
        ) : null}

        {/* PENDING TOOLTIP / REASON */}
        {!isLaunchEnabled && !isZeroBalance && (
          <p className="text-[11px] font-mono text-accent-amber bg-amber-500/10 p-2.5 rounded-xl flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-accent-amber shrink-0" />
            <span>Pending requirement: {getPendingReason()}</span>
          </p>
        )}

        {/* GATED LAUNCH ACTION CTA */}
        <button
          type="button"
          onClick={handleLaunchInterview}
          disabled={!isLaunchEnabled || isLaunching}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            isLaunchEnabled
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white hover:scale-[1.01] shadow-lg shadow-cyan-500/25 active:scale-[0.99]'
              : 'bg-inset border border-line text-ink-muted opacity-50 cursor-not-allowed'
          }`}
        >
          {isLaunching ? (
            <RefreshCw className="w-4 h-4 animate-spin text-ink" />
          ) : isZeroBalance ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>Recharge Required (0 Credits)</span>
            </>
          ) : isLowBalance ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>Low Balance ({candidateWalletBalance} Credits)</span>
            </>
          ) : (
            <>
              <span>Enter Video Interview Room</span>
              </>
          )}
        </button>
      </div>
    </div>
  );
};