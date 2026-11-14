'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  ShieldCheck,
  Zap,
  BookOpen,
  Target,
  Sparkles,
  BarChart3,
  Flame } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  fetchAptitudeTemplates,
  startAptitudeSession,
  fetchCandidateAptitudeHistory,
  type AptitudeTemplate,
  type AptitudeAttemptHistory,
} from '@/lib/api';

const DEFAULT_TEMPLATES: AptitudeTemplate[] = [
  {
    id: 'template-campus-general',
    title: 'Standard Campus Employability Assessment',
    subtitle: 'AMCAT & CoCubes Benchmark Pattern',
    description: 'Comprehensive 5-pillar cognitive screening simulating top IT & product company hiring filters.',
    durationMinutes: 30,
    totalQuestions: 12,
    sections: [
      { name: 'Quantitative', questionCount: 4, timeMinutes: 10 },
      { name: 'Logical', questionCount: 3, timeMinutes: 8 },
      { name: 'Verbal', questionCount: 2, timeMinutes: 5 },
      { name: 'Data Interpretation', questionCount: 2, timeMinutes: 5 },
      { name: 'Abstract', questionCount: 1, timeMinutes: 2 },
    ],
    negativeMarking: false,
    proctoringStrictness: 'STRICT',
  },
  {
    id: 'template-quant-speed-sprint',
    title: 'Quantitative Speed & Accuracy Sprint',
    subtitle: 'High-Velocity Math & Number Systems',
    description: 'Focus on arithmetic shortcuts, probability, percentages, and modular speed math.',
    durationMinutes: 15,
    totalQuestions: 5,
    sections: [{ name: 'Quantitative', questionCount: 5, timeMinutes: 15 }],
    negativeMarking: true,
    proctoringStrictness: 'STANDARD',
  },
  {
    id: 'template-analytical-reasoning',
    title: 'Logical & Critical Deductions Test',
    subtitle: 'Puzzles, Arrangements & Syllogisms',
    description: 'Evaluate non-verbal fluid intelligence, critical reasoning, and algorithmic logic under pressure.',
    durationMinutes: 15,
    totalQuestions: 4,
    sections: [{ name: 'Logical', questionCount: 4, timeMinutes: 15 }],
    negativeMarking: false,
    proctoringStrictness: 'STANDARD',
  },
];

