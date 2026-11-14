'use client';

import React from 'react';
import { Volume2, Sparkles, RefreshCw, Mic as MicIcon, Send, Clock } from 'lucide-react';
import type { AnswerFlowState } from '@/app/candidate/interview/[id]/room/page';
import type { PlaybackState } from '@/lib/hooks/useInterviewerSpeech';

export interface InterviewQuestionAnswerPaneProps {
  turnIndex: number;
  totalTurns?: number;
  questionRemainingSeconds?: number | null;
  currentStageName: string;
  currentQuestion: string;
  sessionLoading: boolean;
  onReplayAudio: (text: string) => void;
  practiceFeedback: string | null;
  stream: MediaStream | null;
  isMuted: boolean;
  answerFlowState: AnswerFlowState;
  playbackState: PlaybackState;
  canAnswer: boolean;
  autoSubmitCountdown: number | null;
  autoSubmitPending: boolean;
  isThinkingPaused?: boolean;
  onExtendThinkingTime?: () => void;
  speechLanguage: string;
  onSpeechLanguageChange: (lang: string) => void;
  isRecording: boolean;
  isSpeechRecognizing: boolean;
  isUserEditingRef: React.MutableRefObject<boolean>;
  liveTranscript: string;
  liveInterimTranscript: string;
  liveCommittedTranscript: string;
  candidateAnswer: string;
  candidateAnswerRef: React.MutableRefObject<string>;
  setCandidateAnswer: React.Dispatch<React.SetStateAction<string>>;
  setSpeechTranscript: (t: string) => void;
  cancelSilenceTimer: () => void;
  isSubmitting: boolean;
  isTranscribing: boolean;
  isConcluding: boolean;
  apiError: string | null;
  retryTarget: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitAnswer: (answerText: string, source: 'manual') => void;
  onRetrySubmission: () => void;
}

