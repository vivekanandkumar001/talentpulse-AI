'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Sparkles,
  TrendingUp,
  Zap,
  Video,
  Info,
  Pencil,
  X,
  Server,
  ShieldCheck,
  AlertTriangle,
  SlidersHorizontal,
  FlaskConical,
  Cpu,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  ErrorBanner,
  PageHeader,
  Pill,
  RefreshButton,
  StatCard,
} from '@/components/super-admin/ui';
import { TimeSeriesChart } from '@/components/super-admin/charts/TimeSeriesChart';
import { saFetch } from '@/lib/super-admin';

/* ------------------------------------------------------------- types */

type ServiceSummary = {
  attempts: number;
  usd: number;
  inr: number;
  tokens_in: number;
  tokens_out: number;
};

type ModelSummary = {
  provider: string;
  model: string;
  attempts: number;
  usd: number;
  inr: number;
  tokens_in: number;
  tokens_out: number;
};

type OperationSummary = { attempts: number; usd: number; inr: number };

type Summary = {
  attempts: number;
  successful: number;
  failed: number;
  usd: number;
  inr: number;
  tokens_in: number;
  tokens_out: number;
  status_counts: Record<string, number>;
  by_service: Record<string, ServiceSummary>;
  by_model: ModelSummary[];
  by_operation: Record<string, OperationSummary>;
};

type InfraItem = {
  id: string;
  label: string;
  provider: string;
  category: string;
  unit: string;
  unit_cost_usd: number;
  unit_cost_inr: number;
  monthly_qty: number;
  monthly_cost_usd: number;
  monthly_cost_inr: number;
  note: string;
  config: boolean;
  active: boolean;
};

type InfraCosts = {
  success: boolean;
  items: InfraItem[];
  total_month_usd: number;
  total_month_inr: number;
  by_category_inr: Record<string, number>;
};

type EstimateModel = {
  model: string;
  provider: string;
  rate_found: boolean;
  rates?: Record<string, number>;
  rate_card_version?: number | null;
  cost_per_call_inr: number;
  llm_calls_per_interview: number;
  llm_cost_per_interview_inr: number;
  stt_cost_inr: number;
  tts_cost_inr: number;
  livekit_cost_inr: number;
  embedding_cost_inr: number;
  total_interview_cost_inr: number;
  total_interview_cost_usd: number;
  cost_per_1000_interviews_inr: number;
  cost_per_1000_interviews_lakh: number;
  total_tokens_per_interview: number;
};

type CostEstimate = {
  success: boolean;
  assumptions: Record<string, number>;
  models: EstimateModel[];
  cheapest_model: EstimateModel | null;
  most_expensive_model: EstimateModel | null;
  infra_total_month_inr: number;
  fx_rate_usd_to_inr: number;
};

type EvalRunSummary = {
  id: string;
  run_at: string;
  triggered_by: string;
  providers: string[];
  totals: {
    input_tokens?: number;
    output_tokens?: number;
    cost_inr?: number;
    calls?: number;
    ok?: number;
    failed?: number;
    avg_score?: number | null;
  };
  per_provider: Record<string, { calls: number; ok: number; avg_score: number | null; cost_inr: number; avg_latency_ms: number }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  llm: 'LLM',
  voice: 'Voice (STT/TTS)',
  media: 'Media & WebRTC',
  data: 'Data stores',
  hosting: 'Hosting',
  email: 'Email',
  misc: 'Misc',
  payments: 'Payments',
};

type PricingDoc = {
  id: string;
  call_type: string;
  provider_kind: string;
  match_type: string;
  model_pattern: string;
  rates: Record<string, number>;
  seed_source?: string;
  version: number;
};

type CostOverview = {
  success: boolean;
  attempts_total: number;
  today: Summary;
  month: Summary;
  completed_interviews_month: number;
  completed_interviews_total: number;
  cost_per_completed_interview_inr: number | null;
  run_rate_month_inr: number;
  series: Array<{ date: string; count: number }>;
  pricing: PricingDoc[];
};

const inr = (v: number | null | undefined, digits = 4) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const usd = (v: number | null | undefined, digits = 6) =>
  v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const SERVICE_LABELS: Record<string, string> = {
  llm_chat: 'LLM Chat (interviewer / evaluator / scorecard)',
  voice_stt: 'Speech-to-Text',
  voice_tts: 'Text-to-Speech',
  embeddings: 'Embeddings / Resume Search',
  code_execution: 'Code Execution',
  media_storage: 'Media Storage',
};

