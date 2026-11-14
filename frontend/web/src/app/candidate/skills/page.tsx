'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  fetchCandidateSkillInsights,
  fetchCandidateSkills,
  type CandidateSkillInsight,
  type CandidateSkillInsights,
  type CandidateSkill,
} from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  GraduationCap,
  Award,
  BookOpen,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileText,
  ExternalLink,
  Star,
  Rocket,
  ShieldCheck,
  ClipboardList,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

/** Star tier → human label, aligned with backend _level(). */
function tierOf(outOf5?: number): string {
  if (outOf5 === undefined) return 'Unexplored';
  if (outOf5 >= 4.5) return 'Expert';
  if (outOf5 >= 3.5) return 'Advanced';
  if (outOf5 >= 2.5) return 'Competent';
  if (outOf5 >= 1.5) return 'Developing';
  if (outOf5 >= 0.5) return 'Learning';
  return 'Unexplored';
}

/** 0-5 star rating with partial fill, fully CSS-driven. */
function StarRating({ score, size = 18 }: { score: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  const stars = Array.from({ length: 5 }, (_, i) => i);
  return (
    <div
      role="img"
      aria-label={`${score.toFixed(1)} out of 5 stars`}
      className="relative inline-flex items-center gap-1 align-middle"
    >
      {/* Empty track row */}
      <div className="flex items-center gap-0.5">
        {stars.map((i) => (
          <Star
            key={i}
            className="text-surface-3 fill-surface-3 shrink-0"
            style={{ width: size, height: size }}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ))}
      </div>
      {/* Filled overlay, clipped to score fraction */}
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-0.5">
          {stars.map((i) => (
            <Star
              key={i}
              className="text-accent-amber fill-accent-amber shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Source badges for evidence transparency. */
function SourceBadge({ sources }: { sources?: Array<'interview' | 'practice'> }) {
  if (!sources || sources.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-inset px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-faint">
        Untested
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sources.includes('interview') && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-emerald">
          Real interview
        </span>
      )}
      {sources.includes('practice') && (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
          Practice drill
        </span>
      )}
    </div>
  );
}

/** One-liner source footnote for a skill row. */
function sourceFootnote(skill: CandidateSkill): string {
  const sessions = skill.sessionsCount ?? 0;
  const interviews = skill.interviewEvidenceCount ?? 0;
  const parts: string[] = [];
  if (sessions > 0) parts.push(`${sessions} drill${sessions === 1 ? '' : 's'} taken`);
  if (interviews > 0) parts.push(`${interviews} interview ${interviews === 1 ? 'session' : 'sessions'}`);
  return parts.length > 0 ? parts.join(' · ') : 'Not yet practised — take a drill to rate this skill';
}

export default function CandidateSkillsPage() {
  const [insights, setInsights] = useState<CandidateSkillInsights | null>(null);
  const [profileSkills, setProfileSkills] = useState<CandidateSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSkills() {
      setLoading(true);
      try {
        const [insightData, rawSkills] = await Promise.all([
          fetchCandidateSkillInsights(),
          fetchCandidateSkills(),
        ]);
        setInsights(insightData);
        const resolvedSkills =
          (insightData?.skills && insightData.skills.length > 0)
            ? insightData.skills
            : (rawSkills && rawSkills.length > 0)
              ? rawSkills
              : [];
        setProfileSkills(resolvedSkills);
      } catch (err) {
        console.error('Failed to fetch candidate skills data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, []);

  // Only skills with assessment evidence are listed in the competency matrix.
  const assessedSkills: CandidateSkillInsight[] = insights?.competencies ?? [];
  const hasAssessedSkills = assessedSkills.length > 0;
  const hasResumeSkills = profileSkills.length > 0;

  // Average stars across all resume skills (0 when none).
  const avgStars = useMemo(() => {
    if (profileSkills.length === 0) return 0;
    const sum = profileSkills.reduce((acc, s) => acc + (s.scoreOutOf5 ?? 0), 0);
    return Math.round((sum / profileSkills.length) * 10) / 10;
  }, [profileSkills]);

  const assessedCount = useMemo(
    () => profileSkills.filter((s) => (s.assessed ?? false)).length,
    [profileSkills]
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <DashboardHeader />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden rounded-2xl bg-surface border border-line p-6 sm:p-7">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-accent-cyan" />
                  Technical Skill Matrix
                </span>
                {hasResumeSkills && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 border border-emerald-500/30 text-accent-emerald">
                    {profileSkills.length} Skills Linked
                  </span>
                )}
                {assessedCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 border border-amber-500/30 text-accent-amber">
                    {assessedCount} Assessed
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                Technical Competency &amp; Skill Benchmarks
              </h1>
              <p className="text-ink-muted text-xs sm:text-sm">
                Every skill from your resume is scored 0–5 from your practice drills and live interviews. Drill the weakest one to move the needle.
              </p>
            </div>

            <div className="flex items-center gap-4 md:gap-6 shrink-0">
              <div className="flex flex-col items-center md:items-end gap-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-ink-faint">Overall Stars</p>
                <div className="flex items-center gap-2">
                  <StarRating score={avgStars} size={20} />
                  <span className="font-mono font-bold text-lg text-accent-amber tabular-nums">{avgStars.toFixed(1)}</span>
                </div>
                <p className="text-[10px] font-mono text-ink-faint">/ 5.0</p>
              </div>
              <div className="h-12 w-px bg-line hidden md:block" />
              <div className="flex flex-col items-center md:items-end gap-1">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-ink-faint">Readiness</p>
                <p className="text-lg font-extrabold text-ink tabular-nums">{insights?.overallReadinessScore ?? '—'}</p>
                <p className="text-[10px] font-mono text-ink-muted">{insights?.readinessTier ?? 'Not evaluated'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SECTION 1: RESUME SKILLS — 0-5 STAR RATING ============ */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-cyan" />
                <span>Your Resume Skills</span>
                {hasResumeSkills && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan">
                    {profileSkills.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Skills extracted from your resume, scored 0–5 from your practice drills and interviews.
              </p>
            </div>
            <Link
              href="/candidate/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-cyan hover:underline"
            >
              <span>Manage in Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-accent-cyan animate-spin mx-auto" />
              <p className="text-ink-muted text-xs">Loading your skills...</p>
            </div>
          ) : hasResumeSkills ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileSkills.map((skill, idx) => {
                const outOf5 = skill.scoreOutOf5 ?? 0;
                const level = skill.level ?? tierOf(outOf5);
                const assessed = skill.assessed ?? false;
                const sessions = skill.sessionsCount ?? 0;
                const practiceHref = `/candidate/practice?skill=${encodeURIComponent(skill.name)}`;

                return (
                  <div
                    key={`${skill.name}-${idx}`}
                    className="group rounded-2xl bg-surface border border-line p-5 space-y-4 transition-all hover:border-line-strong hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]"
                  >
                    {/* Header row: name + source badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-accent-cyan shrink-0" />
                          <span className="text-sm font-bold text-ink truncate">{skill.name}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-line text-ink-muted">
                            Resume
                          </span>
                        </div>
                        <SourceBadge sources={skill.sources} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-ink-faint">Level</span>
                        <span className={`text-xs font-bold ${assessed ? 'text-accent-cyan' : 'text-ink-faint'}`}>
                          {level}
                        </span>
                      </div>
                    </div>

                    {/* Stars + numeric */}
                    <div className="flex items-center justify-between gap-4 border-t border-line/60 pt-3">
                      <div className="space-y-1">
                        <StarRating score={outOf5} size={22} />
                        <p className="text-[11px] font-mono text-ink-faint">
                          {outOf5.toFixed(1)} / 5.0{sessions > 0 ? ` · ${sessions} drill${sessions === 1 ? '' : 's'}` : ''}
                        </p>
                      </div>
                      <Link
                        href={practiceHref}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-on-brand text-xs font-bold transition-all"
                        aria-label={`Practice ${skill.name}`}
                      >
                        Practice
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Evidence footnote */}
                    <p className="text-[10px] font-mono text-ink-faint leading-snug">
                      {sourceFootnote(skill)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-line p-8 text-center space-y-3">
              <FileText className="w-8 h-8 text-ink-faint mx-auto" />
              <p className="text-ink font-semibold text-sm">No resume skills detected</p>
              <p className="text-ink-muted text-xs max-w-md mx-auto">
                Upload your resume and we will extract your technical stack — then rate each skill as you practice.
              </p>
              <Link
                href="/candidate/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 text-xs font-semibold"
              >
                <span>Upload Resume in Profile</span>
              </Link>
            </div>
          )}

          {/* Tip strip */}
          {hasResumeSkills && (
            <div className="rounded-2xl border border-line bg-inset px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-[11px] text-ink-muted">
                <span className="font-semibold text-ink">Tip:</span> A skill’s star rating rises with every practice drill you complete — pick the weakest one first.
              </p>
              <Link
                href="/candidate/practice"
                className="inline-flex items-center gap-1 text-accent-cyan hover:underline font-semibold text-xs shrink-0"
              >
                <span>Practice all skills</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* ============ SECTION 2: INTERVIEW / PRACTICE EVIDENCE ============ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-cyan" />
              <span>Interview &amp; Practice Evidence</span>
              {hasAssessedSkills && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-accent-amber">
                  {assessedSkills.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Competency scores pulled from your AI interview scorecards and practice drills. Scores are shown 0–5 stars and 0–100 numeric.
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
              <p className="text-ink-muted text-sm">Fetching skill assessments...</p>
            </div>
          ) : hasAssessedSkills ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessedSkills.map((item, idx) => {
                const score100 = typeof item.score === 'number' ? item.score : 0;
                const outOf5 = Math.max(0, Math.min(5, score100 / 20));
                const percent = Math.max(0, Math.min(100, score100));
                return (
                  <div key={`${item.name}-${idx}`} className="rounded-2xl bg-surface border border-line p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-ink leading-snug">{item.name}</span>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-accent-cyan border border-cyan-500/20 uppercase tracking-wider">
                        {item.level || 'Assessed'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <StarRating score={outOf5} size={16} />
                      <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted">
                        <span>0–5 stars</span>
                        <span className="text-accent-amber font-bold">{outOf5.toFixed(1)} / 5.0</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-ink-muted">
                          {(item.sources ?? []).join(' + ') || 'Evidence'}
                        </span>
                        <span className="font-mono text-accent-cyan font-bold">{score100} / 100</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-inset overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-line p-10 text-center space-y-3">
              <GraduationCap className="w-8 h-8 text-ink-faint mx-auto" />
              <p className="text-ink font-semibold text-sm">No evidence-based scores yet</p>
              <p className="text-ink-muted text-xs max-w-md mx-auto">
                Complete a practice drill or a mock interview for any of your resume skills and the star rating above will fill in automatically.
              </p>
              <Link
                href="/candidate/practice"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 text-xs font-semibold"
              >
                <span>Start a Practice Drill</span>
              </Link>
            </div>
          )}
        </section>

        {/* ============ SECTION 3: RECOMMENDED DRILLS ============ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-indigo" />
            <span>Recommended Drills For Your Stack</span>
          </h2>

          {insights?.recommendedDrills && insights.recommendedDrills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.recommendedDrills.map((drill: any, i: number) => (
                <div
                  key={i}
                  className="rounded-2xl bg-surface border border-line p-5 flex items-start justify-between gap-4 hover:border-line-strong transition-all"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-indigo bg-indigo-500/10 border border-indigo-500/30 rounded-full px-2 py-0.5">
                        {drill.difficulty}
                      </span>
                      <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">
                        {drill.category}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-ink leading-snug">{drill.title}</p>
                    <p className="text-[11px] text-ink-muted">{drill.estimatedTime}</p>
                  </div>
                  <Link
                    href="/candidate/practice?drill=recommended"
                    className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan transition-all"
                    aria-label="Open drill"
                  >
                    <Rocket className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface border border-line p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-ink-faint mx-auto" />
              <p className="text-ink font-semibold text-sm">No recommendations available yet</p>
              <p className="text-ink-muted text-xs max-w-md mx-auto">
                Drill recommendations are generated automatically from your interview scorecard feedback. Complete an interview session and personalized recommendations will appear here.
              </p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
