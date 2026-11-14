'use client';

import React, { useState, useEffect } from 'react';
import { PracticeDrillItem, MicroFeedbackReport, DrillTurnEvaluation } from '@/types/practice';
import { apiFetch } from '@/lib/api';
import { AudioVoiceRecorder } from './AudioVoiceRecorder';
import { MicroFeedbackDossier } from './MicroFeedbackDossier';
import { X, Clock, Volume2, Sparkles, Send, AlertTriangle } from 'lucide-react';

interface LiveDrillSessionModalProps {
  drill: PracticeDrillItem | null;
  onClose: () => void;
  onFinalizeSession?: (
    drillId: string,
    turns: DrillTurnEvaluation[],
    durationSeconds: number
  ) => void;
}

/**
 * Builds the end-of-drill report from the evaluations the LLM actually
 * returned. Nothing here is invented: every bullet is either real evaluator
 * feedback text or a concept the evaluator reported as missing.
 */
function buildMicroFeedbackReport(
  drill: PracticeDrillItem,
  turns: DrillTurnEvaluation[],
  durationSeconds: number
): MicroFeedbackReport {
  const allScores = turns.flatMap((t) => Object.values(t.scores ?? {}));
  const mean = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;

  const strengths = turns
    .map((t) => t.feedback?.split('\n\n')[0]?.trim())
    .filter((f): f is string => Boolean(f));

  // The backend appends "Not yet covered: ..." when the evaluator reports
  // missing concepts. Recover that line so it lands in the right column.
  const omissions = turns
    .flatMap((t) => t.feedback?.split('\n\n') ?? [])
    .map((line) => line.trim())
    .filter((line) => /^not yet covered:/i.test(line))
    .map((line) => line.replace(/^not yet covered:\s*/i, ''));

  return {
    drillId: drill.id,
    score: Math.round(mean * 10),
    durationSeconds,
    strengthsSummary:
      strengths.length > 0
        ? strengths
        : ['The evaluator did not return narrative feedback for this attempt.'],
    omissionsAndMistakes:
      omissions.length > 0 ? omissions : ['No missing concepts were flagged by the evaluator.'],
    modelAnswerOverview:
      turns[turns.length - 1]?.feedback?.trim() ||
      'No model answer breakdown was returned for this attempt.',
    suggestedFollowUpTopics: drill.coreSkillsTested,
  };
}

export const LiveDrillSessionModal: React.FC<LiveDrillSessionModalProps> = ({
  drill,
  onClose,
  onFinalizeSession
}) => {
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>(drill?.sampleStarterQuestion || '');
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [isPlayingQuestionAudio, setIsPlayingQuestionAudio] = useState<boolean>(false);

  const [turns, setTurns] = useState<DrillTurnEvaluation[]>([]);
  const [finalReport, setFinalReport] = useState<MicroFeedbackReport | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState<number>((drill?.estimatedMinutes ?? 10) * 60);

  // The parent keys this component by drill id, so switching drills remounts it
  // and every field above resets to its initial value. An effect that mirrored
  // `drill` back into state would instead cause an extra render pass per switch.

  // Timer countdown
  useEffect(() => {
    if (!drill) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [drill]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayQuestionAudio = () => {
    setIsPlayingQuestionAudio(true);
    setTimeout(() => setIsPlayingQuestionAudio(false), 2500);
  };

  const handleToggleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  const handleSubmitTurn = async () => {
    if (!drill || !candidateAnswer.trim() || isSubmittingTurn) return;

    setIsSubmittingTurn(true);
    setTurnError(null);
    try {
      const res = await apiFetch('/api/v1/practice/sessions/evaluate-turn', {
        method: 'POST',
        body: JSON.stringify({
          drillId: drill.id,
          turnIndex: currentTurnIndex,
          candidateAnswer,
          questionContext: currentQuestion,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { evaluation?: DrillTurnEvaluation; error?: string }
        | null;

      // No heuristic fallback here. A scoring failure must surface as an
      // error, not as a fabricated score the candidate would be graded on.
      if (!res.ok || !data?.evaluation) {
        setTurnError(
          data?.error || `Scoring failed (HTTP ${res.status}). Your answer was not graded.`
        );
        return;
      }

      const turnEval: DrillTurnEvaluation = data.evaluation;
      const updatedTurns = [...turns, turnEval];
      setTurns(updatedTurns);
      setIsRecording(false);
      setCandidateAnswer('');

      if (turnEval.followUpQuestion && !turnEval.isFinalTurn) {
        setCurrentTurnIndex((prev) => prev + 1);
        setCurrentQuestion(turnEval.followUpQuestion);
      } else {
        const elapsed = (drill.estimatedMinutes * 60) - remainingSeconds;
        setFinalReport(buildMicroFeedbackReport(drill, updatedTurns, elapsed));
        if (onFinalizeSession) {
          onFinalizeSession(drill.id, updatedTurns, elapsed);
        }
      }
    } catch (err) {
      console.error('Turn evaluation error:', err);
      setTurnError('Could not reach the scoring service. Your answer was not graded.');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  if (!drill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl rounded-2xl bg-surface border border-line p-6 space-y-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-line pb-4 relative z-10 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-body font-bold text-ink text-base">{drill.title}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan font-mono text-[10px]">
                Turn {currentTurnIndex} / 2
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-caption font-mono text-xs text-accent-amber bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-accent-amber" />
              <span>{formatTimer(remainingSeconds)}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-inset hover:bg-surface-2 text-ink-muted hover:text-ink border border-line transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1 relative z-10">
          {finalReport ? (
            <MicroFeedbackDossier
              report={finalReport}
              onTryAgain={() => {
                setFinalReport(null);
                setCurrentTurnIndex(1);
                setCurrentQuestion(drill.sampleStarterQuestion);
                setTurns([]);
              }}
              onReturnToDrills={onClose}
            />
          ) : (
            <>
              {/* AI Question Prompt Card */}
              <div className="p-5 rounded-xl bg-inset space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2 text-accent-cyan">
                    <Sparkles className="w-4 h-4 text-accent-cyan" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wider">
                      AI Mock Evaluator (Turn #{currentTurnIndex})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handlePlayQuestionAudio}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface hover:bg-surface-2 border border-line text-accent-cyan text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isPlayingQuestionAudio ? 'animate-pulse text-accent-cyan' : ''}`} />
                    <span>{isPlayingQuestionAudio ? 'Speaking...' : 'Listen Audio'}</span>
                  </button>
                </div>

                <p className="text-xs text-ink leading-relaxed font-medium">
                  &quot;{currentQuestion}&quot;
                </p>
              </div>

              {/* Audio & Text Input Interface */}
              <AudioVoiceRecorder
                isRecording={isRecording}
                onToggleRecording={handleToggleRecording}
                transcript={candidateAnswer}
                onTranscriptChange={setCandidateAnswer}
                mode={mode}
                onModeChange={setMode}
              />

              {turnError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-accent-amber/10 text-accent-amber text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{turnError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSubmitTurn}
                  disabled={!candidateAnswer.trim() || isSubmittingTurn}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubmittingTurn ? (
                    <>
                      <Sparkles className="w-4 h-4 text-accent-cyan animate-spin" />
                      <span>Evaluating Answer...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{currentTurnIndex < 2 ? 'Submit & Proceed to Turn 2 ' : 'Finalize & View Micro-Feedback'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};