const OPERATION_LABELS: Record<string, string> = {
  chat: 'Interviewer turns',
  question: 'Question generation',
  evaluate: 'Answer evaluation',
  scorecard: 'Scorecard synthesis',
  interviewer: 'Conversational interviewer',
  llm_chat: 'General chat',
};

function pct(part: number, whole: number): string {
  if (!whole || whole <= 0) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

/* ------------------------------------------------------------- page */

export default function SuperAdminCostInsightsPage() {
  const [data, setData] = useState<CostOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PricingDoc | null>(null);
  const [rateForm, setRateForm] = useState({ input: '', output: '', cached: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [infra, setInfra] = useState<InfraCosts | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [evalRuns, setEvalRuns] = useState<EvalRunSummary[] | null>(null);
  const [editingInfra, setEditingInfra] = useState<InfraItem | null>(null);
  const [infraForm, setInfraForm] = useState({ unit_cost_usd: '', monthly_qty: '', note: '' });
  const [assumpForm, setAssumpForm] = useState({
    questions_per_interview: '',
    avg_input_tokens: '',
    avg_output_tokens: '',
    avg_cached_tokens: '',
    use_openai_tts: false,
  });
  const [savingInfra, setSavingInfra] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [confirmEval, setConfirmEval] = useState(false);
  const [addRateOpen, setAddRateOpen] = useState(false);
  const [rateCreateForm, setRateCreateForm] = useState({
    provider_kind: 'google',
    match_type: 'prefix' as 'exact' | 'prefix',
    model_pattern: '',
    input: '',
    output: '',
    cached: '',
  });
  const [savingNewRate, setSavingNewRate] = useState(false);

  const loadAux = useCallback(async () => {
    try {
      const [infraBody, estimateBody, evalBody] = await Promise.all([
        saFetch<InfraCosts>('/api/super-admin/infra-costs', { cache: 'no-store' }).catch(() => null),
        saFetch<CostEstimate>('/api/super-admin/cost-estimate', { cache: 'no-store' }).catch(() => null),
        saFetch<{ success: boolean; runs: EvalRunSummary[] }>('/api/super-admin/llm-eval/runs', { cache: 'no-store' }).catch(() => null),
      ]);
      if (infraBody?.success) setInfra(infraBody);
      if (estimateBody?.success) setEstimate(estimateBody);
      if (evalBody?.success) setEvalRuns(evalBody.runs || []);
    } catch {
      // auxiliary panels are best-effort
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await saFetch<CostOverview>('/api/super-admin/cost-overview', { cache: 'no-store' });
      setData(body);
      await loadAux();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load spend telemetry.');
    } finally {
      setLoading(false);
    }
  }, [loadAux]);

  useEffect(() => {
    void load();
  }, [load]);

  const month = data?.month;
  const today = data?.today;
  const totalMonthInr = month?.inr ?? 0;

  const serviceRows = useMemo(() => {
    if (!month) return [];
    return Object.entries(month.by_service).sort((a, b) => b[1].inr - a[1].inr);
  }, [month]);

  const modelRows = useMemo(() => {
    if (!month) return [];
    return [...month.by_model].sort((a, b) => b.inr - a.inr);
  }, [month]);

  const operationRows = useMemo(() => {
    if (!month) return [];
    return Object.entries(month.by_operation).sort((a, b) => b[1].inr - a[1].inr);
  }, [month]);

  const openRateEdit = (doc: PricingDoc) => {
    setEditTarget(doc);
    setRateForm({
      input: String(doc.rates.input_per_1m_tokens ?? ''),
      output: String(doc.rates.output_per_1m_tokens ?? ''),
      cached: String(doc.rates.cached_input_per_1m_tokens ?? ''),
    });
  };

  const saveRateEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setNotice(null);
    try {
      const body = await saFetch<{ success: boolean; error?: string }>(
        `/api/super-admin/pricing/${encodeURIComponent(editTarget.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_per_1m_tokens: Number(rateForm.input),
            output_per_1m_tokens: Number(rateForm.output),
            cached_input_per_1m_tokens: rateForm.cached === '' ? undefined : Number(rateForm.cached),
          }),
        },
      );
      if (!body?.success) throw new Error(body?.error || 'Update failed');
      setEditTarget(null);
      setNotice('Rate card updated — new calls are priced with the edited rates.');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to update the rate card.');
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------- infra editor */

  const openInfraEdit = (item: InfraItem) => {
    setEditingInfra(item);
    setInfraForm({
      unit_cost_usd: String(item.unit_cost_usd),
      monthly_qty: String(item.monthly_qty),
      note: item.note || '',
    });
  };

  const saveInfraEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInfra) return;
    setSavingInfra(true);
    setNotice(null);
    try {
      const body = await saFetch<{ success: boolean; error?: string }>(
        `/api/super-admin/infra-costs/${encodeURIComponent(editingInfra.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unit_cost_usd: Number(infraForm.unit_cost_usd),
            monthly_qty: Number(infraForm.monthly_qty),
            note: infraForm.note,
          }),
        },
      );
      if (!body?.success) throw new Error(body?.error || 'Infra update failed');
      setEditingInfra(null);
      await loadAux();
      setNotice('Infra cost updated.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to update infra cost.');
    } finally {
      setSavingInfra(false);
    }
  };

  /* ------------------------- assumptions editor */

  const saveAssumptions = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const body = await saFetch<{ success: boolean; error?: string; assumptions?: Record<string, number> }>(
        '/api/super-admin/cost-assumptions',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions_per_interview: Number(assumpForm.questions_per_interview),
            avg_input_tokens: Number(assumpForm.avg_input_tokens),
            avg_output_tokens: Number(assumpForm.avg_output_tokens),
            avg_cached_tokens: Number(assumpForm.avg_cached_tokens),
            use_openai_tts: assumpForm.use_openai_tts,
          }),
        },
      );
      if (!body?.success) throw new Error(body?.error || 'Assumption update failed');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to update assumptions.');
    }
  };

  /* ------------------------- LLM eval */

  /* ------------------------- rate-card create */

  const submitRateCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewRate(true);
    setNotice(null);
    try {
      const body = await saFetch<{ success: boolean; error?: string }>(
        '/api/super-admin/pricing',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_kind: rateCreateForm.provider_kind,
            match_type: rateCreateForm.match_type,
            model_pattern: rateCreateForm.model_pattern,
            input_per_1m_tokens: Number(rateCreateForm.input),
            output_per_1m_tokens: Number(rateCreateForm.output),
            cached_input_per_1m_tokens: Number(rateCreateForm.cached || 0),
          }),
        },
      );
      if (!body?.success) throw new Error(body?.error || 'Failed to create rate entry');
      setAddRateOpen(false);
      setRateCreateForm({ provider_kind: 'google', match_type: 'prefix', model_pattern: '', input: '', output: '', cached: '' });
      await load();
      setNotice('Model registered — per-call and per-interview economics now include it.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to create rate entry.');
    } finally {
      setSavingNewRate(false);
    }
  };

  const runEval = async () => {
    setConfirmEval(false);
    setRunningEval(true);
    setNotice(null);
    try {
      const body = await saFetch<{ success: boolean; error?: string; run?: EvalRunSummary }>(
        '/api/super-admin/llm-eval/run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm_spend: true }),
        },
      );
      if (!body?.success) throw new Error(body?.error || 'Evaluation failed');
      setEvalRuns((prev) => [body.run as EvalRunSummary, ...(prev ?? [])].slice(0, 20));
      setNotice('Evaluation battery completed — see results below.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Evaluation failed to start.');
    } finally {
      setRunningEval(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Provider Spend & Unit Economics" description="Loading metered spend telemetry…" />
      </div>
    );
  }

  const hasSpendData = (data?.attempts_total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Spend & Unit Economics"
        description="Every provider call, metered with provider-reported token usage and priced from the governed rate card. ₹1 = 1 Credit, ₹1 = 1 LLM token-priced rupee — USD figures at ₹83 / $1 (assumption)."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBanner message={error} />}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-accent-cyan">
          <Info className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="LLM spend · this month"
          value={inr(month?.inr, 2)}
          hint={`${usd(month?.usd, 2)} · run-rate ≈ ${inr(data?.run_rate_month_inr, 2)}`}
          tone="cyan"
          icon={Coins}
        />
        <StatCard
          label="Attempts today"
          value={String(today?.attempts ?? 0)}
          hint={`${today?.successful ?? 0} ok · ${today?.failed ?? 0} failed`}
          tone="violet"
          icon={Zap}
        />
        <StatCard
          label="Avg cost / attempt"
          value={month && month.attempts > 0 ? inr(totalMonthInr / month.attempts, 4) : '—'}
          hint="Measured spend ÷ metered calls"
          tone="violet"
          icon={TrendingUp}
        />
        <StatCard
          label="Cost / completed interview"
          value={data?.cost_per_completed_interview_inr != null ? inr(data.cost_per_completed_interview_inr, 2) : '—'}
          hint={`${data?.completed_interviews_month ?? 0} completed interviews this month`}
          tone="emerald"
          icon={Video}
        />
      </div>

      {!hasSpendData && (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardHeader title="Metering has just been enabled" icon={Info} />
          <p className="mt-2 text-xs text-ink-muted leading-relaxed">
            No LLM calls have been recorded yet. From the next interview / evaluation / scorecard onwards,
            every provider attempt is metered here automatically — with provider-reported token usage and
            rate-card pricing. Numbers above are intentionally zero, not estimated.
          </p>
        </Card>
      )}

      {/* Spend trend */}
      <Card>
        <CardHeader
          title="Spend Trend — Last 14 Days"
          subtitle="Metered ₹ spend per day (provider-reported usage × rate card)"
          icon={TrendingUp}
        />
        <TimeSeriesChart data={data?.series ?? []} days={14} title="Metered Spend" unit="₹ spent / day" tone="cyan" />
        {!!data?.series?.every((p) => p.count === 0) && (
          <p className="mt-2 text-[11px] text-ink-faint">All-zero while metering accumulates its first real calls.</p>
        )}
      </Card>

      {/* Spend by service */}
      <Card>
        <CardHeader
          title="Spend by Service"
          subtitle="Where every provider rupee goes — service category × attempts × cost"
          icon={Server}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-ink-muted">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase text-ink-faint">
                <th className="pb-2 pr-4">Service</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2 pr-4">Tokens in / out</th>
                <th className="pb-2 pr-4">Cost (₹)</th>
                <th className="pb-2 pr-4">Cost ($)</th>
                <th className="pb-2">% of spend</th>
              </tr>
            </thead>
            <tbody>
              {serviceRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-faint">
                    No provider calls metered yet.
                  </td>
                </tr>
              ) : (
                serviceRows.map(([svc, s]) => (
                  <tr key={svc} className="border-b border-line/60 align-middle">
                    <td className="py-2.5 pr-4 font-semibold text-ink">{SERVICE_LABELS[svc] ?? svc}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink">{s.attempts.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {s.tokens_in.toLocaleString('en-IN')} / {s.tokens_out.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-accent-cyan">{inr(s.inr, 4)}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink-muted">{usd(s.usd, 4)}</td>
                    <td className="py-2.5 font-mono">{pct(s.inr, totalMonthInr)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Spend by provider/model */}
      <Card>
        <CardHeader
          title="Spend by Provider / Model"
          subtitle="Gemini vs OpenAI vs OpenRouter — measured usage priced from the rate card"
          icon={Sparkles}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs text-ink-muted">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase text-ink-faint">
                <th className="pb-2 pr-4">Provider</th>
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2 pr-4">Tokens (in / out)</th>
                <th className="pb-2 pr-4">Cost (₹)</th>
                <th className="pb-2">Status mix</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-faint">No model usage recorded yet.</td>
                </tr>
              ) : (
                modelRows.map((m, idx) => (
                  <tr key={`${m.provider}-${m.model}-${idx}`} className="border-b border-line/60 align-middle">
                    <td className="py-2.5 pr-4 font-semibold text-ink capitalize">{m.provider}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-ink">{m.model}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink">{m.attempts}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {m.tokens_in.toLocaleString('en-IN')} / {m.tokens_out.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-accent-cyan">{inr(m.inr, 4)}</td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-mono text-ink-muted">{pct(m.inr, totalMonthInr)} of spend</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Spend by operation */}
      <Card>
        <CardHeader
          title="Spend by Operation"
          subtitle="Interviewer turns vs answer evaluation vs scorecard synthesis — where the tokens go"
          icon={TrendingUp}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {operationRows.length === 0 ? (
            <p className="col-span-full py-6 text-center text-xs text-ink-faint">No operation-tagged spend yet.</p>
          ) : (
            operationRows.map(([op, o]) => (
              <div key={op} className="rounded-xl bg-inset p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{OPERATION_LABELS[op] ?? op}</span>
                  <Pill tone="cyan">{o.attempts} call{o.attempts === 1 ? '' : 's'}</Pill>
                </div>
                <p className="mt-2 text-lg font-black text-ink font-mono">{inr(o.inr, 4)}</p>
                <p className="text-[10px] text-ink-faint mt-0.5">{usd(o.usd, 4)} · {pct(o.inr, totalMonthInr)} of spend</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Rate card governance */}
      <Card>
        <CardHeader
          title="Rate Card Governance"
          subtitle="Versioned ₹/1M-token rate cards used to price every metered call. Edit with an audit trail."
          icon={ShieldCheck}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddRateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-bold text-accent-cyan hover:bg-cyan-500/20 cursor-pointer"
              >
                Add model
              </button>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-accent-emerald">
                Rates editable
              </span>
            </div>
          }
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs text-ink-muted">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase text-ink-faint">
                <th className="pb-2 pr-4">Provider</th>
                <th className="pb-2 pr-4">Match</th>
                <th className="pb-2 pr-4">Model pattern</th>
                <th className="pb-2 pr-4">₹ / 1M in</th>
                <th className="pb-2 pr-4">₹ / 1M out</th>
                <th className="pb-2 pr-4">Cached ₹ / 1M</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pricing ?? []).map((p) => (
                <tr key={p.id} className="border-b border-line/60 align-middle">
                  <td className="py-2.5 pr-4 font-semibold text-ink capitalize">{p.provider_kind}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-ink-muted">{p.match_type}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-accent-cyan">{p.model_pattern}</td>
                  <td className="py-2.5 pr-4 font-mono">{(p.rates.input_per_1m_tokens ?? 0).toFixed(4)}</td>
                  <td className="py-2.5 pr-4 font-mono">{(p.rates.output_per_1m_tokens ?? 0).toFixed(4)}</td>
                  <td className="py-2.5 pr-4 font-mono">{(p.rates.cached_input_per_1m_tokens ?? 0).toFixed(4)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openRateEdit(p)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-cyan hover:bg-cyan-500/20 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.pricing ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-faint">No rate-card entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Rates are USD per 1M tokens, converted at ₹83/$1 (assumption — not live FX). Seed entries are public rate
          cards; models without a matching entry are metered with cost_status
          &nbsp;<span className="font-mono text-accent-amber">MEASURED_USAGE_RATE_UNVERIFIED</span> — usage is real, rate
          is not on file. Edit here makes the rate provider-of-record.
        </p>
      </Card>

      {/* Rate-card edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-base font-bold text-ink">Edit rate card</h3>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveRateEdit} className="mt-4 space-y-4 text-xs">
              <p className="text-[11px] text-ink-muted">
                Entry: <span className="font-mono text-accent-cyan">{editTarget.provider_kind} / {editTarget.model_pattern}</span>
                &nbsp;· version {editTarget.version}
              </p>
              {(['input', 'output', 'cached'] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block font-semibold text-ink-muted capitalize">
                    {field === 'cached' ? 'Cached input ₹ / 1M tokens' : `${field === 'input' ? 'Input' : 'Output'} ₹ / 1M tokens`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={rateForm[field]}
                    onChange={(e) => setRateForm({ ...rateForm, [field]: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Save rate card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Interview cost model assumptions ============ */}
      <Card>
        <CardHeader
          title="Interview Cost Model — Assumptions"
          subtitle="Feeds per-call and per-interview cost below. Update tokens / questions to match your real interviews."
          icon={SlidersHorizontal}
          action={
            <Pill tone="cyan">₹1 = $1 × 1/83</Pill>
          }
        />
        <form onSubmit={saveAssumptions} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {[
            { key: 'questions_per_interview', label: 'Questions / interview', step: 1 },
            { key: 'avg_input_tokens', label: 'Avg input tokens / call', step: 50 },
            { key: 'avg_output_tokens', label: 'Avg output tokens / call', step: 25 },
            { key: 'avg_cached_tokens', label: 'Avg cached tokens / call', step: 25 },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block font-semibold text-ink-muted">{f.label}</span>
              <input
                type="number"
                min={0}
                step={f.step}
                required
                value={String(assumpForm[f.key as keyof typeof assumpForm])}
                onChange={(e) => setAssumpForm({ ...assumpForm, [f.key]: e.target.value })}
                placeholder={String(estimate?.assumptions?.[f.key] ?? '')}
                className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
              />
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-ink-faint">
              Defaults: 10 questions · 800 in / 400 out / 100 cached · 2 LLM calls per question + 2 per interview.
            </p>
          <label className="mt-3 flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-inset px-4 py-3">
            <span>
              <span className="block text-xs font-semibold text-ink">Use OpenAI tts-1 (paid) for interviewer voice</span>
              <span className="block text-[10px] text-ink-faint">Default: Edge-TTS (free). Enabling adds ≈₹112 per 10-min interview (90,000 chars).</span>
            </span>
            <input
              type="checkbox"
              checked={assumpForm.use_openai_tts}
              onChange={(e) => setAssumpForm({ ...assumpForm, use_openai_tts: e.target.checked })}
              className="h-5 w-5 accent-cyan-500"
            />
          </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const a = estimate?.assumptions;
                  setAssumpForm({
                    questions_per_interview: String(a?.questions_per_interview ?? 10),
                    avg_input_tokens: String(a?.avg_input_tokens ?? 800),
                    avg_output_tokens: String(a?.avg_output_tokens ?? 400),
                    avg_cached_tokens: String(a?.avg_cached_tokens ?? 100),
                    use_openai_tts: Boolean(a?.use_openai_tts ?? false),
                  });
                }}
                className="rounded-xl border border-line px-3 py-2 text-[11px] font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
              >
                Reset to current
              </button>
              <button
                type="submit"
                className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-2 text-[11px] font-bold text-accent-cyan hover:bg-cyan-500/30 cursor-pointer"
              >
                Save assumptions
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* ============ Per-call & per-interview economics ============ */}
      <Card>
        <CardHeader
          title="Cost per Call & per Interview — by Model"
          subtitle="Every chat-capable model in your rate card, ranked by ₹/interview. Pick the cheapest that passes evals."
          icon={Cpu}
          action={<Pill tone="violet">{estimate?.models.length ?? 0} models</Pill>}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs text-ink-muted">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase text-ink-faint">
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Rate card</th>
                <th className="pb-2 pr-4 text-right">₹ / call</th>
                <th className="pb-2 pr-4 text-right">LLM calls</th>
                <th className="pb-2 pr-4 text-right">₹ / interview</th>
                <th className="pb-2 pr-4 text-right">₹ / 1,000 interviews</th>
                <th className="pb-2 pr-4 text-right">Tokens / interview</th>
                <th className="pb-2 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {(estimate?.models ?? []).map((m) => {
                const isCheapest = estimate?.cheapest_model?.model === m.model && estimate?.cheapest_model?.provider === m.provider;
                return (
                  <tr key={`${m.provider}-${m.model}`} className={`border-b border-line/60 align-middle ${isCheapest ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-ink">{m.model}</div>
                      <div className="text-[10px] uppercase text-ink-faint font-mono">{m.provider}{m.rate_found ? '' : ' · UNPRICED'}</div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[11px]">
                      {m.rate_found
                        ? `in ${Number(m.rates?.input_per_1m_tokens).toFixed(2)} / out ${Number(m.rates?.output_per_1m_tokens).toFixed(2)}`
                        : 'usage measured, rate unverified'}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-accent-cyan font-bold">{inr(m.cost_per_call_inr, 5)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono">{m.llm_calls_per_interview}</td>
                    <td className="py-2.5 pr-4 text-right font-mono font-bold text-accent-cyan">{inr(m.total_interview_cost_inr, 2)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono">{inr(m.cost_per_1000_interviews_inr, 2)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[11px]">{m.total_tokens_per_interview.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-right">
                      {isCheapest && <Pill tone="emerald">Cheapest</Pill>}
                      {!m.rate_found && <Pill tone="amber">Unpriced</Pill>}
                    </td>
                  </tr>
                );
              })}
              {(estimate?.models ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-ink-faint">
                    Seed the rate card (or add models in AI Configuration) to see per-model economics.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Full interview = {estimate?.models[0]?.llm_calls_per_interview ?? 22} LLM calls + 10 min STT + 10 min TTS + 10 min LiveKit agent minutes + 1 embedding.
          Cheapest is shown only when a rate card entry exists — unpriced models rank last and stay flagged.
        </p>
      </Card>

      {/* ============ Infrastructure TCO ============ */}
      <Card>
        <CardHeader
          title="Infrastructure — Live Monthly TCO"
          subtitle={`Estimated monthly burn: ${infra ? inr(infra.total_month_inr, 2) : '…'} (${infra ? `$${infra.total_month_usd.toFixed(2)}` : ''}) — public list prices, admin-editable`}
          icon={Server}
          action={<Pill tone="violet">{infra?.items.length ?? 0} line items</Pill>}
        />
        {infra && infra.by_category_inr && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(infra.by_category_inr).map(([cat, amt]) => (
              <span key={cat} className="rounded-lg border border-line bg-inset px-2 py-1 text-[11px] text-ink-muted">
                <span className="font-semibold text-ink">{CATEGORY_LABELS[cat] ?? cat}:</span> {inr(amt, 2)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs text-ink-muted">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase text-ink-faint">
                <th className="pb-2 pr-4">Service</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4 text-right">Unit ₹</th>
                <th className="pb-2 pr-4 text-right">Monthly qty</th>
                <th className="pb-2 pr-4 text-right">Monthly ₹</th>
                <th className="pb-2 pr-4">Note (editable)</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(infra?.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-line/60 align-middle">
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-ink">{item.label}</div>
                    <div className="text-[10px] font-mono uppercase text-ink-faint">{item.provider}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-[11px]">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                  <td className="py-2.5 pr-4 font-mono text-[11px]">{item.unit}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{inr(item.unit_cost_inr, 2)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{item.monthly_qty}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-bold text-accent-cyan">{inr(item.monthly_cost_inr, 2)}</td>
                  <td className="py-2.5 pr-4 max-w-[220px] text-[11px] text-ink-faint truncate" title={item.note}>{item.note || '—'}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openInfraEdit(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-cyan hover:bg-cyan-500/20 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {infra && (
              <tfoot>
                <tr className="border-t border-line font-bold text-ink">
                  <td colSpan={5} className="pt-3 pr-4">Estimated monthly TCO</td>
                  <td className="pt-3 pr-4 text-right font-mono text-accent-cyan">{inr(infra.total_month_inr, 2)}</td>
                  <td colSpan={2} className="pt-3 text-[11px] font-normal text-ink-faint">≈ ${infra.total_month_usd.toFixed(2)} / mo</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* ============ LLM evaluation battery ============ */}
      <Card>
        <CardHeader
          title="LLM Evaluation Battery"
          subtitle="6 interview-like prompts × your enabled providers. Admin-triggered, real paid API calls."
          icon={FlaskConical}
          action={
            <button
              type="button"
              disabled={runningEval}
              onClick={() => setConfirmEval(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-accent-amber hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              {runningEval ? 'Running…' : 'Run eval (~₹0.05)'}
            </button>
          }
        />
        {evalRuns && evalRuns.length > 0 ? (
          <div className="mt-4 space-y-3">
            {evalRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="rounded-xl bg-inset p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-ink">Run {run.id}</p>
                    <p className="text-[10px] text-ink-faint">{new Date(run.run_at).toLocaleString()} · by {run.triggered_by} · {run.providers?.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5">{run.totals?.calls ?? 0} calls</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5">avg {run.totals?.avg_score ?? '—'} / 100</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5">{inr(run.totals?.cost_inr ?? 0, 4)}</span>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {Object.entries(run.per_provider || {}).map(([prov, p]) => (
                    <div key={prov} className="rounded-lg border border-line/60 bg-surface px-2 py-1.5">
                      <p className="text-[10px] font-bold uppercase text-accent-cyan">{prov}</p>
                      <p className="font-mono text-[11px] text-ink">score {p.avg_score ?? '—'} · {p.ok}/{p.calls} ok · {p.avg_latency_ms} ms</p>
                      <p className="font-mono text-[10px] text-ink-faint">{inr(p.cost_inr, 5)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-muted">
            No eval runs yet. Runs write to <span className="font-mono">platform_llm_eval_runs</span> with per-provider
            score / latency / cost. The judge is a deterministic local rubric (₹0 extra).
          </p>
        )}
      </Card>

      {/* Edit infra modal */}
      {editingInfra && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingInfra(null); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-base font-bold text-ink">Edit infra cost — {editingInfra.label}</h3>
              </div>
              <button type="button" onClick={() => setEditingInfra(null)} className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveInfraEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-ink-muted">Unit cost (USD) <span className="text-ink-faint">= ₹{(Number(infraForm.unit_cost_usd || 0) * 83).toFixed(2)}</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  required
                  value={infraForm.unit_cost_usd}
                  onChange={(e) => setInfraForm({ ...infraForm, unit_cost_usd: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-ink-muted">Monthly quantity (units / month)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={infraForm.monthly_qty}
                  onChange={(e) => setInfraForm({ ...infraForm, monthly_qty: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-ink-muted">Note (why this price — shown in table)</label>
                <textarea
                  rows={2}
                  value={infraForm.note}
                  onChange={(e) => setInfraForm({ ...infraForm, note: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-ink outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button type="button" onClick={() => setEditingInfra(null)} className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={savingInfra} className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer">
                  {savingInfra ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add model rate descriptor (rate card entry) */}
      {addRateOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAddRateOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-base font-bold text-ink">Add model to rate card</h3>
              </div>
              <button type="button" onClick={() => setAddRateOpen(false)} className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitRateCreate} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-ink-muted">Provider</label>
                  <select
                    value={rateCreateForm.provider_kind}
                    onChange={(e) => setRateCreateForm({ ...rateCreateForm, provider_kind: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-ink outline-none focus:border-cyan-500"
                  >
                    <option value="google">Google (Gemini)</option>
                    <option value="openai">OpenAI</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="ollama">Ollama (self-hosted)</option>
                    <option value="*">Any (wildcard)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-ink-muted">Match type</label>
                  <select
                    value={rateCreateForm.match_type}
                    onChange={(e) => setRateCreateForm({ ...rateCreateForm, match_type: e.target.value as 'exact' | 'prefix' })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-ink outline-none focus:border-cyan-500"
                  >
                    <option value="exact">Exact model id</option>
                    <option value="prefix">Prefix (matches gpt-4o-mini-*)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-ink-muted">Model pattern (e.g. gemini-2.0-flash, gpt-4o)</label>
                <input
                  type="text"
                  required
                  value={rateCreateForm.model_pattern}
                  onChange={(e) => setRateCreateForm({ ...rateCreateForm, model_pattern: e.target.value })}
                  placeholder="gemini-2.0-flash"
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
                />
              </div>
              {[
                { key: 'input', label: 'Input ₹ / 1M tokens' },
                { key: 'output', label: 'Output ₹ / 1M tokens' },
                { key: 'cached', label: 'Cached input ₹ / 1M tokens' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block font-semibold text-ink-muted">{f.label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    value={rateCreateForm[f.key as keyof typeof rateCreateForm] as string}
                    onChange={(e) => setRateCreateForm({ ...rateCreateForm, [f.key]: e.target.value })}
                    placeholder="e.g. 0.30"
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 font-mono text-ink outline-none focus:border-cyan-500"
                  />
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button type="button" onClick={() => setAddRateOpen(false)} className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={savingNewRate} className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer">
                  {savingNewRate ? 'Adding…' : 'Add to rate card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm paid eval modal */}
      {confirmEval && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmEval(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <AlertTriangle className="h-5 w-5 text-accent-amber" />
              <h3 className="text-base font-bold text-ink">Run evaluation — real API spend</h3>
            </div>
            <p className="mt-4 text-xs text-ink-muted leading-relaxed">
              This fires <span className="font-semibold text-ink">~12 paid LLM calls</span> (2 providers × 6 prompts).
              Estimated cost ≈ <span className="font-mono text-accent-cyan">₹0.05–₹2</span> depending on model.
              Results are persisted for governance; the judge rubric costs ₹0 (local heuristic).
            </p>
            <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button type="button" onClick={() => setConfirmEval(false)} className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer">Cancel</button>
              <button type="button" onClick={runEval} className="rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-accent-amber hover:bg-amber-500/30 cursor-pointer">
                Run evaluation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honest scope note */}
      <Card className="border-line bg-inset">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" />
          <div className="text-xs text-ink-muted leading-relaxed">
            <p className="font-bold text-ink">What is and isn&apos;t metered here yet</p>
            <p className="mt-1">
              Metered today: LLM chat completions with provider-reported token usage (interview questions, answer
              evaluation, scorecard, interviewer synthesis). Not yet metered: STT/TTS minutes, embeddings, code-execution
              seconds, recruiter-token usage. The rate card converts provider tokens → ₹ at ₹83/$1. Infra
              line-items (Atlas, Vercel, LiveKit, Qdrant) live in your cloud invoices — connect those billing APIs or
              the table above stays provider-LLM-only by design.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}