export default function AptitudeHubPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AptitudeTemplate[]>(DEFAULT_TEMPLATES);
  const [history, setHistory] = useState<AptitudeAttemptHistory[]>([]);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [tmpls, hist] = await Promise.all([
          fetchAptitudeTemplates(),
          fetchCandidateAptitudeHistory(),
        ]);
        if (tmpls && tmpls.length > 0) setTemplates(tmpls);
        if (hist) setHistory(hist);
      } catch (err) {
        console.warn('[AptitudeHub] Failed to load data:', err);
      }
    }
    void loadData();
  }, []);

  const handleStartTest = async (templateId: string) => {
    setStartingTemplateId(templateId);
    setErrorMsg(null);
    try {
      const session = await startAptitudeSession(templateId);
      if (!session || !session.sessionId) {
        throw new Error('Unable to assemble test session. Please try again.');
      }
      router.push(`/candidate/aptitude/test/${session.sessionId}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch test.');
      setStartingTemplateId(null);
    }
  };

  const completedAttempts = history.filter((h) => h.status === 'completed');
  const avgAccuracy =
    completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((acc, h) => acc + h.accuracy, 0) / completedAttempts.length)
      : 0;
  const percentileValues = completedAttempts.map((h) => h.percentile).filter((p): p is number => p != null);
  const bestPercentile =
    percentileValues.length > 0 ? Math.max(...percentileValues) : null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans relative overflow-x-clip selection:bg-cyan-500/30 selection:text-accent-cyan">
      {/* Background ambient glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Fixed Header Shell */}
      <DashboardHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent-cyan/5 via-surface to-accent-indigo/5 border border-line p-6 sm:p-8">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
              Standardized Cognitive Screening
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight">
              Aptitude & Critical Reasoning Arena
            </h1>
            <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
              Calibrated against top recruitment benchmarks (AMCAT, CoCubes, eLitmus). Master Quantitative Speed,
              Logical Deductions, Verbal Nuance, and Data Interpretation under strict anti-cheating protocols.
            </p>

            {/* Quick Stats Pill Strip */}
            <div className="pt-2 flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-ink-muted bg-inset px-3 py-1.5 rounded-lg border border-line">
                <Target className="w-4 h-4 text-accent-cyan" />
                <span>Attempts: <strong className="text-ink">{completedAttempts.length}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-ink-muted bg-inset px-3 py-1.5 rounded-lg border border-line">
                <TrendingUp className="w-4 h-4 text-accent-emerald" />
                <span>Avg Accuracy: <strong className="text-accent-emerald">{avgAccuracy}%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-ink-muted bg-inset px-3 py-1.5 rounded-lg border border-line">
                <Award className="w-4 h-4 text-accent-amber" />
                <span>Best Percentile: <strong className="text-accent-amber">{bestPercentile != null ? `${bestPercentile}th` : '- (benchmarking)'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-accent-rose text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-accent-rose" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: STANDARDIZED TEST TRACKS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-cyan" />
                Select Assessment Track
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted">
                Tests run in fullscreen mode with server-authoritative monotonic timers and anti-tamper telemetry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tmpl) => {
              const isStarting = startingTemplateId === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  className="rounded-2xl bg-surface border border-line p-6 flex flex-col justify-between hover:border-cyan-500/50 transition-all duration-300 shadow-sm group hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-accent-cyan group-hover:scale-105 transition-transform">
                        <Brain className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-surface-2 border border-line text-ink-muted">
                        {tmpl.proctoringStrictness}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-accent-cyan transition-colors">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-accent-cyan font-medium">{tmpl.subtitle}</p>
                    </div>

                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-3">
                      {tmpl.description}
                    </p>

                    <div className="pt-2 border-t border-line space-y-2 text-xs text-ink-muted">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-ink-faint">
                          <Clock className="w-3.5 h-3.5" /> Duration
                        </span>
                        <span className="font-semibold text-ink">{tmpl.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-ink-faint">
                          <BarChart3 className="w-3.5 h-3.5" /> Questions
                        </span>
                        <span className="font-semibold text-ink">{tmpl.totalQuestions} Items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-ink-faint">
                          <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" /> Negative Marking
                        </span>
                        <span className={tmpl.negativeMarking ? 'text-accent-amber font-semibold' : 'text-ink-muted'}>
                          {tmpl.negativeMarking ? 'Yes (-0.25)' : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      disabled={isStarting}
                      onClick={() => handleStartTest(tmpl.id)}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isStarting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Assembling Session…</span>
                        </>
                      ) : (
                        <>
                          <span>Start Assessment</span>
                          </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SCORE TREND (visible once 2+ attempts exist) */}
        {completedAttempts.length >= 2 && (() => {
          const ordered = [...completedAttempts].reverse();
          const maxScore = Math.max(...ordered.map((a) => a.score), 100);
          const W = 560;
          const H = 120;
          const PAD = 24;
          const stepX = (W - PAD * 2) / (ordered.length - 1);
          const points = ordered.map((a, i) => {
            const x = PAD + i * stepX;
            const y = H - PAD - (a.score / maxScore) * (H - PAD * 2);
            return [x, y];
          });
          const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
          return (
            <section className="rounded-2xl bg-surface border border-line p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-emerald" />
                  Score Trend — Last {ordered.length} Attempts
                </h2>
                <span className="text-[11px] text-ink-muted font-mono">
                  Δ {(() => {
                    const last = ordered[ordered.length - 1];
                    const d = last?.deltaVsPrevious;
                    return d != null ? `${d >= 0 ? '+' : ''}${d} pts vs prev` : '';
                  })()}
                </span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
                <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="currentColor" className="text-line" strokeWidth="1" />
                <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="4" fill="#22d3ee" stroke="#0f172a" strokeWidth="2">
                    <title>{ordered[i].templateTitle}: {ordered[i].score}%</title>
                  </circle>
                ))}
              </svg>
            </section>
          );
        })()}

        {/* SECTION 2: ATTEMPT HISTORY & SCORECARDS */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-ink tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent-amber" />
            Previous Assessment Scorecards
          </h2>

          {history.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface border border-line text-center space-y-3">
              <Brain className="w-10 h-10 text-ink-faint mx-auto" />
              <h3 className="text-base font-semibold text-ink">No Test Attempts Yet</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Launch a 15-minute speed sprint or standard campus mock to benchmark your speed, accuracy, and percentile rank.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full min-w-[720px] text-left text-xs sm:text-sm text-ink">
                <thead className="bg-surface-2 border-b border-line text-ink-muted text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Assessment</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Accuracy</th>
                    <th className="py-3.5 px-4">Percentile</th>
                    <th className="py-3.5 px-4">Integrity Trust</th>
                    <th className="py-3.5 px-4">Velocity</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((att) => (
                    <tr key={att.sessionId} className="hover:bg-surface-2/60 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-medium text-ink">
                        <div>{att.templateTitle}</div>
                        <div className="text-[10px] text-ink-faint font-mono">
                          {new Date(att.startedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-accent-cyan">{att.score}%</td>
                      <td className="py-3.5 px-4 text-accent-emerald font-semibold">{att.accuracy}%</td>
                      <td className="py-3.5 px-4 font-bold text-accent-amber">{att.percentile != null ? `${att.percentile}th` : '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${att.trustScore >= 80 ? 'text-accent-emerald' : 'text-rose-500'}`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {att.trustScore}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted">{att.speedIndex}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/candidate/aptitude/test/${att.sessionId}/report`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-line hover:border-cyan-500/40 text-accent-cyan font-medium text-xs transition-colors"
                        >
                          <span>Scorecard</span>

                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
