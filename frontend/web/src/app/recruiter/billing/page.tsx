'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RecruiterHeader } from '@/components/dashboard/RecruiterHeader';
import { apiFetch } from '@/lib/api';
import {
 Wallet,
 CreditCard,
 RefreshCw,
 Plus,
 ShieldCheck,
 Clock,
 Sparkles,
 Zap,
 Gift,
 CheckCircle2,
 AlertCircle,
 HelpCircle,
 X
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
 amountCredits: number;
 amountNanoUsd: number;
 reason: string;
 serviceType: string | null;
 status: string;
 createdAt: string;
}

interface RecruiterPack {
  credits: number;
  inr: number;
  minutes: number;
  badge: string;
  popular: boolean;
}

const DEFAULT_RECRUITER_PACKS: RecruiterPack[] = [
  { credits: 500, inr: 499, minutes: 250, badge: 'Starter Pack', popular: false },
  { credits: 1000, inr: 999, minutes: 500, badge: 'Growth Scale', popular: true },
  { credits: 2500, inr: 1999, minutes: 1250, badge: 'Enterprise Scale', popular: false },
];

export default function RecruiterBillingPage() {
  const [rechargePacks, setRechargePacks] = useState<RecruiterPack[]>(DEFAULT_RECRUITER_PACKS);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recharging, setRecharging] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success'|'error'} | null>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [activeUpiOrder, setActiveUpiOrder] = useState<MayankUpiOrderResponse | null>(null);

  // Dynamically load packages set by Admin from Super Admin Panel
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicPacks() {
      try {
        const res = await fetch('/api/packages');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.packages)) {
          const recPkgs = data.packages.filter(
            (p: any) => (p.target_audience === 'organization' || p.target_audience === 'both') && Number(p.price || 0) > 0
          );
          if (recPkgs.length > 0 && isMounted) {
            const mapped: RecruiterPack[] = recPkgs.map((pkg: any) => {
              const price = Number(pkg.price ?? pkg.monthlyPrice ?? 500);
              const cr = Number(pkg.credits || (pkg.included_interviews ? pkg.included_interviews * 25 : price));
              return {
                credits: cr,
                inr: price,
                minutes: Number(pkg.interview_duration_limit_minutes ? (cr / 2) : 250),
                badge: pkg.name || 'Recruiter Pack',
                popular: Boolean(pkg.popular || pkg.tier === 'growth'),
              };
            });
            setRechargePacks(mapped);
            if (mapped.length > 0) {
              const popularOrMid = mapped.find((m) => m.popular) || mapped[Math.floor(mapped.length / 2)];
              setSelectedPack(popularOrMid.credits);
            }
          }
        }
      } catch (err) {
        console.warn('[RecruiterBilling] Using fallback packs:', err);
      }
    }
    void loadDynamicPacks();
    return () => {
      isMounted = false;
    };
  }, []);

 const loadWallet = useCallback(async () => {
 try {
 setLoading(true);
 const txRes = await apiFetch('/api/billing/wallet/transactions?limit=50');
 if (txRes.ok) {
 const txData = (await txRes.json()) as { success: boolean; transactions: WalletTransaction[] };
 if (txData.success && Array.isArray(txData.transactions)) {
 setTransactions(txData.transactions);
 }
 }

 const res = await apiFetch('/api/billing/wallet');
 if (res.ok) {
 const data = (await res.json()) as { success: boolean; wallet: WalletData };
 if (data.success && data.wallet) {
 const rawWallet = data.wallet;
 const realAvailable = Math.max(0, rawWallet.availableCredits ?? 0);

 setWallet({
 ...rawWallet,
 availableCredits: realAvailable,
 promotionalCredits: rawWallet.promotionalCredits ?? 0,
 paidCredits: rawWallet.paidCredits ?? 0,
 ratePerMinuteCredits: rawWallet.ratePerMinuteCredits || 0.5,
 demoQuota: rawWallet.demoQuota || {
 remaining: 0,
 totalAllowed: 0,
 completed: 0,
 maxDurationSeconds: 600,
 },
 });
 }
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

 const handleRecharge = async () => {
 const amount = customAmount ? parseFloat(customAmount) : selectedPack;
 if (!amount || amount < 1) {
 setMessage({ text: 'Please enter a valid recharge amount (minimum ₹1).', type: 'error'});
 return;
 }

 setRecharging(true);
 setMessage(null);

 try {
 const orderRes = await createMayankUpiOrder({
 amountCredits: amount,
 amountInr: amount,
 });
 setActiveUpiOrder(orderRes);
 setRechargeModalOpen(false);
 setUpiModalOpen(true);
 } catch (err) {
 setMessage({
 text: err instanceof Error ? err.message : 'Failed to launch UPI Gateway',
 type: 'error',
 });
 } finally {
 setRecharging(false);
 }
 };


   return (
    <div className="min-h-screen bg-inset text-ink font-sans selection:bg-blue-600 selection:text-white">
      <RecruiterHeader />

      <main className="max-w-7xl xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8 space-y-7">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/30 shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink">Organization Wallet & Billing</h1>
                <p className="text-xs sm:text-sm text-ink-faint mt-0.5">
                  Prepaid credit accounting convention: <strong className="text-ink-muted">₹1.00 = 1 Credit</strong>. Transparent, duration-based billing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void loadWallet()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-line bg-surface hover:bg-inset text-ink-muted shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-blue' : 'text-ink-faint'}`} />
              Refresh
            </button>
            <button
              onClick={() => setRechargeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Credits
            </button>
          </div>
        </div>

        {/* Notifications & Banners */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between shadow-xs ${
              message.type === 'success'
                ? 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-accent-emerald shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-accent-rose shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75 text-ink-muted hover:text-ink-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Free Demo Trial Notice if applicable */}
        {wallet?.demoQuota && wallet.demoQuota.remaining > 0 && (
          <div className="p-4 rounded-xl border border-accent-blue/30 bg-accent-blue/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-blue/15 text-accent-blue shrink-0">
                <Gift className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-xs sm:text-sm text-accent-blue block">
                  Complimentary AI Screening Trial Active
                </span>
                <p className="text-xs text-accent-blue mt-0.5">
                  Your organization has <strong className="font-bold text-accent-blue">{wallet.demoQuota.remaining} free screening round(s)</strong> remaining (up to 10 minutes each) with zero wallet deduction.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-md text-xs font-bold bg-surface text-accent-blue border border-accent-blue/30 shadow-2xs whitespace-nowrap">
              {wallet.demoQuota.remaining} of {wallet.demoQuota.totalAllowed} Left
            </span>
          </div>
        )}

        {/* Balance Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Available Balance */}
          <div className="p-5 rounded-xl border border-line bg-surface shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span className="font-medium uppercase tracking-wider text-[11px]">Available Balance</span>
                <span className="font-mono text-[10px] uppercase font-bold text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                  ₹{wallet?.availableCredits?.toFixed(2) ?? '0.00'}
                </span>
                <span className="text-xs font-semibold text-ink-faint">
                  ({wallet?.availableCredits?.toFixed(0) ?? 0} Credits)
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-line text-xs text-ink-faint flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent-blue shrink-0" />
              <span>
                ≈ <strong className="text-ink-2 font-semibold">{Math.floor((wallet?.availableCredits ?? 0) / (wallet?.ratePerMinuteCredits || 0.5))} mins</strong> screening time
              </span>
            </div>
          </div>

          {/* Card 2: Reserved Holds */}
          <div className="p-5 rounded-xl border border-line bg-surface shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span className="font-medium uppercase tracking-wider text-[11px]">Active Reserved Hold</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                  {wallet?.reservedCredits?.toFixed(2) ?? '0.00'}
                </span>
                <span className="text-xs font-semibold text-ink-faint">Credits</span>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-line text-xs text-ink-faint leading-relaxed">
              Atomic preflight hold during live interviews. Auto-releases on finish.
            </p>
          </div>

          {/* Card 3: Consumed Credits */}
          <div className="p-5 rounded-xl border border-line bg-surface shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span className="font-medium uppercase tracking-wider text-[11px]">Total Consumed</span>
                <Zap className="h-4 w-4 text-accent-blue" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                  ₹{wallet?.consumedCredits?.toFixed(2) ?? '0.00'}
                </span>
                <span className="text-xs font-semibold text-ink-faint">Credits</span>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-line text-xs text-ink-faint leading-relaxed">
              Settled screening minutes across all completed candidate interviews.
            </p>
          </div>

          {/* Card 4: Active Rate Card */}
          <div className="p-5 rounded-xl border border-line bg-surface shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-ink-faint">
                <span className="font-medium uppercase tracking-wider text-[11px]">Active Rate Card</span>
                <span className="font-mono text-[10px] uppercase font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/30 px-2 py-0.5 rounded-md">
                  Standard
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-accent-blue">
                  {(wallet?.ratePerMinuteCredits ?? 0.5).toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-ink-faint">Credits / min</span>
              </div>
            </div>
            <p className="mt-4 pt-3 border-t border-line text-xs text-ink-faint leading-relaxed">
              ₹0.50 per minute (1 Rupee = 2 Minutes) with server ceiling-to-whole-minute rounding.
            </p>
          </div>
        </div>

        {/* Clean Process Strip: How Duration-Based Billing Works */}
        <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
          <div className="border-b border-line pb-3 mb-5">
            <h2 className="text-base font-bold text-ink">How Duration-Based Billing Operates</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              Transparent, double-entry ledger calculation governed by server-authoritative timestamps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
            <div className="pt-4 md:pt-0 md:pr-6 space-y-1.5">
              <span className="text-xs font-mono font-bold text-accent-blue block">01 · Preflight Hold</span>
              <h3 className="text-xs font-bold text-ink-2">Atomic Reservation</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                When live charging is active, the server reserves a temporary 10 Credit hold (5 mins @ 2 Credits/min) to prevent mid-answer disconnection.
              </p>
            </div>

            <div className="pt-4 md:pt-0 md:px-6 space-y-1.5">
              <span className="text-xs font-mono font-bold text-accent-blue block">02 · Authoritative Meter</span>
              <h3 className="text-xs font-bold text-ink-2">Precision Server Timing</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Duration is measured strictly by WebSocket server connection intervals with industry-standard ceiling-to-minute rounding (e.g. 18m 15s = 19 billable mins).
              </p>
            </div>

            <div className="pt-4 md:pt-0 md:pl-6 space-y-1.5">
              <span className="text-xs font-mono font-bold text-accent-blue block">03 · Instant Settlement</span>
              <h3 className="text-xs font-bold text-ink-2">Immediate Unused Refund</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Upon interview completion, the exact consumed duration is deducted and any excess reserved hold is released back to your available balance in real time.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Transaction History</h2>
              <p className="text-xs text-ink-faint mt-0.5">Immutable Double-Entry Accounting Ledger</p>
            </div>
            <span className="text-[11px] font-mono text-ink-muted">Currency: INR (₹)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs text-left">
              <thead>
                <tr className="bg-inset border-b border-line text-ink-muted font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Credits (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-faint text-xs">
                      No billing transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-inset/60 transition">
                      <td className="py-3.5 px-4 text-ink-muted font-medium whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        {tx.txRef}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${
                            tx.entryType === 'recharge_paid'
                              ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30'
                              : tx.entryType === 'service_debit'
                              ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30'
                              : tx.entryType === 'service_hold'
                              ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30'
                              : 'bg-surface-2 text-ink-muted border border-line'
                          }`}
                        >
                          {tx.entryType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted max-w-xs truncate">
                        {tx.reason || 'General ledger mutation'}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          tx.amountCredits >= 0 ? 'text-accent-emerald' : 'text-accent-rose'
                        }`}
                      >
                        {tx.amountCredits >= 0 ? `+${tx.amountCredits.toFixed(0)}` : `${tx.amountCredits.toFixed(0)}`} cr
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Recharge Modal */}
      {rechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Add Wallet Credits</h3>
                  <p className="text-[11px] text-ink-faint">Official UPI Instant Payment Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setRechargeModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-muted hover:text-ink-muted transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-semibold text-ink-muted block">
                Select Credit Package (₹1.00 = 1 Credit)
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                {rechargePacks.map((pack) => (
                  <div
                    key={pack.credits}
                    onClick={() => {
                      setSelectedPack(pack.credits);
                      setCustomAmount('');
                    }}
                    className={`cursor-pointer p-4 rounded-xl border-0 text-center transition-all ${
                      selectedPack === pack.credits && !customAmount
                        ? 'bg-accent-blue/10 ring-2 ring-accent-blue/30 shadow-xs'
                        : 'bg-surface hover:bg-surface-2'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-accent-blue">
                      {pack.badge}
                    </span>
                    <span className="text-xl font-extrabold text-ink block mt-1">₹{pack.inr}</span>
                    <span className="text-xs text-ink-muted font-medium block mt-0.5">
                      {pack.credits} Credits
                    </span>
                    <span className="text-[11px] text-ink-muted block mt-2">
                      ~{pack.minutes} mins screening
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink-muted">
                    Or Enter Any Custom Amount (Minimum ₹1)
                  </label>
                  <span className="text-[11px] font-bold text-accent-blue">₹1 = 1 Credit</span>
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
                    className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-line bg-inset/50 text-sm font-semibold text-ink focus:outline-none focus:border-blue-600 focus:bg-surface focus:ring-2 focus:ring-blue-600/15 transition"
                  />
                </div>
                {/* Quick select chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-ink-muted">Quick select:</span>
                  {[1, 10, 50, 100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAmount(String(amt))}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        customAmount === String(amt)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-surface border-line text-ink-muted hover:border-blue-400'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-accent-blue/10 text-xs">
                <div className="flex items-center justify-between font-bold text-ink">
                  <span>Total Payable:</span>
                  <span className="text-base text-accent-blue">
                    ₹{customAmount ? parseFloat(customAmount) || 0 : selectedPack}.00
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-blue-800 leading-relaxed">
                  Secured by <strong>Progeni Atlas UPI</strong> (Google Pay, PhonePe, Paytm, BHIM, QR). Instant credit top-up (₹1 = 1 Credit).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-line pt-4">
              <button
                type="button"
                disabled={recharging}
                onClick={() => setRechargeModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-line text-ink-muted hover:bg-inset transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recharging}
                onClick={() => void handleRecharge()}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {recharging ? 'Creating UPI Order...' : `Pay ₹${customAmount ? parseFloat(customAmount) || 0 : selectedPack} via UPI`}
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