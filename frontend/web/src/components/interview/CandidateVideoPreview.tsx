'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { useMediaSource } from '@/lib/media/MediaSourceProvider';

interface CandidateVideoPreviewProps {
  name?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
  onVADActivityChange?: (isSpeaking: boolean) => void;
  className?: string;
}

export const CandidateVideoPreview: React.FC<CandidateVideoPreviewProps> = ({
  name = 'Candidate',
  isMuted = false,
  isVideoOff = false,
  onToggleMic,
  onToggleVideo,
  onVADActivityChange,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, source, toggleMic, toggleCamera } = useMediaSource();
  const [voiceLevel, setVoiceLevel] = useState<number>(0);

  // Attach provider stream to video element
  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    if (!stream || isVideoOff) {
      currentVideo.srcObject = null;
      return;
    }
    currentVideo.srcObject = stream;
    currentVideo.muted = true;
    currentVideo.playsInline = true;
    currentVideo.autoplay = true;

    const attemptPlay = () => {
      currentVideo.play().catch((err) => {
        console.warn('[CandidateVideoPreview] Play notice:', err);
      });
    };

    if (currentVideo.readyState >= 1) {
      attemptPlay();
    } else {
      currentVideo.addEventListener('loadedmetadata', attemptPlay, { once: true });
    }

    return () => {
      currentVideo.removeEventListener('loadedmetadata', attemptPlay);
    };
  }, [stream, isVideoOff]);

  // Web Audio API VAD Level on provider stream
  useEffect(() => {
    if (!stream || isMuted) {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    let isCancelled = false;
    let animationFrameId: number;
    let audioCtx: AudioContext | null = null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const audioSource = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioSource.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVAD = () => {
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
        const lvl = Math.min(100, Math.round((avg / 128) * 100));
        setVoiceLevel(lvl);

        if (lvl > 15) {
          onVADActivityChange?.(true);
        } else {
          onVADActivityChange?.(false);
        }

        animationFrameId = requestAnimationFrame(updateVAD);
      };
      updateVAD();
    } catch (e) {
      console.warn('Candidate video preview VAD error:', e);
    }

    return () => {
      isCancelled = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      setVoiceLevel(0);
      onVADActivityChange?.(false);
    };
  }, [stream, isMuted, onVADActivityChange]);

  const handleToggleMic = () => {
    toggleMic();
    onToggleMic?.();
  };

  const handleToggleVideo = () => {
    toggleCamera();
    onToggleVideo?.();
  };

  return (
    <div
      className={`relative w-full h-full min-h-[180px] sm:min-h-[220px] rounded-2xl border border-inverse-line bg-slate-950 overflow-hidden shadow-md flex items-center justify-center group ${className}`}
    >
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-inverse-ink-muted">
          <div className="w-12 h-12 rounded-full bg-inverse-surface-2 border border-inverse-line flex items-center justify-center">
            <User className="w-6 h-6 text-inverse-ink-muted" />
          </div>
          <p className="text-xs font-mono">{!stream ? 'No Camera Stream' : 'Camera Muted'}</p>
        </div>
      )}

      {/* Candidate Name & Audio VAD Level Indicator */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-slate-800/90 backdrop-blur-md text-xs font-mono z-10">
        <span className="text-slate-200 font-medium truncate max-w-[110px] sm:max-w-[140px]">{name}</span>
        <div className="flex items-center gap-0.5 h-3">
          <div
            className={`w-1 rounded-full transition-all ${
              voiceLevel > 10 ? 'bg-cyan-400 h-3' : 'bg-slate-700 h-1.5'
            }`}
          />
          <div
            className={`w-1 rounded-full transition-all ${
              voiceLevel > 25 ? 'bg-cyan-400 h-3.5' : 'bg-slate-700 h-1.5'
            }`}
          />
          <div
            className={`w-1 rounded-full transition-all ${
              voiceLevel > 50 ? 'bg-cyan-300 h-4' : 'bg-slate-700 h-1.5'
            }`}
          />
        </div>
      </div>

      {/* Media Controls (Mic & Camera Toggles) */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={handleToggleMic}
          className={`p-2 rounded-lg border backdrop-blur-md transition-colors cursor-pointer ${
            isMuted
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleToggleVideo}
          className={`p-2 rounded-lg border backdrop-blur-md transition-colors cursor-pointer ${
            isVideoOff
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-label={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
