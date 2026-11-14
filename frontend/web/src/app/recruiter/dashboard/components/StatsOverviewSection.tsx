import { Award, Briefcase, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { OverviewStats } from '../dashboard-types';

export function StatsOverviewSection({ overview }: { overview: OverviewStats }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* STAT CARD 1 */}
      <div className="card-panel-hover p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="kicker">Total Candidates Screened</span>
          <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/30 shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="kpi-value">
            {overview.totalCandidates}
          </span>
          <span className="text-xs font-mono font-semibold text-accent-emerald flex items-center gap-0.5">
            {overview.totalCandidates > 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" /> Pipeline Active
              </>
            ) : (
              <span className="text-ink-muted">0 Active</span>
            )}
          </span>
        </div>
        <p className="text-[11px] text-ink-faint">Across all configured technical roles</p>
      </div>

      {/* STAT CARD 2 */}
      <div className="card-panel-hover p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="kicker">Active Job Openings</span>
          <div className="p-2 rounded-lg bg-surface-2 text-ink-muted border border-line shadow-2xs">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="kpi-value">
            {overview.activePositions}
          </span>
          <span className="text-xs font-mono text-accent-blue font-semibold">
            {overview.activePositions > 0 ? `${overview.activePositions} Active` : '0 Configured'}
          </span>
        </div>
        <p className="text-[11px] text-ink-faint">Active AI rubrics configured</p>
      </div>

      {/* STAT CARD 3 */}
      <div className="card-panel-hover p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="kicker">Avg AI Match Score</span>
          <div className="p-2 rounded-lg bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30 shadow-2xs">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="kpi-value">
            {overview.avgMatchScore > 0 ? `${overview.avgMatchScore}%` : 'N/A'}
          </span>
          <span className="text-xs font-mono font-semibold text-accent-emerald">
            {overview.avgMatchScore >= 80 ? 'High Benchmark' : overview.avgMatchScore > 0 ? 'Standard' : 'Awaiting Data'}
          </span>
        </div>
        <p className="text-[11px] text-ink-faint">Multi-factor technical rubric evaluation</p>
      </div>

      {/* STAT CARD 4: FREE DEMO ALLOWANCE & QUOTA */}
      <div className="card-panel-hover p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="kicker">Free Screening Quota</span>
          <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/30 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="kpi-value">
            {overview.freeDemosRemaining ?? 2} <span className="text-xs font-normal text-ink-faint">/ {overview.freeDemosTotal ?? 2} Left</span>
          </span>
          <span className="text-xs font-mono font-semibold text-accent-blue">
            10-Min Limit
          </span>
        </div>
        <p className="text-[11px] text-ink-faint">
          {overview.freeDemosRemaining === 0
            ? 'Trial allowance exhausted • Organization wallet active'
            : 'Complimentary screening trials for evaluation'}
        </p>
      </div>
    </section>
  );
}
