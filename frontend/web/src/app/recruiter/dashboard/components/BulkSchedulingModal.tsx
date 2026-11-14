import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import Link from 'next/link';
import type { JobProfile } from '../dashboard-types';
import type { UseBulkSchedulingReturn } from '../hooks/useBulkScheduling';

export function BulkSchedulingModal({
  jobProfiles,
  showBulkModal,
  setShowBulkModal,
  bulkStep,
  setBulkStep,
  bulkTargetJobId,
  setBulkTargetJobId,
  bulkCustomRole,
  setBulkCustomRole,
  bulkFiles,
  setBulkFiles,
  isBulkDragging,
  setIsBulkDragging,
  isProcessingBulk,
  bulkNotifyCandidates,
  setBulkNotifyCandidates,
  bulkInviteMessage,
  setBulkInviteMessage,
  bulkProposals,
  isZeroBalance,
  handleBulkFilesSelect,
  handleRemoveBulkFile,
  handleStartBulkProcessing,
  handleUpdateProposalSlot,
  handleConfirmBulkSchedules,
}: { jobProfiles: JobProfile[] } & UseBulkSchedulingReturn) {
  if (!showBulkModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-surface border border-line space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-accent-violet">
              <Sparkles className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">
                Bulk Resume Ingestion &amp; AI Scheduling
              </h3>
              <p className="text-xs text-ink-muted">
                {bulkStep === 'upload'
                  ? 'Upload multiple candidate resumes to associate with an open position.'
                  : 'Review, modify, or confirm AI-proposed non-conflicting interview slots.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowBulkModal(false);
              setBulkStep('upload');
            }}
            className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload Form */}
        {bulkStep === 'upload' && (
          <div className="space-y-4">
            {/* Job Opening / Role Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-accent-indigo" />
                  <span>Target Job Opening / Role</span>
                  <span className="text-accent-rose">*</span>
                </label>
                {jobProfiles.length === 0 && (
                  <span className="text-[11px] text-amber-500 font-medium">
                    No saved openings yet — enter a custom role below
                  </span>
                )}
              </div>
              <select
                value={bulkTargetJobId}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkTargetJobId(val);
                  if (val && val !== 'custom') {
                    const sel = jobProfiles.find((j) => j.id === val);
                    if (sel) setBulkCustomRole(sel.title);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Select target job opening...</option>
                {jobProfiles.map((job, idx) => (
                  <option key={`${job.id}-${idx}`} value={job.id}>
                    {job.title} ({job.department})
                  </option>
                ))}
                <option value="custom">+ Specify Custom Role / New Opening</option>
              </select>
            </div>

            {/* Custom Role Input: Show if 'custom' is selected OR if no saved job openings exist */}
            {(bulkTargetJobId === 'custom' || jobProfiles.length === 0) && (
              <div className="space-y-2 animate-fadeIn p-3 rounded-xl bg-indigo-500/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <span>Role Title (For Hire)</span>
                    <span className="text-accent-rose">*</span>
                  </label>
                  <span className="text-[10px] text-accent-indigo font-bold">Custom Role Active</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Developer, Senior React Engineer..."
                  value={bulkCustomRole}
                  onChange={(e) => {
                    setBulkCustomRole(e.target.value);
                    if (!bulkTargetJobId) setBulkTargetJobId('custom');
                  }}
                  className="w-full px-3.5 py-2 rounded-lg bg-surface border border-line text-ink text-sm focus:outline-none focus:border-indigo-500"
                />

                {/* Quick preset suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-ink-muted mr-1">Quick Select:</span>
                  {[
                    'Frontend Developer',
                    'Full Stack Developer',
                    'Backend Engineer',
                    'DevOps Engineer',
                    'AI / ML Engineer',
                  ].map((roleSuggestion) => (
                    <button
                      key={roleSuggestion}
                      type="button"
                      onClick={() => {
                        setBulkTargetJobId('custom');
                        setBulkCustomRole(roleSuggestion);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-accent-indigo border border-indigo-500/30 transition-all cursor-pointer font-medium"
                    >
                      + {roleSuggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-file Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsBulkDragging(true);
              }}
              onDragLeave={() => setIsBulkDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsBulkDragging(false);
                handleBulkFilesSelect(e.dataTransfer.files);
              }}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                isBulkDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-line hover:border-purple-500/50 bg-inset/50'
              }`}
              onClick={() => {
                const inp = document.getElementById('bulk-resume-input');
                inp?.click();
              }}
            >
              <input
                id="bulk-resume-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => handleBulkFilesSelect(e.target.files)}
              />
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-accent-violet flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Click or drag &amp; drop multiple resumes
                </p>
                <p className="text-xs text-ink-muted">
                  Supports up to 50 files (.pdf, .docx, .txt — max 10MB per file)
                </p>
              </div>
            </div>

            {/* Selected Files Badge List */}
            {bulkFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Selected Resumes ({bulkFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setBulkFiles([])}
                    className="text-[11px] text-accent-rose hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-inset">
                  {bulkFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface border border-line text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-3.5 h-3.5 text-accent-violet shrink-0" />
                        <span className="truncate text-ink font-mono text-[11px]">
                          {file.name}
                        </span>
                        <span className="text-ink-muted text-[10px]">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulkFile(idx)}
                        className="text-ink-muted hover:text-accent-rose cursor-pointer ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isZeroBalance && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 flex items-start gap-3 text-xs">
                <AlertCircle className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-accent-amber">Insufficient Wallet Balance (0 Credits)</p>
                  <p className="text-ink-muted">
                    Your balance is zero. You cannot schedule interviews until credits are added to your wallet.
                  </p>
                  <Link
                    href="/recruiter/billing"
                    className="inline-flex items-center gap-1 font-semibold text-accent-cyan hover:underline mt-1"
                  >
                    Recharge Credits in Billing &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBulkProcessing}
                disabled={isProcessingBulk || isZeroBalance || bulkFiles.length === 0 || !bulkTargetJobId}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Parsing Resumes &amp; Matching...</span>
                  </>
                ) : isZeroBalance ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Recharge Required (0 Credits)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-accent-amber" />
                    <span>Parse Resumes &amp; Generate Proposals</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review, Modify, and Confirm Proposals (REQ-2, REQ-3) */}
        {bulkStep === 'proposals' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-2.5 text-xs text-accent-violet">
              <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0" />
              <span>
                AI matched <strong>{bulkProposals.length}</strong> candidates. Review or modify proposed time slots below before confirming.
              </span>
            </div>

            {/* Proposals Table */}
            <div className="max-h-64 overflow-y-auto overflow-x-auto border border-line rounded-xl">
              <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                <thead className="bg-inset border-b border-line text-[11px] font-mono text-ink-muted uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">AI Match</th>
                    <th className="py-2.5 px-3">Interview Date</th>
                    <th className="py-2.5 px-3">Interview Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bulkProposals.map((prop, idx) => (
                    <tr key={idx} className="hover:bg-surface-elevated/40">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-ink">{prop.candidateName}</p>
                        <p className="text-[11px] text-ink-muted font-mono">{prop.candidateEmail}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prop.matchScore >= 80
                              ? 'bg-emerald-500/10 text-accent-emerald border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-accent-indigo border border-indigo-500/20'
                          }`}
                        >
                          {prop.matchScore}% Match
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          value={prop.proposedDate}
                          onChange={(e) => handleUpdateProposalSlot(idx, 'proposedDate', e.target.value)}
                          className="px-2 py-1 rounded-lg bg-inset border border-line text-xs text-ink focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="time"
                          value={prop.proposedTime}
                          onChange={(e) => handleUpdateProposalSlot(idx, 'proposedTime', e.target.value)}
                          className="px-2 py-1 rounded-lg bg-inset border border-line text-xs text-ink focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notification Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-ink">
              <input
                type="checkbox"
                checked={bulkNotifyCandidates}
                onChange={(e) => setBulkNotifyCandidates(e.target.checked)}
                className="rounded border-line text-indigo-600 focus:ring-0"
              />
              <span>Send candidate email notifications and calendar invitations upon confirmation</span>
            </label>

            {/* Optional message */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink-muted">
                Custom Invitation Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please join 5 minutes early with working audio and camera."
                value={bulkInviteMessage}
                onChange={(e) => setBulkInviteMessage(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {isZeroBalance && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 flex items-start gap-3 text-xs">
                <AlertCircle className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-accent-amber">Insufficient Wallet Balance (0 Credits)</p>
                  <p className="text-ink-muted">
                    Your balance is zero. You cannot schedule interviews until credits are added to your wallet.
                  </p>
                  <Link
                    href="/recruiter/billing"
                    className="inline-flex items-center gap-1 font-semibold text-accent-cyan hover:underline mt-1"
                  >
                    Recharge Credits in Billing &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setBulkStep('upload')}
                className="py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-medium cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkSchedules}
                disabled={isProcessingBulk || isZeroBalance}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Finalizing Interviews...</span>
                  </>
                ) : isZeroBalance ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Recharge Required (0 Credits)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Schedule {bulkProposals.length} Interview(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}