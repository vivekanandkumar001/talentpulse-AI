'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Mail,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  GhostButton,
  PageHeader,
  Pill,
  RefreshButton,
  Spinner,
} from '@/components/super-admin/ui';
import { useSuperAdmin } from '@/components/super-admin/SuperAdminShell';
import { formatCurrencyUsd, formatDateTime, formatNumber, saFetch } from '@/lib/super-admin';

type OrgDetailData = {
  success: boolean;
  organization: {
    id: string;
    name: string;
    slug?: string;
    tier: string;
    status: 'active' | 'suspended';
    companySize?: string;
    billingEmail?: string;
    website?: string;
    candidateCount: number;
    recruiterCount: number;
    interviewCount: number;
    jobCount: number;
    createdAt?: string;
  };
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    createdAt?: string;
  }>;
  interviews: Array<{
    id: string;
    candidateName: string;
    candidateEmail?: string;
    jobTitle: string;
    status: string;
    overallScore?: number;
    createdAt?: string;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    department: string;
    status: string;
    createdAt?: string;
  }>;
  billing?: {
    id: string;
    availableBalanceUsd: number;
    paidCreditsUsd: number;
    promotionalCreditsUsd: number;
    consumedCreditsUsd: number;
    currency: string;
  } | null;
};

export default function SuperAdminOrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = String(params?.id || '');
  const { toast } = useSuperAdmin();

  const [data, setData] = useState<OrgDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'interviews' | 'jobs' | 'billing'>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await saFetch<OrgDetailData>(`/api/super-admin/organizations/${orgId}`);
      if (res.success && res.organization) {
        setData(res);
      } else {
        throw new Error('Organization details could not be loaded.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load tenant dossier.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateStatus = async (next: 'active' | 'suspended') => {
    if (!data?.organization) return;
    if (!window.confirm(`Set "${data.organization.name}" to ${next}?`)) return;
    setActionLoading(true);
    try {
      await saFetch(`/api/super-admin/organizations/${data.organization.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      toast?.(`${data.organization.name} is now ${next}.`, 'success');
      await loadData();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed.';
      toast?.(message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <Card>
        <Spinner label="Loading organization dossier…" />
      </Card>
    );
  }

  if (error || !data?.organization) {
    return (
      <div className="space-y-4">
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-cyan hover:underline"
        >
          Back to Organizations
        </Link>
        <ErrorBanner message={error || 'Organization dossier could not be found.'} />
      </div>
    );
  }

  const { organization, users, interviews, jobs, billing } = data;
  const isSuspended = organization.status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Back navigation & Actions Header */}
      <div>
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-accent-cyan transition-colors mb-3"
        >
          Back to Organization Management
        </Link>

        <PageHeader
          title={organization.name}
          description={`Tenant identifier: ${organization.id} • Slug: ${organization.slug || '—'}`}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={`/super-admin/billing`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-3 transition"
              >
                <CreditCard className="h-3.5 w-3.5 text-accent-cyan" />
                Financial Dossier
              </Link>
              {isSuspended ? (
                <GhostButton
                  icon={ShieldCheck}
                  disabled={actionLoading}
                  onClick={() => updateStatus('active')}
                  className="border-emerald-500/30 text-accent-emerald hover:bg-emerald-500/10"
                >
                  Activate Tenant
                </GhostButton>
              ) : (
                <GhostButton
                  icon={ShieldOff}
                  disabled={actionLoading}
                  onClick={() => updateStatus('suspended')}
                  className="border-rose-500/30 text-accent-rose hover:bg-rose-500/10"
                >
                  Suspend Tenant
                </GhostButton>
              )}
              <RefreshButton onClick={loadData} loading={loading} />
            </div>
          }
        />
      </div>

      {/* Top Tenant Summary Banner */}
      <Card className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-accent-cyan text-xl font-black">
              {(organization.name || 'ORG').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-ink">{organization.name}</h2>
                <Pill tone={isSuspended ? 'rose' : 'emerald'}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {organization.status.toUpperCase()}
                </Pill>
                <span className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-mono text-ink-muted uppercase">
                  {organization.tier || 'STARTER'}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted flex items-center gap-2">
                <span>Created {formatDateTime(organization.createdAt)}</span>
                {organization.billingEmail && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-ink-faint">
                      <Mail className="h-3 w-3" /> {organization.billingEmail}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-line/60 pt-3 sm:pt-0 sm:pl-6 text-xs font-mono">
            <div>
              <span className="block text-[10px] uppercase text-ink-faint">Wallet Balance</span>
              <span className="text-base font-bold text-accent-emerald">
                {billing ? formatCurrencyUsd(billing.availableBalanceUsd) : '₹0.00'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-ink-faint">Interviews Run</span>
              <span className="text-base font-bold text-ink">{formatNumber(organization.interviewCount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Core Metric Snapshot Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted font-medium">Team & Recruiters</span>
            <Users className="h-4 w-4 text-accent-cyan" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{formatNumber(organization.recruiterCount)}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Active recruiter seats</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted font-medium">Candidates Screened</span>
            <UserCheck className="h-4 w-4 text-accent-emerald" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{formatNumber(organization.candidateCount)}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Evaluated candidate pool</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted font-medium">Interviews Conducted</span>
            <Video className="h-4 w-4 text-accent-violet" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{formatNumber(organization.interviewCount)}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Technical AI evaluations</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted font-medium">Active Jobs / Openings</span>
            <Briefcase className="h-4 w-4 text-accent-amber" />
          </div>
          <p className="mt-2 text-2xl font-black text-ink">{formatNumber(organization.jobCount)}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Screening job templates</p>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-line gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: 'overview', label: 'Organization Overview', count: undefined },
          { key: 'users', label: 'Team Members', count: users.length },
          { key: 'interviews', label: 'Interviews & Screenings', count: interviews.length },
          { key: 'jobs', label: 'Jobs & Openings', count: jobs.length },
          { key: 'billing', label: 'Financial Wallet', count: undefined },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 pb-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-cyan-500 text-accent-cyan font-bold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] font-mono text-ink-faint">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Tenant Profile & Metadata" icon={Building2} />
            <div className="mt-4 divide-y divide-line/60 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Organization Name</span>
                <span className="font-semibold text-ink">{organization.name}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Tenant Slug</span>
                <span className="font-mono text-ink">{organization.slug || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Subscription Tier</span>
                <span className="font-semibold text-ink uppercase">{organization.tier}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Company Size</span>
                <span className="text-ink">{organization.companySize || '10-50'} employees</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Billing Email</span>
                <span className="font-mono text-ink">{organization.billingEmail || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">Tenant Account ID</span>
                <span className="font-mono text-[11px] text-ink-faint">{organization.id}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Isolation & Governance Posture" icon={ShieldCheck} />
            <div className="mt-4 space-y-3 text-xs text-ink-muted">
              <div className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3">
                <CheckCircle2 className="h-4 w-4 text-accent-emerald shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Strict MongoDB Tenant Isolation</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    All jobs, interviews, and candidates are scoped by <code>org_id: &quot;{organization.id}&quot;</code>.
                    Cross-tenant reads fail-closed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3">
                <CheckCircle2 className="h-4 w-4 text-accent-emerald shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">RBAC & Recruiter Enforceability</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    Only verified recruiters and administrators belonging to this tenant can access candidate dossiers
                    and interview rooms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3">
                <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Authoritative Double-Entry Ledger</p>
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    Credit balance and service debits are reconciled against immutable double-entry ledger records.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: TEAM MEMBERS / USERS */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader
            title="Recruiters & Organization Users"
            subtitle="All user accounts associated with this tenant organization"
            icon={Users}
          />
          <div className="mt-4 overflow-x-auto">
            {users.length === 0 ? (
              <EmptyState title="No users in this organization" hint="Invite recruiters to get started." icon={Users} />
            ) : (
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {users.map((u) => (
                    <tr key={u.id} className="py-2.5">
                      <td className="py-3 pr-4 font-semibold text-ink">{u.fullName}</td>
                      <td className="py-3 pr-4 font-mono text-ink-muted">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-[11px] font-semibold uppercase text-accent-cyan">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Pill tone={u.status === 'active' ? 'emerald' : 'neutral'}>{u.status}</Pill>
                      </td>
                      <td className="py-3 text-ink-faint font-mono">{formatDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: INTERVIEWS */}
      {activeTab === 'interviews' && (
        <Card>
          <CardHeader
            title="Conducted Technical Interviews"
            subtitle="Candidate interviews screened under this tenant"
            icon={Video}
          />
          <div className="mt-4 overflow-x-auto">
            {interviews.length === 0 ? (
              <EmptyState title="No interviews conducted yet" hint="Candidates invited by this tenant will appear here." icon={Video} />
            ) : (
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    <th className="pb-2 pr-4">Candidate</th>
                    <th className="pb-2 pr-4">Job Title</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Overall Score</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {interviews.map((intv) => (
                    <tr key={intv.id} className="py-2.5">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-ink">{intv.candidateName}</p>
                        {intv.candidateEmail && (
                          <p className="font-mono text-[10px] text-ink-faint">{intv.candidateEmail}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-ink-muted">{intv.jobTitle}</td>
                      <td className="py-3 pr-4">
                        <Pill tone={intv.status === 'completed' ? 'emerald' : 'cyan'}>{intv.status}</Pill>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold text-ink">
                        {intv.overallScore !== undefined ? `${intv.overallScore}%` : '—'}
                      </td>
                      <td className="py-3 text-ink-faint font-mono">{formatDateTime(intv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 4: JOBS */}
      {activeTab === 'jobs' && (
        <Card>
          <CardHeader
            title="Jobs & Technical Screening Pipelines"
            subtitle="Configured hiring positions for this tenant"
            icon={Briefcase}
          />
          <div className="mt-4 overflow-x-auto">
            {jobs.length === 0 ? (
              <EmptyState title="No jobs created yet" hint="Job templates created by recruiters will be cataloged here." icon={Briefcase} />
            ) : (
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    <th className="pb-2 pr-4">Job Title</th>
                    <th className="pb-2 pr-4">Department</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {jobs.map((job) => (
                    <tr key={job.id} className="py-2.5">
                      <td className="py-3 pr-4 font-semibold text-ink">{job.title}</td>
                      <td className="py-3 pr-4 text-ink-muted">{job.department}</td>
                      <td className="py-3 pr-4">
                        <Pill tone={job.status === 'active' ? 'emerald' : 'neutral'}>{job.status}</Pill>
                      </td>
                      <td className="py-3 text-ink-faint font-mono">{formatDateTime(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: BILLING & WALLET */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Financial Ledger & Wallet Breakdown" icon={CreditCard} />
            {billing ? (
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
                  <div className="rounded-xl bg-surface-2 p-3">
                    <span className="block text-[10px] uppercase text-ink-muted">Available Balance</span>
                    <span className="text-base font-bold text-accent-emerald">
                      {formatCurrencyUsd(billing.availableBalanceUsd)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <span className="block text-[10px] uppercase text-ink-muted">Paid Recharges</span>
                    <span className="text-base font-bold text-ink">
                      {formatCurrencyUsd(billing.paidCreditsUsd)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <span className="block text-[10px] uppercase text-ink-muted">Promotional Grants</span>
                    <span className="text-base font-bold text-accent-violet">
                      {formatCurrencyUsd(billing.promotionalCreditsUsd)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface-2 p-3">
                    <span className="block text-[10px] uppercase text-ink-muted">Consumed Credits</span>
                    <span className="text-base font-bold text-accent-cyan">
                      {formatCurrencyUsd(billing.consumedCreditsUsd)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/super-admin/billing"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-accent-cyan hover:bg-cyan-500/20 transition"
                  >
                    Open in Billing & Usage Center 
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No billing account provisioned"
                hint="This organization does not currently have a dedicated billing account."
                icon={CreditCard}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}