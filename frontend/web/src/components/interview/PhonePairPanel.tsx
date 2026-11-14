'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMediaSource } from '@/lib/media/MediaSourceProvider';
import {
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cable,
  AlertTriangle,
} from 'lucide-react';
import { ConnectionState } from 'livekit-client';

interface PhonePairPanelProps {
  className?: string;
  forceOpen?: boolean;
}

export const PhonePairPanel: React.FC<PhonePairPanelProps> = ({
  className = '',
  forceOpen = false,
}) => {
  const {
    source,
    missing,
    status,
    phoneStatus,
    pairing,
    probeResult,
    startPairing,
    cancelPairing,
    retryLocal,
  } = useMediaSource();

  const [copied, setCopied] = useState<boolean>(false);
  const [showUsbHelp, setShowUsbHelp] = useState<boolean>(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualOpen, setManualOpen] = useState<boolean>(false);

  // Determine if panel should be auto-visible (missing hardware ONLY after probing completes, and not yet streaming from phone, or forced open)
  const isHardwareMissing =
    status !== 'idle' &&
    status !== 'probing' &&
    (missing.camera || missing.mic) &&
    source !== 'phone';
  const isOpen = forceOpen || manualOpen || isHardwareMissing;

  // Auto-start pairing ONLY when the phone dropped mid-room (forceOpen): the
  // candidate needs an immediate reconnect path, so mint the QR straight away.
  // The lobby path never starts a QR silently — QR mint is an explicit user
  // action ("Open pairing" → "Generate QR") so we don't surprise anyone.
  useEffect(() => {
    if (forceOpen && !pairing && source !== 'phone') {
      startPairing();
    }
  }, [forceOpen, pairing, source, startPairing]);

  // Countdown timer for pairing token expiry
  useEffect(() => {
    if (!pairing?.expiresAt) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [pairing?.expiresAt]);

  const secondsRemaining = pairing?.expiresAt
    ? Math.max(0, Math.floor((new Date(pairing.expiresAt).getTime() - now) / 1000))
    : null;

  const isExpired = secondsRemaining !== null && secondsRemaining <= 0;

  // Copy URL Helper
  const handleCopy = () => {
    if (pairing?.qrUrl && typeof navigator !== 'undefined') {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(pairing.qrUrl).catch(() => {});
      } else {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = pairing.qrUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch {
          // fallback ignore
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRescanDevices = async () => {
    setIsScanning(true);
    await retryLocal();
    setTimeout(() => setIsScanning(false), 800);
  };

  // Formatted countdown string (MM:SS)
  const formattedCountdown = useMemo(() => {
    if (secondsRemaining === null) return '--:--';
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  // Phone Connection Status text
  const phoneStatusDescription = useMemo(() => {
    if (source === 'phone' && !forceOpen) {
      return {
        title: 'Phone Connected & Streaming',
        detail: 'Desktop is receiving video & microphone feed directly from your phone.',
        color: 'text-inverse-emerald',
      };
    }
    if (phoneStatus === ConnectionState.Connecting) {
      return {
        title: 'Phone Handshake in Progress...',
        detail: 'Negotiating encrypted peer connection with your mobile device.',
        color: 'text-inverse-amber',
      };
    }
    if (phoneStatus === ConnectionState.Reconnecting) {
      return {
        title: 'Reconnecting Phone Feed...',
        detail: 'Network hiccup detected, restoring connection.',
        color: 'text-inverse-amber',
      };
    }
    if (pairing == null) {
      return {
        title: 'Link your phone as the camera & mic',
        detail: 'Mint a single-use, 5-minute pairing code. Your phone needs no app — it streams straight through the browser.',
        color: 'text-inverse-cyan',
      };
    }
    if (isExpired) {
      return {
        title: 'QR Code Expired',
        detail: 'Pairing codes have a 5-minute security TTL. Generate a new code to pair.',
        color: 'text-inverse-rose',
      };
    }
    return {
      title: 'Waiting for Mobile Connection',
      detail: 'Scan the QR code with your phone camera or open the link.',
      color: 'text-inverse-cyan',
    };
  }, [source, forceOpen, phoneStatus, isExpired]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* TRIGGER LINK: "Use my phone instead" (visible when not currently streaming from phone and not forced open) */}
      {source !== 'phone' && !forceOpen && (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setManualOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-accent-cyan hover:opacity-75 transition-colors cursor-pointer group"
          >
            <Smartphone className="w-4 h-4 text-accent-cyan group-hover:scale-110 transition-transform" />
            <span>
              {isOpen ? 'Hide Phone Pairing QR' : 'No webcam or mic? Use your phone instead'}
            </span>
          </button>

          {isHardwareMissing && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-accent-amber">
              CAMERA/MIC UNAVAILABLE
            </span>
          )}
        </div>
      )}

      {/* ACTIVE PHONE STREAM NOTIFICATION (When streaming normally and not forced open for reconnect) */}
      {source === 'phone' && !forceOpen && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Phone Camera &amp; Mic Active</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your phone is streaming high-definition audio &amp; video for this interview.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cancelPairing}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Switch Back to Desktop
          </button>
        </div>
      )}

      {/* EXPANDED QR PAIRING CARD (Rendered when open or forceOpen) */}
      {(forceOpen || (isOpen && source !== 'phone')) && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Pair Your Smartphone</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    LiveKit SFU
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Zero installs required &bull; Works with iPhone &amp; Android
                </p>
              </div>
            </div>

            {/* Expiry Pill */}
            {secondsRemaining !== null && !isExpired && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>{formattedCountdown}</span>
              </div>
            )}
          </div>

          {/* VIRTUAL WEBCAM DETECTED BANNER (If DroidCam / Iriun is installed) */}
          {probeResult?.virtualCameraDetected && (
            <div className="p-3.5 rounded-xl bg-cyan-950/50 text-xs text-cyan-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-cyan-300">
                  Detected {probeResult.virtualCameraName} on this Computer
                </div>
                <p className="text-cyan-200/80 leading-relaxed text-[11px]">
                  Your computer already has a virtual phone webcam driver installed. You can select it directly in the Camera Device dropdown above!
                </p>
              </div>
            </div>
          )}

          {/* QR CODE & INSTRUCTIONS SPLIT */}
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* QR Viewport */}
            <div className="relative p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl flex items-center justify-center shrink-0">
              {pairing?.qrUrl && !isExpired ? (
                <QRCodeSVG
                  value={pairing.qrUrl}
                  size={160}
                  bgColor="#020617"
                  fgColor="#38BDF8"
                  level="M"
                />
              ) : pairing == null ? (
                <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-center gap-2 px-3">
                  <QrCode className="w-8 h-8 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Pairing code not yet generated
                  </span>
                  <span className="text-[10px] text-slate-500 leading-snug">
                    Mint a one-time, 5-minute session to link your phone as the camera &amp; mic.
                  </span>
                </div>
              ) : (
                <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-center p-2 text-rose-400">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <span className="text-xs font-semibold">QR Code Expired</span>
                </div>
              )}
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 flex-1 text-xs">
              <div className="space-y-1.5">
                <div className={`font-semibold text-xs ${phoneStatusDescription.color}`}>
                  {phoneStatusDescription.title}
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {phoneStatusDescription.detail}
                </p>
              </div>

              <ol className="space-y-2 text-slate-300 list-decimal list-inside text-[11px]">
                <li>Generate a pairing code on this device.</li>
                <li>Open your phone camera &amp; scan the QR.</li>
                <li>Tap <strong>&quot;Start Camera &amp; Mic&quot;</strong> on your phone.</li>
              </ol>

              {/* Action Buttons: Copy Link & New QR */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {pairing == null ? (
                  <button
                    type="button"
                    onClick={() => startPairing()}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Generate QR Code</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!pairing?.qrUrl || isExpired}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => startPairing()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>New QR</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE WIRED / USB HELP ACCORDION */}
          {!forceOpen && (
            <div className="border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowUsbHelp((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Cable className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Prefer a wired USB cable connection? (Low Wi-Fi latency)</span>
                </span>
                {showUsbHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showUsbHelp && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 text-xs text-slate-300 space-y-2.5">
                  <p className="leading-relaxed text-[11px] text-slate-400">
                    If your Wi-Fi is spotty or you want zero-latency physical streaming, you can use a virtual webcam app over USB:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-cyan-300 block mb-0.5">DroidCam</strong>
                      <span className="text-slate-400">Free, fast Android/iOS USB webcam client.</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-cyan-300 block mb-0.5">Iriun Webcam</strong>
                      <span className="text-slate-400">Supports up to 4K over USB and Wi-Fi.</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <strong className="text-cyan-300 block mb-0.5">Camo</strong>
                      <span className="text-slate-400">High-fidelity iOS/Android camera feed.</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      After connecting USB cable and starting the app:
                    </span>
                    <button
                      type="button"
                      onClick={handleRescanDevices}
                      disabled={isScanning}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>Re-scan Devices</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};