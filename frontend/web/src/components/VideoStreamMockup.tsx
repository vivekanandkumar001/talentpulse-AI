'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mic, MicOff, Video, VideoOff, CheckCircle } from 'lucide-react';

export const VideoStreamMockup: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [answerCompleted, setAnswerCompleted] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-inverse-surface-2 border border-inverse-line-strong shadow-2xl flex flex-col justify-between aspect-video min-h-[340px] sm:min-h-[400px]">
      
      {/* Candidate Video Stream Background Image */}
      <div className="absolute inset-0 z-0">
        {isVideoOn ? (
          <Image
            src="/interview-demo.jpg"
            alt="Candidate AI Video Interview"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="w-full h-full bg-inverse-surface flex items-center justify-center text-inverse-ink-muted font-sans text-sm">
            Camera Paused
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />
      </div>

      {/* 1. Top Header Bar */}
      <div className="relative top-0 left-0 right-0 p-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-inverse-line-strong">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-xs font-sans font-medium text-inverse-ink">
            Live AI Screening Session
          </span>
        </div>

        {/* Turn Progress Indicator */}
        <div className="px-3 py-1 rounded-full bg-black/60 border border-inverse-line-strong backdrop-blur-md">
          <span className="text-xs font-mono font-semibold text-inverse-cyan">
            Active Question
          </span>
        </div>
      </div>

      {/* 2. Floating Picture-in-Picture (PiP) AI Interviewer Avatar */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-12 right-3 z-30 w-32 sm:w-40 rounded-lg overflow-hidden bg-inverse-surface border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] p-2 backdrop-blur-md"
      >
        <div className="flex items-center space-x-1 mb-1">
          <span className="text-[10px] font-sans font-bold text-inverse-cyan uppercase tracking-tight block truncate">
            ≡ƒñû AI INTERVIEWER
          </span>
        </div>
        <div className="h-10 bg-inverse-surface rounded border border-cyan-500/40 flex items-center justify-center space-x-1 px-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
          {[0.6, 1.4, 0.8, 1.8, 1.1, 0.5, 1.3].map((factor, idx) => (
            <motion.span
              key={idx}
              animate={{ scaleY: [0.2, factor, 0.2] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', delay: idx * 0.08 }}
              className="w-1 bg-cyan-400 rounded-full h-6 origin-center z-10"
            />
          ))}
        </div>
        <span className="text-[9px] font-sans text-inverse-ink block text-center mt-1">
          ASKING QUESTION
        </span>
      </motion.div>

      {/* 3. Center AI Interviewer Question Box & Live Closed Captions */}
      <div className="relative z-20 p-3 sm:p-4 bg-black/85 border-t border-inverse-line backdrop-blur-md space-y-2">
        {/* AI Question Overlay */}
        <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-lg p-2.5">
          <span className="text-[10px] font-mono font-bold text-inverse-cyan uppercase tracking-wide block mb-1">
            QUESTION ASKED BY AI:
          </span>
          <p className="text-xs sm:text-sm font-semibold text-inverse-ink">
            {"Question is generated from the real candidate resume, job description and rubric."}
          </p>
        </div>

        {/* Candidate Live Closed Captions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-inverse-cyan font-bold uppercase">
            ≡ƒÄÖ∩╕Å CANDIDATE RESPONSE (LIVE SUBTITLES)
          </span>
          <div className="flex items-center space-x-1 h-3">
            {[0.5, 1.2, 0.4, 1.5, 0.7, 1.1].map((scaleFactor, index) => (
              <motion.span
                key={index}
                animate={{ scaleY: [0.3, scaleFactor, 0.3] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse', delay: index * 0.1 }}
                className="w-1 bg-cyan-400 rounded-full h-full origin-bottom"
              />
            ))}
          </div>
        </div>
        <p className="text-xs font-normal text-inverse-ink">
          {"The real candidate transcript appears here after the interview starts."}
        </p>

        {/* 4. Simple Call Controls Toolbar */}
        <div className="pt-2 flex items-center justify-between border-t border-inverse-line">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-full border transition-all ${
                isMuted
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-inverse-surface-2 border-inverse-line-strong text-inverse-ink hover:bg-inverse-surface-3'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-2 rounded-full border transition-all ${
                !isVideoOn
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-inverse-surface-2 border-inverse-line-strong text-inverse-ink hover:bg-inverse-surface-3'
              }`}
            >
              {!isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setAnswerCompleted(true)}
            className="px-4 py-2 rounded-full bg-[#10b981] hover:bg-[#059669] text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{answerCompleted ? 'Answer Submitted ✓' : 'Complete Answer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
