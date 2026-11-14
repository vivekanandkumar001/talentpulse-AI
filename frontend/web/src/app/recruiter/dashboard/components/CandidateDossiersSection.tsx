import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowUpDown, Clock, Eye, Pencil, Radio, RefreshCw, Search, UserPlus, Users, Video } from 'lucide-react';
import { formatInterviewDateTime, getStudentStatus, isPastUnconducted } from '@/lib/recruiter-dashboard';
import type { CandidateDossier, DashboardSortField, StudentStatus } from '../dashboard-types';
import { RecommendationBadge } from './RecommendationBadge';

export function CandidateDossiersSection({
 loading,
 filteredCandidates,
 totalCandidatesCount = 0,
 openInviteModal,
 handleHeaderSort,
 handleUpdateStudentStatus,
 handleOpenReschedule,
 setSelectedCandidate,
 onClearFilters,
}: {
 loading: boolean;
 filteredCandidates: CandidateDossier[];
 totalCandidatesCount?: number;
 openInviteModal?: () => void;
 handleHeaderSort: (field: DashboardSortField) => void;
 handleUpdateStudentStatus: (candidateId: string, newStatus: StudentStatus, sessionId?: string) => void;
 handleOpenReschedule: (cand: CandidateDossier) => void;
 setSelectedCandidate: Dispatch<SetStateAction<CandidateDossier | null>>;
 onClearFilters: () => void;
}) {
 return (
 <section id="dossiers"className="card-panel overflow-hidden">
 {loading ? (
 <div className="p-16 text-center space-y-3">
 <RefreshCw className="w-8 h-8 text-accent-indigo animate-spin mx-auto"/>
 <p className="text-ink-muted text-sm">Loading candidate evaluation dossiers...</p>
 </div>
 ) : filteredCandidates.length === 0 ? (
  totalCandidatesCount === 0 ? (
    <div className="p-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-accent-indigo border border-indigo-500/20 flex items-center justify-center mx-auto shadow-sm">
        <Users className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-ink">No candidates invited yet</h3>
        <p className="text-ink-muted text-xs max-w-md mx-auto">
          You haven&apos;t invited any candidates for autonomous AI technical screening yet. Click below to schedule and invite your first applicant.
        </p>
      </div>
      {openInviteModal && (
        <button
          type="button"
          onClick={openInviteModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Candidate</span>
        </button>
      )}
    </div>
  ) : (
  <div className="p-16 text-center space-y-4">
  <div className="w-12 h-12 rounded-full bg-surface-2 text-ink-muted flex items-center justify-center mx-auto">
  <Search className="w-6 h-6"/>
  </div>
  <h3 className="text-base font-bold text-ink">No candidates match your filters</h3>
 <p className="text-ink-muted text-xs max-w-md mx-auto">
 Try clearing your search query or selecting another status / recommendation filter.
 </p>
 <button
 type="button"
 onClick={onClearFilters}
 className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-accent-indigo text-xs font-semibold cursor-pointer"
 >
 Clear All Filters
 </button>
 </div>
 )
 ) : (
 <>
 {/* Desktop Table View */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-inset/80 border-b border-line text-[11px] font-mono text-ink-muted uppercase tracking-wider">
 <th
 className="py-4 px-6 cursor-pointer hover:text-ink transition-colors select-none"
 onClick={() => handleHeaderSort('name')}
 >
 <div className="flex items-center gap-1.5">
 <span>Candidate</span>
 <ArrowUpDown className="w-3 h-3 opacity-60"/>
 </div>
 </th>
 <th className="py-4 px-4">Target Position</th>
 <th
 className="py-4 px-4 cursor-pointer hover:text-ink transition-colors select-none"
 onClick={() => handleHeaderSort('aiMatchScore')}
 >
 <div className="flex items-center gap-1.5">
 <span>AI Score</span>
 <ArrowUpDown className="w-3 h-3 opacity-60"/>
 </div>
 </th>
 <th className="py-4 px-4 whitespace-nowrap">
 <div className="flex items-center gap-1.5">
 <span>Aptitude</span>
 </div>
 </th>
 <th className="py-4 px-4 whitespace-nowrap">Recommendation</th>
 <th
 className="py-4 px-4 whitespace-nowrap cursor-pointer hover:text-ink transition-colors select-none"
 onClick={() => handleHeaderSort('status')}
 >
 <div className="flex items-center gap-1.5 text-accent-indigo">
 <span>Status</span>
 <ArrowUpDown className="w-3 h-3 text-accent-indigo"/>
 </div>
 </th>
 <th
 className="py-4 px-4 whitespace-nowrap cursor-pointer hover:text-ink transition-colors select-none"
 onClick={() => handleHeaderSort('appliedDate')}
 >
 <div className="flex items-center gap-1.5">
 <span>Stage & Date</span>
 <ArrowUpDown className="w-3 h-3 opacity-60"/>
 </div>
 </th>
 <th className="py-4 px-6 text-right whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-line text-xs">
 {filteredCandidates.map((candidate, idx) => {
 const candStudentStatus = getStudentStatus(candidate);
 const past = isPastUnconducted(candidate);
 return (
 <tr
 key={candidate.sessionId ||`${candidate.id}-${idx}`}
 className="hover:bg-surface-2 transition-colors group cursor-pointer"
 onClick={() => setSelectedCandidate(candidate)}
 >
 {/* CANDIDATE AVATAR & NAME */}
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
 {candidate.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <p className="font-semibold text-ink group-hover:text-accent-indigo transition-colors">
 {candidate.name}
 </p>
 <p className="text-[11px] text-ink-muted font-mono">{candidate.email}</p>
 </div>
 </div>
 </td>

 {/* TARGET POSITION */}
 <td className="py-4 px-4">
 <span className="font-medium text-ink">{candidate.targetPosition}</span>
 <p className="text-[11px] text-ink-muted">{candidate.department}</p>
 </td>

 {/* AI MATCH SCORE */}
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-full border-2 border-indigo-500/40 bg-inset flex items-center justify-center font-mono font-bold text-xs text-accent-indigo">
 {candidate.aiMatchScore != null ?`${candidate.aiMatchScore}%`: '—'}
 </div>
 </div>
 </td>

 {/* APTITUDE SCREENING SCORE */}
 <td className="py-4 px-4 whitespace-nowrap">
 {candidate.aptitudeScore ? (
 <div className="flex items-center gap-2">
 <div className={`w-10 h-10 rounded-full border-2 bg-inset flex flex-col items-center justify-center font-mono font-bold text-xs ${
 candidate.aptitudeScore.overallScore >= 75
 ? 'border-emerald-500/40 text-emerald-600'
 : candidate.aptitudeScore.overallScore >= 50
 ? 'border-amber-500/40 text-amber-600'
 : 'border-rose-500/40 text-rose-600'
 }`}>
 <span>{candidate.aptitudeScore.overallScore}%</span>
 </div>
 <div className="text-[10px] text-ink-muted">
 <span className="font-semibold text-ink">
 {candidate.aptitudeScore.percentile != null ? `${candidate.aptitudeScore.percentile}th` : '—'}
 </span> %ile
 </div>
 </div>
 ) : (
 <span className="text-ink-muted text-xs">—</span>
 )}
 </td>

 {/* RECOMMENDATION */}
 <td className="py-4 px-4 whitespace-nowrap"><RecommendationBadge recommendation={candidate.recommendation} isPast={past} /></td>

 {/* STUDENT RECORD STATUS BADGE WITH QUICK INLINE CHANGER */}
 <td className="py-4 px-4 whitespace-nowrap"onClick={(e) => e.stopPropagation()}>
 <div className="inline-flex items-center">
 <select
 aria-label={`Update ${candidate.name} status`}
 value={candStudentStatus}
 onChange={(e) =>
 handleUpdateStudentStatus(
 candidate.id,
 e.target.value as StudentStatus,
 candidate.sessionId
 )
 }
 className={`text-[11px] font-bold px-3 py-1 rounded-full cursor-pointer border transition-all focus:outline-none shadow-xs ${
 candStudentStatus === 'selected'
 ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
 : candStudentStatus === 'rejected'
 ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
 : candStudentStatus === 'backout'
 ? 'bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-200/80 font-extrabold'
 : 'bg-blue-50 text-accent-blue border-blue-300 hover:bg-blue-100'
 }`}
 title="Click to change student status [selected, inprocess, rejected, backout]"
 >
 <option value="selected"className="bg-surface text-emerald-700 font-semibold">Selected</option>
 <option value="inprocess"className="bg-surface text-accent-blue font-semibold">In-Process</option>
 <option value="rejected"className="bg-surface text-rose-700 font-semibold">Rejected</option>
 <option value="backout"className="bg-surface text-amber-800 font-semibold">Backout</option>
 </select>
 </div>
 </td>

 {/* STAGE & DATE / TIME */}
 <td className="py-4 px-4 whitespace-nowrap">
 <div className="flex flex-col gap-0.5">
 <span className="text-ink font-semibold flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${
 past
 ? 'bg-amber-600'
 : candidate.status?.toLowerCase().includes('scheduled')
 ? 'bg-indigo-500'
 : 'bg-slate-400'
 }`} />
 {past ? 'Missed': (candidate.stage ||'Screening')}
 </span>
 {(() => {
 const dt = formatInterviewDateTime(
 candidate.scheduledAt,
 candidate.scheduledDate,
 candidate.scheduledTime
 );
 return (
 <div className="text-[11px] font-mono text-ink-muted flex flex-col">
 <span className={dt.isScheduled ? "text-ink font-medium": "text-ink-muted italic"}>
 {dt.date}
 </span>
 {dt.time && (
 <span className={`text-[10px] font-bold flex items-center gap-1 ${past ? 'text-amber-800': 'text-accent-indigo'}`}>
 <Clock className={`w-2.5 h-2.5 ${past ? 'text-amber-700': 'text-accent-indigo'}`} />
 {dt.time}
 </span>
 )}
 </div>
 );
 })()}
 </div>
 </td>

 {/* ACTIONS */}
 <td className="py-4 px-6 text-right whitespace-nowrap"onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-2">
 {candidate.sessionId && candidate.status?.toLowerCase() !== 'completed'&& (
 <button
 type="button"
 onClick={() => handleOpenReschedule(candidate)}
 className="inline-flex items-center justify-center p-2.5 min-h-[40px] min-w-[40px] rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 transition-colors cursor-pointer shadow-sm"
 title="Reschedule interview date & time"
 aria-label="Reschedule interview date & time"
 >
 <Pencil className="w-4 h-4"/>
 </button>
 )}

 {!past && (candidate.status?.toLowerCase().includes('progress') || candidate.status?.toLowerCase().includes('live')) ? (
 <Link
 href={`/recruiter/interview/${candidate.sessionId || candidate.id}/live`}
 className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-accent-rose border border-rose-500/30 text-xs font-bold transition-all shadow-sm"
 title="Monitor interview live"
 >
 <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"/>
 <span>Live Monitor</span>
 </Link>
 ) : candidate.status?.toLowerCase().includes('completed') ? (
 <Link
 href={`/recruiter/interview/${candidate.sessionId || candidate.id}/recording`}
 className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 text-xs font-semibold transition-colors"
 title="View recorded interview and scorecard"
 >
 <Video className="w-3.5 h-3.5"/>
 <span>Recording</span>
 </Link>
 ) : (!past && candidate.status?.toLowerCase().includes('scheduled')) ? (
 <Link
 href={`/recruiter/interview/${candidate.sessionId || candidate.id}/live`}
 className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-accent-indigo border border-indigo-500/30 text-xs font-medium transition-colors"
 title="Join monitor station"
 >
 <Radio className="w-3.5 h-3.5"/>
 <span>Monitor</span>
 </Link>
 ) : null}

 <button
 type="button"
 onClick={() => setSelectedCandidate(candidate)}
 className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-accent-indigo border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
 >
 <Eye className="w-3.5 h-3.5"/>
 <span>Scorecard</span>
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Mobile View: Responsive Cards */}
 <div className="block md:hidden divide-y divide-line">
 {filteredCandidates.map((candidate, idx) => {
 const candStudentStatus = getStudentStatus(candidate);
 const past = isPastUnconducted(candidate);
 return (
 <div
 key={candidate.sessionId ||`${candidate.id}-${idx}`}
 onClick={() => setSelectedCandidate(candidate)}
 className="p-4 space-y-3 hover:bg-surface-2 transition-colors cursor-pointer"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
 {candidate.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <p className="font-semibold text-sm text-ink">{candidate.name}</p>
 <p className="text-xs text-ink-muted font-mono">{candidate.email}</p>
 </div>
 </div>
 
 <div className="flex flex-col items-end gap-1.5">
 <RecommendationBadge recommendation={candidate.recommendation} isPast={past} />
 <select
 aria-label={`Change status for ${candidate.name}`}
 value={candStudentStatus}
 onClick={(e) => e.stopPropagation()}
 onChange={(e) => {
 e.stopPropagation();
 handleUpdateStudentStatus(
 candidate.id,
 e.target.value as StudentStatus,
 candidate.sessionId
 );
 }}
 className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer border transition-all focus:outline-none shadow-xs ${
 candStudentStatus === 'selected'
 ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
 : candStudentStatus === 'rejected'
 ? 'bg-rose-50 text-rose-700 border-rose-300'
 : candStudentStatus === 'backout'
 ? 'bg-amber-100/90 text-amber-900 border-amber-300 font-extrabold'
 : 'bg-blue-50 text-accent-blue border-blue-300'
 }`}
 >
 <option value="selected"className="bg-surface text-emerald-700">Selected</option>
 <option value="inprocess"className="bg-surface text-accent-blue">In-Process</option>
 <option value="rejected"className="bg-surface text-rose-700">Rejected</option>
 <option value="backout"className="bg-surface text-amber-800">Backout</option>
 </select>
 </div>
 </div>

 <div className="flex items-center justify-between text-xs pt-1">
 <div>
 <span className="font-medium text-ink">{candidate.targetPosition}</span>
 <span className="text-ink-muted ml-1">({candidate.department})</span>
 </div>
 <div className="font-mono font-bold text-accent-indigo bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
 {candidate.aiMatchScore != null ?`${candidate.aiMatchScore}%`: '—'}
 </div>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-line text-xs gap-2">
 <div className="flex flex-col">
 <span className="text-ink font-semibold">{candidate.stage}</span>
 {(() => {
 const dt = formatInterviewDateTime(
 candidate.scheduledAt,
 candidate.scheduledDate,
 candidate.scheduledTime
 );
 return (
 <span className={`text-[11px] font-mono ${dt.isScheduled ? 'text-ink-muted': 'text-ink-muted italic'}`}>
 {dt.date} {dt.time &&`• ${dt.time}`}
 </span>
 );
 })()}
 </div>
 <div className="flex items-center gap-2">
 {candidate.sessionId && candidate.status?.toLowerCase() !== 'completed'&& (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleOpenReschedule(candidate);
 }}
 className="inline-flex items-center justify-center p-2 min-h-[36px] min-w-[36px] rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 transition-colors cursor-pointer"
 title="Reschedule interview date & time"
 aria-label="Reschedule interview date & time"
 >
 <Pencil className="w-3.5 h-3.5"/>
 </button>
 )}

 {(candidate.status?.toLowerCase().includes('progress') || candidate.status?.toLowerCase().includes('live')) ? (
 <Link
 href={`/recruiter/interview/${candidate.sessionId || candidate.id}/live`}
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-rose-500/15 text-accent-rose border border-rose-500/30 text-xs font-bold"
 >
 <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"/>
 <span>Live</span>
 </Link>
 ) : candidate.status?.toLowerCase().includes('completed') ? (
 <Link
 href={`/recruiter/interview/${candidate.sessionId || candidate.id}/recording`}
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-cyan-500/10 text-accent-cyan border border-cyan-500/30 text-xs font-semibold"
 >
 <Video className="w-3.5 h-3.5"/>
 <span>Recording</span>
 </Link>
 ) : null}

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedCandidate(candidate);
 }}
 className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 text-accent-indigo border border-indigo-500/30 text-xs font-semibold cursor-pointer"
 >
 <Eye className="w-3.5 h-3.5"/>
 <span>Scorecard</span>
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </>
 )}
 </section>
 );
}
