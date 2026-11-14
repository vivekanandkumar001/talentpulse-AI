import {
 AlertTriangle,
 Clock,
 CreditCard,
 FileText,
 Gift,
 Layers,
 ShieldCheck,
 Sparkles,
 TrendingUp,
 Wallet,
 Zap,
} from 'lucide-react';
import {
 Card,
 CardHeader,
 EmptyState,
 Pill,
 StatCard,
 StatSkeleton,
} from '@/components/super-admin/ui';
import {
 formatCurrencyUsd,
 type BillingOverview,
 type DailyBillingTrend,
 type DemoAnalyticsSummary,
 type ServiceUsageMetric,
} from '@/lib/super-admin';

interface OverviewTabProps {
 loadingOverview: boolean;
 overview: BillingOverview | null;
 demoAnalytics: DemoAnalyticsSummary | null;
 servicesBreakdown: Record<string, ServiceUsageMetric>;
 trend: DailyBillingTrend[];
}

export function OverviewTab({
 loadingOverview,
 overview,
 demoAnalytics,
 servicesBreakdown,
 trend,
}: OverviewTabProps) {
 return (
 <div className="space-y-6">
 {/* Top KPI Cards */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {loadingOverview && !overview ? (
 <>
 <StatSkeleton />
 <StatSkeleton />
 <StatSkeleton />
 <StatSkeleton />
 </>
 ) : (
 <>
 <StatCard
 label="Total Customer Revenue (Paid)"
 value={formatCurrencyUsd(overview?.totalPaidRevenueUsd)}
 hint="Real customer capital deposited into platform wallets"
 icon={CreditCard}
 tone="emerald"
 />
 <StatCard
 label="Promotional Grants"
 value={formatCurrencyUsd(overview?.totalPromotionalCreditsUsd)}
 hint="Admin complimentary trial allowances"
 icon={Gift}
 tone="violet"
 />
 <StatCard
 label="Customer Billable Consumption"
 value={formatCurrencyUsd(overview?.totalCustomerConsumptionUsd)}
 hint="Service units consumed based on active rate cards"
 icon={Zap}
 tone="cyan"
 />
 <StatCard
 label="Platform Gross Margin"
 value={
 overview?.grossMarginUsd != null && overview?.grossMarginPercent != null
 ?`${formatCurrencyUsd(overview.grossMarginUsd)} (${overview.grossMarginPercent}%)`
 : '₹0.00 (0.0%)'
 }
 hint={`Provider Cost: ${formatCurrencyUsd(overview?.totalProviderCostUsd ?? 0)}`}
 icon={TrendingUp}
 tone="amber"
 />
 </>
 )}
 </div>

 {/* Secondary KPIs */}
 <div className="grid gap-4 sm:grid-cols-3">
 <Card className="flex items-center justify-between">
 <div>
 <p className="text-xs text-ink-muted">Total Available Wallet Funds</p>
 <p className="mt-1 text-2xl font-black text-accent-emerald">
 {formatCurrencyUsd(overview?.totalAvailableBalanceUsd)}
 </p>
 <p className="mt-1 text-[11px] text-ink-faint">
 Active in {overview?.activeAccountsCount ?? 0} organization accounts
 </p>
 </div>
 <Wallet className="h-8 w-8 text-accent-emerald/40"/>
 </Card>
 <Card className="flex items-center justify-between">
 <div>
 <p className="text-xs text-ink-muted">Outstanding Invoiced Receivables</p>
 <p className="mt-1 text-2xl font-black text-accent-amber">
 {formatCurrencyUsd(overview?.totalOutstandingDueUsd)}
 </p>
 <p className="mt-1 text-[11px] text-ink-faint">Pending settlement or wire transfer</p>
 </div>
 <FileText className="h-8 w-8 text-accent-amber/40"/>
 </Card>
 <Card className="flex items-center justify-between">
 <div>
 <p className="text-xs text-ink-muted">Low-Balance Warnings</p>
 <p className="mt-1 text-2xl font-black text-accent-rose">
 {overview?.lowBalanceAccountsCount ?? 0}
 </p>
 <p className="mt-1 text-[11px] text-ink-faint">
 Tenants below safety threshold (₹850.00)
 </p>
 </div>
 <AlertTriangle className="h-8 w-8 text-accent-rose/40"/>
 </Card>
 </div>

 {/* Free Demo & Trial Conversion Intelligence Section */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-ink flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-accent-cyan"/>
 Free Demo Interviews & Trial Conversion Analytics
 </h3>
 <p className="text-xs text-ink-muted">
 Strict 10-minute limit enforcement • Server-side quota tracking • Zero customer charges
 </p>
 </div>
 <Pill tone="cyan">2 Free Demos / Account (10m Limit)</Pill>
 </div>

 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="p-4 space-y-1">
 <p className="text-xs text-ink-muted">Demos Started vs Completed</p>
 <p className="text-2xl font-black text-ink">
 {demoAnalytics?.totalDemosCompleted ?? 0}{''}
 <span className="text-xs font-normal text-ink-muted">
 / {demoAnalytics?.totalDemosStarted ?? 0} started
 </span>
 </p>
 <p className="text-[11px] text-ink-faint">
 Abandoned / Incomplete: {demoAnalytics?.abandonedDemos ?? 0}
 </p>
 </Card>

 <Card className="p-4 space-y-1">
 <p className="text-xs text-ink-muted">Trial-to-Paid Conversion Rate</p>
 <p className="text-2xl font-black text-accent-emerald">
 {demoAnalytics?.conversionRatePercent ?? 0}%
 </p>
 <p className="text-[11px] text-ink-faint">
 {demoAnalytics?.conversionCount ?? 0} accounts upgraded to paid plans
 </p>
 </Card>

 <Card className="p-4 space-y-1">
 <p className="text-xs text-ink-muted">Trial Acquisition Cost (AI Spend)</p>
 <p className="text-2xl font-black text-accent-violet">
 {formatCurrencyUsd(demoAnalytics?.totalTrialCostUsd ?? 0)}
 </p>
 <p className="text-[11px] text-ink-faint">
 LLM, STT & TTS cost metered at ₹0 customer charge
 </p>
 </Card>

 <Card className="p-4 space-y-1">
 <p className="text-xs text-ink-muted">Average Demo Duration</p>
 <p className="text-2xl font-black text-accent-cyan">
 {demoAnalytics?.avgDemoDurationMinutes ?? 0} min
 </p>
 <p className="text-[11px] text-ink-faint">
 Hard-capped at 10.0 minutes server-side
 </p>
 </Card>
 </div>
 </div>

 {/* Mathematical Balance Formula Card */}
 <Card className="border border-cyan-500/30 bg-cyan-500/5">
 <div className="flex items-center gap-3">
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-accent-cyan">
 <ShieldCheck className="h-5 w-5"/>
 </span>
 <div>
 <h3 className="text-sm font-bold text-ink">
 Authoritative Financial Balance Invariant
 </h3>
 <p className="font-mono text-xs font-semibold text-cyan-800">
 Available Balance = (Paid Recharges + Promo Grants + Positive Adjustments) − (Consumed Credits + Reserved Holds + Refunds + Negative Adjustments)
 </p>
 </div>
 </div>
 </Card>

 {/* Service Metering Breakdown & Daily Trend */}
 <div className="grid gap-6 xl:grid-cols-2">
 {/* Service Consumption Breakdown */}
 <Card>
 <CardHeader
 title="Service-Wise Metering & Provider Costs"
 subtitle="Customer billable charges versus platform provider expenses"
 icon={Layers}
 />
 {Object.keys(servicesBreakdown).length === 0 ? (
 <EmptyState
 title="No metered consumption yet"
 hint="AI interviews, audio synthesis, and LLM evaluations will stream here live."
 icon={Zap}
 />
 ) : (
 <div className="mt-4 divide-y divide-line/40">
 {Object.entries(servicesBreakdown).map(([key, s]) => (
 <div key={key} className="flex items-center justify-between py-3">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
 {key.replace('_', '')}
 </span>
 <Pill tone="neutral">{s.count} calls</Pill>
 </div>
 <p className="mt-1 text-[11px] text-ink-muted">
 Provider Cost:{''}
 {s.providerCostUsd != null ? (
 formatCurrencyUsd(s.providerCostUsd)
 ) : (
 <span className="text-ink-faint">Unknown (Unconfigured)</span>
 )}{''}
 • Margin:{''}
 <span className="text-accent-emerald">
 {s.marginUsd != null ? formatCurrencyUsd(s.marginUsd) : '—'}
 </span>
 </p>
 </div>
 <div className="text-right">
 <p className="font-mono text-sm font-bold text-accent-cyan">
 {formatCurrencyUsd(s.customerChargeUsd)}
 </p>
 <p className="text-[10px] text-ink-faint">Billed to Customer</p>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>

 {/* Daily Recharges vs Consumption Trend */}
 <Card>
 <CardHeader
 title="14-Day Capital Flow Trend"
 subtitle="Daily customer recharges versus service debits"
 icon={TrendingUp}
 />
 {trend.length === 0 ? (
 <EmptyState
 title="No trend activity recorded"
 hint="Transactions posted to the ledger over the last 14 days will display here."
 icon={Clock}
 />
 ) : (
 <div className="mt-4 space-y-3">
 {trend.map((t) => (
 <div key={t.date} className="rounded-xl bg-surface-2 p-3">
 <div className="flex items-center justify-between text-xs">
 <span className="font-mono font-bold text-ink">{t.date}</span>
 <span className="text-[11px] text-ink-muted">{t.txCount} transactions</span>
 </div>
 <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
 <div className="rounded-lg bg-emerald-500/10 p-2 text-accent-emerald">
 <span className="block text-[10px] font-bold uppercase text-accent-emerald">
 Recharges & Grants
 </span>
 +{formatCurrencyUsd(t.rechargesUsd)}
 </div>
 <div className="rounded-lg bg-rose-500/10 p-2 text-accent-rose">
 <span className="block text-[10px] font-bold uppercase text-accent-rose">
 Service Debits
 </span>
 -{formatCurrencyUsd(t.debitsUsd)}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </Card>
 </div>
 </div>
 );
}