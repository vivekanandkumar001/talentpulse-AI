'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ShieldOff, ShieldCheck, Users, Video } from 'lucide-react';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  GhostButton,
  PageHeader,
  Pill,
  RefreshButton,
  SearchInput,
  TableSkeleton,
} from '@/components/super-admin/ui';
import { useSuperAdmin } from '@/components/super-admin/SuperAdminShell';
import { formatNumber, saFetch, type Organization } from '@/lib/super-admin';

type OrgResponse = { success: boolean; items?: Organization[]; total?: number };

export default function SuperAdminOrganizationsPage() {
  const router = useRouter();
  const { toast } = useSuperAdmin();
  const [items, setItems] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (appliedQuery.trim()) params.set('q', appliedQuery.trim());
      if (status !== 'all') params.set('status', status);
      params.set('limit', '50');
      const body = await saFetch<OrgResponse>(`/api/super-admin/organizations?${params.toString()}`);
      setItems(Array.isArray(body.items) ? body.items : []);
      setTotal(Number(body.total) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load organizations.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (org: Organization, next: 'active' | 'suspended') => {
    if (!window.confirm(`Set "${org.name}" to ${next}?`)) return;
    setActionId(org.id);
    try {
      await saFetch(`/api/super-admin/organizations/${org.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast?.(`${org.name} is now ${next}.`, 'success');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed.';
      setError(message);
      toast?.(message, 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Tenant provisioning, usage and lifecycle status. Tenant isolation is enforced on every read and write."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBanner message={error} />}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchInput
              value={q}
              onChange={setQ}
              onEnter={() => setAppliedQuery(q)}
              placeholder="Search organizations…"
              className="min-w-[220px] flex-1"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              className="cursor-pointer rounded-xl border border-line bg-inset px-3 py-1.5 text-xs text-ink outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <GhostButton onClick={() => setAppliedQuery(q)} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </GhostButton>
          </div>
          <Pill tone="neutral">{formatNumber(total)} organizations</Pill>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink-faint">
                <th className="pb-2 pr-4 font-bold">Organization</th>
                <th className="pb-2 pr-4 font-bold">Tier</th>
                <th className="pb-2 pr-4 font-bold">Candidates</th>
                <th className="pb-2 pr-4 font-bold">Interviews</th>
                <th className="pb-2 pr-4 font-bold">Status</th>
                <th className="pb-2 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <TableSkeleton rows={6} cols={6} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="No organizations found"
                      hint="Adjust the filters, or provision a new tenant."
                      icon={Building2}
                    />
                  </td>
                </tr>
              ) : (
                items.map((org) => {
                  const suspended = String(org.status).toLowerCase() === 'suspended';
                  return (
                    <tr
                      key={org.id}
                      onClick={() => router.push(`/super-admin/organizations/${org.id}`)}
                      className="group cursor-pointer border-t border-line/60 align-middle transition-colors hover:bg-surface-2/70"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 transition-colors group-hover:border-accent-cyan/40 group-hover:bg-accent-cyan/10">
                            <Building2 className="h-4 w-4 text-accent-cyan" />
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/super-admin/organizations/${org.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 truncate font-semibold text-ink transition-colors group-hover:text-accent-cyan hover:underline"
                            >
                              <span>{org.name}</span>
                            </Link>
                            <p className="truncate font-mono text-[11px] text-ink-faint">{org.slug || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink-muted">{org.tier || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 tabular-nums text-ink-muted">
                          <Users className="h-3.5 w-3.5 text-ink-faint" />
                          {formatNumber(org.candidateCount)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 tabular-nums text-ink-muted">
                          <Video className="h-3.5 w-3.5 text-ink-faint" />
                          {formatNumber(org.interviewCount)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Pill tone={suspended ? 'rose' : 'emerald'}>
                          <span className={`h-1.5 w-1.5 rounded-full ${suspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {org.status}
                        </Pill>
                      </td>
                      <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {suspended ? (
                          <GhostButton
                            icon={ShieldCheck}
                            disabled={actionId === org.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(org, 'active');
                            }}
                            className="border-emerald-500/30 text-accent-emerald hover:bg-emerald-500/10"
                          >
                            Activate
                          </GhostButton>
                        ) : (
                          <GhostButton
                            icon={ShieldOff}
                            disabled={actionId === org.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(org, 'suspended');
                            }}
                            className="border-rose-500/30 text-accent-rose hover:bg-rose-500/10"
                          >
                            Suspend
                          </GhostButton>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-line">
        <CardHeader
          title="Tenant governance"
          subtitle="Why these controls look the way they do"
          icon={ShieldCheck}
        />
        <ul className="mt-4 space-y-2 text-xs text-ink-muted">
          <li>• Every organization&apos;s data is isolated; Super Admin sees aggregates, not raw cross-tenant records.</li>
          <li>• Suspending a tenant is reversible, auditable, and never deletes data.</li>
          <li>• Organization-level admins stay distinct from platform-level Super Admin.</li>
        </ul>
      </Card>
    </div>
  );
}
