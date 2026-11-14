import { Briefcase, Plus, Send } from 'lucide-react';
import type { JobProfile } from '../dashboard-types';

export function JobPositionsSection({
  jobProfiles,
  openInviteModal,
  openCreateJobModal,
}: {
  jobProfiles: JobProfile[];
  openInviteModal: (jobId?: string) => void;
  openCreateJobModal?: () => void;
}) {
  return (
    <section id="rubrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobProfiles.length === 0 ? (
        <div className="col-span-full card-panel p-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-accent-cyan border border-cyan-500/20 flex items-center justify-center mx-auto shadow-sm">
            <Briefcase className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-ink">No active job openings yet</h3>
            <p className="text-ink-muted text-xs max-w-md mx-auto">
              Create your first job position to configure an autonomous AI evaluation rubric and start screening applicants.
            </p>
          </div>
          {openCreateJobModal && (
            <button
              type="button"
              onClick={openCreateJobModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Job Position</span>
            </button>
          )}
        </div>
      ) : (
        jobProfiles.map((job, idx) => (
        <div
          key={job.id ? `${job.id}-${idx}` : `job-${idx}`}
          className="card-panel-hover p-6 space-y-4 h-full flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-accent-indigo border border-indigo-500/20">
                {job.department}
              </span>
              <span className="text-xs font-mono text-ink-muted">
                Level: <span className="text-ink">{job.experienceLevel}</span>
              </span>
            </div>

            <h3 className="text-lg font-bold text-ink">{job.title}</h3>

            <div className="space-y-1.5">
              <p className="text-xs text-ink-muted font-medium">Required Technical Rubrics:</p>
              <div className="flex flex-wrap gap-1.5">
                {job.skillsRequired.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-inset border border-line text-xs text-ink font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              <strong className="text-ink font-mono">{job.applicantsCount}</strong> Candidates Screened
            </span>

            <button
              type="button"
              onClick={() => openInviteModal(job.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </div>
      ))
    )}
    </section>
  );
}
