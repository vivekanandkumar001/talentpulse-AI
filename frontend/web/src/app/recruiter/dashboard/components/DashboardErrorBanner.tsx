import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logout } from '@/lib/api';
import type { DashboardError } from '../dashboard-types';

export function DashboardErrorBanner({
  error,
  fetchDashboard,
}: {
  error: DashboardError;
  fetchDashboard: () => Promise<void>;
}) {
  return (
    <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-accent-rose flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-accent-rose shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm text-accent-rose">{error.title}</h3>
          <p className="text-xs text-accent-rose/80 mt-0.5">{error.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {error.errorType === 'role_forbidden' ? (
          <>
            <Link
              href="/candidate/dashboard"
              className="px-4 py-2 rounded-xl bg-surface border border-line text-ink text-xs font-semibold hover:border-line-strong transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Candidate Portal</span>
            </Link>
            <button
              onClick={async () => {
                try { await logout(); } catch {}
                window.location.href = '/login';
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-semibold hover:opacity-95 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Sign In as Recruiter</span>
              </button>
          </>
        ) : error.errorType === 'unauthorized' ? (
          <>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Sign In</span>
              </Link>
            <button
              onClick={fetchDashboard}
              className="px-3.5 py-2 rounded-xl bg-surface border border-line text-ink text-xs font-semibold hover:border-line-strong transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </>
        ) : (
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    </div>
  );
}
