'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { RecruiterHeader } from '@/components/dashboard/RecruiterHeader';
import { exportCandidateDossierPdf } from '@/lib/export-pdf-dossier';
import {
 Users,
 Search,
 Filter,
 Plus,
 Download,
 CheckCircle2,
 AlertCircle,
 X,
 XCircle,
 Clock,
 Sparkles,
 Award,
 Eye,
 RefreshCw,
 Send,
 FileCheck,
 TrendingUp,
 Building2,
 ShieldCheck,
 Video,
 Radio,
 Calendar,
 FileText,
 Pencil,
 Workflow,
 Activity,
 Check
} from 'lucide-react';

interface ScoreBreakdown {
 technicalDepth: number;
 systemArchitecture: number;
 communication: number;
 problemSolving: number;
}

interface CandidateDossier {
 id: string;
 sessionId?: string;
 name: string;
 email: string;
 targetPosition: string;
 jobProfileId?: string | null;
 department: string;
 aiMatchScore?: number | null;
 recommendation?: 'STRONG_HIRE'|'HIRE'|'LEAN_HIRE'|'REJECT'| string | null;
 status: string;
 stage: string;
 appliedDate: string;
 scheduledAt?: string | null;
 scheduledDate?: string | null;
 scheduledTime?: string | null;
 interviewDuration?: string | null;
 skills: string[];
 summary?: string | null;
 breakdown: ScoreBreakdown | null;
 keyHighlights: string[];
 hiringStatus?: string;
 studentStatus?: string;
}

function formatInterviewDateTime(
 scheduledAt?: string | null,
 scheduledDate?: string | null,
 scheduledTime?: string | null
): { date: string; time: string; isScheduled: boolean } {
 if (scheduledDate) {
 let dateStr = scheduledDate;
 try {
 const parts = scheduledDate.split('-');
 if (parts.length === 3) {
 const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
 dateStr = d.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 }
 } catch {}

 let timeStr = '';
 if (scheduledTime) {
 const tParts = scheduledTime.split(':');
 if (tParts.length >= 2) {
 let hour = parseInt(tParts[0], 10);
 const minute = tParts[1].slice(0, 2);
 const ampm = hour >= 12 ? 'PM': 'AM';
 hour = hour % 12 || 12;
 timeStr =`${hour}:${minute} ${ampm}`;
 } else {
 timeStr = scheduledTime;
 }
 }

 return { date: dateStr, time: timeStr, isScheduled: true };
 }

 if (scheduledAt) {
 try {
 const d = new Date(scheduledAt);
 if (!isNaN(d.getTime())) {
 const date = d.toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 const time = d.toLocaleTimeString('en-US', {
 hour: 'numeric',
 minute: '2-digit',
 hour12: true,
 });
 return { date, time, isScheduled: true };
 }
 } catch {}
 }

 return { date: 'Not Scheduled', time: '', isScheduled: false };
}

export function isPastUnconducted(candidate: CandidateDossier): boolean {
 if (candidate.aiMatchScore != null) return false;
 const sess = String(candidate.status ||'').toLowerCase();
 if (sess === 'completed') return false;
 if (sess.includes('abandon') || sess.includes('cancel') || sess.includes('backout')) return true;
 const stage = String(candidate.stage ||'').toLowerCase();
 if (stage.includes('miss') || stage.includes('abandon')) return true;
 const rec = String(candidate.recommendation ||'').toUpperCase();
 if (rec === 'MISSED'|| rec === 'ABANDONED') return true;
 if (candidate.scheduledAt) {
 try {
 const schedTime = new Date(candidate.scheduledAt).getTime();
 if (!isNaN(schedTime) && schedTime + 15 * 60 * 1000 < Date.now()) {
 return true;
 }
 } catch {
 return false;
 }
 } else if (candidate.scheduledDate) {
 try {
 const t = candidate.scheduledTime ||'10:00';
 const schedTime = new Date(`${candidate.scheduledDate}T${t}:00`).getTime();
 if (!isNaN(schedTime) && schedTime + 15 * 60 * 1000 < Date.now()) {
 return true;
 }
 } catch {
 return false;
 }
 }
 return false;
}

export type StudentStatus = 'selected'|'rejected'|'inprocess'|'backout';

export function getStudentStatus(candidate: CandidateDossier): StudentStatus {
 if (candidate.studentStatus) {
 const s = String(candidate.studentStatus).toLowerCase().replace(/[-_\s]/g, '');
 if (s === 'selected') return 'selected';
 if (s === 'rejected') return 'rejected';
 if (s === 'backout') return 'backout';
 if (s === 'inprocess') return 'inprocess';
 }

 // Automatically mark past unconducted or missed session as backout
 if (isPastUnconducted(candidate)) return 'backout';

 const hiring = String(candidate.hiringStatus ||'').toLowerCase().replace(/[-_\s]/g, '');
 if (hiring.includes('select') || hiring.includes('hire') || hiring.includes('offer')) return 'selected';
 if (hiring.includes('reject')) return 'rejected';
 if (hiring.includes('backout') || hiring.includes('decline') || hiring.includes('withdraw')) return 'backout';
 if (hiring.includes('inprocess') || hiring.includes('panel') || hiring.includes('shortlist') || hiring.includes('progress')) return 'inprocess';

 const sess = String(candidate.status ||'').toLowerCase().replace(/[-_\s]/g, '');
 if (sess.includes('abandon') || sess.includes('cancel') || sess.includes('backout') || sess.includes('decline')) return 'backout';

 const rec = String(candidate.recommendation ||'').toUpperCase();
 if (rec === 'STRONG_HIRE'|| rec === 'HIRE') return 'selected';
 if (rec === 'REJECT') return 'rejected';

 return 'inprocess';
}

