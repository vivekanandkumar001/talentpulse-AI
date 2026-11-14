'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  FileUp,
  FileCheck,
  Building,
  Zap,
  Target,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
  ChevronDown } from 'lucide-react';
import {
  apiFetch,
  fetchCandidateResumes,
  fetchPracticeJobRoles,
  createPracticeInterview,
  suggestPracticeJobDescription,
  isValidSessionId,
  formatBytes,
  type CandidateResume,
} from '@/lib/api';

type JdMode = 'paste' | 'upload';

// Practice sessions are fixed-length (matches "10-Minute Fixed Drill" copy everywhere).
const PRACTICE_MINUTES = 10;

// Only used if the backend dropdown source (live postings + past roles) returns
// nothing, so the picker is never empty. The list itself is data-driven.
const FALLBACK_JOB_ROLES = [
  'Senior Full-Stack Engineer',
  'Full-Stack Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Software Engineer',
  'Data Engineer',
  'Data Scientist',
  'ML Engineer',
  'QA Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Security Engineer',
  'Mobile Developer',
  'Technical Lead',
  'Software Architect',
  'Product Manager',
  'Data Analyst',
];

export function PracticeInterviewSetup() {
  const router = useRouter();

  // Mode: Paste or Upload
  const [jdMode, setJdMode] = useState<JdMode>('paste');
  const [pastedJd, setPastedJd] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);

  // Job Role
  const [jobRole, setJobRole] = useState('');
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleHighlight, setRoleHighlight] = useState(-1);

  // JD suggestion
  const [isSuggestingJd, setIsSuggestingJd] = useState(false);
  const [jdSuggestion, setJdSuggestion] = useState<{ source: string; title: string | null; company: string | null } | null>(null);
  const [jdSuggestionError, setJdSuggestionError] = useState<string | null>(null);

  // Candidate Resume State
  const [resumes, setResumes] = useState<CandidateResume[] | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Wallet / Balance State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [ratePerMinCredits, setRatePerMinCredits] = useState(0.5);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [isLowBalance, setIsLowBalance] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const roleBoxRef = useRef<HTMLDivElement>(null);

  // Fetch candidate's wallet balance
  useEffect(() => {
    let isMounted = true;
    async function loadWallet() {
      try {
        setLoadingWallet(true);
        const res = await apiFetch('/api/billing/wallet');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.wallet) {
            // Rate is read from the live wallet payload — never hardcode what we charge.
            const rate = Number(
              data.wallet.ratePerMinuteCredits ?? data.wallet.rate_per_minute_credits ?? 0.5
            );
            if (Number.isFinite(rate) && rate > 0) setRatePerMinCredits(rate);
            const storedBalance = Number(data.wallet.availableCredits ?? 0);
            setWalletBalance(storedBalance <= 0 ? 0 : storedBalance);
            setIsLowBalance(storedBalance > 0 && storedBalance < rate * PRACTICE_MINUTES);
          }
        }
      } catch (err) {
        console.error('[PracticeSetup] Wallet API error:', err);
        // Do not fabricate a balance on failure — the server enforces the
        // real balance at session creation (402 INSUFFICIENT_CREDITS).
        setWalletBalance(null);
      } finally {
        if (isMounted) setLoadingWallet(false);
      }
    }
    void loadWallet();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch candidate's existing resume on mount
  useEffect(() => {
    let isMounted = true;
    async function loadResume() {
      setLoadingResume(true);
      setResumeError(null);
      const data = await fetchCandidateResumes();
      if (!isMounted) return;
      if (data === null) {
        setResumes(null);
        setResumeError('Could not load saved resume context.');
      } else {
        setResumes(data);
      }
      setLoadingResume(false);
    }
    void loadResume();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load real role suggestions for the dropdown (live postings + past roles).
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      const roles = await fetchPracticeJobRoles();
      if (!isMounted) return;
      setRoleOptions(roles);
    }
    void loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close the role suggestion list when clicking outside the field.
  useEffect(() => {
    if (!roleOpen) return;
    function onDocMouseDown(event: MouseEvent) {
      if (roleBoxRef.current && !roleBoxRef.current.contains(event.target as Node)) {
        setRoleOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [roleOpen]);

  const roleSuggestions = roleOptions.length > 0 ? roleOptions : FALLBACK_JOB_ROLES;

  // Filter the suggestions against what the candidate typed. Free typing is
  // always allowed; the list only helps, it never forces a choice.
  const filteredRoles = (() => {
    const query = jobRole.trim().toLowerCase();
    if (!query) return roleSuggestions;
    return roleSuggestions.filter((role) => role.toLowerCase().includes(query));
  })();

  const activeRoleIndex =
    roleHighlight >= 0 && roleHighlight < filteredRoles.length ? roleHighlight : -1;

  // Derived billing figures — driven by the live wallet rate, never hardcoded.
  const costPerInterview = Math.max(0, ratePerMinCredits * PRACTICE_MINUTES);
  const affordableCount =
    walletBalance === null ? null : Math.floor(walletBalance / (costPerInterview || 1));

  // Determine active parsed resume
  const activeResume = resumes?.find(
    (r) => r.is_active && (r.status === 'PARSED' || r.status === 'UPLOADED')
  ) || resumes?.[0];

  const hasUsableResume = Boolean(activeResume);

  // Validate inputs
  const isZeroBalance = walletBalance !== null && walletBalance <= 0;
  const isJdValid = jdMode === 'paste' ? pastedJd.trim().length >= 20 : Boolean(jdFile);
  const isRoleValid = jobRole.trim().length >= 2;
  const canStart = isJdValid && isRoleValid && !isSubmitting && !isZeroBalance;

  // Role combobox handlers (free typing + anchored suggestion list).
  const selectRole = (role: string) => {
    setJobRole(role);
    setRoleOpen(false);
    setRoleHighlight(-1);
  };

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!roleOpen) {
        setRoleOpen(true);
        setRoleHighlight(filteredRoles.length > 0 ? 0 : -1);
        return;
      }
      setRoleHighlight((prev) => (filteredRoles.length === 0 ? -1 : (prev + 1) % filteredRoles.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!roleOpen) {
        setRoleOpen(true);
        setRoleHighlight(filteredRoles.length > 0 ? filteredRoles.length - 1 : -1);
        return;
      }
      setRoleHighlight((prev) =>
        filteredRoles.length === 0
          ? -1
          : prev <= 0
          ? filteredRoles.length - 1
          : prev - 1
      );
      return;
    }
    if (e.key === 'Enter') {
      if (roleOpen) {
        e.preventDefault();
        if (activeRoleIndex >= 0) selectRole(filteredRoles[activeRoleIndex]);
        else setRoleOpen(false);
      }
      return;
    }
    if (e.key === 'Escape') {
      if (roleOpen) {
        e.preventDefault();
        setRoleOpen(false);
      }
      return;
    }
    if (e.key === 'Tab') {
      setRoleOpen(false);
    }
  };

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setSubmitError('Supported formats: PDF, DOC, DOCX, TXT');
        return;
      }
      setSubmitError(null);
      setJdFile(file);
    }
  };

  const handleClearFile = () => {
    setJdFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSuggestJd = async () => {
    if (jobRole.trim().length < 2) {
      setJdSuggestionError('Enter a job title first so the description can be tailored.');
      setJdSuggestion(null);
      return;
    }

    setIsSuggestingJd(true);
    setJdSuggestionError(null);
    setJdSuggestion(null);

    try {
      const result = await suggestPracticeJobDescription(jobRole.trim());
      setPastedJd(result.job_description || '');
      setJdMode('paste');
      setJdFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setJdSuggestion({
        source: result.source,
        title: result.job_title || jobRole.trim(),
        company: result.company_name || null,
      });
      setSubmitError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not generate a job description right now. Please try again.';
      setJdSuggestionError(message);
    } finally {
      setIsSuggestingJd(false);
    }
  };

  // Start interview submission
  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isZeroBalance) {
      setSubmitError('Your wallet balance is 0 credits. You cannot start a practice interview with zero balance. Please recharge your wallet.');
      return;
    }
    if (!canStart) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        job_role: jobRole.trim(),
        job_description: jdMode === 'paste' ? pastedJd.trim() : undefined,
        file: jdMode === 'upload' && jdFile ? jdFile : undefined,
      };

      const result = await createPracticeInterview(payload);

      if (result && isValidSessionId(result.session_id)) {
        const targetUrl = result.target_url || `/candidate/interview/${result.session_id}/lobby`;
        router.push(targetUrl);
      } else {
        throw new Error('Interview created but no session ID was returned.');
      }
    } catch (err) {
      console.error('[PracticeSetup] Failed to start practice interview:', err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to start practice interview. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* ------------------------------------------------------------- HERO SECTION */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface via-surface-2 to-canvas border border-line p-6 sm:p-8 lg:p-10 shadow-2xl">
        {/* Glow ambient spots */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-accent-indigo/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
            AI Practice Interview Simulator
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink leading-tight">
            Practice & Elevate Your{' '}
            <span className="bg-gradient-to-r from-accent-cyan via-accent-indigo to-accent-violet bg-clip-text text-transparent">
              Interview Performance
            </span>
          </h1>

          <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
            Launch a tailored, AI-led screening interview based on any target job role and description. Get real-time technical evaluation, audio analysis, and instant rubric scoring.
          </p>

          {/* Key Feature Chips */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-ink-2 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas/80 border border-line">
              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
              <span>10-Minute Fixed Drill</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas/80 border border-line">
              <Zap className="w-3.5 h-3.5 text-accent-amber" />
              <span>Adaptive Question Synthesis</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas/80 border border-line">
              <Target className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Job-Specific Competencies</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas/80 border border-line">
              <BarChart3 className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Instant Post-Session Dossier</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-accent-rose/10 border border-accent-rose/30 text-accent-rose flex items-start gap-3.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Unable to initiate practice interview session</p>
            <p className="mt-0.5 text-xs opacity-90">{submitError}</p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- MAIN FORM GRID */}
      <form onSubmit={handleStartInterview} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: SETUP INPUTS (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: TARGET JOB ROLE */}
          <div
            className={`relative bg-surface/90 backdrop-blur-xl border border-line rounded-xl p-6 sm:p-7 shadow-xl space-y-5 transition-all hover:border-accent-cyan/30 ${
              roleOpen ? 'z-20' : 'z-0'
            }`}
          >
            <div className="flex items-start justify-between gap-3 sm:items-center">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan flex items-center justify-center font-bold">
                  1
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Briefcase className="w-5 h-5 flex-shrink-0 text-accent-cyan" />
                    Target Job Role
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Specify the position or level you are practicing for.
                  </p>
                </div>
              </div>

              {jobRole.trim().length >= 2 && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Role Defined
                </span>
              )}
            </div>

            <div>
              <label htmlFor="job-role-input" className="block text-xs font-bold text-ink-2 uppercase tracking-wider mb-2">
                Job Title / Position
              </label>
              <div className="relative" ref={roleBoxRef}>
                <input
                  id="job-role-input"
                  type="text"
                  value={jobRole}
                  onChange={(e) => {
                    setJobRole(e.target.value);
                    setRoleOpen(true);
                    setRoleHighlight(-1);
                  }}
                  onFocus={() => setRoleOpen(true)}
                  onKeyDown={handleRoleKeyDown}
                  placeholder="Please enter target job role (e.g. Senior Full-Stack Engineer, Frontend Lead)..."
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={roleOpen}
                  aria-controls="job-role-listbox"
                  aria-owns="job-role-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={activeRoleIndex >= 0 ? `job-role-option-${activeRoleIndex}` : undefined}
                  className="w-full rounded-2xl bg-canvas border border-line pl-4 pr-12 py-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan transition-all font-medium shadow-inner"
                />
                <button
                  type="button"
                  aria-label={roleOpen ? 'Hide job title suggestions' : 'Show job title suggestions'}
                  aria-expanded={roleOpen}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setRoleOpen((prev) => !prev);
                    setRoleHighlight(-1);
                    document.getElementById('job-role-input')?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${roleOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {roleOpen && (
                  <div
                    id="job-role-listbox"
                    role="listbox"
                    aria-label="Job title suggestions"
                    className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xl"
                  >
                    {filteredRoles.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-ink-muted leading-relaxed">
                        No preset roles match. Press <span className="font-semibold text-ink">Enter</span> or keep
                        typing to use “{jobRole.trim()}” as a custom title.
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          Suggested roles
                        </div>
                        {filteredRoles.map((role, index) => (
                          <button
                            key={role}
                            type="button"
                            id={`job-role-option-${index}`}
                            role="option"
                            aria-selected={index === activeRoleIndex}
                            onMouseEnter={() => setRoleHighlight(index)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectRole(role)}
                            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                              index === activeRoleIndex
                                ? 'bg-accent-cyan/10 text-accent-cyan font-semibold'
                                : 'text-ink hover:bg-canvas'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* STEP 2: JOB DESCRIPTION */}
          <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-xl p-6 sm:p-7 shadow-xl space-y-5 transition-all hover:border-accent-indigo/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/20 text-accent-indigo flex items-center justify-center font-bold">
                  2
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <FileText className="w-5 h-5 flex-shrink-0 text-accent-indigo" />
                    Job Description
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Paste the requirements or upload a job specification document.
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleSuggestJd}
                  disabled={jobRole.trim().length < 2 || isSuggestingJd}
                  className={`inline-flex w-full items-center justify-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all border sm:w-auto sm:py-1.5 ${
                    jobRole.trim().length >= 2 && !isSuggestingJd
                      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20 hover:bg-accent-cyan/20'
                      : 'bg-canvas text-ink-muted border-line cursor-not-allowed'
                  }`}
                  title={jobRole.trim().length >= 2 ? 'Draft a realistic JD for this role' : 'Enter a job title first'}
                >
                  {isSuggestingJd ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-cyan" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                  )}
                  Suggest JD
                </button>

                <div className="flex w-full items-center p-1 rounded-2xl bg-canvas border border-line sm:w-fit">
                  <button
                    type="button"
                    onClick={() => setJdMode('paste')}
                    className={`flex-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer sm:flex-none ${
                      jdMode === 'paste'
                        ? 'bg-surface text-ink shadow-md border border-line'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdMode('upload')}
                    className={`flex-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer sm:flex-none ${
                      jdMode === 'upload'
                        ? 'bg-surface text-ink shadow-md border border-line'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-accent-indigo" />
                    Upload File
                  </button>
                </div>
              </div>
            </div>

            {/* Option A: Paste JD */}
            {jdMode === 'paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="font-semibold uppercase tracking-wider">
                    Job Description Text
                  </span>
                </div>

                <textarea
                  value={pastedJd}
                  onChange={(e) => setPastedJd(e.target.value)}
                  placeholder="Please paste the full job description here (e.g. required technical skills, stack, responsibilities, years of experience)..."
                  rows={8}
                  className="w-full rounded-2xl bg-canvas border border-line px-4 py-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent-indigo/50 focus:border-accent-indigo transition-all resize-y font-mono leading-relaxed shadow-inner"
                />

                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs text-ink-muted pt-1">
                  <span className="min-w-0">
                    {pastedJd.trim().length < 20 ? (
                      <span className="text-accent-amber font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Minimum 20 characters required for personalized questions.
                      </span>
                    ) : (
                      <span className="text-accent-emerald font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Ready for question synthesis ({pastedJd.trim().length} chars)
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] whitespace-nowrap">{pastedJd.trim().length} characters</span>
                </div>

                {jdSuggestion && (
                  <div className="flex items-start gap-2 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 px-3 py-2 text-[11px] text-ink-muted">
                    <Sparkles className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0 mt-0.5" />
                    <span>
                      {jdSuggestion.source === 'job_posting'
                        ? `Drafted from a live job posting${jdSuggestion.company ? ` at ${jdSuggestion.company}` : ''} for “${jdSuggestion.title}”. Review and edit before starting.`
                        : `AI-drafted for “${jdSuggestion.title}”. Review and edit before starting.`}
                    </span>
                  </div>
                )}

                {jdSuggestionError && (
                  <div className="flex items-start gap-2 rounded-xl bg-accent-rose/10 border border-accent-rose/25 px-3 py-2 text-[11px] text-accent-rose">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{jdSuggestionError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Option B: Upload JD */}
            {jdMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="jd-file-upload"
                />

                {!jdFile ? (
                  <label
                    htmlFor="jd-file-upload"
                    className="border-2 border-dashed border-line hover:border-accent-indigo/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-canvas/50 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/20 text-accent-indigo flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-ink">
                      Click to upload or drag & drop Job Specification
                    </p>
                    <p className="text-xs text-ink-muted mt-1 font-medium">
                      Supports PDF, DOC, DOCX, TXT (up to 10 MB)
                    </p>
                  </label>
                ) : (
                  <div className="p-4 rounded-2xl bg-canvas flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald flex items-center justify-center">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink break-all">{jdFile.name}</p>
                        <p className="text-xs text-ink-muted font-mono mt-0.5">
                          {formatBytes(jdFile.size)} • Document Attached
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-2 flex-shrink-0 rounded-xl text-ink-muted hover:text-accent-rose hover:bg-accent-rose/10 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: RESUME CONTEXT */}
          <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-xl p-6 sm:p-7 shadow-xl space-y-4 transition-all hover:border-accent-violet/30">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-accent-violet/10 border border-accent-violet/20 text-accent-violet flex items-center justify-center font-bold">
                  3
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Building className="w-5 h-5 flex-shrink-0 text-accent-violet" />
                    Candidate Resume Profile
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Your candidate profile will personalize questions against your career history.
                  </p>
                </div>
              </div>

              <Link
                href="/candidate/profile"
                className="text-xs text-accent-cyan hover:underline font-semibold flex flex-shrink-0 items-center gap-1"
              >
                Manage Profile 
              </Link>
            </div>

            {loadingResume ? (
              <div className="p-4 rounded-2xl bg-canvas flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-surface-3" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-surface-3 rounded w-1/3" />
                  <div className="h-3 bg-surface-3 rounded w-1/4" />
                </div>
              </div>
            ) : hasUsableResume && activeResume ? (
              <div className="p-4 rounded-2xl bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ink break-all">{activeResume.file_name}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
                        ✓ ACTIVE RESUME LOADED
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Interview AI will cross-reference your experience against the target role.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-accent-cyan/10 text-ink flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-accent-cyan">Standard Profile Context Active</p>
                  <p className="text-ink-muted leading-relaxed">
                    You can start this practice interview immediately! Uploading a resume in your profile adds deeper personalized follow-up questions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* WALLET BALANCE ALERT BANNER */}
          {isZeroBalance ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-accent-amber flex items-start gap-3.5 shadow-lg shadow-amber-500/5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent-amber" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                    <span>Zero Wallet Balance</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-accent-amber border border-amber-500/30">
                      0 Credits
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your wallet balance is 0 credits. Candidates cannot start an AI practice interview without available credits. Please recharge your wallet to launch practice interviews.
                </p>
                <div className="pt-1">
                  <Link
                    href="/candidate/wallet"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all shadow-md shadow-accent-cyan/20 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Recharge Wallet Credits</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : isLowBalance ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-accent-amber flex items-start gap-3.5 shadow-lg shadow-amber-500/5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent-amber" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                    <span>Low Wallet Balance</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-accent-amber border border-amber-500/30">
                      {walletBalance} Credits
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your wallet balance is low. One 10-minute session costs {costPerInterview} credits, so you have enough for {affordableCount ?? 0} more practice interview(s). Please recharge your wallet to continue.
                </p>
                <div className="pt-1">
                  <Link
                    href="/candidate/wallet"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all shadow-md shadow-accent-cyan/20 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Recharge Wallet Credits</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* PRIMARY CTA BAR */}
          <div className="pt-2 flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={!canStart}
              className={`w-full py-4 px-8 rounded-2xl text-base font-bold shadow-2xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-accent-cyan via-accent-indigo to-accent-violet hover:opacity-95 text-white shadow-accent-cyan/25 hover:shadow-accent-cyan/40 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-canvas text-ink-muted border border-line cursor-not-allowed opacity-50 shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Interview Room & Questions...</span>
                </>
              ) : isZeroBalance ? (
                <>
                  <AlertCircle className="w-5 h-5 text-accent-amber" />
                  <span>Recharge Required (Balance: 0 Credits)</span>
                </>
              ) : isLowBalance ? (
                <>
                  <AlertCircle className="w-5 h-5 text-accent-amber" />
                  <span>Low Balance ({walletBalance} Credits)</span>
                </>
              ) : (
                <>
                  <span>Start Practice Interview</span>
                  </>
              )}
            </button>

            {!canStart && !isSubmitting && !isLowBalance && !isZeroBalance && (
              <p className="text-xs text-accent-amber font-medium text-center">
                {!isRoleValid
                  ? '⚠️ Enter or select a Target Job Role above to unlock interview setup.'
                  : !isJdValid
                  ? '⚠️ Provide at least 20 characters of Job Description (or upload a file) to unlock.'
                  : ''}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR TIPS & SIMULATION GUIDE (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SIMULATION SUMMARY CARD */}
          <div className="bg-surface/90 backdrop-blur-xl border border-line rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent-cyan" />
              Screening Room Specs
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3 py-2 border-b border-line">
                <span className="text-ink-muted flex flex-shrink-0 items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-cyan" /> Format
                </span>
                <span className="font-semibold text-ink text-right">AI Practice Interview</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-line">
                <span className="text-ink-muted flex flex-shrink-0 items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent-indigo" /> Session Duration
                </span>
                <span className="font-semibold text-accent-emerald text-right">10 Minutes (Fixed)</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-ink-muted flex flex-shrink-0 items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-accent-violet" /> Evaluation
                </span>
                <span className="font-semibold text-ink text-right">Rubric Scorecard</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-t border-line">
                <span className="text-ink-muted flex flex-shrink-0 items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-accent-amber" /> Cost
                </span>
                <span className="font-semibold text-ink text-right">
                  {costPerInterview} credits <span className="text-ink-muted font-normal">({PRACTICE_MINUTES} min @ {ratePerMinCredits} cr/min)</span>
                </span>
              </div>
            </div>

            <div className="pt-2 rounded-2xl bg-canvas p-3 text-[11px] text-ink-muted leading-relaxed">
              💡 Your interview will adaptively probe technical competencies, system design, and behavioral scenarios tailored to your role.
            </div>
          </div>

          {/* PRO TIPS CARD */}
          <div className="bg-gradient-to-br from-surface via-surface-2 to-canvas border border-line rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-amber" />
              Pro Practice Advice
            </h3>

            <ul className="space-y-3 text-xs text-ink-2">
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1.5 flex-shrink-0" />
                <span>Use the <strong>STAR Method</strong> (Situation, Task, Action, Result) for behavioral questions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-indigo mt-1.5 flex-shrink-0" />
                <span>Speak at a measured pace — the AI analyzes technical depth and delivery confidence.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-violet mt-1.5 flex-shrink-0" />
                <span>When writing code or solving architecture problems, explain your reasoning out loud.</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}