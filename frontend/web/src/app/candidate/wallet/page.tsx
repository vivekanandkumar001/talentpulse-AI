'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { apiJson } from '@/lib/api';
import {
  Wallet,
  CreditCard,
  RefreshCw,
  Plus,
  ShieldCheck,
  Clock,
  Zap,
  Gift,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Building2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Search,
  ExternalLink,
  Receipt,
  FileText,
  Video,
  Info
} from 'lucide-react';
import { createMayankUpiOrder, MayankUpiOrderResponse } from '@/lib/mayank_upi';
import { MayankUpiModal } from '@/components/billing/MayankUpiModal';

interface WalletData {
  accountId: string;
  accountName: string;
  accountType: string;
  orgId: string | null;
  userId: string | null;
  currency: string;
  ratePerMinuteCredits: number;
  baseFeeCredits: number;
  availableCredits: number;
  paidCredits: number;
  promotionalCredits: number;
  consumedCredits: number;
  reservedCredits: number;
  lowBalanceThresholdCredits: number;
  isLowBalance: boolean;
  chargingEnabled: boolean;
  demoQuota: {
    totalAllowed: number;
    completed: number;
    remaining: number;
    maxDurationSeconds: number;
  };
}

interface WalletTransaction {
  id: string;
  txRef: string;
  entryType: string;
  category?: 'IN' | 'OUT' | 'DEMO';
  title?: string;
  reason?: string;
  amountCredits: number;
  amountInr?: number;
  balanceAfter?: number;
  status: string;
  createdAt: string;
  sessionId?: string;
  roleTitle?: string;
  interviewType?: string;
  durationMinutes?: number;
  ratePerMinute?: number;
  paymentId?: string;
  orderId?: string;
}

interface TransactionSummary {
  availableCredits: number;
  totalCredited: number;
  totalDebited: number;
  count: number;
}

interface CandidatePack {
  packName: string;
  credits: number;
  inr: number;
  minutes: number;
  badge: string;
  popular?: boolean;
}

const DEFAULT_CANDIDATE_PACKS: CandidatePack[] = [
  { packName: 'pack_1', credits: 1, inr: 1, minutes: 2, badge: 'Trial Pack' },
  { packName: 'pack_49', credits: 50, inr: 49, minutes: 100, badge: 'Warm-up Pack' },
  { packName: 'pack_99', credits: 100, inr: 99, minutes: 200, badge: 'Placement Ready', popular: true },
  { packName: 'pack_199', credits: 200, inr: 199, minutes: 400, badge: 'Pro Mastery' },
];

