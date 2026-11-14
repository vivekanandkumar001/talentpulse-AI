'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Briefcase,
  MapPin,
  Clock,
  Sparkles,
  Heart,
  Globe,
  Zap,
  CheckCircle2,
  X,
  Upload,
  Send,
  Building2 } from 'lucide-react';

export default function CareerPage() {
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);

  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantLinkedIn, setApplicantLinkedIn] = useState('');
  const [applicantNote, setApplicantNote] = useState('');

  const [liveJobs, setLiveJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadOpenings() {
      try {
        const res = await apiFetch('/api/careers/openings');
        if (res.ok) {
          const data = (await res.json()) as { success: boolean; jobs?: any[] };
          if (isMounted && data.success && Array.isArray(data.jobs) && data.jobs.length > 0) {
            setLiveJobs(data.jobs);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live openings, fallback to static defaults:', err);
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    }
    loadOpenings();
    return () => { isMounted = false; };
  }, []);

  const perks = [
    {
      icon: Globe,
      title: 'Remote-First Culture',
      desc: 'Work from anywhere in the world. We offer home office stipends and co-working allowances.',
    },
    {
      icon: Zap,
      title: 'High-Impact Ownership',
      desc: 'Flat organization where every engineer and researcher shapes product roadmap directly.',
    },
    {
      icon: Sparkles,
      title: 'Top-Tier Compensation & Equity',
      desc: 'Competitive salary benchmarked against top tech tiers, with meaningful early equity ownership.',
    },
    {
      icon: Heart,
      title: 'Comprehensive Health & Wellness',
      desc: 'Full medical, dental, vision coverage with mental health and gym wellness subsidies.',
    },
  ];

  // Careers are managed exclusively from the /super-admin/careers panel.
  // No hardcoded fallback: the public page renders whatever the admin publishes.

  const jobs = liveJobs;

  const filteredJobs =
    selectedDept === 'All' ? jobs : jobs.filter((j) => j.dept === selectedDept);
  const departmentOptions = ['All', ...Array.from(new Set(jobs.map((j: any) => j.dept)))] as string[];

  const handleOpenApply = (job: any) => {
    setSelectedJob(job);
    setApplyModalOpen(true);
    setApplicationSubmitted(false);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApply(true);
    try {
      const res = await apiFetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob?.id || selectedJob?.job_id,
          jobTitle: selectedJob?.title,
          applicantName,
          applicantEmail,
          applicantLinkedIn,
          applicantNote,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Failed to submit application.');
      }
      setApplicationSubmitted(true);
      setTimeout(() => {
        setApplyModalOpen(false);
        setApplicationSubmitted(false);
        setApplicantName('');
        setApplicantEmail('');
        setApplicantLinkedIn('');
        setApplicantNote('');
      }, 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
    } finally {
      setSubmittingApply(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-20 lg:py-28">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-10 left-1/3 w-[500px] h-[350px] bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-accent-emerald text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Join Our Global Team
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink tracking-tight leading-[1.1]">
            Build the Future of{' '}
            <span className="bg-gradient-to-r from-accent-blue via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              Autonomous Intelligence
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-ink-muted">
            We are solving high-stakes challenges in generative audio, real-time code sandboxing, and algorithmic fairness. Join a mission-driven team where your work impacts millions of careers.
          </p>

          <div className="pt-2">
            <a
              href="#openings"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              View Open Roles ({jobs.length}) </a>
          </div>
        </div>
      </section>

      {/* Perks Grid */}
      <section className="py-20 bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider block">
              LIFE AT PROGENI ATLAS
            </span>
            <h2 className="text-3xl font-black text-ink tracking-tight">
              Why You&apos;ll Love Working Here
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map((p, i) => {
              const IconComp = p.icon;
              return (
                <div key={i} className="p-6 rounded-xl border border-line bg-surface-deep space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-accent-blue text-on-brand flex items-center justify-center shadow-md">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-ink">{p.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions Section (#openings) */}
      <section id="openings" className="py-20 bg-surface-deep scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">Open Positions</h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-1">
                Showing {filteredJobs.length} active roles across all departments
              </p>
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {departmentOptions.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedDept === dept
                      ? 'bg-accent-blue text-on-brand shadow-xs'
                      : 'bg-surface text-ink-muted border border-line hover:bg-surface-2'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Job List Cards */}
          <div className="space-y-4">
            {loadingJobs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="p-6 sm:p-7 rounded-xl border border-line bg-surface shadow-xs animate-pulse space-y-3"
                >
                  <div className="flex gap-2">
                    <div className="h-4 w-20 rounded-full bg-surface-2" />
                    <div className="h-4 w-32 rounded bg-surface-2" />
                  </div>
                  <div className="h-5 w-2/3 rounded bg-surface-2" />
                  <div className="h-3 w-full rounded bg-surface-2" />
                  <div className="h-3 w-5/6 rounded bg-surface-2" />
                </div>
              ))
            ) : filteredJobs.length === 0 ? (
              <div className="p-10 sm:p-14 rounded-2xl border border-dashed border-line-strong text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-2 text-ink-muted flex items-center justify-center mx-auto">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-ink">No openings right now</h3>
                  <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto">
                    We continuously hire exceptional engineers, designers and operators. New roles are published here as they open — please check back soon.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-on-brand text-xs font-bold transition-all"
                >
                  Get in touch
                </Link>
              </div>
            ) : (
              filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-6 sm:p-7 rounded-xl border border-line bg-surface shadow-xs hover:border-cyan-400/50 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-accent-blue  border border-blue-500/20">
                      {job.dept}
                    </span>
                    <span className="text-[11px] text-ink-muted flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="text-[11px] text-ink-muted flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {job.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-ink">{job.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{job.description}</p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenApply(job)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover   text-on-brand font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Apply Now</span>
                    </button>
                </div>
              </div>
            )))}
          </div>
        </div>
      </section>

      {/* Interactive Application Modal */}
      {applyModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-2/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-xl bg-surface  border border-line  p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-ink-muted hover:text-ink-muted "
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-accent-blue text-on-brand flex items-center justify-center shadow-md">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink ">Apply for Role</h3>
                <p className="text-xs text-ink-faint">{selectedJob.title}</p>
              </div>
            </div>

            {applicationSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-ink ">Application Received!</h4>
                <p className="text-xs text-ink-faint max-w-xs mx-auto">
                  Thank you for applying to Progeni Atlas. Our talent team reviews applications within 48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Please enter your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="Please enter your email address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    LinkedIn / GitHub / Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={applicantLinkedIn}
                    onChange={(e) => setApplicantLinkedIn(e.target.value)}
                    placeholder="Please enter LinkedIn, GitHub, or portfolio URL"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Resume / Brief Note
                  </label>
                  <textarea
                    rows={3}
                    value={applicantNote}
                    onChange={(e) => setApplicantNote(e.target.value)}
                    placeholder="Please briefly highlight your relevant experience and projects..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-on-brand font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
