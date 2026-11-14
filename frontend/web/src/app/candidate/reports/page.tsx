'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Video,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Brain,
  ShieldCheck,
  Zap,
  Target,
  BarChart3,
  X,
  Layers
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  fetchCandidateInterviews,
  fetchCandidatePracticeHistory,
  fetchCandidateAptitudeHistory,
  isValidSessionId,
  type InterviewSession,
  type PracticeHistoryItem,
  type PracticeInterviewItem,
  type PracticeHistoryData,
  type AptitudeAttemptHistory
} from '@/lib/api';

type ReportTab = 'interviews' | 'practice' | 'aptitude';

function RecommendationBadge({ recommendation }: { recommendation: string | null | undefined }) {
  if (!recommendation) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-surface-2 border border-line text-ink-faint flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" /> EVALUATED
      </span>
    );
  }

  const rec = recommendation.toUpperCase();
  const styles: Record<string, string> = {
    STRONG_HIRE: 'bg-emerald-500/15 border-emerald-500/30 text-accent-emerald',
    HIRE: 'bg-cyan-500/15 border-cyan-500/30 text-accent-cyan',
    LEAN_HIRE: 'bg-amber-500/15 border-amber-500/30 text-accent-amber',
    NO_HIRE: 'bg-rose-500/15 border-rose-500/30 text-accent-rose',
    REJECT: 'bg-rose-500/15 border-rose-500/30 text-accent-rose',
  };
  const Icon = rec.includes('HIRE') ? Sparkles : AlertCircle;

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${styles[rec] || 'bg-surface-2 border-line text-ink-muted'}`}
    >
      <Icon className="w-3.5 h-3.5" /> {rec.replace(/_/g, ' ')}
    </span>
  );
}

function CandidateReportsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ReportTab) || 'interviews';

  const [activeTab, setActiveTab] = useState<ReportTab>(
    ['interviews', 'practice', 'aptitude'].includes(initialTab) ? initialTab : 'interviews'
  );

  const [interviews, setInterviews] = useState<InterviewSession[] | null>(null);
  const [practiceData, setPracticeData] = useState<PracticeHistoryData | null>(null);
  const [aptitudeAttempts, setAptitudeAttempts] = useState<AptitudeAttemptHistory[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Drill drill-down modal
  const [selectedDrill, setSelectedDrill] = useState<PracticeHistoryItem | null>(null);

  useEffect(() => {
    async function loadAllReports() {
      setLoading(true);
      try {
        const [intList, pracHistory, aptHistory] = await Promise.all([
          fetchCandidateInterviews(),
          fetchCandidatePracticeHistory(),
          fetchCandidateAptitudeHistory(),
        ]);
        setInterviews(intList);
        setPracticeData(pracHistory);
        setAptitudeAttempts(aptHistory);
      } catch (err) {
        console.error('Failed to load candidate reports:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadAllReports();
  }, []);

  // Filter completed interviews
  const completedInterviews = useMemo(() => {
    if (!interviews) return [];
    return interviews.filter((i) => {
      const st = (i.status || '').toLowerCase();
      return st === 'completed' || st === 'evaluated' || i.reportUrl || i.total_score !== null;
    });
  }, [interviews]);

  // Unified practice items
  const drillAttempts = practiceData?.attempts || [];
  const practiceInterviews = practiceData?.practice_interviews || [];
  const practiceStats = practiceData?.stats || {
    totalDrillsCompleted: 0,
    totalPracticeMinutes: 0,
    averageScore: 0,
    readinessPercentage: 0,
  };

  const totalReportsCount = completedInterviews.length + drillAttempts.length + (aptitudeAttempts?.length || 0);

  const avgInterviewScore = useMemo(() => {
    const scores = completedInterviews.map((i) => i.total_score).filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return drillAttempts.length > 0 ? practiceStats.averageScore : null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [completedInterviews, drillAttempts, practiceStats.averageScore]);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans relative overflow-x-clip selection:bg-cyan-500/30 selection:text-accent-cyan">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[28rem] h-[28rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Modern Dashboard Header */}
      <DashboardHeader />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Page Hero & Overview */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                Verified Dossiers &amp; Analytics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-3">
              <FileText className="w-7 h-7 text-accent-cyan" />
              <span>Assessment &amp; Practice Reports</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted max-w-2xl">
              Access your official AI technical screening dossiers, interactive practice drill feedback,
              and cognitive aptitude evaluation scorecards.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="px-4 py-3 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-muted uppercase">Total Reports</p>
                <p className="text-lg font-bold text-ink">{totalReportsCount}</p>
              </div>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-accent-emerald">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-muted uppercase">Avg Evaluation</p>
                <p className="text-lg font-bold text-ink">
                  {avgInterviewScore !== null ? `${avgInterviewScore}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation Segmented Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center p-1 rounded-2xl bg-surface-2 border border-line shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('interviews')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'interviews'
                  ? 'bg-surface text-accent-cyan shadow-sm border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Interview Reports ({completedInterviews.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'practice'
                  ? 'bg-surface text-accent-cyan shadow-sm border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Practice Reports ({drillAttempts.length + practiceInterviews.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('aptitude')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'aptitude'
                  ? 'bg-surface text-accent-cyan shadow-sm border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Aptitude Reports ({aptitudeAttempts?.length || 0})</span>
            </button>
          </div>

          <Link
            href="/candidate/practice"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch New Practice Drill</span>
          </Link>
        </div>

        {/* Tab 1: Formal Interview Reports */}
        {activeTab === 'interviews' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-line bg-surface p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
                <p className="text-sm text-ink-muted">Loading interview evaluation dossiers...</p>
              </div>
            ) : completedInterviews.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan flex items-center justify-center mx-auto">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">No Completed Interview Reports Yet</h3>
                  <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
                    When you complete an official technical screening or mock interview, your full
                    dossier with turn-by-turn evaluation, competencies, and PDF download will appear here.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/candidate/practice"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs transition"
                  >
                    <span>Start Practice Interview</span>
                    </Link>
                  <Link
                    href="/candidate/interviews"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-ink text-xs font-semibold transition"
                  >
                    <span>View Scheduled Interviews</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {completedInterviews.map((session) => {
                  const hasScore = typeof session.total_score === 'number';
                  const reportUrl = session.reportUrl || `/candidate/interview/${session.id}/report`;
                  const scoreVal = hasScore ? Math.round(session.total_score as number) : null;

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl bg-surface border border-line p-6 hover:border-accent-cyan/40 transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex flex-col items-center justify-center font-mono font-extrabold text-accent-cyan shrink-0">
                          {scoreVal !== null ? (
                            <>
                              <span className="text-base leading-none">{scoreVal}%</span>
                              <span className="text-[9px] uppercase font-sans text-ink-muted mt-0.5">Score</span>
                            </>
                          ) : (
                            <FileText className="w-6 h-6" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-base font-bold text-ink">
                              {session.roleTitle || session.job_title || 'Technical Systems Engineer'}
                            </h3>
                            <RecommendationBadge recommendation={session.final_recommendation} />
                            {session.isPractice && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-violet/10 text-accent-violet border border-accent-violet/30">
                                AI PRACTICE MOCK
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-ink-muted flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{session.companyName || session.company_name || 'Progeni Atlas Assessment'}</span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(session.ended_at || session.scheduled_at).toLocaleDateString()}</span>
                            <span>({session.duration_minutes || 45} mins)</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <Link
                          href={reportUrl}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Full Dossier</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Practice Drill Reports */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            {/* Practice aggregate summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs">
                <p className="text-xs text-ink-muted font-medium">Completed Technical Drills</p>
                <p className="text-xl font-bold text-ink mt-1">{practiceStats.totalDrillsCompleted}</p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs">
                <p className="text-xs text-ink-muted font-medium">Average Drill Accuracy</p>
                <p className="text-xl font-bold text-accent-emerald mt-1">
                  {practiceStats.averageScore ? `${Math.round(practiceStats.averageScore)}%` : '0%'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs">
                <p className="text-xs text-ink-muted font-medium">Practice Time Invested</p>
                <p className="text-xl font-bold text-accent-cyan mt-1">
                  {practiceStats.totalPracticeMinutes} minutes
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-line bg-surface p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
                <p className="text-sm text-ink-muted">Loading practice evaluations...</p>
              </div>
            ) : drillAttempts.length === 0 && practiceInterviews.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-violet/10 border border-purple-500/20 text-accent-violet flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">No Practice Drills Completed Yet</h3>
                  <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
                    Sharpen your technical articulation with 2-turn interactive AI drills or full mock interviews.
                    Every answer is critiqued for technical depth, correctness, and architecture.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/candidate/practice"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Practice Lab</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Practice Mock Interviews */}
                {practiceInterviews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Full AI Mock Interviews
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {practiceInterviews.map((m) => (
                        <div
                          key={m.sessionId}
                          className="rounded-2xl bg-surface border border-line p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-purple-500/40 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center text-accent-violet font-mono font-bold">
                              {m.score !== null && m.score !== undefined ? `${m.score}%` : 'MOCK'}
                            </div>
                            <div>
                              <h4 className="font-bold text-ink text-sm">{m.roleTitle}</h4>
                              <p className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                                <span>{m.companyName}</span>
                                <span>•</span>
                                <span>{new Date(m.scheduledAt || '').toLocaleDateString()}</span>
                              </p>
                            </div>
                          </div>

                          <Link
                            href={m.reportUrl || `/candidate/interview/${m.sessionId}/report`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-violet/10 hover:bg-accent-violet/20 text-accent-violet border border-accent-violet/30 text-xs font-bold transition"
                          >
                            <span>View Mock Report</span>
                            </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Practice Drills */}
                {drillAttempts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Technical Practice Drills
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {drillAttempts.map((drill) => (
                        <div
                          key={drill.id}
                          className="rounded-2xl bg-surface border border-line p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-accent-cyan/40 transition"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-accent-emerald text-sm shrink-0">
                              {drill.score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-ink text-sm">{drill.drillTitle}</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-2 text-ink-muted">
                                  {drill.category}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-cyan/10 text-accent-cyan">
                                  {drill.difficulty}
                                </span>
                              </div>
                              <p className="text-xs text-ink-muted flex items-center gap-2 mt-1 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>{Math.round(drill.durationSeconds / 60)} mins</span>
                                <span>•</span>
                                <span>{new Date(drill.completedAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{(drill.turns || []).length} turns evaluated</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDrill(drill)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-bold text-ink transition cursor-pointer"
                          >
                            <span>Review Turn Feedback</span>
            
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Aptitude Reports */}
        {activeTab === 'aptitude' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-line bg-surface p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
                <p className="text-sm text-ink-muted">Loading cognitive aptitude reports...</p>
              </div>
            ) : !aptitudeAttempts || aptitudeAttempts.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-accent-amber flex items-center justify-center mx-auto">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">No Aptitude Tests Completed Yet</h3>
                  <p className="text-xs text-ink-muted max-w-md mx-auto mt-1">
                    Complete standardized problem-solving, cognitive reasoning, and quantitative aptitude assessments.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/candidate/aptitude"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <span>Browse Aptitude Modules</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {aptitudeAttempts.map((attempt) => (
                  <div
                    key={attempt.sessionId}
                    className="rounded-2xl bg-surface border border-line p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/40 transition shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-accent-amber text-sm shrink-0">
                        {attempt.score}%
                      </div>
                      <div>
                        <h4 className="font-bold text-ink text-sm">{attempt.templateTitle}</h4>
                        <p className="text-xs text-ink-muted flex items-center gap-3 mt-1 font-mono">
                          <span>Accuracy: {attempt.accuracy}%</span>
                          <span>•</span>
                          <span>Percentile: {attempt.percentile != null ? `${attempt.percentile}%` : 'benchmarking'}</span>
                          <span>•</span>
                          <span>Trust Score: {attempt.trustScore}%</span>
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/candidate/aptitude/test/${attempt.sessionId}/report`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-accent-amber border border-amber-500/30 text-xs font-bold transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Aptitude Report</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Drill Feedback Drawer Modal */}
      {selectedDrill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-line flex items-center justify-between bg-surface-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-accent-cyan uppercase">
                  {selectedDrill.category} Drill Evaluation
                </span>
                <h3 className="text-base font-bold text-ink">{selectedDrill.drillTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrill(null)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <p className="text-xs font-semibold text-accent-emerald">
                    Overall Accuracy &amp; Depth Score
                  </p>
                  <p className="text-2xl font-extrabold text-accent-emerald mt-0.5">
                    {selectedDrill.score}%
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-ink-muted">
                  <p>Difficulty: {selectedDrill.difficulty}</p>
                  <p>Duration: {Math.round(selectedDrill.durationSeconds / 60)} mins</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Turn-by-Turn AI Probe &amp; Critique
                </h4>

                {(!selectedDrill.turns || selectedDrill.turns.length === 0) ? (
                  <p className="text-xs text-ink-muted italic">No individual turn records logged for this session.</p>
                ) : (
                  selectedDrill.turns.map((t, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-canvas border border-line space-y-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-accent-cyan">TURN {t.turnIndex || idx + 1}</span>
                        <p className="text-xs font-bold text-ink mt-0.5">{t.question}</p>
                      </div>

                      {t.answer && (
                        <div className="p-3 rounded-lg bg-surface border border-line/60 text-xs text-ink-muted">
                          <p className="text-[10px] font-bold text-ink uppercase mb-1">Your Articulation:</p>
                          <p className="italic">{t.answer}</p>
                        </div>
                      )}

                      {t.scores && (
                        <div className="flex items-center gap-3 text-[11px] font-mono pt-1">
                          <span className="text-accent-emerald">Relevance: {t.scores.relevance ?? '-'}/10</span>
                          <span>•</span>
                          <span className="text-accent-cyan">Depth: {t.scores.depth ?? '-'}/10</span>
                          <span>•</span>
                          <span className="text-accent-violet">Correctness: {t.scores.correctness ?? '-'}/10</span>
                        </div>
                      )}

                      {t.feedback && (
                        <p className="text-xs text-ink-muted bg-accent-cyan/5 border border-accent-cyan/20 p-2.5 rounded-lg">
                          <strong className="text-accent-cyan font-semibold">AI Feedback:</strong> {t.feedback}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-line flex justify-end bg-surface-2">
              <button
                type="button"
                onClick={() => setSelectedDrill(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-line text-xs font-bold text-ink hover:bg-canvas transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas text-ink flex items-center justify-center text-xs text-ink-muted">Loading Assessment & Practice Reports...</div>}>
      <CandidateReportsContent />
    </Suspense>
  );
}
