'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Brain,
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BookOpen,
  Filter,
  Zap,
  Target,
  Sparkles,
  Share2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  fetchAptitudeReport,
  logAptitudeEvent,
  type AptitudeReportResponse,
  type AptitudeReviewItem,
} from '@/lib/api';

export default function AptitudeReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.testId) ? params.testId[0] : (params.testId as string);

  const [report, setReport] = useState<AptitudeReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      if (!sessionId) return;
      setLoading(true);
      try {
        const res = await fetchAptitudeReport(sessionId);
        if (isMounted) {
          if (res && res.scorecard) {
            setReport(res);
            void logAptitudeEvent('report_view', sessionId);
          } else {
            setError('Report details are currently being finalized or session not found.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve assessment scorecard.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadReport();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard.writeText(window.location.href);
    void logAptitudeEvent('share_click', sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center space-y-4 text-ink">
        <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-base font-semibold text-ink">Generating Cognitive Evaluation Scorecard…</p>
          <p className="text-xs text-ink-faint mt-1">Aggregating 5-pillar performance, speed index & proctoring telemetry</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-ink text-center space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-accent-rose">
          <XCircle className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-xl font-bold">Scorecard Unavailable</h2>
          <p className="text-sm text-ink-muted max-w-md mt-1">{error || 'Session could not be located.'}</p>
        </div>
        <Link
          href="/candidate/aptitude"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan/90 text-white text-sm font-semibold transition"
        >
          <RotateCcw className="w-4 h-4" />
          Return to Aptitude Hub
        </Link>
      </div>
    );
  }

  const { scorecard, templateTitle, candidateName, telemetry } = report;
  const {
    overallScore,
    percentile,
    totalQuestions,
    attempted,
    correct,
    incorrect,
    unanswered,
    accuracyPercent,
    trustScore,
    integrityVerdict,
    speedIndex,
    avgSecondsPerQuestion,
    accuracyVsSpeed,
    sectionalPercentile,
    radar,
    deltaVsPrevious,
    percentileBasis,
    normPoolSize,
    sectionBreakdown,
    review = [],
  } = scorecard;

  // Filter questions
  const filteredReview = review.filter((item: AptitudeReviewItem) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'incorrect') return item.isAttempted && !item.isCorrect;
    if (filter === 'unanswered') return !item.isAttempted;
    return true;
  });

  const getScoreVerdict = (score: number) => {
    if (score >= 80) return { label: 'Exceptional (Top Tier)', color: 'text-accent-emerald', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (score >= 60) return { label: 'Placement Ready (Strong Core)', color: 'text-accent-cyan', bg: 'bg-cyan-500/10 border-cyan-500/30' };
    if (score >= 40) return { label: 'Proficient (Needs Polish)', color: 'text-accent-amber', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'Needs Remedial Practice', color: 'text-accent-rose', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const verdict = getScoreVerdict(overallScore);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-accent-cyan/20">
      <DashboardHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/80 pb-5">
          <div className="space-y-1">
            <Link
              href="/candidate/aptitude"
              className="inline-flex items-center text-xs font-medium text-ink-muted hover:text-accent-cyan transition mb-1"
            >
              Back to Aptitude Arena
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Cognitive Assessment Scorecard</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${verdict.bg} ${verdict.color}`}>
                {verdict.label}
              </span>
              {deltaVsPrevious != null && (
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                  deltaVsPrevious >= 0
                    ? 'bg-accent-emerald/10 text-accent-emerald border-accent-emerald/30'
                    : 'bg-accent-rose/10 text-accent-rose border-accent-rose/30'
                }`}>
                  {deltaVsPrevious >= 0 ? '▲' : '▼'} {Math.abs(deltaVsPrevious)} pts vs your last attempt
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Candidate: <span className="text-ink-2 font-medium">{candidateName || 'Verified Candidate'}</span> • Test:{' '}
              <span className="text-accent-cyan font-medium">{templateTitle || 'Employability Assessment'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={`/api/aptitude/sessions/${sessionId}/report/pdf`}
              target="_blank"
              rel="noreferrer"
              onClick={() => void logAptitudeEvent('pdf_download', sessionId)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-line hover:bg-surface-2 text-xs font-semibold text-ink transition cursor-pointer"
              title="Open print-ready scorecard (save as PDF)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              PDF Scorecard
            </a>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-line hover:bg-surface-2 text-xs font-semibold text-ink transition cursor-pointer"
              title="Copy shareable scorecard URL"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? 'Link Copied!' : 'Share Scorecard'}
            </button>
            <Link
              href="/candidate/aptitude"
              onClick={() => void logAptitudeEvent('retake_click', sessionId)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan hover:bg-accent-cyan/90 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {report.abVariant === 'A' ? 'Retake / New Test' : 'Beat Your Score '}
            </Link>
          </div>
        </div>

        {/* Hero Performance Overview KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Overall Score */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface to-accent-cyan/5 border border-accent-cyan/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan">
              <Award className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Overall Score</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-accent-cyan">{overallScore}%</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              {correct} / {totalQuestions} Solved Correctly
            </p>
          </div>

          {/* Percentile Rank */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface to-accent-violet/5 border border-accent-violet/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-accent-violet/10 text-accent-violet">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Cognitive Rank</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-accent-violet">
                {percentile != null ? `${percentile}th` : '—'}
              </span>
            </div>
            <p className="text-[11px] text-accent-violet mt-1">
              {percentileBasis === 'norm_pool'
                ? `Percentile vs ${normPoolSize} completed attempts`
                : `Benchmarking — unlocks at 30 attempts (${normPoolSize ?? 0}/30)`}
            </p>
          </div>

          {/* Accuracy % */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface to-accent-emerald/5 border border-accent-emerald/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-accent-emerald/10 text-accent-emerald">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Accuracy Rate</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-accent-emerald">{accuracyPercent}%</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              {correct} Correct of {attempted} Attempted
            </p>
          </div>

          {/* Speed Index */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface to-accent-amber/5 border border-accent-amber/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-accent-amber/10 text-accent-amber">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Pace & Velocity</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold text-accent-amber truncate">{speedIndex}</span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              {avgSecondsPerQuestion != null ? `${avgSecondsPerQuestion}s avg / question` : 'Response cadence vs median'}
            </p>
          </div>

          {/* Trust Score */}
          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface to-accent-emerald/5 border border-accent-emerald/30 relative overflow-hidden">
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-accent-emerald/10 text-accent-emerald">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Integrity Trust</p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-accent-emerald">{trustScore}%</span>
            </div>
            <p className="text-[11px] text-accent-emerald mt-1 flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                integrityVerdict === 'clean' ? 'bg-accent-emerald' : integrityVerdict === 'review' ? 'bg-accent-amber' : 'bg-accent-rose'
              }`} />
              {integrityVerdict === 'clean' ? 'Clean session' : integrityVerdict === 'review' ? 'Review recommended' : 'Flagged for review'}
            </p>
          </div>
        </div>

        {/* Cognitive Fitness Radar vs Benchmark */}
        {radar && radar.length >= 3 && (() => {
          const axes = radar.length;
          const R = 78;
          const CX = 100;
          const CY = 92;
          const axisPoint = (i: number, frac: number) => {
            const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
            return [CX + R * frac * Math.cos(angle), CY + R * frac * Math.sin(angle)];
          };
          const polygon = (values: number[]) =>
            values.map((v, i) => axisPoint(i, Math.max(0, Math.min(100, v)) / 100).join(',')).join(' ');
          const gridRings = [0.25, 0.5, 0.75, 1];
          const quadrant = {
            fast_accurate: { label: 'Fast & Accurate', tone: 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10', pos: 'top-right' },
            fast_careless: { label: 'Fast & Careless', tone: 'text-accent-amber border-accent-amber/40 bg-accent-amber/10', pos: 'top-right' },
            slow_accurate: { label: 'Slow & Accurate', tone: 'text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10', pos: 'bottom-right' },
            slow_careless: { label: 'Slow & Careless', tone: 'text-accent-rose border-accent-rose/40 bg-accent-rose/10', pos: 'top-left' },
          }[accuracyVsSpeed ?? 'slow_accurate'];
          return (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-violet" />
                  Cognitive Fitness Radar
                </h2>
                <span className="text-xs text-ink-muted hidden sm:inline">Benchmark line: {Math.round(radar[0]?.benchmark ?? 60)}%</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2 p-4 rounded-2xl bg-surface border border-line flex items-center justify-center">
                  <svg viewBox="0 0 200 184" className="w-full max-w-[260px]">
                    {gridRings.map((frac, i) => (
                      <polygon
                        key={i}
                        points={Array.from({ length: axes }, (_, j) => axisPoint(j, frac).join(',')).join(' ')}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                    ))}
                    {Array.from({ length: axes }, (_, i) => (
                      <line key={i} x1={CX} y1={CY} x2={axisPoint(i, 1)[0]} y2={axisPoint(i, 1)[1]} stroke="#e2e8f0" strokeWidth="1" />
                    ))}
                    <polygon points={polygon(radar.map((r) => r.score))} fill="rgba(2,132,199,0.15)" stroke="#0284c7" strokeWidth="2" />
                    <polygon points={polygon(radar.map((r) => r.benchmark))} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" />
                    {radar.map((r, i) => {
                      const [x, y] = axisPoint(i, 1.14);
                      return (
                        <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize="8" fontWeight="600">
                          {r.pillar}
                        </text>
                      );
                    })}
                    {radar.map((r, i) => {
                      const [x, y] = axisPoint(i, Math.max(0, Math.min(100, r.score)) / 100);
                      return <circle key={`p${i}`} cx={x} cy={y} r="2.2" fill="#0284c7" />;
                    })}
                  </svg>
                </div>
                <div className="lg:col-span-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {radar.map((r) => (
                      <div key={r.pillar} className="p-3 rounded-xl bg-surface-2/60 border border-line flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{r.pillar}</p>
                          <p className="text-[10px] text-ink-faint mt-0.5">Benchmark {Math.round(r.benchmark)}%</p>
                        </div>
                        <span className={`text-sm font-extrabold tabular-nums ${r.score >= r.benchmark ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                          {Math.round(r.score)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`p-3 rounded-xl border ${quadrant.tone} space-y-0.5`}>
                    <p className="text-xs font-bold uppercase tracking-wider">Accuracy × Speed — {quadrant.label}</p>
                    <p className="text-[11px] opacity-90">
                      {accuracyVsSpeed === 'fast_accurate' && 'High velocity with strong accuracy — recruiters notice this profile.'}
                      {accuracyVsSpeed === 'fast_careless' && 'Fast but error-prone. Slow down 15% and your accuracy — and percentile — will climb.'}
                      {accuracyVsSpeed === 'slow_accurate' && 'Accurate but slow. Drill speed on your weakest pillar to convert accuracy into percentile.'}
                      {accuracyVsSpeed === 'slow_careless' && 'Both speed and accuracy need work. Retake the sprint track after targeted drills.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* 5-Pillar Cognitive Section Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent-cyan" />
              5-Pillar Cognitive Competency Matrix
            </h2>
            <span className="text-xs text-ink-muted hidden sm:inline">Mercer & 60% norm-pool benchmark</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(sectionBreakdown || {}).map(([secName, stats]) => {
              const scorePct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              const mins = Math.floor(stats.timeSpent / 60);
              const secs = Math.round(stats.timeSpent % 60);

              let badgeColor = 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30';
              if (scorePct >= 75) badgeColor = 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30';
              else if (scorePct < 40) badgeColor = 'bg-accent-rose/15 text-accent-rose border-accent-rose/30';

              return (
                <div
                  key={secName}
                  className="p-4 rounded-xl bg-surface border border-line hover:border-line-strong transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{secName}</h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {stats.correct} of {stats.total} correct • {stats.attempted} attempted
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                      {scorePct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-inset rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-line">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-ink-faint" />
                      Time: {mins > 0 ? `${mins}m ` : ''}{secs}s
                      {sectionalPercentile?.[secName] != null && (
                        <span className="text-accent-violet font-semibold"> · {sectionalPercentile[secName]}th %ile</span>
                      )}
                    </span>
                    <span className="text-ink-faint">
                      {scorePct >= 75 ? 'Mastery' : scorePct >= 50 ? 'Proficient' : 'Needs Practice'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Question-by-Question Deep Review Arena */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-cyan" />
                Comprehensive Question Solutions & Derivations
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Review your selections, correct answers, step-by-step logic, and mathematical shortcuts.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-line text-xs">
              <span className="px-2 py-1 text-ink-faint flex items-center gap-1 hidden sm:flex">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filter === 'all' ? 'bg-accent-cyan text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                All ({review.length})
              </button>
              <button
                onClick={() => setFilter('correct')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filter === 'correct' ? 'bg-accent-emerald text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Correct ({correct})
              </button>
              <button
                onClick={() => setFilter('incorrect')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filter === 'incorrect' ? 'bg-accent-rose text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Incorrect ({incorrect})
              </button>
              <button
                onClick={() => setFilter('unanswered')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filter === 'unanswered' ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Unanswered ({unanswered})
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {filteredReview.map((item: AptitudeReviewItem, idx: number) => {
              const hasOptions = Array.isArray(item.options) && item.options.length > 0;
              const hasPrompt = Boolean(item.prompt);

              return (
                <div
                  key={item.id || idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    item.isCorrect
                      ? 'bg-accent-emerald/5 border-accent-emerald/40'
                      : item.isAttempted
                      ? 'bg-accent-rose/5 border-accent-rose/40'
                      : 'bg-surface border border-line'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-2 border border-line text-ink-muted">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan">
                        {item.section}
                      </span>
                      <span className="text-xs text-ink-muted">• {item.topic}</span>
                      <span
                        className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                          item.difficulty === 'hard'
                            ? 'bg-accent-rose/10 text-accent-rose'
                            : item.difficulty === 'medium'
                            ? 'bg-accent-amber/10 text-accent-amber'
                            : 'bg-surface-2 text-ink-faint'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-ink-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-ink-faint" />
                        Time: {Math.round(item.timeSpentSeconds || 0)}s
                      </span>
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-accent-emerald font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Correct
                        </span>
                      ) : item.isAttempted ? (
                        <span className="inline-flex items-center gap-1 text-accent-rose font-semibold">
                          <XCircle className="w-4 h-4" /> Incorrect
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-muted font-medium">
                          <HelpCircle className="w-4 h-4" /> Unanswered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  {hasPrompt ? (
                    <div className="py-3">
                      <p className="text-sm sm:text-base font-medium text-ink leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>
                  ) : null}

                  {/* Options List */}
                  {hasOptions ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                      {item.options!.map((opt: string, optIdx: number) => {
                        const isCorrectOption = optIdx === item.correctIndex;
                        const isSelectedByCandidate = optIdx === item.selectedOptionIndex;

                        let optClass = 'bg-surface-2 border border-line text-ink-muted';
                        if (isCorrectOption) {
                          optClass = 'bg-accent-emerald/10 border-accent-emerald/60 text-accent-emerald font-medium';
                        } else if (isSelectedByCandidate && !isCorrectOption) {
                          optClass = 'bg-accent-rose/10 border-accent-rose/60 text-accent-rose';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${optClass}`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-surface border border-line text-ink-muted">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>

                            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                              {isSelectedByCandidate && !isCorrectOption && (
                                <span className="text-accent-rose">Your Selection</span>
                              )}
                              {isCorrectOption && (
                                <span className="text-accent-emerald flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="my-2 p-2.5 rounded-lg bg-inset text-xs text-ink-muted">
                      Answer Key: Option {String.fromCharCode(65 + item.correctIndex)} was correct.
                      {item.selectedOptionIndex !== null && item.selectedOptionIndex !== undefined ? (
                        <span> (You chose Option {String.fromCharCode(65 + item.selectedOptionIndex)})</span>
                      ) : (
                        <span> (Not attempted)</span>
                      )}
                    </div>
                  )}

                  {/* Pedagogical Derivation & Math Shortcuts */}
                  <div className="mt-3.5 pt-3 border-t border-line/80 space-y-2">
                    {item.explanation && (
                      <div className="p-3 rounded-xl bg-inset text-xs sm:text-sm text-ink-muted space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-accent-cyan">
                          <Sparkles className="w-3.5 h-3.5" />
                          Solution Derivation:
                        </div>
                        <p className="leading-relaxed text-ink-muted whitespace-pre-line">{item.explanation}</p>
                      </div>
                    )}

                    {item.formula && (
                      <div className="p-2.5 rounded-lg bg-accent-cyan/5 border border-accent-cyan/30 text-xs text-ink flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                        <div>
                          <span className="font-bold text-accent-cyan">Formula / Rule: </span>
                          <span className="font-mono">{item.formula}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Anti-Cheating Telemetry Audit Box */}
        {telemetry && (
          <section className="p-5 rounded-2xl bg-surface-2 border border-line space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-emerald" />
              Proctoring Integrity Audit Trail
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-inset border border-line">
                <span className="text-ink-faint block">Tab Switches</span>
                <span className="text-base font-bold text-ink">
                  {String((telemetry as Record<string, unknown>).tabSwitchCount ?? 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-inset border border-line">
                <span className="text-ink-faint block">Fullscreen Exits</span>
                <span className="text-base font-bold text-ink">
                  {String((telemetry as Record<string, unknown>).fullscreenExitCount ?? 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-inset border border-line">
                <span className="text-ink-faint block">DevTools Incursions</span>
                <span className="text-base font-bold text-ink">
                  {String((telemetry as Record<string, unknown>).devtoolsOpenedCount ?? 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-inset border border-line">
                <span className="text-ink-faint block">Copy/Paste Blocks</span>
                <span className="text-base font-bold text-ink">
                  {String((telemetry as Record<string, unknown>).copyPasteAttempts ?? 0)}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Footer Next Actions */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-surface to-accent-cyan/5 border border-accent-cyan/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-ink">Ready for the Next Step in Your Pipeline?</h3>
            <p className="text-xs sm:text-sm text-ink-muted">
              Practice 1-on-1 with Sarah Chen in the Humanoid AI Technical Interview Arena.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/candidate/aptitude"
              className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-ink transition cursor-pointer"
            >
              Other Aptitude Tracks
            </Link>
            <button
              onClick={() => router.push('/candidate/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-accent-cyan/90 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 transition"
            >
              Go to Candidate Dashboard
              </button>
          </div>
        </div>
      </main>
    </div>
  );
}
