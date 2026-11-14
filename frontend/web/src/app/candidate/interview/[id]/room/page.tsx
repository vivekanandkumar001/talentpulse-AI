'use client';

// Suppress TFLite/Emscripten WASM informational logs from triggering Next.js dev overlay
if (typeof window !== 'undefined' && !(window as unknown as Record<string, unknown>).__tflite_console_patched) {
  (window as unknown as Record<string, unknown>).__tflite_console_patched = true;
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    const firstArg = args[0];
    if (
      typeof firstArg === 'string' &&
      (firstArg.includes('TensorFlow Lite') ||
        firstArg.includes('XNNPACK delegate') ||
        firstArg.includes('INFO: Created'))
    ) {
      // eslint-disable-next-line no-console -- intentional: demotes noisy TFLite WASM "errors" to info so they don't trip the Next.js dev overlay.
      console.info(...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConnectionState } from 'livekit-client';
import { useMediaSource } from '@/lib/media/MediaSourceProvider';
import type { ProctoringHealthState } from '@/lib/proctoring/proctoringHealth';
import { useInterviewProctoring } from '@/lib/hooks/useInterviewProctoring';
import { useInterviewerSpeech, safeHash, logAudioEvent } from '@/lib/hooks/useInterviewerSpeech';
import { TelephonicBargeInController } from '@/lib/media/BargeInAudioController';
import { useInterviewAudioRecorder } from '@/lib/hooks/useInterviewAudioRecorder';
import { usePhoneCompanionSync } from '@/lib/hooks/usePhoneCompanionSync';
import { InterviewRoomHeader } from '@/components/interview/InterviewRoomHeader';
import { AIAvatarViewport, AIState } from '@/components/interview/AIAvatarViewport';
import { CandidateVideoPreview } from '@/components/interview/CandidateVideoPreview';
import { CodeEditorPane } from '@/components/interview/CodeEditorPane';
import { ArchitectureWhiteboardPane } from '@/components/interview/ArchitectureWhiteboardPane';
import { LiveClosedCaptions, CaptionEntry } from '@/components/interview/LiveClosedCaptions';
import { SessionExitModal } from '@/components/interview/SessionExitModal';
import {
  InvalidSessionScreen,
  MediaPreparingScreen,
  ProctoringWaitingScreen,
  FullscreenStartGateScreen,
  SessionExpiredScreen,
} from '@/components/interview/InterviewGateScreens';
import { InterviewStatusBanner } from '@/components/interview/InterviewStatusBanner';
import { InterviewQuestionAnswerPane } from '@/components/interview/InterviewQuestionAnswerPane';
import { PhoneDisconnectOverlay } from '@/components/interview/PhoneDisconnectOverlay';
import { ConcludingOverlay } from '@/components/interview/ConcludingOverlay';
import { useWebSpeechRecognition } from '@/lib/hooks/useWebSpeechRecognition';
import { resolveAnswerSubmissionText } from '@/lib/hooks/speechTranscript';
import {
  startInterviewSession,
  answerInterviewQuestion,
  timeoutInterviewQuestion,
  finishInterviewSession,
  getInterviewState,
  runInterviewPreflight,
  reportInterviewMediaState,
  retryInterviewStage,
  InterviewContract,
  apiFetch,
  isValidSessionId,
  type VoiceFailure,
} from '@/lib/api';
import {
  decrementDisplayedSeconds,
  readAuthoritativeSeconds,
  startInterviewCountdownTicker,
} from '@/lib/interviewCountdown';
import {
  Code2,
  Layers,
  FileText,
} from 'lucide-react';

const DEFAULT_FALLBACK_STAGES = [
  'Introduction',
  'Technical Probe',
  'Live Coding',
  'System Design',
  'Wrap-Up',
];

export type AnswerFlowState =
  | 'AI_SPEAKING'
  | 'LISTENING_FOR_ANSWER'
  | 'ANSWER_ACTIVE'
  | 'SILENCE_PENDING'
  | 'SUBMITTING'
  | 'EVALUATING'
  | 'AI_RESPONDING'
  | 'NEXT_QUESTION';

export default function LiveInterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || '';
  const sessionId = isValidSessionId(rawId) ? rawId : '';

  // Keep browser Back inside the candidate workflow. A room can be opened from
  // a deep link (with the public landing page behind it in history), so going
  // back should never strand the candidate on that landing page.
  useEffect(() => {
    if (!sessionId) return;

    window.history.pushState({ page: 'candidate-interview-room', sessionId }, '', window.location.href);
    const handlePopState = () => router.replace('/candidate/dashboard');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router, sessionId]);

  // Media Provider State
  const { source, stream, phoneStatus, status: mediaStatus, liveKitConnected, startPairing, retryLocal, audioUnlocked, unlockAudio } = useMediaSource();

  // Session Turn State – always derived from the server contract
  const [serverState, setServerState] = useState<InterviewContract | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [turnIndex, setTurnIndex] = useState<number>(1);
  const [totalTurns, setTotalTurns] = useState<number>(5);
  const [stages, setStages] = useState<string[]>(DEFAULT_FALLBACK_STAGES);
  const [currentStageName, setCurrentStageName] = useState<string>('Introduction');
  const [sessionMode, setSessionMode] = useState<string>('real');
  const [apiError, setApiError] = useState<string | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [canAnswer, setCanAnswer] = useState<boolean>(false);
  const [retryTarget, setRetryTarget] = useState<string | null>(null);

  // Candidate Answer State & Explicit State Machine
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const candidateAnswerRef = useRef<string>('');
  useEffect(() => {
    candidateAnswerRef.current = candidateAnswer;
  }, [candidateAnswer]);

  const isUserEditingRef = useRef<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Explicit, race-safe candidate answer flow state machine:
  // AI_SPEAKING -> LISTENING_FOR_ANSWER -> ANSWER_ACTIVE -> SILENCE_PENDING -> SUBMITTING -> EVALUATING -> AI_RESPONDING -> NEXT_QUESTION
  const [answerFlowState, setAnswerFlowState] = useState<AnswerFlowState>('AI_SPEAKING');
  const answerFlowStateRef = useRef<AnswerFlowState>('AI_SPEAKING');
  const isAnswerCaptureClosedRef = useRef<boolean>(true);
  const questionGenerationTokenRef = useRef<number>(1);
  const hasStartedSpeakingRef = useRef<boolean>(false);

  const setFlowState = useCallback((nextState: AnswerFlowState) => {
    if (answerFlowStateRef.current === nextState) return;
    answerFlowStateRef.current = nextState;
    setAnswerFlowState(nextState);
  }, []);

  // Browser Speech Recognition for Live Real-Time Preview (configurable locale, default en-IN)
  const [speechLanguage, setSpeechLanguage] = useState<string>('en-IN');
  const cancelSilenceTimerRef = useRef<() => void>(() => { });
  const stopVadRef = useRef<() => void>(() => { });

  const {
    isListening: isSpeechRecognizing,
    transcript: liveTranscript,
    committedTranscript: liveCommittedTranscript,
    interimTranscript: liveInterimTranscript,
    isSupported: isWebSpeechSupported,
    startListening: startSpeechRecognition,
    stopListening: stopSpeechRecognition,
    resetTranscript: resetSpeechRecognition,
    setTranscript: setSpeechTranscript,
    getLatestTranscript,
  } = useWebSpeechRecognition({
    language: speechLanguage,
    onSpeechStart: () => {
      if (isAnswerCaptureClosedRef.current || isSubmittingRef.current) return;
      if (answerFlowStateRef.current === 'AI_SPEAKING' || answerFlowStateRef.current === 'SUBMITTING' || answerFlowStateRef.current === 'EVALUATING') return;

      cancelSilenceTimerRef.current();
      setFlowState('ANSWER_ACTIVE');
    },
    onTranscriptUpdate: (displayedText) => {
      if (isAnswerCaptureClosedRef.current || isSubmittingRef.current) return;
      if (answerFlowStateRef.current === 'AI_SPEAKING' || answerFlowStateRef.current === 'SUBMITTING' || answerFlowStateRef.current === 'EVALUATING') return;

      cancelSilenceTimerRef.current();
      if (!isUserEditingRef.current && displayedText) {
        setCandidateAnswer(displayedText);
        candidateAnswerRef.current = displayedText;
      }
    },
  });
  // Lets the async recorder callback read the current question without
  // re-subscribing the answer handler on every turn.
  const activeQuestionRef = useRef<string | null>(null);
  const question_id_ref = useRef<string | null>(null);
  const submitQuestionTimeoutRef = useRef<((expiredQuestionId: string, partialAnswer: string) => Promise<boolean>) | null>(null);
  useEffect(() => {
    activeQuestionRef.current = questionId;
    question_id_ref.current = questionId;
  }, [questionId]);

  // Session & Workspace State
  const [activeTab, setActiveTab] = useState<'code' | 'whiteboard' | 'context'>('context');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [questionRemainingSeconds, setQuestionRemainingSeconds] = useState<number | null>(null);
  const [deadlineStatus, setDeadlineStatus] = useState<
    'loading' | 'active' | 'question-expired' | 'advancing' | 'interview-expired' | 'completed' | 'network-error'
  >('loading');
  const [isConcluding, setIsConcluding] = useState<boolean>(false);
  const [concludingMessage, setConcludingMessage] = useState<string>('');

  const applyContract = useCallback((contract: InterviewContract) => {
    setServerState(contract);
    const mode = contract.mode || 'real';
    setSessionMode(mode);
    setTotalTurns(contract.total_turns ?? 5);
    if (contract.turn_index !== null && contract.turn_index !== undefined) setTurnIndex(Math.max(1, contract.turn_index));
    if (contract.question) setCurrentQuestion(contract.question);
    setQuestionId(contract.question_id ?? null);
    setCanAnswer(Boolean(contract.can_answer));
    setRemainingSeconds(readAuthoritativeSeconds(contract.remaining_time_seconds));
    setQuestionRemainingSeconds(readAuthoritativeSeconds(contract.question_remaining_seconds));
    const state = String(contract.state || '').toUpperCase();
    if (state === 'COMPLETED' || contract.status === 'completed' || contract.finished || contract.remaining_time_seconds === 0) {
      setDeadlineStatus('interview-expired');
      if (sessionId && !isConcludingRef.current) {
        void triggerSessionConclusion('time_expired');
      }
    } else if (contract.question_expired) {
      setDeadlineStatus('question-expired');
    } else if (state === 'QUESTION_GENERATING') {
      setDeadlineStatus('advancing');
    } else if (contract.can_answer) {
      setDeadlineStatus('active');
    } else {
      setDeadlineStatus('loading');
    }
    if (Array.isArray(contract.stages) && contract.stages.length > 0) {
      setStages(contract.stages);
    }
    const activeStages = (Array.isArray(contract.stages) && contract.stages.length > 0)
      ? contract.stages
      : DEFAULT_FALLBACK_STAGES;
    const turnIdx = Math.max(0, (contract.turn_index ?? 1) - 1);
    const mappedStage = contract.current_stage || activeStages[Math.min(turnIdx, activeStages.length - 1)] || activeStages[0];
    setCurrentStageName(mappedStage);
  }, []);

  // AI & Media State
  const [aiState, setAiState] = useState<AIState>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const isMutedRef = useRef<boolean>(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  // Real mode only: the interview start waits behind an explicit button so the
  // fullscreen requirement is entered from a genuine user gesture.
  const [needsRealStartGate, setNeedsRealStartGate] = useState<boolean>(false);

  const handleViolationTerminated = useCallback(() => {
    setAiState('idle');
  }, []);

  // Proctoring Engine Hook (MediaPipe FaceLandmarker, focus/tab-switch/fullscreen tracking)
  const {
    proctoringHealthState,
    proctoringStatus,
    proctoringReady,
    proctoringUnavailable,
    proctoringAlertBanner,
    proctoringWarningCount,
    bindProctoringVideo,
    recordProctoringEvent,
    proctoringFaceCountRef,
  } = useInterviewProctoring({
    sessionId,
    stream,
    isInterviewActive: Boolean(serverState && [
      'INTERVIEW_STARTED', 'AI_GREETING', 'QUESTION_GENERATING', 'QUESTION_READY',
      'INTERVIEWER_SPEAKING', 'LISTENING', 'CANDIDATE_RESPONDING', 'TRANSCRIBING',
      'ANSWER_READY', 'EVALUATING', 'INTERVIEWER_RESPONDING', 'FOLLOW_UP_OR_NEXT_QUESTION',
      'INTERVIEW_COMPLETING', 'FINAL_SCORING',
    ].includes(serverState.state)),
    onViolationTerminated: handleViolationTerminated,
  });

  // Subtitles Stream State
  const [subtitles, setSubtitles] = useState<CaptionEntry[]>([]);

  // Telephonic barge-in owns the interruption decision (AEC grace, sustained
  // speech hysteresis, lookback ring buffer, gain ducking). It is created once
  // below and fed PCM frames from the room VAD.
  const bargeInControllerRef = useRef<TelephonicBargeInController | null>(null);
  const bargeInHandlerRef = useRef<() => void>(() => { });
  // Live IDE Code Observation: Tracks candidate's real-time code and language
  const latestCodeRef = useRef<{ code: string; language: string }>({ code: '', language: 'python' });

  // Interviewer Speech & Audio Playback Hook
  const {
    playbackState,
    speakQuestion,
    playInstantBackchannel,
    stopCurrentPlayback,
    handleReplayAudio,
    activeDialogueIdRef,
    playedDialogueKeysRef,
    failedDialogueKeysRef,
    setPlaybackState,
    audioRef,
    getAudioAnalyser,
  } = useInterviewerSpeech({
    sessionId,
    stream,
    isMutedRef,
    onSpeechStart: () => {
      setAiState('speaking');
      setFlowState('AI_SPEAKING');
      isAnswerCaptureClosedRef.current = true;
      cancelSilenceTimerRef.current();
      stopSpeechRecognition();
    },
    onSpeechEnd: () => {
      setAiState('listening');
      setFlowState('LISTENING_FOR_ANSWER');
      isAnswerCaptureClosedRef.current = false;
      hasStartedSpeakingRef.current = false;
      if (sessionId) {
        void getInterviewState(sessionId).then((st) => applyContract(st as unknown as InterviewContract)).catch(() => { });
      }
    },
    onSpeechError: () => {
      setAiState('listening');
      setFlowState('LISTENING_FOR_ANSWER');
      isAnswerCaptureClosedRef.current = false;
      hasStartedSpeakingRef.current = false;
      if (sessionId) {
        void getInterviewState(sessionId).then((st) => applyContract(st as unknown as InterviewContract)).catch(() => { });
      }
    },
  });

  const speakQuestionRef = useRef(speakQuestion);
  useEffect(() => {
    speakQuestionRef.current = speakQuestion;
  }, [speakQuestion]);

  const enableInterviewerAudio = useCallback(async () => {
    try {
      await unlockAudio();
      setAiState('listening');
    } catch {
      setApiError('Interviewer audio could not be enabled in this browser.');
    }
  }, [unlockAudio]);

  const isConcludingRef = useRef(false);

  // Trigger Finalizing Overlay & Redirection: /report for practice, /dashboard for real
  const triggerSessionConclusion = useCallback(async (reason?: string) => {
    if (!sessionId || isConcludingRef.current) return;
    isConcludingRef.current = true;
    setIsConcluding(true);

    const isPractice = sessionMode === 'practice';
    const thankYouSpoken = isPractice
      ? 'Thank you so much for your effort! The practice drill is now complete. We are generating your scorecard and evaluation report now.'
      : 'Thank you for your time and responses! Your interview has concluded. We are finalizing your evaluation and submitting your results.';

    setConcludingMessage(
      isPractice
        ? 'Thank you for completing your practice drill! Generating your scorecard and report...'
        : 'Thank you for completing your interview! Finalizing your responses and submitting results...'
    );

    setAiState('speaking');
    setSubtitles((prev) => [
      ...prev,
      { id: `conclusion-${Date.now()}`, speaker: 'Sarah Chen', text: thankYouSpoken },
    ]);

    stopCurrentPlayback('session_conclusion');
    stopSpeechRecognition();
    cancelSilenceTimerRef.current();

    // Speak thank you via Studio Human Voice asset so candidate hears real human voice
    try {
      const conclusionAudio = new Audio('/audio/voice/thank_you_conclusion.mp3');
      conclusionAudio.playbackRate = 1.0;
      void conclusionAudio.play().catch(() => {});
    } catch (err) {
      console.warn('Conclusion studio audio playback error:', err);
    }

    try {
      const finishPromise = finishInterviewSession(sessionId);
      // Wait at least 3.2 seconds so candidate hears the Thank You speech before redirect
      await Promise.allSettled([
        finishPromise,
        new Promise((resolve) => setTimeout(resolve, 3200)),
      ]);

      if (isPractice) {
        // Practice drill: Redirect to report page!
        router.replace(`/candidate/interview/${sessionId}/report`);
      } else {
        // Real interview: Close lobby and redirect to Dashboard!
        router.replace('/candidate/dashboard?interview_completed=true');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[triggerSessionConclusion Error]', msg);

      // If session was already marked completed or ended, proceed to redirect
      if (msg.includes('already') || msg.includes('COMPLETED') || msg.includes('ended')) {
        if (isPractice) {
          router.replace(`/candidate/interview/${sessionId}/report`);
        } else {
          router.replace('/candidate/dashboard?interview_completed=true');
        }
        return;
      }

      isConcludingRef.current = false;
      setIsConcluding(false);
      setRetryTarget('FINISH');
      setApiError(err instanceof Error ? err.message : 'The interview could not be finalized. Please retry.');
    }
  }, [router, sessionId, sessionMode, stopCurrentPlayback, stopSpeechRecognition]);

  const isPreflightInFlightRef = useRef(false);

  const runPreflightAndStart = useCallback(async (forcedMode?: string, isRetry?: boolean) => {
    if (!sessionId) return;
    if (isPreflightInFlightRef.current && !isRetry) {
      return;
    }
    isPreflightInFlightRef.current = true;
    setApiError(null);
    // Stop any currently playing dialogue before starting a new interview.
    stopCurrentPlayback('preflight_start');
    setAiState('initializing');
    const effectiveMode = forcedMode || sessionMode || 'real';
    const isRealMode = effectiveMode === 'real';

    const POST_PREFLIGHT_STATES = [
      'MEDIA_READY', 'INTERVIEW_STARTED', 'AI_GREETING', 'QUESTION_GENERATING',
      'QUESTION_READY', 'INTERVIEWER_SPEAKING', 'LISTENING', 'CANDIDATE_RESPONDING',
      'TRANSCRIBING', 'ANSWER_READY', 'EVALUATING', 'INTERVIEWER_RESPONDING',
      'FOLLOW_UP_OR_NEXT_QUESTION', 'INTERVIEW_COMPLETING', 'FINAL_SCORING', 'COMPLETED'
    ];

    try {
      // Step 1: Check server state first. If state is already MEDIA_READY or later, skip preflight.
      let currentState: string | undefined = undefined;
      try {
        const serverState = await getInterviewState(sessionId);
        currentState = serverState?.state;
      } catch {
        // Fall through if state fetch fails
      }

      const shouldSkipPreflight = currentState && POST_PREFLIGHT_STATES.includes(currentState);

      if (!shouldSkipPreflight) {
        try {
          await runInterviewPreflight(sessionId, {
            camera_ok: Boolean(stream?.getVideoTracks().length),
            microphone_ok: Boolean(stream?.getAudioTracks().length),
            requires_livekit: isRealMode,
            livekit_connected: isRealMode ? liveKitConnected : true,
            livekit_publishing: Boolean(stream && stream.getTracks().some((t) => t.readyState === 'live')),
            fullscreen: Boolean(document.fullscreenElement),
            face_detected: proctoringFaceCountRef.current > 0,
            face_count: proctoringFaceCountRef.current,
            proctoring_model_loaded: proctoringReady && !proctoringUnavailable,
          });
        } catch (preflightErr: any) {
          const errMsg = preflightErr instanceof Error ? preflightErr.message : String(preflightErr);
          const stateFromErr = preflightErr?.current_state;
          const is409OrMediaReady = preflightErr?.status_code === 409 ||
            stateFromErr === 'MEDIA_READY' ||
            (stateFromErr && POST_PREFLIGHT_STATES.includes(stateFromErr)) ||
            errMsg.includes('409') ||
            errMsg.includes('MEDIA_READY');

          if (!is409OrMediaReady) {
            throw preflightErr;
          }
        }
      }

      // Step 2: Proceed to /start session
      let data: InterviewContract;
      try {
        data = await startInterviewSession(sessionId);
      } catch (startErr: any) {
        const errMsg = startErr instanceof Error ? startErr.message : String(startErr);
        if (
          errMsg.includes('already has a start time') ||
          errMsg.includes('already started') ||
          errMsg.includes('409')
        ) {
          const state = await getInterviewState(sessionId);
          data = state as unknown as InterviewContract;
        } else {
          throw startErr;
        }
      }
      applyContract(data);
      setCandidateAnswer('');
      resetSpeechRecognition();
      stopSpeechRecognition();
      isUserEditingRef.current = false;
      // Reset 5-second silence timer
      cancelSilenceTimerRef.current();
      hasStartedSpeakingRef.current = false;
      setPlaybackState('IDLE');
      if (data.question) {
        const textHash = safeHash(data.question);
        const dialogueId = `${sessionId}:q:${data.turn_index ?? 0}:${textHash}`;
        logAudioEvent('QUESTION_RECEIVED', { dialogue_id: dialogueId, turn_index: data.turn_index, mode: effectiveMode, text_hash: textHash });
        setSubtitles([
          { id: `q-${data.turn_index ?? 0}-${Date.now()}`, speaker: 'Sarah Chen', text: data.question },
        ]);
        if (audioUnlocked) void speakQuestionRef.current(data.question, dialogueId);
        else {
          setAiState('listening');
          setFlowState('LISTENING_FOR_ANSWER');
          isAnswerCaptureClosedRef.current = false;
        }
      } else {
        setAiState('listening');
        setFlowState('LISTENING_FOR_ANSWER');
        isAnswerCaptureClosedRef.current = false;
      }
    } catch (err: unknown) {
      console.warn('[runPreflightAndStart Error]', err);
      setApiError(err instanceof Error ? err.message : 'The interview could not be started.');
      setAiState('idle');
    } finally {
      isPreflightInFlightRef.current = false;
    }
  }, [sessionId, stopCurrentPlayback, audioUnlocked, stream, sessionMode, liveKitConnected, proctoringReady, proctoringUnavailable, applyContract]);

  // Real-mode start gate: enters fullscreen from this click (a user gesture the
  // browser accepts) and only then runs preflight. If fullscreen is refused the
  // preflight is not attempted – the candidate sees why instead of a generic
  // failure, and no MEDIA_ERROR state is manufactured.
  const beginRealInterview = useCallback(async () => {
    if (!sessionId) return;
    try {
      await unlockAudio();
    } catch {
      // Audio unlock exception swallowed gracefully
    }
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fall through: the explicit check below reports the refusal.
    }
    if (!document.fullscreenElement) {
      setApiError('Fullscreen is required for a real interview. Allow fullscreen when your browser asks, then press Begin again.');
      return;
    }
    setNeedsRealStartGate(false);
    await runPreflightAndStart('real');
  }, [runPreflightAndStart, sessionId, unlockAudio]);

  // Resume from the server contract instead of local component state.
  const hasResumedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const resume = async () => {
      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success && !cancelled) {
        attempts++;
        try {
          const state = await getInterviewState(sessionId);
          if (cancelled) return;
          applyContract(state as unknown as InterviewContract);
          success = true;
          setApiError(null);
          if (state.state === 'COMPLETED' || state.status === 'completed') {
            const isPractice = (state.mode || sessionMode) === 'practice';
            if (isPractice) {
              router.replace(`/candidate/interview/${sessionId}/report`);
            } else {
              router.replace('/candidate/dashboard?interview_completed=true');
            }
            return;
          }
          const mode = state.mode || sessionMode || 'real';
          const PREFLIGHT_OR_LOBBY_STATES = ['AUTHENTICATED', 'INTERVIEW_AUTHORIZED', 'LOBBY', 'PROCTORING_PREFLIGHT', 'MEDIA_READY'];
          const isReadyForStart = PREFLIGHT_OR_LOBBY_STATES.includes(state.state);

          if (isReadyForStart) {
            if (!stream || (mode === 'real' && proctoringUnavailable)) return;
            if (mode === 'real') {
              if (!liveKitConnected) return;
              if (!document.fullscreenElement) {
                setNeedsRealStartGate(true);
                return;
              }
            }
            setNeedsRealStartGate(false);
            const resumeKey = `${sessionId}:${state.state}:start`;
            if (hasResumedSessionRef.current !== resumeKey) {
              hasResumedSessionRef.current = resumeKey;
              await runPreflightAndStart(mode);
            }
          } else if (state.question) {
            const textHash = safeHash(state.question);
            const dialogueId = `${sessionId}:q:${state.turn_index ?? 0}:${textHash}`;
            logAudioEvent('QUESTION_RESTORED', { dialogue_id: dialogueId, turn_index: state.turn_index, state: state.state, text_hash: textHash });

            if (activeDialogueIdRef.current === dialogueId || playedDialogueKeysRef.current.has(dialogueId) || failedDialogueKeysRef.current.has(dialogueId)) {
              logAudioEvent('RESUME_EFFECT_SKIPPED_ACTIVE_OR_PLAYED', { dialogue_id: dialogueId, active_dialogue: activeDialogueIdRef.current });
              setAiState('listening');
              setFlowState('LISTENING_FOR_ANSWER');
              isAnswerCaptureClosedRef.current = false;
              return;
            }

            stopCurrentPlayback('resume_effect_new_dialogue');
            setSubtitles([
              { id: `q-${state.turn_index ?? 0}-${Date.now()}`, speaker: 'Sarah Chen', text: state.question },
            ]);
            if (audioUnlocked) void speakQuestionRef.current(state.question, dialogueId);
            else {
              setAiState('listening');
              setFlowState('LISTENING_FOR_ANSWER');
              isAnswerCaptureClosedRef.current = false;
            }
          } else {
            setAiState('listening');
            setFlowState('LISTENING_FOR_ANSWER');
            isAnswerCaptureClosedRef.current = false;
            if (['INTERVIEW_STARTED', 'AI_GREETING', 'QUESTION_GENERATING'].includes(state.state)) {
              setTimeout(() => {
                if (!cancelled) void resume();
              }, 1500);
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Could not load the interview state.';
          if (!cancelled) {
            setApiError(msg);
            const recoveryState = (err as { recoveryState?: unknown })?.recoveryState;
            if (typeof recoveryState === 'string') setRetryTarget(recoveryState);
          }
          if (attempts < 3 && !cancelled) {
            await new Promise((r) => setTimeout(r, attempts * 1000));
          }
        }
      }
    };
    void resume();
    return () => { cancelled = true; };
  }, [sessionId, stream, liveKitConnected, sessionMode, proctoringUnavailable, applyContract, runPreflightAndStart, audioUnlocked]);

  const sessionLoading = serverState === null;

  // Submit Candidate Answer with atomic idempotency and state guards.
  const handleSubmitAnswer = useCallback(async (answerOverride?: string, source: 'auto' | 'manual' = 'manual') => {
    // 1. Double-submit guard: block concurrent calls
    if (isSubmittingRef.current) {
      return;
    }
    if (isAnswerCaptureClosedRef.current && source === 'auto') {
      return;
    }

    // Preserve the live hypothesis before stop() commits final results and
    // discards interim text for the next recognition session.
    const transcriptAtSubmit = getLatestTranscript();

    // 2. Atomically engage submission lock and close answer window permanently for this question
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    isAnswerCaptureClosedRef.current = true;

    cancelSilenceTimerRef.current();

    // Stop recognition and VAD immediately
    stopSpeechRecognition();
    stopVadRef.current();

    setFlowState('SUBMITTING');
    setAiState('evaluating');

    // 3. Acquire canonical transcript safely (avoid stale React state snapshots)
    const rawText = resolveAnswerSubmissionText({
      speechTranscript: transcriptAtSubmit,
      candidateAnswer: candidateAnswerRef.current,
      answerOverride,
      isUserEditing: isUserEditingRef.current,
    });
    const textToSend = rawText.trim();

    if (!textToSend || !sessionId) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      isAnswerCaptureClosedRef.current = false;
      setFlowState('LISTENING_FOR_ANSWER');
      setAiState('listening');
      return;
    }

    setFlowState('EVALUATING');
    setApiError(null);
    setRetryTarget(null);

    // Submit against the question currently shown in this tab. The backend
    // verifies the deadline atomically; a state GET here could itself reconcile
    // expiry before this tab has sent its approved partial answer.
    const submittedQuestionId = question_id_ref.current ?? activeQuestionRef.current;
    if (!submittedQuestionId) {
      setApiError('The active question is not available. Refresh the interview state and retry.');
      setRetryTarget('LISTENING');
      setCandidateAnswer(textToSend);
      candidateAnswerRef.current = textToSend;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      isAnswerCaptureClosedRef.current = false;
      setFlowState('LISTENING_FOR_ANSWER');
      return;
    }

    logAudioEvent('ANSWER_SUBMITTED', { session_id: sessionId, turn_index: turnIndex, answer_len: textToSend.length, source });

    setSubtitles((prev) => [
      ...prev,
      { id: `a-${turnIndex}-${Date.now()}`, speaker: 'You', text: textToSend },
    ]);

    // Sub-30ms Conversational Backchannel: Instant acoustic affirmation while LLM processes
    playInstantBackchannel();

    const currentQuestionToken = questionGenerationTokenRef.current;

    try {
      const qId = submittedQuestionId;
      const idempotencyKey = `answer:${sessionId}:turn-${turnIndex}:q-${qId}`;
      const res = await answerInterviewQuestion(
        sessionId,
        textToSend,
        submittedQuestionId,
        idempotencyKey,
        latestCodeRef.current.code || undefined,
        latestCodeRef.current.language || undefined,
      );

      // Guard against races where the turn might have progressed
      if (questionGenerationTokenRef.current !== currentQuestionToken) {
        console.warn('[Submit] Ignoring response for stale question token');
        return;
      }

      setFlowState('AI_RESPONDING');

      if (res.finished || (remainingSeconds !== null && remainingSeconds <= 0)) {
        void triggerSessionConclusion(res.finished ? undefined : 'time_expired');
        return;
      }

      // Advance to next question turn with a clean slate
      setFlowState('NEXT_QUESTION');
      questionGenerationTokenRef.current += 1;
      setCandidateAnswer('');
      candidateAnswerRef.current = '';
      resetSpeechRecognition();
      isUserEditingRef.current = false;
      hasStartedSpeakingRef.current = false;
      applyContract(res);
      setPracticeFeedback(res.feedback ?? null);

      const ackText = typeof res.interviewer_response === 'string' ? res.interviewer_response.trim() : '';
      const nextQText = res.next_question?.text ? res.next_question.text.trim() : '';

      if (ackText) {
        const textHash = safeHash(ackText);
        const dialogueId = `${sessionId}:r:${turnIndex}:${textHash}`;
        logAudioEvent('QUESTION_RECEIVED', { dialogue_id: dialogueId, type: 'interviewer_response', turn_index: turnIndex, text_hash: textHash });
        setSubtitles((prev) => [
          ...prev,
          { id: `i-${turnIndex}-${Date.now()}`, speaker: 'Sarah Chen', text: ackText },
        ]);
      }

      if (nextQText) {
        const textHash = safeHash(nextQText);
        const dialogueId = `${sessionId}:q:${res.next_question!.turn_index}:${textHash}`;
        logAudioEvent('QUESTION_RECEIVED', { dialogue_id: dialogueId, type: 'next_question', turn_index: res.next_question!.turn_index, text_hash: textHash });
        setSubtitles((prev) => [
          ...prev,
          { id: `q-${res.next_question!.turn_index}-${Date.now()}`, speaker: 'Sarah Chen', text: nextQText },
        ]);
      }

      // High-Velocity Conversational Audio Pipelining:
      // Speak the short acknowledgment immediately to minimize time-to-first-sound,
      // then seamlessly deliver the next technical question.
      const singleDialogue = ackText || nextQText;
      if (audioUnlocked && ackText && nextQText) {
        const ackId = `${sessionId}:turn-${turnIndex}:ack:${safeHash(ackText)}`;
        const qId = `${sessionId}:turn-${turnIndex}:q:${safeHash(nextQText)}`;
        await speakQuestion(ackText, ackId);
        await speakQuestion(nextQText, qId);
      } else if (singleDialogue) {
        const dialogueId = `${sessionId}:turn-${turnIndex}:${safeHash(singleDialogue)}`;
        if (audioUnlocked) await speakQuestion(singleDialogue, dialogueId);
        else {
          setFlowState('LISTENING_FOR_ANSWER');
          setAiState('listening');
          isAnswerCaptureClosedRef.current = false;
        }
      } else {
        setFlowState('LISTENING_FOR_ANSWER');
        setAiState('listening');
        isAnswerCaptureClosedRef.current = false;
      }
    } catch (err: unknown) {
      if ((err as { errorCode?: string })?.errorCode === 'question_expired') {
        void submitQuestionTimeoutRef.current?.(submittedQuestionId, textToSend);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to evaluate answer. Please try again.';
      setApiError(msg);
      if (timedOutQuestionRef.current === submittedQuestionId) {
        setRetryTarget('QUESTION_TIMEOUT');
      } else {
        setRetryTarget(serverState?.state && serverState.state !== 'LISTENING' ? serverState.state : null);
      }
      // Preserve submitted text for explicit retry without reopening automatic listening
      setCandidateAnswer(textToSend);
      candidateAnswerRef.current = textToSend;
      setFlowState('SILENCE_PENDING');
      setAiState('listening');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [sessionId, turnIndex, applyContract, audioUnlocked, speakQuestion, triggerSessionConclusion, stopSpeechRecognition, resetSpeechRecognition, getLatestTranscript, setFlowState]);

  const handleSubmitAnswerRef = useRef(handleSubmitAnswer);
  useEffect(() => {
    handleSubmitAnswerRef.current = handleSubmitAnswer;
  }, [handleSubmitAnswer]);

  const handleBargeIn = useCallback(() => {
    // Telephonic Full-Duplex Interruption:
    // Instantly duck & cut interviewer audio and abort in-flight TTS API calls
    logAudioEvent('TELEPHONIC_BARGE_IN_TRIGGERED', { session_id: sessionId, turn_index: turnIndex });
    cancelSilenceTimerRef.current();
    stopCurrentPlayback('candidate_barge_in');
    setAiState('listening');
    setFlowState('ANSWER_ACTIVE');
    isAnswerCaptureClosedRef.current = false;
    hasStartedSpeakingRef.current = true;
    if (isWebSpeechSupported && !isSpeechRecognizing) {
      startSpeechRecognition();
    }
  }, [
    sessionId,
    turnIndex,
    stopCurrentPlayback,
    setAiState,
    setFlowState,
    isWebSpeechSupported,
    isSpeechRecognizing,
    startSpeechRecognition,
  ]);

  // Keep the controller's callback pointed at the latest handler.
  useEffect(() => {
    bargeInHandlerRef.current = handleBargeIn;
  }, [handleBargeIn]);

  // One controller per room. It is driven by notifyInterviewerStart/Stop and
  // by the PCM frames forwarded from the VAD below.
  useEffect(() => {
    const controller = new TelephonicBargeInController(() => {
      bargeInHandlerRef.current();
    });
    bargeInControllerRef.current = controller;
    return () => {
      controller.reset();
      bargeInControllerRef.current = null;
    };
  }, []);

  // Arm the controller when interviewer audio actually starts playing (not
  // when the /speak request starts): the 350 ms AEC grace window must cover
  // the first milliseconds of real speaker output. The element is created
  // lazily on the first /speak response, hence the PLAYING gate.
  useEffect(() => {
    const controller = bargeInControllerRef.current;
    if (!controller) return;
    if (playbackState === 'PLAYING') {
      controller.notifyInterviewerStart();
      if (audioRef.current) controller.attachAudioElement(audioRef.current);
    } else if (
      playbackState === 'IDLE' ||
      playbackState === 'COMPLETED' ||
      playbackState === 'FAILED' ||
      playbackState === 'CANCELLED'
    ) {
      controller.notifyInterviewerStop();
    }
  }, [playbackState, audioRef]);

  const {
    autoSubmitCountdown,
    autoSubmitPending,
    cancelSilenceTimer,
    isThinkingPaused,
    extendThinkingTime,
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    stopVad,
  } = useInterviewAudioRecorder({
    sessionId,
    stream,
    turnIndex,
    currentQuestion,
    answerFlowState,
    answerFlowStateRef,
    setFlowState,
    playbackState,
    isMuted,
    isSubmitting,
    isSubmittingRef,
    isConcluding,
    isAnswerCaptureClosedRef,
    isUserEditingRef,
    candidateAnswer,
    candidateAnswerRef,
    setCandidateAnswer,
    liveTranscript,
    liveInterimTranscript,
    isWebSpeechSupported,
    isSpeechRecognizing,
    startSpeechRecognition,
    stopSpeechRecognition,
    resetSpeechRecognition,
    getLatestTranscript,
    setAiState,
    setSubtitles,
    setApiError,
    hasStartedSpeakingRef,
    onSubmitAnswer: handleSubmitAnswer,
    onPcmFrame: (pcm, isVocal) => {
      bargeInControllerRef.current?.pushAudioFrame(pcm, isVocal);
    },
  });

  useEffect(() => {
    cancelSilenceTimerRef.current = cancelSilenceTimer;
    stopVadRef.current = stopVad;
  }, [cancelSilenceTimer, stopVad]);

  // Phone Reconnect State Logic
  const {
    isPhoneDisconnected,
    reconnectCountdown,
    isPhoneTerminalFailure,
    resetPairAttempts,
  } = usePhoneCompanionSync({
    source,
    phoneStatus,
    sessionId,
    startPairing,
  });







  // Informational countdown only. The backend enforces the deadline; the client
  // never concludes an interview on its own and never resets from duration.
  const hasActiveCountdown = remainingSeconds !== null && remainingSeconds > 0
    || (questionRemainingSeconds !== null && questionRemainingSeconds > 0);
  useEffect(() => {
    if (isConcluding || !hasActiveCountdown) return;
    return startInterviewCountdownTicker(() => {
      setRemainingSeconds((prev) => decrementDisplayedSeconds(prev));
      setQuestionRemainingSeconds((prev) => decrementDisplayedSeconds(prev));
    });
  }, [hasActiveCountdown, isConcluding]);

  const overallReconcileInFlightRef = useRef(false);
  const timedOutQuestionRef = useRef<string | null>(null);
  const questionTimeoutInFlightRef = useRef<string | null>(null);

  const submitQuestionTimeout = useCallback(async (expiredQuestionId: string, partialAnswer: string) => {
    if (!sessionId || questionTimeoutInFlightRef.current === expiredQuestionId) return false;
    questionTimeoutInFlightRef.current = expiredQuestionId;
    timedOutQuestionRef.current = expiredQuestionId;
    if (partialAnswer.trim()) {
      setCandidateAnswer(partialAnswer);
      candidateAnswerRef.current = partialAnswer;
    }
    setApiError(null);
    setDeadlineStatus('advancing');
    setCanAnswer(false);
    isAnswerCaptureClosedRef.current = true;
    cancelSilenceTimerRef.current();
    stopSpeechRecognition();
    stopVadRef.current();
    setFlowState('NEXT_QUESTION');

    try {
      let result: InterviewContract = await timeoutInterviewQuestion(sessionId, expiredQuestionId, partialAnswer.trim());
      if (result.state === 'AI_PROVIDER_ERROR') {
        result = await retryInterviewStage(sessionId, 'QUESTION_GENERATING');
      }
      applyContract(result);
      setCandidateAnswer('');
      candidateAnswerRef.current = '';
      setRetryTarget(null);
      resetSpeechRecognition();
      isUserEditingRef.current = false;
      if (result.finished) {
        setDeadlineStatus('interview-expired');
        void triggerSessionConclusion('time_expired');
      } else if (result.question_id && result.question_id !== expiredQuestionId && result.question) {
        questionGenerationTokenRef.current += 1;
        const textHash = safeHash(result.question);
        const dialogueId = `${sessionId}:q:${result.turn_index ?? 0}:${textHash}`;
        setSubtitles((prev) => [
          ...prev,
          { id: `q-${result.turn_index ?? 0}-${Date.now()}`, speaker: 'Sarah Chen', text: result.question! },
        ]);
        if (audioUnlocked) await speakQuestion(result.question, dialogueId);
        else {
          setFlowState('LISTENING_FOR_ANSWER');
          setAiState('listening');
          isAnswerCaptureClosedRef.current = false;
        }
      } else {
        setDeadlineStatus(result.state === 'COMPLETED' ? 'completed' : 'advancing');
      }
      return true;
    } catch (err: unknown) {
      setDeadlineStatus('network-error');
      setRetryTarget('QUESTION_TIMEOUT');
      setApiError(err instanceof Error ? err.message : 'The expired question could not be advanced. Retry the connection.');
      return false;
    } finally {
      questionTimeoutInFlightRef.current = null;
    }
  }, [
    sessionId, applyContract, audioUnlocked, speakQuestion, stopSpeechRecognition,
    resetSpeechRecognition, setFlowState, triggerSessionConclusion,
  ]);
  useEffect(() => {
    submitQuestionTimeoutRef.current = submitQuestionTimeout;
  }, [submitQuestionTimeout]);

  // When interview timer expires (remainingSeconds reaches 0):
  // Conclude session immediately and redirect without leaving room stuck at 00:00!
  useEffect(() => {
    const state = String(serverState?.state || '').toUpperCase();
    const terminal = ['COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(state);
    if (
      !sessionId || terminal || isConcluding
      || remainingSeconds === null || remainingSeconds > 0
      || overallReconcileInFlightRef.current
    ) return;

    overallReconcileInFlightRef.current = true;
    setCanAnswer(false);
    isAnswerCaptureClosedRef.current = true;
    cancelSilenceTimerRef.current();
    stopSpeechRecognition();
    stopVadRef.current();
    stopCurrentPlayback('time_expired');
    setDeadlineStatus('interview-expired');
    void triggerSessionConclusion('time_expired');
  }, [sessionId, serverState?.state, remainingSeconds, isConcluding, stopCurrentPlayback, stopSpeechRecognition, triggerSessionConclusion]);

  // When per-question timer expires (questionRemainingSeconds reaches 0):
  // Auto-advance to the next question automatically, capturing partial answer if available.
  useEffect(() => {
    const expiredQuestionId = serverState?.question_id;
    if (
      !sessionId || !serverState || !expiredQuestionId || !canAnswer
      || questionRemainingSeconds === null || questionRemainingSeconds > 0 || isConcluding
      || timedOutQuestionRef.current === expiredQuestionId
    ) return;

    const partialAnswer = resolveAnswerSubmissionText({
      speechTranscript: getLatestTranscript(),
      candidateAnswer: candidateAnswerRef.current,
      isUserEditing: isUserEditingRef.current,
    }).trim() || 'No response recorded within the allotted question time limit.';

    void submitQuestionTimeout(expiredQuestionId, partialAnswer);
  }, [
    sessionId, serverState, canAnswer, questionRemainingSeconds, isConcluding,
    submitQuestionTimeout, getLatestTranscript,
  ]);

  // Camera/mic acquisition failure is persisted once per transition into the
  // failed state: edge-triggered, never polled, so retries cannot flood the
  // warning count. Severity stays server-derived.
  const prevMediaStatusRef = useRef(mediaStatus);
  useEffect(() => {
    const prev = prevMediaStatusRef.current;
    prevMediaStatusRef.current = mediaStatus;
    if (mediaStatus === prev || mediaStatus !== 'error') return;
    void recordProctoringEvent('camera_error', 'Camera/microphone acquisition failed, so proctoring cannot observe the candidate.');
  }, [mediaStatus, recordProctoringEvent]);

  // Mirror the realtime transport state to the server so a lost LiveKit
  // connection becomes MEDIA_ERROR instead of a silently continued "interview".
  // Only *transitions* are reported: the initial "not connected yet" render is
  // not a disconnect (media has never been connected), and pre-start lifecycle
  // states refuse a MEDIA_ERROR transition, which surfaced as a spurious 409.
  const lastReportedConnectionRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    const connected = liveKitConnected;
    const prev = lastReportedConnectionRef.current;
    if (prev === connected) return;
    lastReportedConnectionRef.current = connected;
    if (prev === null && !connected) return;
    const lost = !connected && mediaStatus === 'error';
    // The telemetry POST is fire-and-forget: it never blocks or mutates render state.
    const report = async () => {
      if (lost) await recordProctoringEvent('media_disconnect', 'Realtime media transport was lost.');
      await reportInterviewMediaState(sessionId, connected, connected ? 'realtime media connected' : 'realtime media transport lost')
        .catch(() => undefined);
    };
    void report();
  }, [sessionId, liveKitConnected, mediaStatus, recordProctoringEvent]);

  // Resume a failed stage only when the server allows that retry target.
  const handleRetryStage = useCallback(async () => {
    if (!sessionId) return;
    try {
      setApiError(null);
      if (retryTarget === 'FINISH') {
        setRetryTarget(null);
        void triggerSessionConclusion();
        return;
      }
      if (retryTarget === 'QUESTION_TIMEOUT' || retryTarget === 'QUESTION_GENERATING') {
        const expiredQuestionId = question_id_ref.current ?? activeQuestionRef.current;
        if (!expiredQuestionId) throw new Error('The expired question is not available to retry.');
        const partialAnswer = resolveAnswerSubmissionText({
          speechTranscript: getLatestTranscript(),
          candidateAnswer: candidateAnswerRef.current,
          isUserEditing: isUserEditingRef.current,
        }).trim();
        const recovered = await submitQuestionTimeout(expiredQuestionId, partialAnswer);
        if (recovered) setRetryTarget(null);
        return;
      }

      const latestState = await getInterviewState(sessionId);
      applyContract(latestState as unknown as InterviewContract);

      if (latestState.state === 'MEDIA_ERROR' || latestState.state === 'PROCTORING_PREFLIGHT' || latestState.state === 'LOBBY') {
        await runPreflightAndStart(undefined, true);
        return;
      }

      const target = retryTarget === 'MEDIA_ERROR' ? 'MEDIA_READY' : (retryTarget || latestState.state);
      const contract = await retryInterviewStage(sessionId, target);
      applyContract(contract);
      if (target === 'QUESTION_GENERATING' && contract.question_id !== latestState.question_id && contract.question) {
        setCandidateAnswer('');
        candidateAnswerRef.current = '';
        resetSpeechRecognition();
        isUserEditingRef.current = false;
        const dialogueId = `${sessionId}:q:${contract.turn_index ?? 0}:${safeHash(contract.question)}`;
        if (audioUnlocked) await speakQuestion(contract.question, dialogueId);
        else {
          setFlowState('LISTENING_FOR_ANSWER');
          setAiState('listening');
          isAnswerCaptureClosedRef.current = false;
        }
      }
      setRetryTarget(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Retry was refused by the interview state machine.');
    }
  }, [sessionId, retryTarget, applyContract, runPreflightAndStart, triggerSessionConclusion, audioUnlocked, resetSpeechRecognition, speakQuestion, setFlowState, submitQuestionTimeout, getLatestTranscript]);

  const handleResetListening = useCallback(async () => {
    if (!sessionId) return;
    try {
      setApiError(null);
      resetSpeechRecognition();
      stopSpeechRecognition();
      setCandidateAnswer('');
      isUserEditingRef.current = false;
      // Reset 5-second silence timer
      cancelSilenceTimerRef.current();
      hasStartedSpeakingRef.current = false;
      const res = await apiFetch(`/api/interview/${sessionId}/reset-listening`, { method: 'POST' });
      if (res.ok) {
        const contract = await res.json();
        applyContract(contract);
        setAiState('listening');
      } else {
        const err = await res.json().catch(() => ({}));
        setApiError(err.error || 'Failed to reset session to LISTENING.');
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to reset session.');
    }
  }, [sessionId, applyContract, resetSpeechRecognition, stopSpeechRecognition]);

  const currentStageIndex = Math.max(
    0,
    stages.findIndex((s) => s?.toLowerCase() === currentStageName?.toLowerCase())
  );

  const handleConfirmExit = () => {
    setShowExitModal(false);
    void triggerSessionConclusion();
  };

  if (!sessionId) {
    return <InvalidSessionScreen onReturnDashboard={() => router.push('/candidate/dashboard')} />;
  }

  if (apiError && (apiError.includes('Session expired') || apiError.includes('log in again') || apiError.includes('Authentication required'))) {
    return (
      <SessionExpiredScreen
        redirectPath={`/candidate/interview/${sessionId}/room`}
        onReturnDashboard={() => router.push('/candidate/dashboard')}
      />
    );
  }

  if (!stream || (sessionMode === 'real' && !liveKitConnected)) {
    return (
      <MediaPreparingScreen
        bindProctoringVideo={bindProctoringVideo}
        sessionMode={sessionMode}
        mediaStatus={mediaStatus}
        onRetry={() => void retryLocal()}
      />
    );
  }

  if (proctoringUnavailable || !proctoringReady) {
    return (
      <ProctoringWaitingScreen
        bindProctoringVideo={bindProctoringVideo}
        proctoringHealthState={proctoringHealthState}
        proctoringUnavailable={proctoringUnavailable}
        onRetry={() => void retryLocal()}
      />
    );
  }

  // Real interview start gate: fullscreen must be granted from this button press
  // (a user gesture) before preflight runs, otherwise the server fails closed.
  if (needsRealStartGate) {
    return (
      <FullscreenStartGateScreen
        bindProctoringVideo={bindProctoringVideo}
        proctoringHealthState={proctoringHealthState}
        facesObserved={proctoringFaceCountRef.current}
        apiError={apiError}
        onBeginInterview={() => void beginRealInterview()}
      />
    );
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-canvas text-ink flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <video ref={bindProctoringVideo} muted playsInline autoPlay className="hidden" aria-hidden="true" />

      {/* TOP NAVIGATION & STATUS BAR */}
      <InterviewRoomHeader
        sessionId={sessionId}
        currentStageIndex={currentStageIndex}
        stages={stages}
        remainingSeconds={remainingSeconds}
        proctoringStatus={proctoringStatus}
        proctoringHealthState={proctoringHealthState}
        faceCount={proctoringFaceCountRef.current}
        mediaSource={source}
        onEndSessionClick={() => {
          if (!isConcluding) setShowExitModal(true);
        }}
        isConcluding={isConcluding}
      />

      <div
        role="status"
        aria-live="polite"
        className="mx-auto w-full max-w-7xl px-4 text-xs text-ink-muted"
      >
        {deadlineStatus === 'loading' && 'Loading authoritative interview state…'}
        {deadlineStatus === 'active' && (
          questionRemainingSeconds === null
            ? 'Interview active · deadlines continue while you are away.'
            : `Question time remaining: ${String(Math.floor(questionRemainingSeconds / 60)).padStart(2, '0')}:${String(questionRemainingSeconds % 60).padStart(2, '0')} · deadlines continue while you are away.`
        )}
        {deadlineStatus === 'question-expired' && 'Question time expired.'}
        {deadlineStatus === 'advancing' && 'Question time expired · saving the available response and advancing…'}
        {deadlineStatus === 'interview-expired' && 'Interview time expired · finalizing submitted responses…'}
        {deadlineStatus === 'completed' && 'Interview completed.'}
        {deadlineStatus === 'network-error' && 'Connection issue · deadline status could not be confirmed. Retry to resume safely.'}
      </div>

      {/* COMPACT INTERVIEW STATUS & AUDIO UNLOCK BANNER */}
      <InterviewStatusBanner
        proctoringAlertBanner={proctoringAlertBanner}
        proctoringWarningCount={proctoringWarningCount}
        apiError={apiError}
        audioUnlocked={audioUnlocked}
        retryTarget={retryTarget}
        onEnableInterviewerAudio={() => void enableInterviewerAudio()}
        onRetryStage={handleRetryStage}
        onRetryPreflight={() => void runPreflightAndStart()}
        remainingSeconds={remainingSeconds}
        questionRemainingSeconds={questionRemainingSeconds}
      />

      {/* MAIN RESPONSIVE WORKSPACE CONTAINER */}
      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 sm:p-4 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-3 sm:gap-4">

        {/* MEDIA STACK (Desktop: Side Column, Mobile: Top Hero Block) */}
        <section className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">

          {/* CANDIDATE VIDEO (Primary Live Camera Element) */}
          <div className="w-full sm:w-1/2 lg:w-full h-[200px] sm:h-[220px] lg:h-[240px] shrink-0">
            <CandidateVideoPreview
              name="Candidate"
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              onToggleMic={() => setIsMuted((prev) => { const next = !prev; void recordProctoringEvent('mic_disabled', next ? 'Candidate microphone muted.' : 'Candidate microphone enabled.'); return next; })}
              onToggleVideo={() => setIsVideoOff((prev) => { const next = !prev; void recordProctoringEvent('camera_disabled', next ? 'Candidate camera disabled.' : 'Candidate camera enabled.'); return next; })}
            />
          </div>

          {/* INTERVIEWER VIEWPORT */}
          <div className="w-full sm:w-1/2 lg:w-full h-[180px] sm:h-[230px] lg:h-[240px] shrink-0">
            <AIAvatarViewport
              aiState={aiState}
              name="Sarah Chen"
              role="Staff Technical Lead (Interviewer)"
              audioElement={audioRef.current}
              analyserNode={getAudioAnalyser()}
              compact
            />
          </div>

        </section>

        {/* RIGHT INTERACTIVE WORKSPACE & TURN INTERACTION PANE */}
        <section className="flex-1 flex flex-col overflow-hidden gap-3 min-w-0">

          {/* Workspace Switcher & Session Mode Indicator */}
          <div className="flex items-center justify-between bg-surface/80 p-1 rounded-xl border border-line shrink-0 gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab('context')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === 'context'
                  ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/30 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface'
                  }`}
              >
                <FileText className="w-3.5 h-3.5 text-accent-emerald" />
                <span>Question Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${activeTab === 'code'
                  ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/30 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface'
                  }`}
              >
                <Code2 className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Code Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('whiteboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === 'whiteboard'
                  ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/30 font-bold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-accent-indigo" />
                <span>Whiteboard</span>
              </button>
            </div>

            {sessionMode === 'practice' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-accent-emerald text-[11px] font-mono font-bold shrink-0">
                PRACTICE DRILL
              </span>
            )}
          </div>

          {/* Active Workspace Content Area */}
          <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col gap-3 min-h-[300px]">
            {activeTab === 'code' && (
              <CodeEditorPane
                sessionId={sessionId}
                onCodeChange={(lang, currentCode) => {
                  latestCodeRef.current = { language: lang, code: currentCode };
                }}
                onAttachCodeToAnswer={(codeMd) => {
                  setCandidateAnswer((prev) => {
                    const trimmed = prev.trim();
                    const nextAns = trimmed ? `${trimmed}\n\n${codeMd}` : codeMd;
                    candidateAnswerRef.current = nextAns;
                    return nextAns;
                  });
                  isUserEditingRef.current = true;
                  setActiveTab('context');
                }}
              />
            )}
            {activeTab === 'whiteboard' && (
              <ArchitectureWhiteboardPane
                sessionId={sessionId}
                onSpeakCritique={(spokenLine) => {
                  void speakQuestion(spokenLine);
                }}
                onAttachToAnswer={(diagramSummary) => {
                  setCandidateAnswer((prev) => {
                    const trimmed = prev.trim();
                    const nextAns = trimmed ? `${trimmed}\n\n${diagramSummary}` : diagramSummary;
                    candidateAnswerRef.current = nextAns;
                    return nextAns;
                  });
                  isUserEditingRef.current = true;
                  setActiveTab('context');
                }}
              />
            )}
            {activeTab === 'context' && (
              <InterviewQuestionAnswerPane
                turnIndex={turnIndex}
                totalTurns={totalTurns}
                currentStageName={currentStageName}
                currentQuestion={currentQuestion}
                questionRemainingSeconds={questionRemainingSeconds}
                sessionLoading={sessionLoading}
                onReplayAudio={handleReplayAudio}
                practiceFeedback={practiceFeedback}
                stream={stream}
                isMuted={isMuted}
                answerFlowState={answerFlowState}
                playbackState={playbackState}
                canAnswer={canAnswer}
                autoSubmitCountdown={autoSubmitCountdown}
                autoSubmitPending={autoSubmitPending}
                isThinkingPaused={isThinkingPaused}
                onExtendThinkingTime={extendThinkingTime}
                speechLanguage={speechLanguage}
                onSpeechLanguageChange={setSpeechLanguage}
                isRecording={isRecording}
                isSpeechRecognizing={isSpeechRecognizing}
                isUserEditingRef={isUserEditingRef}
                liveTranscript={liveTranscript}
                liveInterimTranscript={liveInterimTranscript}
                liveCommittedTranscript={liveCommittedTranscript}
                candidateAnswer={candidateAnswer}
                candidateAnswerRef={candidateAnswerRef}
                setCandidateAnswer={setCandidateAnswer}
                setSpeechTranscript={setSpeechTranscript}
                cancelSilenceTimer={cancelSilenceTimer}
                isSubmitting={isSubmitting}
                isTranscribing={isTranscribing}
                isConcluding={isConcluding}
                apiError={apiError}
                retryTarget={retryTarget}
                onStartRecording={() => void startRecording()}
                onStopRecording={stopRecording}
                onSubmitAnswer={(text, source) => void handleSubmitAnswer(text, source)}
                onRetrySubmission={() => {
                  if (retryTarget === 'QUESTION_TIMEOUT' || retryTarget === 'QUESTION_GENERATING') {
                    void handleRetryStage();
                  } else {
                    void handleSubmitAnswer(candidateAnswer.trim(), 'manual');
                  }
                }}
              />
            )}
          </div>

          {/* Live Closed Captions Ticker */}
          <div className="shrink-0">
            <LiveClosedCaptions subtitles={subtitles} />
          </div>

        </section>

      </main>

      {/* PHONE DISCONNECTED OVERLAY */}
      <PhoneDisconnectOverlay
        isPhoneDisconnected={isPhoneDisconnected}
        isPhoneTerminalFailure={isPhoneTerminalFailure}
        reconnectCountdown={reconnectCountdown}
        onUseDesktopCamera={async () => {
          await retryLocal();
          resetPairAttempts();
        }}
      />

      {/* SESSION EXIT CONFIRMATION MODAL */}
      <SessionExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirmExit={handleConfirmExit}
        isConcluding={isConcluding}
        isPractice={sessionMode === 'practice'}
      />

      {/* SESSION OVERLAY ON CONCLUSION */}
      <ConcludingOverlay
        isConcluding={isConcluding}
        concludingMessage={concludingMessage}
      />
    </div>
  );
}