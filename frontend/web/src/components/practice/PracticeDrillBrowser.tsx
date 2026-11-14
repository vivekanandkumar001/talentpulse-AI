'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';

import {
  CandidatePracticeStats,
  DrillTurnEvaluation,
  PracticeCategory,
  PracticeDrillItem,
} from '@/types/practice';
import { apiFetch } from '@/lib/api';
import { PracticeHeroBanner } from '@/components/practice/PracticeHeroBanner';
import { PracticeFilterBar } from '@/components/practice/PracticeFilterBar';
import { PracticeDrillCard } from '@/components/practice/PracticeDrillCard';
import { PracticeHeaderStats } from '@/components/practice/PracticeHeaderStats';
import { LiveDrillSessionModal } from '@/components/practice/LiveDrillSessionModal';
import { BrandLogo } from '@/components/common/BrandLogo';

interface PracticeDrillsResponse {
  success: boolean;
  drills: PracticeDrillItem[];
  stats: CandidatePracticeStats;
  error?: string;
}

interface PracticeDrillBrowserProps {
  /** Drill id from `?drill=`, used to deep-link straight into a session. */
  initialDrillId?: string;
  /** Skill keyword from `?skill=`, pre-fills search and auto-launches best matching drill. */
  initialSkill?: string;
  /** When true, omits the duplicate standalone header */
  embedded?: boolean;
}

