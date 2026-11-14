'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Layers, Lock, ShieldCheck, ShieldHalf, Table2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  ErrorBanner,
  PageHeader,
  Pill,
  RefreshButton,
  Spinner,
  VerdictPill,
} from '@/components/super-admin/ui';
import { saFetch, type PermissionPayload, type Verdict } from '@/lib/super-admin';

/**
 * Runtime guarantees surfaced on the RBAC page. Each flag is "good" when its
 * backend value equals `goodWhen`.
 *
 * `passwordVisibility` is deliberately inverted: the secure state is that
 * passwords are NOT visible to any admin, so `goodWhen` is `false`.
 */
const ENFORCEMENT_FLAGS: Array<{ key: string; label: string; goodWhen: boolean }> = [
  { key: 'candidatePrivacy', label: 'Candidate privacy', goodWhen: true },
  { key: 'tenantIsolation', label: 'Tenant isolation', goodWhen: true },
  { key: 'privilegedActionAudit', label: 'Privileged-action audit', goodWhen: true },
  { key: 'auditLogImmutability', label: 'Audit-log immutability', goodWhen: true },
  { key: 'liveJoinRequiresReason', label: 'Live join needs reason', goodWhen: true },
  { key: 'liveKitTokenAuthorization', label: 'LiveKit token authorization', goodWhen: true },
  { key: 'backendApiAuthorization', label: 'Backend API authorization', goodWhen: true },
  { key: 'passwordVisibility', label: 'Passwords never visible', goodWhen: false },
];

const ROLE_ACCENT: Record<
  string,
  {
    base: string;
    active: string;
    pill: 'violet' | 'cyan' | 'emerald';
  }
> = {
  super_admin: {
    base: 'text-accent-violet border-violet-500/30 bg-violet-500/5 hover:border-violet-500/60 hover:bg-violet-500/10',
    active: 'ring-2 ring-violet-500 border-violet-500 bg-violet-500/15 shadow-md shadow-violet-500/10 scale-[1.01]',
    pill: 'violet',
  },
  recruiter: {
    base: 'text-accent-cyan border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60 hover:bg-cyan-500/10',
    active: 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-500/15 shadow-md shadow-cyan-500/10 scale-[1.01]',
    pill: 'cyan',
  },
  candidate: {
    base: 'text-accent-emerald border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10',
    active: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10 scale-[1.01]',
    pill: 'emerald',
  },
};

