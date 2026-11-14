import type { Dispatch, SetStateAction } from 'react';
import { Briefcase, Download, Plus, Search, Sparkles, Users, X, ArrowUpDown } from 'lucide-react';
import type {
 CandidateDossier,
 DashboardSortDirection,
 DashboardSortField,
 DashboardSortMode,
 JobProfile,
} from '../dashboard-types';

export function DashboardControlBar({
 activeTab,
 setActiveTab,
 candidates,
 jobProfiles,
 filteredCandidates,
 statusCounts,
 selectedStatusFilter,
 setSelectedStatusFilter,
 sortMode,
 setSortMode,
 onBulkUploadClick,
 handleExportDossiers,
 isExporting,
 setShowCreateJobModal,
 searchQuery,
 setSearchQuery,
 selectedRecFilter,
 setSelectedRecFilter,
 sortField,
 setSortField,
 sortDirection,
 setSortDirection,
}: {
 activeTab: 'dossiers'|'jobs';
 setActiveTab: (tab: 'dossiers'|'jobs') => void;
 candidates: CandidateDossier[];
 jobProfiles: JobProfile[];
 filteredCandidates: CandidateDossier[];
 statusCounts: { selected: number; rejected: number; inprocess: number; backout: number };
 selectedStatusFilter: string;
 setSelectedStatusFilter: (value: string) => void;
 sortMode: DashboardSortMode;
 setSortMode: (mode: DashboardSortMode) => void;
 onBulkUploadClick: () => void;
 handleExportDossiers: (format?: 'xlsx'|'csv') => Promise<void>;
 isExporting: boolean;
 setShowCreateJobModal: Dispatch<SetStateAction<boolean>>;
 searchQuery: string;
 setSearchQuery: (value: string) => void;
 selectedRecFilter: string;
 setSelectedRecFilter: (value: string) => void;
 sortField: DashboardSortField;
 setSortField: (field: DashboardSortField) => void;
 sortDirection: DashboardSortDirection;
 setSortDirection: (direction: DashboardSortDirection) => void;
}) {
 return (
 <section className="card-panel overflow-hidden p-3.5 space-y-3">
 
 {/* ROW 1: PRIMARY VIEW TABS + STATUS DROPDOWN ALWAYS STRICTLY PARALLEL */}
 <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
 
 {/* LEFT: TABS & PARALLEL STATUS DROPDOWN IN ONE STRICT NON-WRAPPING ROW */}
 <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
 
 {/* TABS GROUP */}
 <div className="inline-flex items-center gap-1 bg-inset p-1 rounded-xl border border-line shrink-0">
 <button
 type="button"
 onClick={() => setActiveTab('dossiers')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'dossiers'
 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
 : 'text-ink-muted hover:text-ink'
 }`}
 >
 <Users className="w-3.5 h-3.5"/>
 <span>Candidate Dossiers ({filteredCandidates.length})</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('jobs')}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'jobs'
 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
 : 'text-ink-muted hover:text-ink'
 }`}
 >
 <Briefcase className="w-3.5 h-3.5"/>
 <span>Active Positions &amp; Rubrics ({jobProfiles.length})</span>
 </button>
 </div>

 {/* DROPDOWN PARALLEL TO"ACTIVE POSITIONS & RUBRICS"WITH INLINE SORT TO TOP TOGGLE */}
 <div className="inline-flex items-center gap-1.5 bg-inset p-1 rounded-xl border border-line hover:border-indigo-500/40 transition-colors shadow-sm shrink-0 whitespace-nowrap">
 <div className="flex items-center gap-1.5 pl-2">
 <ArrowUpDown className="w-3.5 h-3.5 text-accent-indigo shrink-0"/>
 <label htmlFor="student-status-dropdown"className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider hidden sm:inline">
 Status:
 </label>
 <select
 id="student-status-dropdown"
 aria-label="Student Record Status Filter and Sort"
 value={selectedStatusFilter}
 onChange={(e) => {
 setSelectedStatusFilter(e.target.value);
 if (activeTab !== 'dossiers') setActiveTab('dossiers');
 }}
 className="bg-transparent text-ink text-xs font-semibold focus:outline-none cursor-pointer py-1 pr-1"
 >
 <option value="all"className="bg-surface text-ink">
 All Statuses ({candidates.length})
 </option>
 <option value="selected"className="bg-surface text-accent-emerald font-semibold">
 Selected ({statusCounts.selected})
 </option>
 <option value="rejected"className="bg-surface text-accent-rose font-semibold">
 Rejected ({statusCounts.rejected})
 </option>
 <option value="inprocess"className="bg-surface text-accent-blue font-semibold">
 In-Process ({statusCounts.inprocess})
 </option>
 <option value="backout"className="bg-surface text-amber-800 font-semibold">
 Backout ({statusCounts.backout})
 </option>
 </select>
 </div>

 {activeTab === 'dossiers'&& (
 <div className="flex items-center gap-0.5 border-l border-line pl-1.5 pr-0.5">
 <button
 type="button"
 onClick={() => setSortMode('filter')}
 className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
 sortMode === 'filter'
 ? 'bg-indigo-600 text-white shadow-xs'
 : 'text-ink-muted hover:text-ink'
 }`}
 title="Filter: Display only records matching the selected status"
 >
 Filter
 </button>
 <button
 type="button"
 onClick={() => setSortMode('sortTop')}
 className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
 sortMode === 'sortTop'
 ? 'bg-indigo-600 text-white shadow-xs'
 : 'text-ink-muted hover:text-ink'
 }`}
 title="Sort to Top: Display all student records with chosen status pinned at top"
 >
 Sort to Top
 </button>
 </div>
 )}
 </div>

 </div>

 {/* RIGHT SIDE OF ROW 1: ACTIONS (BULK UPLOAD / EXPORT DOSSIERS / CREATE POSITION) */}
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onBulkUploadClick}
 className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
 title="Bulk upload candidate resumes & generate AI-assisted interview schedules"
 >
 <Sparkles className="w-3.5 h-3.5 text-accent-amber"/>
 <span>Bulk Upload &amp; Auto-Schedule</span>
 </button>
 {activeTab === 'dossiers'&& (
 <button
 type="button"
 onClick={() => handleExportDossiers('xlsx')}
 disabled={isExporting}
 className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-line text-ink text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-50"
 title="Export candidate dossiers and scorecards to Microsoft Excel (.xlsx)"
 >
 <Download className="w-3.5 h-3.5 text-accent-emerald"/>
 <span>{isExporting ? 'Exporting...': 'Export Excel'}</span>
 </button>
 )}
 {activeTab === 'jobs'&& (
 <button
 type="button"
 onClick={() => setShowCreateJobModal(true)}
 className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
 >
 <Plus className="w-4 h-4"/>
 <span>Create New Position</span>
 </button>
 )}
 </div>
 </div>

 {/* ROW 2: SEARCH & SORT CONTROLS - SHIFTED TO LEFT SIDE WITH PROPER ARRANGEMENT */}
 {activeTab === 'dossiers'&& (
 <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-2.5 justify-start">
 {/* Search Input */}
 <div className="relative w-full sm:w-64 md:w-72">
 <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5"/>
 <input
 type="text"
 placeholder="Please search candidate or skill..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 transition-colors"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery('')}
 className="absolute right-3 top-2 text-ink-muted hover:text-ink"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>

 {/* Filter by Recommendation (Shifted to Left alongside Search) */}
 <select
 value={selectedRecFilter}
 onChange={(e) => setSelectedRecFilter(e.target.value)}
 className="px-3 py-1.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
 title="Filter by Recommendation"
 >
 <option value="all">All Recommendations</option>
 <option value="STRONG_HIRE">Strong Hire</option>
 <option value="HIRE">Hire</option>
 <option value="LEAN_HIRE">Lean Hire</option>
 <option value="REJECT">Reject</option>
 </select>

 {/* Sort Option Selector (Shifted to Left alongside Search) */}
 <select
 value={`${sortField}-${sortDirection}`}
 onChange={(e) => {
 const [field, dir] = e.target.value.split('-');
 setSortField(field as any);
 setSortDirection(dir as any);
 }}
 className="px-3 py-1.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
 title="Sort Student Records"
 >
 <option value="status-asc">Sort: Status Priority</option>
 <option value="aiMatchScore-desc">Sort: Highest AI Score</option>
 <option value="aiMatchScore-asc">Sort: Lowest AI Score</option>
 <option value="appliedDate-desc">Sort: Newest First</option>
 <option value="appliedDate-asc">Sort: Oldest First</option>
 <option value="name-asc">Sort: Name (A-Z)</option>
 </select>
 </div>
 )}
 </section>
 );
}