export function PracticeDrillBrowser({ initialDrillId, initialSkill, embedded = false }: PracticeDrillBrowserProps) {
  const router = useRouter();

  const [drills, setDrills] = useState<PracticeDrillItem[]>([]);
  const [stats, setStats] = useState<CandidatePracticeStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(() => initialSkill?.trim() ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(() => initialSkill?.trim() ?? '');
  const [activeDrill, setActiveDrill] = useState<PracticeDrillItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEmptyStats, setShowEmptyStats] = useState(false);
  const [deepLinkConsumed, setDeepLinkConsumed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadWallet() {
      try {
        const res = await apiFetch('/api/billing/wallet');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.wallet) {
            const storedBalance = Number(data.wallet.availableCredits ?? 0);
            setWalletBalance(storedBalance <= 0 ? 0 : storedBalance);
          }
        }
      } catch (err) {
        console.error('[PracticeDrillBrowser] Wallet API error:', err);
        // Do not fabricate a balance on failure — the server enforces the
        // real balance at drill creation (402 INSUFFICIENT_CREDITS).
        setWalletBalance(null);
      }
    }
    void loadWallet();
    return () => {
      isMounted = false;
    };
  }, [reloadToken]);

  // Debounce so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch. The effect body awaits before touching state, so results land in a
  // promise callback rather than cascading a render out of the effect itself.
  // The loading flag is raised by the event handlers below instead.
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      category: selectedCategory,
      difficulty: selectedDifficulty,
      search: debouncedSearch,
    });

    (async () => {
      try {
        const res = await apiFetch(`/api/v1/practice/drills?${params.toString()}`);
        const data = (await res.json().catch(() => null)) as PracticeDrillsResponse | null;

        if (cancelled) return;

        if (!res.ok) {
          setLoadError(data?.error || `Could not load drills (HTTP ${res.status}).`);
          return;
        }
        if (!data?.drills) {
          setLoadError('The drills service returned an unexpected response.');
          return;
        }

        setDrills(data.drills);
        if (data.stats) {
          setStats(data.stats);
          setShowEmptyStats(data.stats.totalDrillsCompleted === 0);
        }
      } catch (err) {
        console.error('Failed to load practice drills:', err);
        if (!cancelled) {
          setLoadError('Could not reach the drills service. Check your connection and retry.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedDifficulty, debouncedSearch, reloadToken]);

  // Deep-link: /candidate/practice?drill=<id> opens that drill once the list
  // arrives. Adjusted during render (React's documented pattern for deriving
  // state from a prop) so this does not cost an extra commit.
  if (!deepLinkConsumed && initialDrillId && drills.length > 0) {
    setDeepLinkConsumed(true);
    const match = drills.find((d) => d.id === initialDrillId);
    if (match) {
      setActiveDrill(match);
    } else {
      console.warn(`Deep-linked drill "${initialDrillId}" is not in the current result set.`);
    }
  }

  // Deep-link: /candidate/practice?skill=<name> — auto-launch the best-matching
  // drill once the filtered list arrives. Prefer a recommended drill (personalized)
  // and fall back to the first search result. If wallet balance is known to be 0,
  // do not auto-open; the existing zero-balance guard blocks click-to-launch.
  if (!deepLinkConsumed && initialSkill && drills.length > 0) {
    setDeepLinkConsumed(true);
    const normalized = initialSkill.trim().toLowerCase();
    const match =
      drills.find((d) => d.recommendedReason !== undefined) ??
      drills.find((d) =>
        (d.coreSkillsTested ?? []).some((s) => s.toLowerCase().includes(normalized) || normalized.includes(s.toLowerCase()))
      ) ??
      drills[0];
    if (match) {
      if (walletBalance !== 0) {
        setActiveDrill(match);
      }
    }
  }

  // Strip the param once it has been acted on, so a refresh does not re-open it.
  useEffect(() => {
    if (deepLinkConsumed) router.replace('/candidate/practice', { scroll: false });
  }, [deepLinkConsumed, router]);

  const recommendedDrill = useMemo(
    () => drills.find((d) => d.recommendedReason !== undefined),
    [drills]
  );

  /** Re-run the fetch with the current filters (used after finalizing). */
  const refresh = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadToken((n) => n + 1);
  }, []);

  const handleCategoryChange = useCallback((category: PracticeCategory) => {
    setIsLoading(true);
    setLoadError(null);
    setSelectedCategory(category);
  }, []);

  const handleDifficultyChange = useCallback((difficulty: string) => {
    setIsLoading(true);
    setLoadError(null);
    setSelectedDifficulty(difficulty);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setIsLoading(true);
    setLoadError(null);
    setSearchQuery(query);
  }, []);

  const handleFinalizeSession = useCallback(
    async (drillId: string, turns: DrillTurnEvaluation[], durationSeconds: number) => {
      try {
        await apiFetch('/api/v1/practice/sessions/finalize', {
          method: 'POST',
          body: JSON.stringify({ drillId, turns, durationSeconds }),
        });
      } catch (err) {
        console.error('Failed to finalize practice session:', err);
      }
      // Best scores and aggregate stats changed; pull fresh numbers.
      refresh();
    },
    [refresh]
  );

  const isZeroBalance = walletBalance !== null && walletBalance <= 0;

  const handleStartDrillWithCheck = (drill: PracticeDrillItem) => {
    if (isZeroBalance) {
      setLoadError('Your wallet balance is 0 credits. You cannot launch a practice drill with zero balance. Please recharge your wallet.');
      return;
    }
    setActiveDrill(drill);
  };

  return (
    <div className={embedded ? 'text-ink font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16' : 'min-h-screen bg-canvas text-ink font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16'}>
      {!embedded && (
        <header className="sticky top-0 z-50 h-16 shrink-0 bg-header border-b border-line px-4 sm:px-8 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BrandLogo href="/candidate/dashboard" />
            <span className="text-ink-faint hidden sm:inline">|</span>
            <span className="hidden sm:inline text-xs font-mono text-accent-cyan">
              Practice Drills &amp; Mock Lab
            </span>
          </div>

          <Link
            href="/candidate/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-2 border border-line text-ink text-xs font-medium transition-colors"
          > <span>Candidate Dashboard</span>
          </Link>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Zero Wallet Balance Alert */}
        {isZeroBalance && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-accent-amber flex items-start gap-3.5 shadow-lg shadow-amber-500/5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent-amber" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-ink">Zero Wallet Balance (0 Credits)</h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-accent-amber border border-amber-500/30">
                  0 Credits
                </span>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Your wallet balance is 0 credits. Candidates cannot start practice drills without available credits. Please recharge your credits to practice.
              </p>
              <div className="pt-1">
                <Link
                  href="/candidate/wallet"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-accent-cyan/90 transition-all shadow-md shadow-accent-cyan/20 cursor-pointer"
                >
                  <span>Recharge Wallet</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {stats && !showEmptyStats && <PracticeHeaderStats stats={stats} />}

        {stats && showEmptyStats && (
          <div className="p-4 rounded-2xl bg-surface border border-line text-sm text-ink-muted">
            You have not completed any drills yet. Finish one and your scores, practice time and
            readiness will appear here.
          </div>
        )}

        <PracticeHeroBanner
          recommendedDrill={recommendedDrill}
          onLaunchWarmup={handleStartDrillWithCheck}
        />

        <PracticeFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleDifficultyChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          totalFilteredCount={drills.length}
        />

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-body font-semibold text-ink text-sm tracking-wide uppercase font-mono">
              Available Practice Drills ({drills.length})
            </h2>
            <span className="text-caption font-mono text-ink-muted text-xs">
              Self-Paced AI Micro-Mocks
            </span>
          </div>

          {loadError && (
            <div className="p-5 rounded-2xl bg-surface border border-accent-amber/30 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">Could not load practice drills</p>
                  <p className="text-xs text-ink-muted">{loadError}</p>
                </div>
              </div>
<button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 border border-line text-ink text-xs font-medium transition-colors cursor-pointer"
              >
                Retry
              </button>

            </div>
          )}

          {isLoading && drills.length === 0 && (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-muted">
              <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
              <span>Loading drills...</span>
            </div>
          )}

          {!loadError && !isLoading && drills.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-surface border border-line space-y-2">
              <p className="text-ink-muted text-sm">
                No practice drills match your current filters.
              </p>
              <p className="text-ink-muted text-xs font-mono">
                Try a different category, difficulty, or search term.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drills.map((drill, idx) => (
              <PracticeDrillCard
                key={`${drill.id}-${idx}`}
                drill={drill}
                onStartDrill={handleStartDrillWithCheck}
              />
            ))}
          </div>
        </section>
      </main>

      {activeDrill && (
        <LiveDrillSessionModal
          key={activeDrill.id}
          drill={activeDrill}
          onClose={() => setActiveDrill(null)}
          onFinalizeSession={handleFinalizeSession}
        />
      )}
    </div>
  );
}