export default function SuperAdminRolesPage() {
  const [data, setData] = useState<PermissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'all' | 'super_admin' | 'recruiter' | 'candidate'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await saFetch<PermissionPayload & { success: boolean }>('/api/super-admin/permissions');
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the permission matrix.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roles = (data?.roleHierarchy || []).filter((r) => r.id !== 'admin');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="The canonical RBAC matrix served by the backend. What you see here is exactly what the platform enforces — it can never drift from the API guards."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBanner message={error} />}

      {loading && !data ? (
        <Card>
          <Spinner label="Loading permission matrix…" />
        </Card>
      ) : data ? (
        <>
          {/* Principles */}
          <Card className="border-emerald-400/20 bg-emerald-400/5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-accent-emerald" />
              <div>
                <p className="text-sm font-bold text-ink">Governance principles</p>
                <ul className="mt-2 space-y-1.5 text-xs text-ink-muted">
                  {data.principles.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-emerald" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Enforcement status */}
          <Card>
            <CardHeader title="Enforcement status" subtitle="Runtime guarantees validated by the backend" icon={ShieldCheck} />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {ENFORCEMENT_FLAGS.map(({ key, label, goodWhen }) => {
                const value = Boolean(data.enforcement?.[key]);
                const good = value === goodWhen;
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                      good
                        ? 'border-emerald-500/25 bg-emerald-500/5 text-accent-emerald'
                        : 'border-amber-500/25 bg-amber-500/5 text-accent-amber'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="uppercase">{good ? 'Enforced' : 'Off'}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Role hierarchy */}
          <Card>
            <CardHeader
              title="Role hierarchy"
              subtitle="Scope decreases from platform-wide to individual • Click any role to focus its permissions"
              icon={Layers}
              action={
                selectedRole !== 'all' ? (
                  <button
                    onClick={() => setSelectedRole('all')}
                    className="text-xs font-semibold text-accent-cyan hover:underline px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 transition"
                  >
                    Reset Filter (Show All)
                  </button>
                ) : undefined
              }
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {roles.map((role, idx) => {
                const isSelected = selectedRole === role.id;
                const style = ROLE_ACCENT[role.id];
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRole(selectedRole === role.id ? 'all' : (role.id as any))}
                    className={`group relative text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? style?.active || 'ring-2 ring-cyan-500 border-cyan-500'
                        : style?.base || 'border-line bg-surface-2 hover:bg-surface-3'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        {role.label}
                        {isSelected && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current bg-surface/90">
                            Active
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-mono opacity-70 px-1.5 py-0.5 rounded-md border border-current/20">
                        L{idx + 1}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] opacity-80">{role.id}</p>
                    <p className="mt-2 text-xs text-ink-muted leading-relaxed">{role.scope}</p>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-current/15 text-[11px] font-medium">
                      <span>{isSelected ? 'Click to show all roles' : 'Click to filter matrix'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Matrix */}
          <Card>
            <CardHeader
              title="Recommended permission matrix"
              subtitle={
                selectedRole !== 'all'
                  ? `Focusing on ${roles.find((r) => r.id === selectedRole)?.label} permissions`
                  : 'Every row is enforced server-side, not merely displayed'
              }
              icon={Table2}
            />

            {/* Desktop Table View */}
            <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border-b border-line bg-surface pb-3 pr-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Feature / Permission
                    </th>
                    <th
                      className={`border-b border-line pb-3 pr-4 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        selectedRole === 'candidate'
                          ? 'text-accent-emerald bg-emerald-500/10 px-2 rounded-t-lg'
                          : selectedRole !== 'all'
                          ? 'opacity-35 text-ink-faint'
                          : 'text-accent-emerald'
                      }`}
                    >
                      Candidate
                    </th>
                    <th
                      className={`border-b border-line pb-3 pr-4 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        selectedRole === 'recruiter'
                          ? 'text-accent-cyan bg-cyan-500/10 px-2 rounded-t-lg'
                          : selectedRole !== 'all'
                          ? 'opacity-35 text-ink-faint'
                          : 'text-accent-cyan'
                      }`}
                    >
                      Recruiter / HR
                    </th>
                    <th
                      className={`border-b border-line pb-3 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        selectedRole === 'super_admin'
                          ? 'text-accent-violet bg-violet-500/10 px-2 rounded-t-lg'
                          : selectedRole !== 'all'
                          ? 'opacity-35 text-ink-faint'
                          : 'text-accent-violet'
                      }`}
                    >
                      Super Admin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.permissionMatrix.map((row, i) => (
                    <tr key={i} className="align-top">
                      <td className="sticky left-0 z-10 border-b border-line/50 bg-surface py-3 pr-4 text-xs font-medium text-ink">
                        {row.feature}
                      </td>
                      <td
                        className={`border-b border-line/50 py-3 pr-4 transition-all duration-200 ${
                          selectedRole === 'candidate'
                            ? 'bg-emerald-500/5 px-2 font-semibold'
                            : selectedRole !== 'all'
                            ? 'opacity-30'
                            : ''
                        }`}
                      >
                        <VerdictPill verdict={row.candidate.verdict as Verdict}>
                          {row.candidate.text}
                        </VerdictPill>
                      </td>
                      <td
                        className={`border-b border-line/50 py-3 pr-4 transition-all duration-200 ${
                          selectedRole === 'recruiter'
                            ? 'bg-cyan-500/5 px-2 font-semibold'
                            : selectedRole !== 'all'
                            ? 'opacity-30'
                            : ''
                        }`}
                      >
                        <VerdictPill verdict={row.recruiter.verdict as Verdict}>
                          {row.recruiter.text}
                        </VerdictPill>
                      </td>
                      <td
                        className={`border-b border-line/50 py-3 transition-all duration-200 ${
                          selectedRole === 'super_admin'
                            ? 'bg-violet-500/5 px-2 font-semibold'
                            : selectedRole !== 'all'
                            ? 'opacity-30'
                            : ''
                        }`}
                      >
                        <VerdictPill verdict={row.super_admin.verdict as Verdict}>
                          {row.super_admin.text}
                        </VerdictPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive List View */}
            <div className="mt-4 md:hidden divide-y divide-line/60">
              {data.permissionMatrix.map((row, i) => {
                const activeRoleCell =
                  selectedRole === 'candidate'
                    ? { role: 'Candidate', cell: row.candidate, color: 'text-accent-emerald' }
                    : selectedRole === 'recruiter'
                    ? { role: 'Recruiter / HR', cell: row.recruiter, color: 'text-accent-cyan' }
                    : selectedRole === 'super_admin'
                    ? { role: 'Super Admin', cell: row.super_admin, color: 'text-accent-violet' }
                    : null;

                return (
                  <div key={i} className="py-3 space-y-2">
                    <p className="text-xs font-bold text-ink">{row.feature}</p>
                    {activeRoleCell ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-semibold ${activeRoleCell.color}`}>
                          {activeRoleCell.role}
                        </span>
                        <VerdictPill verdict={activeRoleCell.cell.verdict as Verdict}>
                          {activeRoleCell.cell.text}
                        </VerdictPill>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-accent-emerald">Candidate</span>
                          <VerdictPill verdict={row.candidate.verdict as Verdict}>
                            {row.candidate.text}
                          </VerdictPill>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-accent-cyan">Recruiter</span>
                          <VerdictPill verdict={row.recruiter.verdict as Verdict}>
                            {row.recruiter.text}
                          </VerdictPill>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-accent-violet">Super Admin</span>
                          <VerdictPill verdict={row.super_admin.verdict as Verdict}>
                            {row.super_admin.text}
                          </VerdictPill>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Super Admin powers */}
          <Card>
            <CardHeader
              title="Super Admin powers"
              subtitle="The 12 governance domains, with their explicit guardrails"
              icon={ShieldHalf}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.superAdminModules.map((mod, i) => (
                <div key={mod.id} className="flex flex-col rounded-2xl bg-surface-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[11px] font-bold text-accent-cyan">
                      {i + 1}
                    </span>
                    <p className="text-sm font-bold text-ink">{mod.title}</p>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">{mod.summary}</p>
                  <ul className="mt-3 space-y-1 text-[11px] text-ink-muted">
                    {mod.capabilities.map((c, ci) => (
                      <li key={ci} className="flex gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-emerald" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  {mod.guardrails.length > 0 && (
                    <div className="mt-3 rounded-xl bg-amber-500/5 p-2.5">
                      {mod.guardrails.map((g, gi) => (
                        <p key={gi} className="flex gap-1.5 text-[11px] text-accent-amber">
                          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{g}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Action policy */}
          <Card>
            <CardHeader
              title="Super Admin action policy"
              subtitle="What Super Admin can and cannot do — the strict list"
              icon={ShieldCheck}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-ink-faint">
                    <th className="pb-2 pr-4 font-bold">Action</th>
                    <th className="pb-2 pr-4 font-bold">Policy</th>
                    <th className="pb-2 font-bold">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {data.actionPolicy.map((row, i) => (
                    <tr key={i} className="border-t border-line/60 align-top">
                      <td className="py-3 pr-4 text-xs font-medium text-ink">{row.action}</td>
                      <td className="py-3 pr-4 text-xs text-ink-muted">{row.policy}</td>
                      <td className="py-3">
                        <VerdictPill verdict={row.verdict}>{row.verdict}</VerdictPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-faint">
            <Pill tone="emerald">Allow</Pill>
            <span>plainly permitted</span>
            <Pill tone="amber">Conditional</Pill>
            <span>only under stated scope / grant / audit</span>
            <Pill tone="rose">Deny</Pill>
            <span>forbidden</span>
          </div>
        </>
      ) : null}
    </div>
  );
}