export const InterviewQuestionAnswerPane: React.FC<InterviewQuestionAnswerPaneProps> = ({
  turnIndex,
  totalTurns,
  currentStageName,
  questionRemainingSeconds,
  currentQuestion,
  sessionLoading,
  onReplayAudio,
  practiceFeedback,
  stream,
  isMuted,
  answerFlowState,
  playbackState,
  canAnswer,
  autoSubmitCountdown,
  autoSubmitPending,
  isThinkingPaused,
  onExtendThinkingTime,
  speechLanguage,
  onSpeechLanguageChange,
  isRecording,
  isSpeechRecognizing,
  isUserEditingRef,
  liveTranscript,
  liveInterimTranscript,
  liveCommittedTranscript,
  candidateAnswer,
  candidateAnswerRef,
  setCandidateAnswer,
  setSpeechTranscript,
  cancelSilenceTimer,
  isSubmitting,
  isTranscribing,
  isConcluding,
  apiError,
  retryTarget,
  onStartRecording,
  onStopRecording,
  onSubmitAnswer,
  onRetrySubmission,
}) => {
  const activeAnswerText = (
    isUserEditingRef.current ? candidateAnswer : candidateAnswer || liveTranscript
  ).trim();
  const hasValidAnswer = activeAnswerText.length >= 3;
  const isAnsweringAllowed =
    Boolean(currentQuestion) &&
    !isSubmitting &&
    !isTranscribing &&
    !isConcluding &&
    answerFlowState !== 'AI_SPEAKING' &&
    playbackState !== 'PLAYING';

  return (
    <div className="w-full h-full p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-4 overflow-y-auto flex flex-col justify-between shadow-sm">
      <div className="space-y-3">
        <div className="border-b border-line pb-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono text-accent-cyan font-bold uppercase tracking-wide">
              Question {turnIndex > 0 ? turnIndex : 1} &bull; Stage: {currentStageName}
            </span>
            {questionRemainingSeconds !== null && questionRemainingSeconds !== undefined && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors shadow-sm ${
                  questionRemainingSeconds <= 20
                    ? 'bg-rose-500/15 border-rose-500/40 text-accent-rose animate-pulse'
                    : questionRemainingSeconds <= 45
                    ? 'bg-amber-500/15 border-amber-500/40 text-accent-amber'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-accent-cyan'
                }`}
                title="Allotted time remaining for this question before automatic progression"
              >
                <Clock className="w-3 h-3" />
                <span>
                  Question Time: {Math.floor(questionRemainingSeconds / 60)}:{String(questionRemainingSeconds % 60).padStart(2, '0')}
                </span>
              </span>
            )}
          </div>
          {currentQuestion && (
            <button
              type="button"
              onClick={() => onReplayAudio(currentQuestion)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Replay Audio</span>
            </button>
          )}
        </div>

        {sessionLoading || !currentQuestion ? (
          <div className="flex items-center gap-3 text-accent-cyan  py-4 px-3.5 rounded-xl bg-inset border border-line">
            <RefreshCw className="w-4 h-4 animate-spin text-accent-cyan " />
            <span className="text-xs font-mono font-medium text-accent-cyan ">Sarah is formulating the next question...</span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-inset text-xs sm:text-sm text-ink leading-relaxed font-sans font-medium">
            {currentQuestion}
          </div>
        )}

        {/* Practice Feedback Banner */}
        {practiceFeedback && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 text-xs text-accent-indigo space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 ">
              <Sparkles className="w-4 h-4" />
              <span>Interviewer Notes:</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{practiceFeedback}</p>
          </div>
        )}
      </div>

      {/* Candidate Answer Box & Primary Recording Action */}
      <div className="space-y-2.5 pt-3 border-t border-line">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-mono text-ink-muted font-medium">YOUR ANSWER:</label>

          {/* Microphone Status State Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
              !stream
                ? 'bg-amber-500/15 border-amber-500/40 text-accent-amber '
                : isMuted
                ? 'bg-rose-500/15 border-rose-500/40 text-accent-rose '
                : answerFlowState === 'AI_SPEAKING' || playbackState === 'PLAYING'
                ? 'bg-indigo-500/15 border-indigo-500/40 text-accent-indigo '
                : answerFlowState === 'SUBMITTING'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-accent-cyan '
                : answerFlowState === 'EVALUATING'
                ? 'bg-amber-500/15 border-amber-500/40 text-accent-amber  animate-pulse'
                : answerFlowState === 'SILENCE_PENDING'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-accent-cyan  animate-pulse'
                : answerFlowState === 'ANSWER_ACTIVE'
                ? 'bg-rose-500/15 border-rose-500/40 text-accent-rose  animate-pulse'
                : answerFlowState === 'LISTENING_FOR_ANSWER' && canAnswer
                ? 'bg-emerald-500/15 border-emerald-500/40 text-accent-emerald  animate-pulse'
                : 'bg-surface border-line text-ink'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !stream
                  ? 'bg-amber-500'
                  : isMuted
                  ? 'bg-rose-500'
                  : answerFlowState === 'AI_SPEAKING' || playbackState === 'PLAYING'
                  ? 'bg-indigo-500'
                  : answerFlowState === 'SUBMITTING'
                  ? 'bg-cyan-500 animate-spin'
                  : answerFlowState === 'EVALUATING'
                  ? 'bg-amber-500 animate-spin'
                  : answerFlowState === 'SILENCE_PENDING'
                  ? 'bg-cyan-600  animate-ping'
                  : answerFlowState === 'ANSWER_ACTIVE'
                  ? 'bg-rose-500 animate-ping'
                  : answerFlowState === 'LISTENING_FOR_ANSWER' && canAnswer
                  ? 'bg-emerald-500 animate-ping'
                  : 'bg-slate-400'
              }`}
            />
            {!stream
              ? 'Microphone Permission Required'
              : isMuted
              ? 'Muted'
              : answerFlowState === 'AI_SPEAKING' || playbackState === 'PLAYING'
              ? 'Interviewer Speaking'
              : answerFlowState === 'SUBMITTING'
              ? 'Submitting answer...'
              : answerFlowState === 'EVALUATING'
              ? 'Evaluating your answer...'
              : answerFlowState === 'SILENCE_PENDING'
              ? `Silence detected — submitting in ${autoSubmitCountdown ?? 5}s`
              : answerFlowState === 'ANSWER_ACTIVE'
              ? 'Recording Answer (Listening)'
              : answerFlowState === 'LISTENING_FOR_ANSWER' && canAnswer
              ? 'Listening — Speak to answer'
              : 'Microphone On'}
          </span>

          {/* Language / Locale Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-ink-muted uppercase font-mono tracking-wider">Locale:</span>
            <select
              value={speechLanguage}
              onChange={(e) => onSpeechLanguageChange(e.target.value)}
              aria-label="Speech Recognition Language"
              className="bg-surface border border-line text-ink text-xs rounded-lg px-2 py-0.5 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="en-IN">English (India)</option>
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>

        {/* Live Speech Recognition Preview Banner */}
        {(answerFlowState === 'ANSWER_ACTIVE' ||
          answerFlowState === 'SILENCE_PENDING' ||
          isRecording ||
          isSpeechRecognizing) &&
          !isUserEditingRef.current &&
          (liveTranscript || liveInterimTranscript) && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-500/15 text-xs font-mono text-accent-cyan">
              <span className="w-2 h-2 rounded-full bg-cyan-600  animate-ping shrink-0" />
              <span className="text-[11px] font-bold text-accent-cyan uppercase tracking-wider shrink-0">
                Live Preview:
              </span>
              <span className="truncate flex-1 text-ink font-medium">
                <span>{liveCommittedTranscript || liveTranscript}</span>
                {liveInterimTranscript && (
                  <span className="text-accent-cyan italic ml-1 font-semibold">{liveInterimTranscript}</span>
                )}
              </span>
            </div>
          )}

        {/* Thinking & Silence Auto-Submit Reassurance Banner */}
        {autoSubmitPending && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-500/10 text-xs text-ink transition-all shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-accent-cyan shrink-0 animate-pulse" />
              <span className="truncate">
                Natural pause detected. Wrapping up in <strong className="text-accent-cyan font-mono font-bold text-sm">{autoSubmitCountdown ?? 18}s</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onExtendThinkingTime && (
                <button
                  type="button"
                  onClick={onExtendThinkingTime}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-accent-amber border border-amber-500/40 font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5"
                  title="Pause auto-submit for 60s while you think"
                >
                  <span>✋ I need a moment</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onSubmitAnswer(activeAnswerText, 'manual')}
                disabled={!hasValidAnswer}
                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer text-xs"
              >
                Submit Answer
              </button>
            </div>
          </div>
        )}

        {isThinkingPaused && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 text-xs text-accent-amber transition-all">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-amber shrink-0" />
              <span>Thinking buffer active — take your time. Auto-submit is paused.</span>
            </div>
            <button
              type="button"
              onClick={() => onSubmitAnswer(activeAnswerText, 'manual')}
              disabled={!hasValidAnswer}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all cursor-pointer text-[11px]"
            >
              Ready to Submit
            </button>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              value={
                isUserEditingRef.current
                  ? candidateAnswer
                  : answerFlowState === 'ANSWER_ACTIVE' ||
                    answerFlowState === 'SILENCE_PENDING' ||
                    isRecording ||
                    isSpeechRecognizing
                  ? liveTranscript || candidateAnswer
                  : candidateAnswer
              }
              onChange={(e) => {
                const val = e.target.value;
                setCandidateAnswer(val);
                candidateAnswerRef.current = val;
                isUserEditingRef.current = val.trim().length > 0;
                setSpeechTranscript(val);
                cancelSilenceTimer();
              }}
              placeholder={
                answerFlowState === 'ANSWER_ACTIVE' || isRecording || isSpeechRecognizing
                  ? 'Listening... your spoken words will appear here live...'
                  : 'Please record your answer, or type it here...'
              }
              rows={2}
              disabled={
                isSubmitting ||
                sessionLoading ||
                isConcluding ||
                !Boolean(currentQuestion) ||
                answerFlowState === 'SUBMITTING' ||
                answerFlowState === 'EVALUATING'
              }
              className="flex-1 bg-inset border border-line rounded-xl p-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-cyan-500/50 resize-none font-sans disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (hasValidAnswer && isAnsweringAllowed) {
                    onSubmitAnswer(activeAnswerText, 'manual');
                  }
                }
              }}
            />
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => (isRecording ? onStopRecording() : onStartRecording())}
                disabled={!isAnsweringAllowed && !isRecording}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-surface-2 hover:bg-surface-3 text-ink border border-line disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {isTranscribing ||
                isSubmitting ||
                answerFlowState === 'SUBMITTING' ||
                answerFlowState === 'EVALUATING' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MicIcon className="w-4 h-4" />
                )}
                <span>
                  {isRecording
                    ? 'Stop Recording'
                    : isTranscribing
                    ? 'Transcribing...'
                    : isSubmitting || answerFlowState === 'SUBMITTING'
                    ? 'Submitting...'
                    : answerFlowState === 'EVALUATING'
                    ? 'Evaluating...'
                    : 'Start Answer'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSubmitAnswer(activeAnswerText, 'manual')}
                disabled={
                  !isAnsweringAllowed ||
                  !hasValidAnswer ||
                  isSubmitting ||
                  answerFlowState === 'SUBMITTING' ||
                  answerFlowState === 'EVALUATING'
                }
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                {isSubmitting || answerFlowState === 'SUBMITTING' || answerFlowState === 'EVALUATING' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting || answerFlowState === 'SUBMITTING'
                    ? 'Submitting...'
                    : answerFlowState === 'EVALUATING'
                    ? 'Evaluating...'
                    : 'Submit Answer'}
                </span>
              </button>
            </div>
          </div>

          {/* Explicit Retry Banner on Evaluation Error */}
          {apiError && candidateAnswer.trim() && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 text-xs text-accent-rose">
              <span className="truncate flex-1">Submission error. Your answer is preserved.</span>
              <button
                type="button"
                onClick={onRetrySubmission}
                disabled={isSubmitting}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
              >
                {retryTarget === 'QUESTION_TIMEOUT' ? 'Retry Timeout & Advance' : 'Retry Submission'}
              </button>
            </div>
          )}
        </div>

        {answerFlowState === 'SILENCE_PENDING' && autoSubmitPending && (
          <p className="text-xs text-accent-cyan font-semibold mt-1 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping inline-block" />
            <span>
              Silence detected — submitting in {autoSubmitCountdown ?? 5}s... Speak or type to cancel.
            </span>
          </p>
        )}
      </div>
    </div>
  );
};