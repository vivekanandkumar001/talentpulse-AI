import { AlertCircle, CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react';
import type { CandidateDossier } from '../dashboard-types';

// HELPER: RECOMMENDATION COLOR BADGES
export function RecommendationBadge({
 recommendation: rec,
 isPast,
}: {
 recommendation: CandidateDossier['recommendation'];
 isPast?: boolean;
}) {
 const upperRec = String(rec ||'').trim().toUpperCase();
 if (isPast || upperRec === 'MISSED'|| upperRec === 'ABANDONED'|| upperRec === 'EXPIRED') {
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-accent-amber/20 border border-accent-amber/40 text-accent-amber flex items-center gap-1 shadow-xs">
 <XCircle className="w-3.5 h-3.5 text-accent-amber shrink-0"/> MISSED
 </span>
 );
 }
 if (!upperRec || upperRec === 'PENDING') {
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-surface-2 border border-line text-ink-muted flex items-center gap-1">
 <Clock className="w-3 h-3 text-ink-muted"/> PENDING
 </span>
 );
 }
 switch (upperRec) {
 case 'STRONG_HIRE':
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-accent-emerald flex items-center gap-1">
 <Sparkles className="w-3 h-3 text-accent-emerald"/> STRONG HIRE
 </span>
 );
 case 'HIRE':
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 border border-indigo-500/30 text-accent-indigo flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3 text-accent-indigo"/> HIRE
 </span>
 );
 case 'LEAN_HIRE':
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-accent-amber flex items-center gap-1">
 <Clock className="w-3 h-3 text-accent-amber"/> LEAN HIRE
 </span>
 );
 case 'REJECT':
 default:
 return (
 <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-accent-rose flex items-center gap-1">
 <AlertCircle className="w-3 h-3 text-accent-rose"/> REJECT
 </span>
 );
 }
}
