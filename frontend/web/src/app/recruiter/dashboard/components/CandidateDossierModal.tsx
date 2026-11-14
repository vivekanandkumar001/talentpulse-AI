import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { Brain, Calendar, CheckCircle2, Download, Radio, Sparkles, Video, X } from 'lucide-react';
import { formatInterviewDateTime, getStudentStatus, isPastUnconducted } from '@/lib/recruiter-dashboard';
import type { CandidateDossier, StudentStatus } from '../dashboard-types';
import { RecommendationBadge } from './RecommendationBadge';
import { exportCandidateDossierPdf } from '@/lib/export-pdf-dossier';

export function CandidateDossierModal({
 selectedCandidate,
 setSelectedCandidate,
 handleUpdateStudentStatus,
 handleOpenReschedule,
 showToast,
}: {
 selectedCandidate: CandidateDossier;
 setSelectedCandidate: Dispatch<SetStateAction<CandidateDossier | null>>;
 handleUpdateStudentStatus: (candidateId: string, newStatus: StudentStatus, sessionId?: string) => void;
 handleOpenReschedule: (cand: CandidateDossier) => void;
 showToast: (text: string, type?: 'success'|'error') => void;
}) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-fadeIn">
 <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-xl bg-surface border border-line space-y-6 shadow-2xl text-ink">
 
 {/* MODAL HEADER */}
 <div className="flex items-start justify-between border-b border-line pb-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xl shadow-lg">
 {selectedCandidate.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-3">
 <h2 className="text-xl font-bold">{selectedCandidate.name}</h2>
 <RecommendationBadge recommendation={selectedCandidate.recommendation} isPast={isPastUnconducted(selectedCandidate)} />
 </div>
 <p className="text-xs text-ink-muted font-mono mt-0.5">
 {selectedCandidate.email} • {selectedCandidate.targetPosition}
 </p>

 {/* STUDENT RECORD STATUS IN MODAL */}
 <div className="flex flex-wrap items-center gap-2 mt-2.5">
 <span className="text-[11px] font-mono text-ink-muted">Student Status:</span>
 <div className="flex items-center gap-1.5">
 {(['selected', 'inprocess', 'rejected', 'backout'] as StudentStatus[]).map((st) => {
 const isCurrent = getStudentStatus(selectedCandidate) === st;
 return (
 <button
 key={st}
 type="button"
 onClick={() => handleUpdateStudentStatus(selectedCandidate.id, st, selectedCandidate.sessionId)}
 className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
 isCurrent
 ? st === 'selected'
 ? 'bg-emerald-500 text-white shadow-sm'
 : st === 'rejected'
 ? 'bg-rose-500 text-white shadow-sm'
 : st === 'backout'
 ? 'bg-amber-600 text-white shadow-sm font-bold'
 : 'bg-blue-500 text-white shadow-sm'
 : 'bg-inset text-ink-muted hover:text-ink border border-line'
 }`}
 >
 {st === 'inprocess'? 'In-Process': st}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </div>

 <button
 type="button"
 onClick={() => setSelectedCandidate(null)}
 className="p-2 rounded-xl bg-surface-2 text-ink-muted hover:text-ink cursor-pointer"
 >
 <X className="w-5 h-5"/>
 </button>
 </div>

 {/* OVERALL MATCH SCORE & SCORE SLIDERS */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-inset p-5 rounded-2xl">
 <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-line pb-4 sm:pb-0 pr-0 sm:pr-4">
 <span className="text-xs text-ink-muted font-medium">Overall Match Score</span>
 <div className="text-4xl font-extrabold text-accent-indigo font-mono mt-1">
 {selectedCandidate.aiMatchScore != null ?`${selectedCandidate.aiMatchScore}%`: 'N/A'}
 </div>
 </div>

 <div className="sm:col-span-2 space-y-3">
 {selectedCandidate.breakdown ? (
 <>
 {/* Technical Depth */}
 <div className="space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-ink">Technical Depth & Concepts</span>
 <span className="font-mono text-accent-indigo">{selectedCandidate.breakdown.technicalDepth}%</span>
 </div>
 <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
 <div className="h-full bg-indigo-500"style={{ width:`${selectedCandidate.breakdown.technicalDepth}%`}}></div>
 </div>
 </div>

 {/* System Architecture */}
 <div className="space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-ink">System Architecture & Scalability</span>
 <span className="font-mono text-accent-cyan">{selectedCandidate.breakdown.systemArchitecture}%</span>
 </div>
 <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
 <div className="h-full bg-cyan-500"style={{ width:`${selectedCandidate.breakdown.systemArchitecture}%`}}></div>
 </div>
 </div>

 {/* Communication */}
 <div className="space-y-1">
 <div className="flex justify-between text-xs">
 <span className="text-ink">Communication & Structural Clarity</span>
 <span className="font-mono text-accent-emerald">{selectedCandidate.breakdown.communication}%</span>
 </div>
 <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
 <div className="h-full bg-emerald-500"style={{ width:`${selectedCandidate.breakdown.communication}%`}}></div>
 </div>
 </div>
 </>
 ) : (
 <div className="flex items-center justify-center h-full text-xs text-ink-muted italic py-4">
 Not evaluated yet
 </div>
 )}
 </div>
 </div>

 {/* COGNITIVE & APTITUDE SCREENING CARD */}
 <div className="bg-inset p-5 rounded-2xl space-y-3">
   <div className="flex items-center justify-between">
     <div className="flex items-center gap-2">
       <Brain className="w-4 h-4 text-accent-cyan" />
       <span className="text-xs font-bold uppercase tracking-wider text-ink">Cognitive & Aptitude Screening</span>
     </div>
     {selectedCandidate.aptitudeScore ? (
       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-accent-cyan border border-cyan-500/30">
         Completed
       </span>
     ) : (
       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-2 text-ink-muted border border-line">
         Pending / Not Attempted
       </span>
     )}
   </div>

   {selectedCandidate.aptitudeScore ? (
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
       <div className="p-3 rounded-xl bg-surface text-center">
         <span className="text-[10px] font-mono text-ink-muted uppercase block">Aptitude Score</span>
         <span className="text-xl font-extrabold text-accent-cyan font-mono">{selectedCandidate.aptitudeScore.overallScore}%</span>
       </div>
       <div className="p-3 rounded-xl bg-surface text-center">
         <span className="text-[10px] font-mono text-ink-muted uppercase block">Cognitive Rank</span>
         <span className="text-xl font-extrabold text-accent-violet font-mono">
           {selectedCandidate.aptitudeScore.percentile != null ? `${selectedCandidate.aptitudeScore.percentile}th` : '—'}
         </span>
         <span className="text-[9px] text-ink-faint block mt-0.5">
           {selectedCandidate.aptitudeScore.percentileBasis === 'norm_pool'
             ? `vs ${selectedCandidate.aptitudeScore.normPoolSize ?? 0} attempts`
             : 'Benchmarking — pool < 30'}
         </span>
       </div>
       <div className="p-3 rounded-xl bg-surface text-center">
         <span className="text-[10px] font-mono text-ink-muted uppercase block">Accuracy</span>
         <span className="text-xl font-extrabold text-accent-emerald font-mono">{selectedCandidate.aptitudeScore.accuracy}%</span>
       </div>
       <div className="p-3 rounded-xl bg-surface text-center">
         <span className="text-[10px] font-mono text-ink-muted uppercase block">Proctoring Trust</span>
         <span className="text-xl font-extrabold text-accent-emerald font-mono">{selectedCandidate.aptitudeScore.trustScore}%</span>
         <span className="text-[9px] block mt-0.5">
           {(() => {
             const v = selectedCandidate.aptitudeScore.integrityVerdict;
             const cls = v === 'flagged' ? 'text-accent-rose' : v === 'review' ? 'text-accent-amber' : 'text-accent-emerald';
             return <span className={cls}>{v === 'flagged' ? 'Flagged' : v === 'review' ? 'Review' : 'Clean'}</span>;
           })()}
         </span>
       </div>
     </div>
   ) : (
     <p className="text-xs text-ink-muted italic py-1">
       Candidate has not completed the 5-pillar cognitive screening assessment yet.
     </p>
   )}
 </div>

 {/* AI EXECUTIVE SUMMARY */}
 <div className="space-y-2">
 <h3 className="text-sm font-bold text-ink flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-accent-indigo"/>
 AI Evaluation Executive Summary
 </h3>
 <p className="text-xs text-ink leading-relaxed bg-inset p-4 rounded-xl">
 {selectedCandidate.summary ||'Not evaluated yet'}
 </p>
 </div>

 {/* KEY HIGHLIGHTS BULLETS */}
 {selectedCandidate.keyHighlights && selectedCandidate.keyHighlights.length > 0 && (
 <div className="space-y-2">
 <h3 className="text-sm font-bold text-ink flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 text-accent-emerald"/>
 Key Technical Highlights & Scenario Execution
 </h3>
 <ul className="space-y-2">
 {selectedCandidate.keyHighlights.map((highlight, idx) => (
 <li key={idx} className="flex items-start gap-2.5 text-xs text-ink">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
 <span>{highlight}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* ACTION FOOTER */}
 <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
 <div className="flex flex-col gap-0.5 text-xs text-ink-muted font-mono">
 {(() => {
 const sched = formatInterviewDateTime(
 selectedCandidate.scheduledAt,
 selectedCandidate.scheduledDate,
 selectedCandidate.scheduledTime
 );
 if (sched.isScheduled) {
 return (
 <span className="text-ink font-semibold flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-accent-indigo"/>
 Interview: {sched.date} {sched.time &&`at ${sched.time}`}
 </span>
 );
 }
 return null;
 })()}
 <span>Applied: {new Date(selectedCandidate.appliedDate).toLocaleDateString()}</span>
 </div>

 <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
 {(selectedCandidate.status?.toLowerCase().includes('progress') || selectedCandidate.status?.toLowerCase().includes('live')) ? (
 <Link
 href={`/recruiter/interview/${selectedCandidate.sessionId || selectedCandidate.id}/live`}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-accent-rose border border-rose-500/40 text-xs font-bold transition-all shadow-md"
 >
 <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"/>
 <span>Open Live Monitor</span>
 </Link>
 ) : selectedCandidate.status?.toLowerCase().includes('completed') ? (
 <Link
 href={`/recruiter/interview/${selectedCandidate.sessionId || selectedCandidate.id}/recording`}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-accent-cyan border border-cyan-500/30 text-xs font-semibold transition-all shadow-md"
 >
 <Video className="w-4 h-4"/>
 <span>Watch Recording & Transcript</span>
 </Link>
 ) : selectedCandidate.status?.toLowerCase().includes('scheduled') ? (
 <Link
 href={`/recruiter/interview/${selectedCandidate.sessionId || selectedCandidate.id}/live`}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-accent-indigo border border-indigo-500/30 text-xs font-medium transition-all shadow-md"
 >
 <Radio className="w-4 h-4"/>
 <span>Monitor Session</span>
 </Link>
 ) : null}

 {selectedCandidate.sessionId && (
 <button
 type="button"
 onClick={() => handleOpenReschedule(selectedCandidate)}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-accent-amber border border-amber-500/30 text-xs font-semibold transition-all shadow-md cursor-pointer"
 >
 <Calendar className="w-4 h-4"/>
 <span>Reschedule Interview</span>
 </button>
 )}

 <button
 type="button"
 onClick={() => {
   try {
     exportCandidateDossierPdf(selectedCandidate);
     showToast(`PDF Dossier for ${selectedCandidate.name} downloaded successfully!`, 'success');
   } catch {
     showToast('Failed to generate PDF dossier', 'error');
   }
 }}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-semibold cursor-pointer border border-line"
 title="Download verified PDF Candidate Dossier"
 >
 <Download className="w-4 h-4 text-accent-emerald"/>
 <span>Download PDF Dossier</span>
 </button>

 <button
 type="button"
 onClick={() => {
   handleUpdateStudentStatus(selectedCandidate.id, 'rejected', selectedCandidate.sessionId);
   setSelectedCandidate(null);
 }}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-all"
 >
 <X className="w-4 h-4 text-rose-500"/>
 <span>Reject Candidate</span>
 </button>

 <button
 type="button"
 onClick={() => {
   handleUpdateStudentStatus(selectedCandidate.id, 'selected', selectedCandidate.sessionId);
   setSelectedCandidate(null);
 }}
 className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
 >
 <span>Shortlist & Advance to Panel </span>
 </button>
</div>
 </div>

 </div>
 </div>
 );
}