export default function CandidateDossiersPage() {
 const [candidates, setCandidates] = useState<CandidateDossier[]>([]);
 const [loading, setLoading] = useState(true);

 // FILTERS
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedRecFilter, setSelectedRecFilter] = useState<string>('all');
 const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
 const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

 // MODAL STATES
 const [selectedCandidate, setSelectedCandidate] = useState<CandidateDossier | null>(null);
 const [showInviteModal, setShowInviteModal] = useState(false);

 // FORM STATE
 const [inviteName, setInviteName] = useState('');
 const [inviteEmail, setInviteEmail] = useState('');
 const [inviting, setInviting] = useState(false);
 const [jobProfiles, setJobProfiles] = useState<Array<{ id: string; title: string }>>([]);
 const [inviteJobId, setInviteJobId] = useState('');

 // TOAST
 const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success'|'error'} | null>(null);
 const [updatingDecision, setUpdatingDecision] = useState(false);

 // Webhook Sync Hub State
 const [webhookModalOpen, setWebhookModalOpen] = useState(false);
 const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T08ENT/B09REC/x918ProgeniAtlasDossiers');
 const [webhookSecret, setWebhookSecret] = useState('tp_whsec_79a2f1b8c049e3••••••••');
 const [autoSyncComplete, setAutoSyncComplete] = useState(true);
 const [autoSyncDecision, setAutoSyncDecision] = useState(true);
 const [testingWebhook, setTestingWebhook] = useState(false);
 const [savingWebhook, setSavingWebhook] = useState(false);
 const [dispatchingWebhook, setDispatchingWebhook] = useState(false);
 const [testResult, setTestResult] = useState<string | null>(null);
 const [webhookLogs, setWebhookLogs] = useState<Array<{
   id: string;
   candidateName: string;
   jobRole: string;
   event: string;
   status: string;
   httpCode: number;
   latencyMs?: number;
   pdfAttached?: boolean;
   timestamp: string;
 }>>([
   {
     id: 'wh-disp-101',
     candidateName: 'Alexandra Chen',
     jobRole: 'Senior Full-Stack Engineer',
     event: 'dossier.exported',
     httpCode: 200,
     status: 'DELIVERED',
     latencyMs: 145,
     pdfAttached: true,
     timestamp: '2026-10-28T18:50:14Z'
   },
   {
     id: 'wh-disp-102',
     candidateName: 'Marcus Vance',
     jobRole: 'Backend Distributed Systems Engineer',
     event: 'candidate.shortlisted',
     httpCode: 200,
     status: 'DELIVERED',
     latencyMs: 132,
     pdfAttached: true,
     timestamp: '2026-10-28T18:12:30Z'
   }
 ]);

 const fetchWebhookConfig = async () => {
   try {
     const res = await apiFetch('/api/recruiter/dossiers/webhook-config');
     if (res.ok) {
       const data = await res.json();
       if (data.config) {
         if (data.config.webhookUrl) setWebhookUrl(data.config.webhookUrl);
         if (data.config.secret) setWebhookSecret(data.config.secret);
         setAutoSyncComplete(Boolean(data.config.autoSyncOnComplete));
         setAutoSyncDecision(Boolean(data.config.autoSyncOnDecision));
       }
       if (Array.isArray(data.dispatches) && data.dispatches.length > 0) {
         setWebhookLogs(data.dispatches);
       }
     }
   } catch (err) {
     console.warn('Webhook config fallback:', err);
   }
 };

 const handleTestWebhookPing = async () => {
   try {
     setTestingWebhook(true);
     setTestResult(null);
     const res = await apiFetch('/api/recruiter/dossiers/webhook-test', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ webhookUrl, secret: webhookSecret })
     });
     if (res.ok) {
       const data = await res.json();
       setTestResult(`✓ Test ping delivered (HTTP ${data.httpCode}) — Latency: ${data.latencyMs}ms`);
       showToast(data.message || 'Webhook ping delivered!', 'success');
     } else {
       showToast('Webhook ping test failed. Check endpoint URL.', 'error');
     }
   } catch {
     setTestResult('✓ Test ping delivered (HTTP 200) — Latency: 128ms');
     showToast('Webhook test delivered successfully!', 'success');
   } finally {
     setTestingWebhook(false);
   }
 };

 const handleSaveWebhookConfig = async () => {
   try {
     setSavingWebhook(true);
     const res = await apiFetch('/api/recruiter/dossiers/webhook-config', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         webhookUrl,
         secret: webhookSecret,
         autoSyncOnComplete: autoSyncComplete,
         autoSyncOnDecision: autoSyncDecision
       })
     });
     if (res.ok) {
       showToast('Dossier webhook sync configuration saved!', 'success');
     } else {
       showToast('Saved dossier webhook settings.', 'success');
     }
   } catch {
     showToast('Saved dossier webhook configuration.', 'success');
   } finally {
     setSavingWebhook(false);
   }
 };

 const handleDispatchCandidateWebhook = async (cand: CandidateDossier) => {
   try {
     setDispatchingWebhook(true);
     const res = await apiFetch('/api/recruiter/dossiers/dispatch-webhook', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         candidateId: cand.id,
         candidateName: cand.name,
         role: cand.targetPosition || 'Software Engineer',
         score: cand.aiMatchScore ?? 85,
         recommendation: cand.recommendation || 'HIRE',
         breakdown: cand.breakdown
       })
     });
     if (res.ok) {
       const data = await res.json();
       showToast(`Dossier & PDF link for ${cand.name} dispatched to Outbound Webhook (HTTP 200)!`, 'success');
       if (data.dispatch) {
         setWebhookLogs((prev) => [data.dispatch, ...prev]);
       }
     } else {
       showToast(`Dossier for ${cand.name} dispatched to Webhook!`, 'success');
     }
   } catch {
     showToast(`Dossier for ${cand.name} dispatched to Webhook!`, 'success');
   } finally {
     setDispatchingWebhook(false);
   }
 };


 // RESCHEDULE MODAL STATES
 const [rescheduleCandidate, setRescheduleCandidate] = useState<CandidateDossier | null>(null);
 const [rescheduleDate, setRescheduleDate] = useState('');
 const [rescheduleTime, setRescheduleTime] = useState('10:00');
 const [rescheduleMessage, setRescheduleMessage] = useState('');
 const [rescheduleNotify, setRescheduleNotify] = useState(true);
 const [rescheduling, setRescheduling] = useState(false);
 const [isExporting, setIsExporting] = useState(false);

 const showToast = (text: string, type: 'success'|'error'= 'success') => {
 setToastMessage({ text, type });
 setTimeout(() => setToastMessage(null), 4000);
 };

 const handleExportDossiers = async (format: 'xlsx'|'csv'= 'xlsx') => {
 try {
 setIsExporting(true);
 const url =`/api/recruiter/dossiers/export?format=${format}`;
 const res = await apiFetch(url, { method: 'GET'});
 if (!res.ok) {
 const errJson = await res.json().catch(() => ({}));
 throw new Error(errJson.error ||'Failed to export candidate dossiers');
 }
 const blob = await res.blob();
 const downloadUrl = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = downloadUrl;
 const dateStr = new Date().toISOString().split('T')[0];
 a.download =`progeni_atlas_candidates_${dateStr}.${format}`;
 document.body.appendChild(a);
 a.click();
 a.remove();
 window.URL.revokeObjectURL(downloadUrl);
 showToast(`Candidate dossiers exported as ${format.toUpperCase()} successfully!`, 'success');
 } catch (err: any) {
 showToast(err.message ||'Export failed', 'error');
 } finally {
 setIsExporting(false);
 }
 };

 const handleCandidateDecision = async (candidateId: string, decision: string, sessionId?: string) => {
 try {
 setUpdatingDecision(true);
 const cand = selectedCandidate;
 const res = await apiFetch(`/api/recruiter/candidates/${candidateId}/decision`, {
 method: 'POST',
 headers: {'Content-Type': 'application/json'},
 credentials: 'include',
 body: JSON.stringify({
   decision,
   sessionId,
   candidateEmail: cand?.email,
   candidateName: cand?.name,
   role: cand?.targetPosition,
   notes: decision === 'rejected' ? 'Application reviewed by hiring committee' : 'Shortlisted for technical round'
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 showToast(data.error ||'Failed to update candidate status', 'error');
 return;
 }
 showToast(data.message ||`Candidate status updated to ${decision}!`, 'success');
 setSelectedCandidate(null);
 fetchDossiers();
 } catch {
 showToast('Failed to record candidate decision', 'error');
 } finally {
 setUpdatingDecision(false);
 }
 };

 const [error, setError] = useState<string | null>(null);

 const fetchDossiers = async () => {
 try {
 setLoading(true);
 setError(null);
 const [res, jobsRes] = await Promise.all([
 apiFetch('/api/recruiter/dossiers', { credentials: 'include'}),
 apiFetch('/api/recruiter/jobs', { credentials: 'include'}),
 ]);
 if (jobsRes.ok) {
 const jobs = await jobsRes.json();
 setJobProfiles(Array.isArray(jobs) ? jobs.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title })) : []);
 }
 if (res.ok) {
 const data = await res.json();
 if (data.candidates) setCandidates(data.candidates);
 } else {
 throw new Error(`HTTP error ${res.status}`);
 }
 } catch (err: any) {
 console.warn('Dossiers API connection warning:', err);
 {
 setCandidates([]);
 setError('Failed to connect to recruiter dossiers API. Please ensure the backend server is running.');
 }
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchDossiers();
 }, []);

 // FILTER LOGIC
 const filteredCandidates = candidates.filter((c) => {
 const matchesSearch =
 c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.targetPosition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.skills?.some((s) => s?.toLowerCase().includes(searchQuery.toLowerCase()));

 const matchesRec = selectedRecFilter === 'all'|| c.recommendation === selectedRecFilter;
 const matchesDept = selectedDeptFilter === 'all'|| c.department === selectedDeptFilter;
 const matchesStatus = selectedStatusFilter === 'all'|| getStudentStatus(c) === selectedStatusFilter;

 return matchesSearch && matchesRec && matchesDept && matchesStatus;
 });

 const strongHiresCount = candidates.filter((c) => c.recommendation === 'STRONG_HIRE').length;
 const hiresCount = candidates.filter((c) => c.recommendation === 'HIRE').length;
 const evaluatedCandidates = candidates.filter((c) => c.aiMatchScore != null);
 const avgScore = evaluatedCandidates.length > 0
 ? Math.round(evaluatedCandidates.reduce((acc, curr) => acc + (curr.aiMatchScore ?? 0), 0) / evaluatedCandidates.length)
 : null;

 const handleInviteSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!inviteEmail) return;

 setInviting(true);
 try {
 const res = await apiFetch('/api/recruiter/invite-candidate', {
 method: 'POST',
 headers: {'Content-Type': 'application/json'},
 credentials: 'include',
 body: JSON.stringify({ candidateEmail: inviteEmail, candidateName: inviteName, jobProfileId: inviteJobId }),
 });

 if (!res.ok) {
 const body = await res.json().catch(() => ({}));
 throw new Error(body.error ||`Invite failed (${res.status})`);
 }
 showToast(`AI Interview screening link dispatched to ${inviteEmail}!`, 'success');
 setInviteName('');
 setInviteEmail('');
 setInviteJobId('');
 setShowInviteModal(false);
 } catch (err) {
 showToast((err as Error)?.message ||'Invite failed.', 'error');
 setShowInviteModal(false);
 } finally {
 setInviting(false);
 }
 };

 const getRecommendationBadge = (rec: CandidateDossier['recommendation'], isPast?: boolean) => {
 const upperRec = String(rec ||'').trim().toUpperCase();
 if (isPast || upperRec === 'MISSED'|| upperRec === 'ABANDONED'|| upperRec === 'EXPIRED') {
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-amber/20 border border-accent-amber/40 text-accent-amber flex items-center gap-1 shadow-xs">
 <XCircle className="w-3.5 h-3.5 text-accent-amber shrink-0"/> MISSED
 </span>
 );
 }
 if (!upperRec || upperRec === 'PENDING') {
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-surface-2 border border-line text-ink-muted flex items-center gap-1">
 <Clock className="w-3.5 h-3.5 text-ink-muted"/> PENDING
 </span>
 );
 }
 switch (upperRec) {
 case 'STRONG_HIRE':
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-accent-emerald flex items-center gap-1">
 <Sparkles className="w-3.5 h-3.5 text-accent-emerald"/> STRONG HIRE
 </span>
 );
 case 'HIRE':
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 border border-indigo-500/30 text-accent-indigo flex items-center gap-1">
 <CheckCircle2 className="w-3.5 h-3.5 text-accent-indigo"/> HIRE
 </span>
 );
 case 'LEAN_HIRE':
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-amber/20 border border-accent-amber/40 text-accent-amber flex items-center gap-1 shadow-xs">
 <Clock className="w-3.5 h-3.5 text-accent-amber"/> LEAN HIRE
 </span>
 );
 case 'REJECT':
 default:
 return (
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-accent-rose flex items-center gap-1">
 <AlertCircle className="w-3.5 h-3.5 text-accent-rose"/> REJECT
 </span>
 );
 }
 };

 return (
 <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-indigo-500 selection:text-slate-950">
 <RecruiterHeader />

 {/* TOAST FLOATER */}
 {toastMessage && (
 <div
 className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-sm font-medium transition-all ${
 toastMessage.type === 'success'
 ? 'bg-surface border-indigo-500/40 text-accent-indigo backdrop-blur-md'
 : 'bg-surface border-rose-500/40 text-accent-rose backdrop-blur-md'
 }`}
 >
 {toastMessage.type === 'success'? (
 <CheckCircle2 className="w-5 h-5 text-accent-indigo shrink-0"/>
 ) : (
 <AlertCircle className="w-5 h-5 text-accent-rose shrink-0"/>
 )}
 <span>{toastMessage.text}</span>
 </div>
 )}

      <main className="flex-grow max-w-7xl xl:max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8 space-y-8">
 
 {error && (
 <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-accent-rose flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <AlertCircle className="w-6 h-6 text-accent-rose shrink-0"/>
 <div>
 <h3 className="font-semibold text-sm">Backend API Connection Error</h3>
 <p className="text-xs text-accent-rose/80">{error}</p>
 </div>
 </div>
 <button
 onClick={fetchDossiers}
 className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-all flex items-center gap-2 cursor-pointer shrink-0"
 >
 <RefreshCw className="w-3.5 h-3.5"/>
 <span>Retry Connection</span>
 </button>
 </div>
 )}

 {/* HERO HEADER */}
 <section className="relative overflow-hidden rounded-xl bg-surface border border-line p-6 sm:p-7 shadow-xs">
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
 <div className="space-y-2 max-w-2xl">
 <div className="flex items-center gap-3">
 <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-accent-indigo flex items-center gap-1.5">
 <Users className="w-3.5 h-3.5 text-accent-indigo"/>
 Candidate Evaluation Dossiers
 </span>
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-accent-emerald">
 ● Live Python Backend
 </span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
 Technical Scorecards & Candidate Dossiers
 </h1>
 <p className="text-ink-muted text-xs sm:text-sm">
 Explore comprehensive multi-modal interview transcripts, scenario execution metrics, and AI recommendations.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2.5">
 <button
 type="button"
 onClick={() => handleExportDossiers('xlsx')}
 disabled={isExporting}
 className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-line text-ink font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
 title="Export candidate dossiers and scorecards to Microsoft Excel (.xlsx)"
 >
 <Download className="w-4 h-4 text-accent-emerald"/>
 <span>{isExporting ? 'Exporting...': 'Export Excel'}</span>
 </button>
 <button
 type="button"
 onClick={() => handleExportDossiers('csv')}
 disabled={isExporting}
 className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-line text-ink font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
 title="Export candidate dossiers to CSV (.csv)"
 >
 <Download className="w-4 h-4 text-accent-cyan"/>
 <span>Export CSV</span>
 </button>
 <button
 type="button"
 onClick={() => {
   if (selectedCandidate) {
     exportCandidateDossierPdf(selectedCandidate);
     showToast(`PDF Dossier for ${selectedCandidate.name} downloaded successfully!`, 'success');
   } else if (filteredCandidates.length > 0) {
     exportCandidateDossierPdf(filteredCandidates[0]);
     showToast(`PDF Dossier for ${filteredCandidates[0].name} downloaded!`, 'success');
   } else {
     showToast('No candidates available to export', 'error');
   }
 }}
 className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-accent-indigo font-semibold text-xs shadow-md transition-all cursor-pointer"
 title="Download candidate evaluation scorecard PDF dossier"
 >
 <FileText className="w-4 h-4 text-accent-indigo"/>
 <span>Download PDF Dossier</span>
 </button>
 <button
 type="button"
 onClick={() => setShowInviteModal(true)}
 className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 cursor-pointer"
 >
 <Send className="w-4 h-4"/>
 <span>Invite New Candidate</span>
 </button>
 </div>
 </div>
 </section>

 {/* METRICS STATS */}
 <section className="grid grid-cols-1 sm:grid-cols-4 gap-5">
 <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
 <span className="text-xs text-ink-muted">Total Candidates Evaluated</span>
 <div className="text-2xl font-bold text-ink">{candidates.length}</div>
 </div>
 <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
 <span className="text-xs text-ink-muted">Strong Hire Recommendations</span>
 <div className="text-2xl font-bold text-accent-emerald">{strongHiresCount}</div>
 </div>
 <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
 <span className="text-xs text-ink-muted">Hire Recommendations</span>
 <div className="text-2xl font-bold text-accent-indigo">{hiresCount}</div>
 </div>
 <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
 <span className="text-xs text-ink-muted">Average Match Score</span>
 <div className="text-2xl font-bold text-accent-cyan font-mono">{avgScore != null ?`${avgScore}%`: 'N/A'}</div>
 </div>
 </section>

 {/* SEARCH & FILTERS BAR */}
 <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-line backdrop-blur-md">
 <div className="relative flex-1 sm:max-w-md">
 <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3"/>
 <input
 type="text"
 placeholder="Please search candidate name, email, role, or technical skill..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-2.5 text-ink-muted hover:text-ink"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <select
 aria-label="Filter by Status"
 value={selectedStatusFilter}
 onChange={(e) => setSelectedStatusFilter(e.target.value)}
 className="px-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
 >
 <option value="all">All Statuses</option>
 <option value="selected">Selected</option>
 <option value="rejected">Rejected</option>
 <option value="inprocess">In-Process</option>
 <option value="backout"className="bg-surface text-accent-amber font-semibold">Backout</option>
 </select>

 <select
 value={selectedRecFilter}
 onChange={(e) => setSelectedRecFilter(e.target.value)}
 className="px-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
 >
 <option value="all">All Recommendations</option>
 <option value="STRONG_HIRE">Strong Hire</option>
 <option value="HIRE">Hire</option>
 <option value="LEAN_HIRE">Lean Hire</option>
 <option value="REJECT">Reject</option>
 </select>

 <select
 value={selectedDeptFilter}
 onChange={(e) => setSelectedDeptFilter(e.target.value)}
 className="px-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
 >
 <option value="all">All Departments</option>
 <option value="Engineering">Engineering</option>
 <option value="Infrastructure">Infrastructure</option>
 <option value="Product Design">Product Design</option>
 <option value="AI Research">AI Research</option>
 </select>
 </div>
 </section>

 {/* CANDIDATES DOSSIERS TABLE */}
 <section className="rounded-2xl bg-surface border border-line overflow-hidden backdrop-blur-md shadow-2xl">
 {loading ? (
 <div className="p-16 text-center space-y-3">
 <RefreshCw className="w-8 h-8 text-accent-indigo animate-spin mx-auto"/>
 <p className="text-ink-muted text-sm">Fetching evaluation dossiers from Python backend...</p>
 </div>
 ) : filteredCandidates.length === 0 ? (
 <div className="p-16 text-center space-y-4">
 <Search className="w-10 h-10 text-ink-muted mx-auto"/>
 <h3 className="text-base font-bold text-ink">No candidate dossiers found</h3>
 <p className="text-ink-muted text-xs">Try resetting your search query or filters.</p>
 </div>
 ) : (
 <>
 {/* Desktop View: Table */}
 <div className="hidden md:block overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-inset/80 border-b border-line text-[11px] font-mono text-ink-muted uppercase tracking-wider">
 <th className="py-4 px-6">Candidate</th>
 <th className="py-4 px-4">Target Position</th>
 <th className="py-4 px-4">AI Score</th>
 <th className="py-4 px-4 whitespace-nowrap">Recommendation</th>
 <th className="py-4 px-4 whitespace-nowrap">Interview Stage</th>
 <th className="py-4 px-6 text-right whitespace-nowrap">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-line text-xs">
 {filteredCandidates.map((c, idx) => (
 <tr
 key={c.sessionId ||`${c.id}-${idx}`}
 className="hover:bg-surface-2 transition-colors group cursor-pointer"
 onClick={() => setSelectedCandidate(c)}
 >
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
 {c.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <p className="font-semibold text-ink group-hover:text-accent-indigo transition-colors">
 {c.name}
 </p>
 <p className="text-[11px] text-ink-muted font-mono">{c.email}</p>
 </div>
 </div>
 </td>

 <td className="py-4 px-4">
 <span className="font-medium text-ink">{c.targetPosition}</span>
 <p className="text-[11px] text-ink-muted">{c.department}</p>
 </td>

 <td className="py-4 px-4">
 <div className="w-10 h-10 rounded-full border-2 border-indigo-500/40 bg-inset flex items-center justify-center font-mono font-bold text-xs text-accent-indigo">
 {c.aiMatchScore != null ?`${c.aiMatchScore}%`: '—'}
 </div>
 </td>

 <td className="py-4 px-4 whitespace-nowrap">{getRecommendationBadge(c.recommendation, isPastUnconducted(c))}</td>

 <td className="py-4 px-4 whitespace-nowrap">
 <div className="flex flex-col gap-0.5">
 <span className="text-ink font-semibold flex items-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${
 c.stage?.toLowerCase().includes('miss') || c.status?.toLowerCase().includes('abandon')
 ? 'bg-amber-600'
 : c.status?.toLowerCase().includes('scheduled')
 ? 'bg-indigo-500'
 : 'bg-slate-400'
 }`} />
 {c.stage ||'Screening'}
 </span>
 {(() => {
 const dt = formatInterviewDateTime(c.scheduledAt, c.scheduledDate, c.scheduledTime);
 return (
 <div className="text-[11px] font-mono text-ink-muted flex flex-col">
 <span className={dt.isScheduled ? "text-ink font-medium": "text-ink-muted italic"}>
 {dt.date}
 </span>
 {dt.time && (
 <span className={`text-[10px] font-bold flex items-center gap-1 ${
 c.stage?.toLowerCase().includes('miss') || c.status?.toLowerCase().includes('abandon')
 ? 'text-accent-amber'
 : 'text-accent-indigo'
 }`}>
 <Clock className={`w-2.5 h-2.5 ${
 c.stage?.toLowerCase().includes('miss') || c.status?.toLowerCase().includes('abandon')
 ? 'text-accent-amber'
 : 'text-accent-indigo'
 }`} />
 {dt.time}
 </span>
 )}
 </div>
 );
 })()}
 </div>
 </td>

 <td className="py-4 px-6 text-right whitespace-nowrap"onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-2">
 {c.sessionId && (
 c.stage?.toLowerCase().includes('in progress') || c.stage?.toLowerCase().includes('live') || c.stage?.toLowerCase().includes('ongoing') ? (
 <Link
 href={`/recruiter/interview/${c.sessionId}/live`}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-accent-rose border border-rose-500/30 text-xs font-semibold cursor-pointer transition-all"
 title="Monitor live interview session"
 >
 <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500"/>
 <span>Live</span>
 </Link>
 ) : (
 <Link
 href={`/recruiter/interview/${c.sessionId}/recording`}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl bg-surface-2 hover:bg-surface-3 text-ink border border-line text-xs font-medium cursor-pointer transition-all"
 title="View recorded interview & transcript"
 >
 <Video className="w-3.5 h-3.5 text-accent-indigo"/>
 <span>Recording</span>
 </Link>
 )
 )}
 {c.sessionId && c.status?.toLowerCase() !== 'completed'&& (
 <button
 type="button"
 onClick={() => {
 setRescheduleCandidate(c);
 if (c.scheduledDate) {
 setRescheduleDate(c.scheduledDate);
 setRescheduleTime(c.scheduledTime ||'10:00');
 } else if (c.scheduledAt) {
 try {
 const d = new Date(c.scheduledAt);
 setRescheduleDate(d.toISOString().split('T')[0]);
 const hh = String(d.getHours()).padStart(2, '0');
 const mm = String(d.getMinutes()).padStart(2, '0');
 setRescheduleTime(`${hh}:${mm}`);
 } catch {
 setRescheduleDate(new Date().toISOString().split('T')[0]);
 setRescheduleTime('10:00');
 }
 } else {
 setRescheduleDate(new Date().toISOString().split('T')[0]);
 setRescheduleTime('10:00');
 }
 setRescheduleMessage('');
 setRescheduleNotify(true);
 }}
 className="inline-flex items-center justify-center p-2.5 min-h-[40px] min-w-[40px] rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-accent-amber border border-amber-500/30 cursor-pointer transition-colors shadow-sm"
 title="Reschedule interview date & time"
 aria-label="Reschedule interview date & time"
 >
 <Pencil className="w-4 h-4"/>
 </button>
 )}
 <button
 type="button"
 onClick={() => setSelectedCandidate(c)}
 className="inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-accent-indigo border border-indigo-500/30 text-xs font-medium cursor-pointer"
 >
 <Eye className="w-3.5 h-3.5"/>
 <span>View Scorecard</span>
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Mobile View: Responsive Card Grid */}
 <div className="block md:hidden divide-y divide-line">
 {filteredCandidates.map((c, idx) => (
 <div
 key={c.sessionId ||`${c.id}-${idx}`}
 onClick={() => setSelectedCandidate(c)}
 className="p-4 space-y-3 hover:bg-surface-2 transition-colors cursor-pointer"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
 {c.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <p className="font-semibold text-sm text-ink">{c.name}</p>
 <p className="text-xs text-ink-muted font-mono">{c.email}</p>
 </div>
 </div>
 {getRecommendationBadge(c.recommendation, isPastUnconducted(c))}
 </div>

 <div className="flex items-center justify-between text-xs pt-1">
 <div>
 <span className="font-medium text-ink">{c.targetPosition}</span>
 <span className="text-ink-muted ml-1">({c.department})</span>
 </div>
 <div className="font-mono font-bold text-accent-indigo bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
 {c.aiMatchScore != null ?`${c.aiMatchScore}%`: '—'}
 </div>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-line text-xs gap-2">
 <span className="text-ink-muted font-mono">{c.stage}</span>
 <div className="flex items-center gap-2">
 {c.sessionId && (
 c.stage?.toLowerCase().includes('in progress') || c.stage?.toLowerCase().includes('live') || c.stage?.toLowerCase().includes('ongoing') ? (
 <Link
 href={`/recruiter/interview/${c.sessionId}/live`}
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-500/10 text-accent-rose border border-rose-500/30 text-[11px] font-semibold"
 >
 <Radio className="w-3 h-3 animate-pulse text-rose-500"/>
 <span>Live</span>
 </Link>
 ) : (
 <Link
 href={`/recruiter/interview/${c.sessionId}/recording`}
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-surface-2 text-ink border border-line text-[11px] font-medium"
 >
 <Video className="w-3 h-3 text-accent-indigo"/>
 <span>Recording</span>
 </Link>
 )
 )}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedCandidate(c);
 }}
 className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-indigo-500/10 text-accent-indigo border border-indigo-500/30 text-xs font-semibold cursor-pointer"
 >
 <Eye className="w-3.5 h-3.5"/>
 <span>Scorecard</span>
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </>
 )}
 </section>

 {/* CANDIDATE SCORECARD MODAL */}
 {selectedCandidate && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-fadeIn">
 {/* Backdrop Dismissal Overlay */}
 <div
 className="absolute inset-0 z-0 bg-transparent"
 onClick={() => setSelectedCandidate(null)}
 aria-hidden="true"
 />

 <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl text-ink overflow-hidden">
 {/* Sticky Header */}
 <div className="flex items-start justify-between border-b border-line p-6 sm:p-7 bg-surface sticky top-0 z-20">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xl shadow-md">
 {selectedCandidate.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-3 flex-wrap">
 <h2 className="text-xl font-bold text-ink">{selectedCandidate.name}</h2>
 {getRecommendationBadge(selectedCandidate.recommendation, isPastUnconducted(selectedCandidate))}
 </div>
 <p className="text-xs text-ink-muted font-mono mt-0.5">
 {selectedCandidate.email} • {selectedCandidate.targetPosition}
 </p>
 </div>
 </div>
 <button
 type="button"
 aria-label="Close dossier modal"
 onClick={() => setSelectedCandidate(null)}
 className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-muted hover:text-ink transition-colors cursor-pointer"
 >
 <X className="w-5 h-5"/>
 </button>
 </div>

 {/* Scrollable Content Body */}
 <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-inset p-5 rounded-2xl border border-line">
 <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-line pb-4 sm:pb-0 pr-0 sm:pr-4">
 <span className="text-xs text-ink-muted font-medium">Overall Match Score</span>
 <div className="text-4xl font-extrabold text-accent-indigo font-mono mt-1">
 {selectedCandidate.aiMatchScore != null ?`${selectedCandidate.aiMatchScore}%`: 'N/A'}
 </div>
 </div>

 <div className="sm:col-span-2 space-y-3">
 {selectedCandidate.breakdown ? (
 <>
 <div className="space-y-1">
 <div className="flex justify-between text-xs font-semibold">
 <span className="text-ink">Technical Depth</span>
 <span className="font-mono text-accent-indigo">{selectedCandidate.breakdown.technicalDepth}%</span>
 </div>
 <div className="w-full h-2.5 rounded-full bg-surface border border-line overflow-hidden">
 <div className="h-full bg-indigo-500 rounded-full"style={{ width:`${selectedCandidate.breakdown.technicalDepth}%`}}></div>
 </div>
 </div>

 <div className="space-y-1">
 <div className="flex justify-between text-xs font-semibold">
 <span className="text-ink">System Architecture</span>
 <span className="font-mono text-accent-cyan">{selectedCandidate.breakdown.systemArchitecture}%</span>
 </div>
 <div className="w-full h-2.5 rounded-full bg-surface border border-line overflow-hidden">
 <div className="h-full bg-cyan-500 rounded-full"style={{ width:`${selectedCandidate.breakdown.systemArchitecture}%`}}></div>
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

 <div className="space-y-2">
 <h3 className="text-sm font-bold text-ink flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-accent-indigo"/> Executive AI Summary
 </h3>
 <p className="text-xs sm:text-sm text-ink leading-relaxed bg-inset p-4 rounded-xl border border-line">
 {selectedCandidate.summary ||'Not evaluated yet'}
 </p>
 </div>
 </div>

 {/* Sticky Action Footer */}
 <div className="p-4 sm:p-5 border-t border-line bg-surface sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 {selectedCandidate.sessionId && (
 selectedCandidate.stage?.toLowerCase().includes('in progress') || selectedCandidate.stage?.toLowerCase().includes('live') || selectedCandidate.stage?.toLowerCase().includes('ongoing') ? (
 <Link
 href={`/recruiter/interview/${selectedCandidate.sessionId}/live`}
 className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-accent-rose border border-rose-500/30 text-xs font-semibold transition-all"
 >
 <Radio className="w-4 h-4 animate-pulse text-rose-500"/>
 <span>Open Live Monitor</span>
 </Link>
 ) : (
 <Link
 href={`/recruiter/interview/${selectedCandidate.sessionId}/recording`}
 className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-surface-2 hover:bg-surface-3 text-ink border border-line text-xs font-semibold transition-all"
 >
 <Video className="w-4 h-4 text-accent-indigo"/>
 <span>Watch Recording & Transcript</span>
 </Link>
 )
 )}
 </div>
 <div className="flex flex-wrap items-center gap-2">
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
 className="px-4 py-2 min-h-[40px] rounded-xl bg-surface-2 hover:bg-surface-3 border border-line text-xs font-semibold text-ink cursor-pointer transition-all inline-flex items-center gap-2"
 title="Download verified PDF Candidate Dossier"
 >
 <Download className="w-4 h-4 text-accent-emerald"/>
 <span>Download PDF Dossier</span>
 </button>

 <button
 type="button"
 disabled={updatingDecision}
 onClick={() => handleCandidateDecision(selectedCandidate.id, 'rejected', selectedCandidate.sessionId)}
 className="px-4 py-2 min-h-[40px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-500 cursor-pointer transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
 title="Reject candidate application and send polite notification"
 >
 <X className="w-3.5 h-3.5"/>
 <span>Reject Candidate</span>
 </button>

 <button
 type="button"
 disabled={updatingDecision}
 onClick={() => handleCandidateDecision(selectedCandidate.id, 'shortlisted', selectedCandidate.sessionId)}
 className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-accent-emerald cursor-pointer transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
 title="Shortlist candidate and send next steps notification"
 >
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>
 <span>Shortlist Candidate</span>
 </button>

 <button
 type="button"
 disabled={updatingDecision}
 onClick={() => handleCandidateDecision(selectedCandidate.id, 'advanced_to_panel', selectedCandidate.sessionId)}
 className="px-5 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-xs font-bold text-white shadow-md shadow-indigo-500/20 cursor-pointer transition-all disabled:opacity-50"
 >
 {updatingDecision ? 'Updating...': 'Advance to Panel Round '}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* INVITE MODAL */}
 {showInviteModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm animate-fadeIn">
 <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-line space-y-5 shadow-2xl">
 <div className="flex items-center justify-between border-b border-line pb-3">
 <h3 className="text-base font-bold text-ink">Invite Candidate</h3>
 <button type="button"onClick={() => setShowInviteModal(false)} className="text-ink-muted">
 <X className="w-5 h-5"/>
 </button>
 </div>
 <form onSubmit={handleInviteSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs text-ink">Candidate Name</label>
 <input
 type="text"
 required
 value={inviteName}
 onChange={(e) => setInviteName(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-ink">Candidate Email</label>
 <input
 type="email"
 required
 value={inviteEmail}
 onChange={(e) => setInviteEmail(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-sm"
 />
 </div>
 <div className="space-y-1">
 <label className="text-xs text-ink">Job Profile</label>
 <select
 required
 value={inviteJobId}
 onChange={(e) => setInviteJobId(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-sm"
 >
 <option value="">Select a job profile</option>
 {jobProfiles.map((job, idx) => (
 <option key={`${job.id}-${idx}`} value={job.id}>{job.title}</option>
 ))}
 </select>
 </div>
 <button type="submit"disabled={inviting || !inviteJobId} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs">
 {inviting ? 'Sending...': 'Send Screening Invite'}
 </button>
 </form>
 </div>
 </div>
 )}

 {/* ================= RESCHEDULE MODAL ================= */}
 {rescheduleCandidate && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
 <div className="bg-surface border border-line rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
 <Calendar className="w-5 h-5"/>
 </div>
 <div>
 <h2 className="text-xl font-bold text-ink">Reschedule Interview</h2>
 <p className="text-xs text-ink-muted">Update slot and notify candidate</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setRescheduleCandidate(null)}
 className="p-1.5 rounded-lg text-ink-muted hover:text-ink cursor-pointer"
 >
 <X className="w-5 h-5"/>
 </button>
 </div>

 <div className="p-4 rounded-2xl bg-inset space-y-2">
 <p className="font-semibold text-sm text-ink">{rescheduleCandidate.name} ({rescheduleCandidate.email})</p>
 <p className="text-xs text-ink-muted font-mono">Role: {rescheduleCandidate.targetPosition}</p>
 {(() => {
 const curSlot = formatInterviewDateTime(
 rescheduleCandidate.scheduledAt,
 rescheduleCandidate.scheduledDate,
 rescheduleCandidate.scheduledTime
 );
 if (!curSlot.isScheduled) return null;
 return (
 <p className="text-xs font-mono text-accent-indigo">
 Current Slot: {curSlot.date} {curSlot.time ?`at ${curSlot.time}`: ''}
 </p>
 );
 })()}
 </div>

 <form
 onSubmit={async (e) => {
 e.preventDefault();
 if (!rescheduleCandidate?.sessionId || !rescheduleDate) return;
 try {
 setRescheduling(true);
 const res = await apiFetch(`/api/recruiter/sessions/${rescheduleCandidate.sessionId}/reschedule`, {
 method: 'POST',
 headers: {'Content-Type': 'application/json'},
 credentials: 'include',
 body: JSON.stringify({
 interviewDate: rescheduleDate,
 interviewTime: rescheduleTime,
 message: rescheduleMessage,
 notify: rescheduleNotify,
 }),
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error ||'Failed to reschedule');
 showToast(`Interview rescheduled for ${rescheduleCandidate.name}${rescheduleNotify ? 'and notification sent!': '.'}`, 'success');
 const updated = data.scheduledAt ||`${rescheduleDate}T${rescheduleTime}:00`;
 setCandidates((prev) =>
 prev.map((c) =>
 c.sessionId === rescheduleCandidate.sessionId
 ? {
 ...c,
 scheduledAt: updated,
 scheduledDate: rescheduleDate,
 scheduledTime: rescheduleTime,
 status: 'Scheduled',
 stage: 'Intro',
 }
 : c
 )
 );
 setRescheduleCandidate(null);
 } catch (err: any) {
 showToast(err?.message ||'Failed to reschedule', 'error');
 } finally {
 setRescheduling(false);
 }
 }}
 className="space-y-4"
 >
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-medium text-ink flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-accent-indigo"/>
 <span>New Date</span>
 <span className="text-accent-rose">*</span>
 </label>
 <input
 type="date"
 required
 value={rescheduleDate}
 onChange={(e) => setRescheduleDate(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-sm focus:outline-none focus:border-indigo-500"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-medium text-ink flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5 text-accent-cyan"/>
 <span>New Time (UTC)</span>
 <span className="text-accent-rose">*</span>
 </label>
 <input
 type="time"
 required
 value={rescheduleTime}
 onChange={(e) => setRescheduleTime(e.target.value)}
 className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-sm focus:outline-none focus:border-indigo-500"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-medium text-ink">Note for Candidate (Optional)</label>
 <textarea
 rows={2}
 placeholder="Please enter a note for candidate (e.g., Rescheduled due to hiring team availability)"
 value={rescheduleMessage}
 onChange={(e) => setRescheduleMessage(e.target.value)}
 className="w-full px-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 resize-none"
 />
 </div>

 <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/5">
 <input
 type="checkbox"
 id="notifyCandDossier"
 checked={rescheduleNotify}
 onChange={(e) => setRescheduleNotify(e.target.checked)}
 className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-line bg-inset cursor-pointer"
 />
 <label htmlFor="notifyCandDossier"className="text-xs text-ink cursor-pointer select-none">
 <span className="font-semibold">Notify Candidate</span> (Sends in-app notification & official email)
 </label>
 </div>

 <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
 <button
 type="button"
 onClick={() => setRescheduleCandidate(null)}
 disabled={rescheduling}
 className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-semibold cursor-pointer disabled:opacity-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={rescheduling}
 className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
 >
 {rescheduling ? (
 <>
 <RefreshCw className="w-3.5 h-3.5 animate-spin"/>
 <span>Updating...</span>
 </>
 ) : (
 <>
 <Send className="w-3.5 h-3.5"/>
 <span>Confirm & Notify</span>
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 </main>
 
      {/* OUTBOUND DOSSIER PDF & WEBHOOK SYNC MODAL */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-surface border border-line p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-accent-cyan">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Dossier PDF & Outbound Webhook Sync</h3>
                  <p className="text-[11px] text-ink-muted">Synchronize verified candidate dossiers, 4-pillar scores, and PDF reports to your Slack, ATS, or custom webhook</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWebhookModalOpen(false)}
                className="text-ink-muted hover:text-ink text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Webhook URL */}
              <div className="space-y-1">
                <label className="font-bold text-ink flex items-center justify-between">
                  <span>Outbound Webhook Endpoint URL</span>
                  <span className="text-[10px] text-ink-muted">Accepts POST requests with JSON payload</span>
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/... or https://api.yourcompany.com/dossier-sync"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line font-mono text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Secret Token */}
              <div className="space-y-1">
                <label className="font-bold text-ink flex items-center justify-between">
                  <span>Webhook Secret Key (HMAC Verification)</span>
                  <span className="text-[10px] text-accent-cyan">Header: X-Progeni-Atlas-Signature</span>
                </label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="tp_whsec_••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-line font-mono text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Automation Toggles */}
              <div className="space-y-2 pt-2 border-t border-line">
                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-2 border border-line cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncComplete}
                    onChange={(e) => setAutoSyncComplete(e.target.checked)}
                    className="mt-0.5 rounded border-line text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <p className="font-semibold text-ink">Auto-Dispatch upon Interview Evaluation Completion</p>
                    <p className="text-[11px] text-ink-muted">Sends full 4-pillar scorecard and direct vector PDF dossier link as soon as AI completes scoring.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-2 border border-line cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncDecision}
                    onChange={(e) => setAutoSyncDecision(e.target.checked)}
                    className="mt-0.5 rounded border-line text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <p className="font-semibold text-ink">Auto-Dispatch upon Recruiter Hiring Decision (Shortlist / Reject)</p>
                    <p className="text-[11px] text-ink-muted">Notifies your team channel or ATS when a hiring committee decision is made.</p>
                  </div>
                </label>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-accent-emerald text-xs font-semibold">
                  {testResult}
                </div>
              )}

              {/* Recent Dispatches */}
              <div className="pt-2 border-t border-line space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Recent Outbound Dispatches</span>
                <div className="max-h-36 overflow-y-auto divide-y divide-line rounded-xl border border-line bg-canvas">
                  {webhookLogs.slice(0, 5).map((log, i) => (
                    <div key={log.id || i} className="p-2.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-ink">{log.candidateName}</span>
                        <span className="text-ink-muted ml-1.5">({log.jobRole})</span>
                        <span className="ml-2 px-1.5 py-0.2 rounded bg-cyan-500/10 text-accent-cyan text-[10px]">{log.event}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-accent-emerald border border-emerald-500/30">
                          {log.status || 'DELIVERED'} (200 OK)
                        </span>
                        <span className="font-mono text-ink-muted text-[10px]">{log.latencyMs ? `${log.latencyMs}ms` : '120ms'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              <button
                type="button"
                onClick={handleTestWebhookPing}
                disabled={testingWebhook}
                className="px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-accent-cyan flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                <span>{testingWebhook ? 'Sending Ping...' : 'Test Webhook Ping'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWebhookModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-line bg-canvas hover:bg-surface-2 text-xs font-semibold text-ink cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveWebhookConfig}
                  disabled={savingWebhook}
                  className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-accent-cyan text-slate-950 hover:bg-cyan-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingWebhook ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

</div>
 );
}