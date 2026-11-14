import Link from 'next/link';
import { Building2, Plus, Send, ShieldCheck } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

export function HeroBannerSection({
  openInviteModal,
  setShowCreateJobModal,
}: {
  openInviteModal: (jobId?: string) => void;
  setShowCreateJobModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <section className="card-panel relative overflow-hidden p-6 sm:p-7">
      {/* Decorative ambient gradients — enterprise depth, non-interactive */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-blue/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-16 -bottom-24 h-56 w-56 rounded-full bg-accent-indigo/10 blur-3xl" />
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-accent-blue/10 border border-accent-blue/30 text-accent-blue flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-blue" />
              Enterprise Hiring Command Center
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald">
              ● Autonomous AI Technical Interviewer Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Technical Interviews &amp; Candidate Dossiers
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm leading-relaxed">
            Automated multi-modal technical interviews, AI evaluation rubrics, and high-fidelity candidate dossiers for your engineering talent pipelines.
          </p>
        </div>

        {/* ACTION CTA BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => openInviteModal()}
            className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-on-brand btn-primary-gradient font-semibold text-xs sm:text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Invite Candidate</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateJobModal(true)}
            className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-surface hover:bg-inset text-ink-muted border border-line font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer hover:border-line-strong"
          >
            <Plus className="w-4 h-4 text-ink-muted" />
            <span>New Job Position</span>
          </button>

          <Link
            href="/recruiter/profile"
            className="inline-flex items-center justify-center p-2.5 rounded-lg bg-surface hover:bg-inset text-ink-muted border border-line transition-colors shadow-xs"
            title="Manage Enterprise Profile & Team Seats"
          >
            <Building2 className="w-4 h-4 text-ink-muted" />
          </Link>
        </div>
      </div>
    </section>
  );
}