export default function CandidateWalletPage() {
  const [candidatePacks, setCandidatePacks] = useState<CandidatePack[]>(DEFAULT_CANDIDATE_PACKS);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Mayank Singh UPI Gateway Modal State
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [activeUpiOrder, setActiveUpiOrder] = useState<MayankUpiOrderResponse | null>(null);

  // Paytm-style filter and search state
  const [activeTab, setActiveTab] = useState<'ALL' | 'OUT' | 'IN' | 'DEMO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  // Load published packages dynamically from Admin Panel API
  useEffect(() => {
    let isMounted = true;
    async function loadPacks() {
      try {
        const res = await fetch('/api/packages');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.packages)) {
          const cand = data.packages.filter(
            (p: any) => (p.target_audience === 'individual' || p.target_audience === 'both') && Number(p.price || 0) > 0
          );
          if (cand.length > 0 && isMounted) {
            const mapped: CandidatePack[] = cand.map((pkg: any) => {
              const price = Number(pkg.price ?? pkg.monthlyPrice ?? 99);
              const cr = Number(pkg.credits || (pkg.included_interviews ? pkg.included_interviews * 20 : price));
              return {
                packName: pkg.id || pkg.package_id || `pack_${price}`,
                credits: cr,
                inr: price,
                minutes: Number(pkg.interview_duration_limit_minutes || Math.round(cr * 2)),
                badge: pkg.name || 'Practice Pack',
                popular: Boolean(pkg.popular || pkg.tier === 'pro'),
              };
            });
            setCandidatePacks(mapped);
            if (mapped.length > 0) {
              const popularOrMid = mapped.find((m) => m.popular) || mapped[Math.floor(mapped.length / 2)];
              setSelectedPack(popularOrMid.credits);
            }
          }
        }
      } catch (e) {
        console.warn('[CandidateWallet] Using fallback candidate packs:', e);
      }
    }
    void loadPacks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Enterprise pattern: server is the source of truth for money.
  // The transactions endpoint computes the canonical ledger (running balance,
  // credited/debited totals, non-negative balances) — we never recompute money
  // client-side. Wallet doc supplies quota/rate metadata. Both calls go through
  // the typed apiJson client (auth + 401 refresh + in-flight dedup + safe parse),
  // fired in parallel, and any failure degrades to an honest empty/error state.
  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);

      const [walletRes, txRes] = await Promise.all([
        apiJson<{ success: boolean; wallet?: WalletData }>('/api/billing/wallet', {}, { skipCache: true }),
        apiJson<{
          success: boolean;
          transactions?: WalletTransaction[];
          summary?: TransactionSummary;
        }>('/api/billing/wallet/transactions?limit=50', {}, { skipCache: true }),
      ]);

      const txList = Array.isArray(txRes?.transactions) ? txRes.transactions : [];
      setTransactions(txList);

      const serverSummary = txRes?.summary ?? null;
      const rawWallet = walletRes?.wallet ?? null;

      const num = (v: unknown): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      if (rawWallet) {
        setWallet({
          ...rawWallet,
          availableCredits: Math.max(0, num(rawWallet.availableCredits ?? serverSummary?.availableCredits)),
          paidCredits: num(rawWallet.paidCredits),
          promotionalCredits: num(rawWallet.promotionalCredits),
          consumedCredits: Math.max(0, num(rawWallet.consumedCredits ?? serverSummary?.totalDebited)),
          ratePerMinuteCredits: rawWallet.ratePerMinuteCredits || 0.5,
          demoQuota: rawWallet.demoQuota || {
            remaining: 0,
            totalAllowed: 0,
            completed: 0,
            maxDurationSeconds: 600,
          },
        });
      }

      setSummary({
        availableCredits: Math.max(
          0,
          num(serverSummary?.availableCredits ?? rawWallet?.availableCredits)
        ),
        totalCredited: Math.max(
          0,
          num(serverSummary?.totalCredited ?? ((rawWallet?.paidCredits ?? 0) + (rawWallet?.promotionalCredits ?? 0)))
        ),
        totalDebited: Math.max(
          0,
          num(serverSummary?.totalDebited ?? rawWallet?.consumedCredits)
        ),
        count: serverSummary?.count ?? txList.length,
      });

      if (!walletRes && !txRes) {
        setMessage({
          text: 'Failed to load wallet data. Please check your connection and try again.',
          type: 'error',
        });
      }
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : 'Failed to load wallet data.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const selectedObj = useMemo(() => {
    return candidatePacks.find((p) => p.credits === selectedPack) || candidatePacks[0];
  }, [candidatePacks, selectedPack]);

  const payableInr = useMemo(() => {
    if (customAmount && customAmount.trim().length > 0) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return selectedObj?.inr ?? 99;
  }, [customAmount, selectedObj]);

  const payableCredits = useMemo(() => {
    if (customAmount && customAmount.trim().length > 0) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return selectedObj?.credits ?? 100;
  }, [customAmount, selectedObj]);

  const handleRecharge = async () => {
    if (!payableCredits || payableCredits < 1 || !payableInr || payableInr < 1) {
      setMessage({ text: 'Please enter a valid amount (minimum ₹1).', type: 'error' });
      return;
    }

    setRecharging(true);
    setMessage(null);

    try {
      const orderRes = await createMayankUpiOrder({
        amountCredits: payableCredits,
        amountInr: payableInr,
      });
      setActiveUpiOrder(orderRes);
      setRechargeModalOpen(false);
      setUpiModalOpen(true);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to initialize UPI Gateway order.',
        type: 'error',
      });
    } finally {
      setRecharging(false);
    }
  };

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Tab filter
      if (activeTab === 'OUT' && (tx.category !== 'OUT' && tx.amountCredits >= 0)) return false;
      if (activeTab === 'IN' && (tx.category !== 'IN' && tx.amountCredits <= 0)) return false;
      if (activeTab === 'DEMO' && (tx.category !== 'DEMO' && tx.entryType !== 'free_demo')) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (tx.title || '').toLowerCase().includes(q);
        const reasonMatch = (tx.reason || '').toLowerCase().includes(q);
        const refMatch = (tx.txRef || '').toLowerCase().includes(q);
        const roleMatch = (tx.roleTitle || '').toLowerCase().includes(q);
        const sessionMatch = (tx.sessionId || '').toLowerCase().includes(q);
        if (!titleMatch && !reasonMatch && !refMatch && !roleMatch && !sessionMatch) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  // Tab counts
  const counts = useMemo(() => {
    const all = transactions.length;
    const debits = transactions.filter((t) => t.category === 'OUT' || t.amountCredits < 0).length;
    const credits = transactions.filter((t) => t.category === 'IN' || t.amountCredits > 0).length;
    const demos = transactions.filter((t) => t.category === 'DEMO' || t.entryType === 'free_demo').length;
    return { all, debits, credits, demos };
  }, [transactions]);

  // Overall sums
  const availableBal = Math.max(0, wallet?.availableCredits ?? summary?.availableCredits ?? 0);
  const totalCredited = Math.max(0, summary?.totalCredited ?? 0);
  const totalDebited = Math.max(0, wallet?.consumedCredits ?? summary?.totalDebited ?? 0);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 w-full max-w-7xl xl:max-w-screen-2xl mx-auto p-4 sm:px-6 lg:px-8 2xl:px-10 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-accent-cyan">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">Interview Credits & Passbook</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                    Live Balance
                  </span>
                </div>
                <p className="text-sm text-ink-muted">
                  Paytm-style transparent credit statement. Track exact interview deductions, practice durations, and recharge top-ups.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadWallet()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-line bg-surface hover:bg-surface-2 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setRechargeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Credits
            </button>
          </div>
        </div>

        {/* Notifications & Banners */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-accent-emerald'
                : 'bg-rose-500/10 border-rose-500/30 text-accent-rose'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Paytm-Style Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Available Balance */}
          <div className="p-6 rounded-xl border border-line bg-surface shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold uppercase tracking-wider">Available Balance</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-accent-cyan">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-ink">
                ₹{availableBal.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-accent-cyan">
                ({availableBal.toFixed(0)} Credits)
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-ink-muted">₹1.00 = 1 Credit</span>
              <button
                onClick={() => setRechargeModalOpen(true)}
                className="text-accent-cyan hover:underline font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                + Top Up
              </button>
            </div>
          </div>

          {/* Card 2: Total Credits Added / Recharged */}
          <div className="p-6 rounded-xl border border-line bg-surface shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold uppercase tracking-wider">Total Added (Recharges)</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-accent-emerald">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-accent-emerald">
                +₹{totalCredited.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">credited</span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Total credited via verified online UPI recharges.
            </p>
          </div>

          {/* Card 3: Total Spent on Practice & Technical Interviews */}
          <div className="p-6 rounded-xl border border-line bg-surface shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold uppercase tracking-wider">Spent on Interviews</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-accent-rose">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-accent-rose">
                -₹{totalDebited.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">({totalDebited.toFixed(0)} Credits)</span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Deducted across completed practice & technical screenings.
            </p>
          </div>

          {/* Card 4: Free Demo Quota */}
          <div className="p-6 rounded-xl border border-line bg-surface shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold uppercase tracking-wider">Free Demo Quota</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-accent-indigo">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-ink">
                {wallet?.demoQuota?.remaining ?? 2}
              </span>
              <span className="text-sm font-semibold text-ink-muted">
                of {wallet?.demoQuota?.totalAllowed ?? 3} Free Demos Left
              </span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Rate: ₹2.00 / min (2 cr/min) applied after free demo rounds.
            </p>
          </div>
        </div>

        {/* Paytm-Style Passbook & History Section */}
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5 shadow-sm">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent-cyan" />
                <h2 className="text-lg font-black text-ink">Paytm Passbook & Credit History</h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Every interview practice debit and recharge credit with closing balances.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
              <input
                type="text"
                placeholder="Search by role, session ID, or Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-canvas border border-line text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Paytm-Style Segmented Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-canvas text-ink-muted hover:text-ink border border-line'
              }`}
            >
              <span>All Transactions</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'ALL' ? 'bg-surface/20 text-white' : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('OUT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'OUT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-canvas text-ink-muted hover:text-ink border border-line'
              }`}
            >
              <span>Spent on Interviews (-)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'OUT' ? 'bg-surface/20 text-white' : 'bg-rose-500/10 text-accent-rose'
                }`}
              >
                {counts.debits}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('IN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'IN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-canvas text-ink-muted hover:text-ink border border-line'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-accent-emerald" />
              <span>Added / Recharges (+)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'IN' ? 'bg-surface/20 text-white' : 'bg-emerald-500/10 text-accent-emerald'
                }`}
              >
                {counts.credits}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DEMO')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'DEMO'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-canvas text-ink-muted hover:text-ink border border-line'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-accent-indigo" />
              <span>Free Demos</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'DEMO' ? 'bg-surface/20 text-white' : 'bg-indigo-500/10 text-accent-indigo'
                }`}
              >
                {counts.demos}
              </span>
            </button>
          </div>

          {/* Transactions List (Paytm Passbook Style) */}
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-canvas">
                <Receipt className="h-8 w-8 text-ink-muted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-ink">No transactions found</p>
                <p className="text-xs text-ink-muted mt-1">
                  {searchQuery
                    ? `No transactions matching "${searchQuery}"`
                    : 'Your wallet transaction statement is clean.'}
                </p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isCredit = tx.category === 'IN' || tx.amountCredits > 0;
                const isDemo = tx.category === 'DEMO' || tx.entryType === 'free_demo' || tx.amountCredits === 0;
                const isDebit = !isCredit && !isDemo;

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="p-4 rounded-2xl bg-canvas hover:bg-surface-2 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left: Direction Icon + Title + Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`p-3 rounded-2xl shrink-0 mt-0.5 transition ${
                          isCredit
                            ? 'bg-emerald-500/10 text-accent-emerald group-hover:scale-105'
                            : isDebit
                            ? 'bg-rose-500/10 text-accent-rose group-hover:scale-105'
                            : 'bg-indigo-500/10 text-accent-indigo group-hover:scale-105'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : isDebit ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-ink truncate group-hover:text-accent-cyan transition">
                            {tx.title || (isCredit ? 'Money Added to Wallet' : 'Practice Interview Settlement')}
                          </h4>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCredit
                                ? 'bg-emerald-500/10 text-accent-emerald'
                                : isDebit
                                ? 'bg-rose-500/10 text-accent-rose'
                                : 'bg-indigo-500/10 text-accent-indigo'
                            }`}
                          >
                            {isCredit ? 'Credit In' : isDebit ? 'Debit Out' : 'Free Demo'}
                          </span>
                        </div>

                        {/* Subtext description / reason */}
                        <p className="text-xs text-ink-muted">
                          {tx.reason || (isCredit ? 'Recharge credit' : 'AI Technical Screening')}
                        </p>

                        {/* Metadata chips */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-muted pt-0.5">
                          <span className="font-mono">
                            {new Date(tx.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-line/60 text-[10px]">
                            {tx.txRef}
                          </span>
                          {tx.sessionId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-accent-cyan">
                                Session: {tx.sessionId.slice(0, 8)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Paytm Closing Balance */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-line/60 pt-2 md:pt-0 shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-lg font-black font-mono tracking-tight ${
                            isCredit
                              ? 'text-accent-emerald'
                              : isDebit
                              ? 'text-accent-rose'
                              : 'text-accent-indigo'
                          }`}
                        >
                          {isCredit
                            ? `+ ₹${Math.abs(tx.amountCredits).toFixed(2)}`
                            : isDebit
                            ? `- ₹${Math.abs(tx.amountCredits).toFixed(2)}`
                            : `₹0.00`}
                        </span>
                        <span className="text-[11px] font-semibold text-ink-muted">
                          {isCredit
                            ? `(+${Math.abs(tx.amountCredits).toFixed(0)} cr)`
                            : isDebit
                            ? `(-${Math.abs(tx.amountCredits).toFixed(0)} cr)`
                            : '(Free Demo)'}
                        </span>
                      </div>

                      {/* Signature Paytm Passbook closing balance */}
                      {typeof tx.balanceAfter === 'number' && (
                        <div className="mt-1 text-[11px] font-medium text-ink-muted">
                          Closing Balance:{' '}
                          <strong className="text-ink font-mono font-bold">
                            ₹{tx.balanceAfter.toFixed(2)}
                          </strong>{' '}
                          <span className="text-[10px]">({tx.balanceAfter.toFixed(0)} cr)</span>
                        </div>
                      )}

                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-accent-emerald">
                        <CheckCircle2 className="h-3 w-3" />
                        {tx.status || 'COMPLETED'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Paytm-Style Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-lg font-bold text-ink">Transaction Details</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg hover:bg-surface-2 text-ink-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Verified Green Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-center space-y-1">
              <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-accent-emerald mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-xs font-bold text-accent-emerald tracking-wide uppercase">
                Payment Settled & Verified
              </div>
              <div className="text-2xl font-black font-mono text-ink">
                {selectedTx.amountCredits >= 0
                  ? `+ ₹${selectedTx.amountCredits.toFixed(2)}`
                  : `- ₹${Math.abs(selectedTx.amountCredits).toFixed(2)}`}
              </div>
              <div className="text-xs text-ink-muted">
                {selectedTx.amountCredits >= 0
                  ? `Credited to your primary candidate wallet`
                  : `Deducted for AI technical screening session`}
              </div>
            </div>

            {/* Statement Fields Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-line/60">
                <span className="text-ink-muted">Transaction Reference</span>
                <span className="font-mono font-bold text-ink">{selectedTx.txRef}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/60">
                <span className="text-ink-muted">Title / Purpose</span>
                <span className="font-semibold text-ink text-right max-w-xs">{selectedTx.title}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-line/60">
                <span className="text-ink-muted">Detailed Reason</span>
                <span className="text-ink-muted text-right max-w-xs">{selectedTx.reason}</span>
              </div>

              {selectedTx.durationMinutes && (
                <div className="flex justify-between py-1.5 border-b border-line/60">
                  <span className="text-ink-muted">Interview Duration</span>
                  <span className="font-bold text-ink">{selectedTx.durationMinutes} minutes</span>
                </div>
              )}

              {selectedTx.ratePerMinute !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-line/60">
                  <span className="text-ink-muted">Billing Rate</span>
                  <span className="font-mono text-ink">
                    {selectedTx.ratePerMinute > 0
                      ? `₹${selectedTx.ratePerMinute.toFixed(2)} / min (${selectedTx.ratePerMinute} cr/min)`
                      : 'Free Demo (₹0.00)'}
                  </span>
                </div>
              )}

              {selectedTx.sessionId && (
                <div className="flex justify-between py-1.5 border-b border-line/60">
                  <span className="text-ink-muted">Interview Session ID</span>
                  <span className="font-mono text-accent-cyan">{selectedTx.sessionId}</span>
                </div>
              )}

              {selectedTx.balanceAfter !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-line/60">
                  <span className="text-ink-muted">Closing Wallet Balance</span>
                  <span className="font-mono font-black text-ink">
                    ₹{selectedTx.balanceAfter.toFixed(2)} ({selectedTx.balanceAfter.toFixed(0)} Credits)
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-line/60">
                <span className="text-ink-muted">Date & Time</span>
                <span className="font-mono text-ink">
                  {new Date(selectedTx.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-ink-muted">Settlement Engine</span>
                <span className="font-semibold text-accent-emerald flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Progeni Atlas Ledger
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              {selectedTx.sessionId ? (
                <Link
                  href={`/candidate/interview/${selectedTx.sessionId}/report`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-accent-cyan border border-cyan-500/30 hover:bg-cyan-500/10 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Interview Scorecard
                </Link>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-lg font-bold text-ink">Add Interview Credits</h3>
              </div>
              <button
                onClick={() => setRechargeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-2 text-ink-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold text-ink-muted block">
                Select Practice Credit Pack
              </label>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {candidatePacks.map((pack) => (
                  <div
                    key={pack.credits}
                    onClick={() => {
                      setSelectedPack(pack.credits);
                      setCustomAmount('');
                    }}
                    className={`cursor-pointer p-3 sm:p-4 rounded-2xl text-center transition ${
                      selectedPack === pack.credits && !customAmount
                        ? 'bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500'
                        : 'bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase text-accent-cyan truncate">
                      {pack.badge}
                    </span>
                    <span className="text-lg sm:text-xl font-black block mt-1 text-ink">₹{pack.inr}</span>
                    <span className="text-xs text-ink-muted block mt-0.5">
                      {pack.credits} Credits
                    </span>
                    <span className="text-[10px] text-ink-faint block mt-1.5">
                      ~{pack.minutes} mins practice
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink-muted">
                    Or Enter Any Custom Amount (Minimum ₹1)
                  </label>
                  <span className="text-[11px] font-bold text-accent-cyan">₹1 = 1 Credit</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter any amount (even ₹1)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-line bg-inset text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                {/* Quick select chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-ink-faint">Quick select:</span>
                  {[1, 5, 10, 49, 99, 199, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmount(String(amt))}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        customAmount === String(amt)
                          ? 'bg-cyan-500 text-white border-cyan-500 shadow-xs'
                          : 'bg-surface border-line text-ink hover:border-cyan-500/50'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', name: 'UPI / QR', icon: Smartphone },
                    { id: 'card', name: 'Cards', icon: CreditCard },
                    { id: 'netbanking', name: 'Net Banking', icon: Building2 },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as 'upi' | 'card' | 'netbanking')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === m.id
                            ? 'border-cyan-500 bg-cyan-500/10 text-accent-cyan shadow-sm ring-1 ring-cyan-500'
                            : 'border-line bg-surface text-ink-muted hover:border-cyan-500/30'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 text-xs text-ink">
                <div className="flex items-center justify-between font-bold">
                  <span>Total Payable:</span>
                  <span className="text-base text-accent-cyan">
                    ₹{payableInr.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">
                  You will receive <strong>{payableCredits} Credits</strong> (~{customAmount ? Math.round(payableCredits * 2) : (selectedObj?.minutes ?? Math.round(payableCredits * 2))} mins practice). Secured by <strong>Progeni Atlas UPI</strong> (Google Pay, PhonePe, Paytm, BHIM, QR). Instant credit addition.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                disabled={recharging}
                onClick={() => setRechargeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-line hover:bg-surface-2 transition text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging || payableInr <= 0}
                onClick={() => void handleRecharge()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-on-brand bg-accent-blue hover:bg-accent-blue-hover shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {recharging ? 'Creating UPI Order...' : `Pay ₹${payableInr.toFixed(0)} via UPI Gateway`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mayank Singh Multi-Merchant UPI Gateway Modal */}
      <MayankUpiModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        orderData={activeUpiOrder}
        onSuccess={async (data) => {
          setMessage({ text: data.message, type: 'success' });
          setCustomAmount('');
          await loadWallet();
        }}
      />
    </div>
  );
}