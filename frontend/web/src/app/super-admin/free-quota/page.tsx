'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Clock,
  Gift,
  Building2,
  Edit2,
  Sliders,
  X,
  RotateCcw,
  Search,
  UserCheck,
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
  SearchInput,
  StatCard,
  StatSkeleton,
  TableSkeleton,
} from '@/components/super-admin/ui';
import { useSuperAdmin } from '@/components/super-admin/SuperAdminShell';
import { formatNumber, saFetch, type PlatformUser } from '@/lib/super-admin';

type QuotaPolicy = {
  is_free_quotas_enabled: boolean;
  default_free_demo_count: number;
  max_demo_duration_seconds: number;
  eligible_role: string | null;
  eligible_interview_types: string[] | string | null;
  reset_policy: string;
  promo_bonus_allowance: number;
  signup_free_enabled: boolean;
  signup_free_credits: number;
  signup_free_max_grants: number;
  signup_free_target_role: string | null;
  version: number;
};

type OrgEntitlement = {
  org_id: string;
  org_name: string;
  is_free_quotas_enabled: boolean;
  free_demo_count_override: number | null;
  max_demo_duration_seconds_override: number | null;
  eligible_role_override: string | null;
  eligible_interview_types_override: string[] | string | null;
  promo_bonus_allowance: number;
};

type UserQuotaEntitlement = {
  user_id: string;
  is_free_quotas_enabled: boolean;
  default_free_demo_count?: number;
  free_demo_count?: number | null;
  max_demo_duration_seconds: number;
  promo_bonus_allowance: number;
  source?: 'platform_default' | 'organization' | 'individual_override' | string;
};

export default function SuperAdminFreeQuotaPage() {
  const { toast } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<QuotaPolicy | null>(null);
  const [orgEntitlements, setOrgEntitlements] = useState<OrgEntitlement[]>([]);
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations');
  const [q, setQ] = useState('');

  // Policy Edit Modal
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    default_free_demo_count: '2',
    max_demo_duration_minutes: '10',
    promo_bonus_allowance: '0',
    eligible_role: 'all',
  });

  // Signup Welcome Credits (Free Plan) Modal
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [savingSignup, setSavingSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({
    signup_free_enabled: true,
    signup_free_credits: '10',
    signup_free_target_role: 'all',
  });

  // Org Override Modal
  const [selectedOrg, setSelectedOrg] = useState<OrgEntitlement | null>(null);
  const [savingOrgOverride, setSavingOrgOverride] = useState(false);
  const [orgForm, setOrgForm] = useState({
    is_free_quotas_enabled: true,
    free_demo_count_override: '',
    max_demo_duration_minutes_override: '',
    promo_bonus_allowance: '0',
  });

  // User Lookup & Override State
  const [userQuery, setUserQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userResults, setUserResults] = useState<PlatformUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [userQuotaLoading, setUserQuotaLoading] = useState(false);
  const [userQuota, setUserQuota] = useState<UserQuotaEntitlement | null>(null);
  const [savingUserOverride, setSavingUserOverride] = useState(false);
  const [userForm, setUserForm] = useState({
    is_free_quotas_enabled: true,
    free_demo_count: '',
    max_demo_duration_minutes: '',
    promo_bonus_allowance: '0',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load platform quota policy
      const policyRes = await saFetch<{ success: boolean; policy: QuotaPolicy }>('/api/super-admin/entitlement-policy');
      if (policyRes.success) {
        setPolicy(policyRes.policy);
      }

      // Load organization entitlements
      const orgsRes = await saFetch<{ success: boolean; orgs: OrgEntitlement[] }>('/api/super-admin/organization-entitlements');
      if (orgsRes.success) {
        setOrgEntitlements(orgsRes.orgs || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load quota policy.');
      toast('Failed to load quota policy.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSetPolicy = async (newPolicy: Partial<QuotaPolicy>) => {
    setLoading(true);
    try {
      await saFetch('/api/super-admin/entitlement-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy),
      });
      toast('Platform quota policy updated successfully.', 'success');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update policy.';
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalFreeQuota = async () => {
    if (!policy) return;
    const nextState = !policy.is_free_quotas_enabled;
    const promptMsg = nextState
      ? 'Enable free trial demo interviews platform-wide?'
      : 'WARNING: Disable free demo interviews platform-wide? No candidates or recruiters will be able to start free demo sessions until re-enabled.';
    if (!window.confirm(promptMsg)) return;

    await handleSetPolicy({ is_free_quotas_enabled: nextState });
  };

  const openEditPolicy = () => {
    if (!policy) return;
    setPolicyForm({
      default_free_demo_count: String(policy.default_free_demo_count),
      max_demo_duration_minutes: String(Math.round(policy.max_demo_duration_seconds / 60)),
      promo_bonus_allowance: String(policy.promo_bonus_allowance),
      eligible_role: policy.eligible_role || 'all',
    });
    setPolicyModalOpen(true);
  };

  const handleSavePolicyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const demoCount = parseInt(policyForm.default_free_demo_count, 10);
    const durationMins = parseInt(policyForm.max_demo_duration_minutes, 10);
    const promo = parseInt(policyForm.promo_bonus_allowance, 10);
    if (isNaN(demoCount) || demoCount < 0) {
      toast('Demo count must be 0 or greater.', 'error');
      return;
    }
    if (isNaN(durationMins) || durationMins < 1 || durationMins > 180) {
      toast('Duration must be between 1 and 180 minutes.', 'error');
      return;
    }
    setSavingPolicy(true);
    try {
      await saFetch('/api/super-admin/entitlement-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_free_demo_count: demoCount,
          max_demo_duration_seconds: durationMins * 60,
          promo_bonus_allowance: isNaN(promo) ? 0 : promo,
          eligible_role: policyForm.eligible_role === 'all' ? null : policyForm.eligible_role,
        }),
      });
      toast('Platform free quota limits saved.', 'success');
      setPolicyModalOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save policy.', 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  const toggleSignupFree = async () => {
    if (!policy) return;
    const nextState = !policy.signup_free_enabled;
    const promptMsg = nextState
      ? 'Enable the one-time welcome credit grant (Free plan) platform-wide for new signups?'
      : 'Disable the welcome credit grant platform-wide? New signups will get 0 credits until re-enabled.';
    if (!window.confirm(promptMsg)) return;
    await handleSetPolicy({ signup_free_enabled: nextState });
  };

  const openEditSignup = () => {
    if (!policy) return;
    setSignupForm({
      signup_free_enabled: policy.signup_free_enabled,
      signup_free_credits: String(policy.signup_free_credits ?? 10),
      signup_free_target_role: policy.signup_free_target_role || 'all',
    });
    setSignupModalOpen(true);
  };

  const handleSaveSignupForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const credits = parseFloat(signupForm.signup_free_credits);
    if (isNaN(credits) || credits < 0 || credits > 100000) {
      toast('Welcome credits must be a number between 0 and 100000.', 'error');
      return;
    }
    setSavingSignup(true);
    try {
      await saFetch('/api/super-admin/entitlement-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signup_free_enabled: signupForm.signup_free_enabled,
          signup_free_credits: credits,
          signup_free_max_grants: 1,
          signup_free_target_role: signupForm.signup_free_target_role,
        }),
      });
      toast('Signup welcome credit policy saved.', 'success');
      setSignupModalOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save signup policy.', 'error');
    } finally {
      setSavingSignup(false);
    }
  };

  const openEditOrg = (org: OrgEntitlement) => {
    setSelectedOrg(org);
    setOrgForm({
      is_free_quotas_enabled: org.is_free_quotas_enabled,
      free_demo_count_override: org.free_demo_count_override != null ? String(org.free_demo_count_override) : '',
      max_demo_duration_minutes_override:
        org.max_demo_duration_seconds_override != null
          ? String(Math.round(org.max_demo_duration_seconds_override / 60))
          : '',
      promo_bonus_allowance: String(org.promo_bonus_allowance || 0),
    });
  };

  const handleSaveOrgOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setSavingOrgOverride(true);
    try {
      const demoCount = orgForm.free_demo_count_override ? parseInt(orgForm.free_demo_count_override, 10) : null;
      const durationMins = orgForm.max_demo_duration_minutes_override
        ? parseInt(orgForm.max_demo_duration_minutes_override, 10)
        : null;

      await saFetch(`/api/super-admin/organizations/${selectedOrg.org_id}/free-quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: selectedOrg.org_name,
          is_free_quotas_enabled: orgForm.is_free_quotas_enabled,
          free_demo_count_override: demoCount,
          max_demo_duration_seconds_override: durationMins ? durationMins * 60 : null,
          promo_bonus_allowance: parseInt(orgForm.promo_bonus_allowance, 10) || 0,
          reason: `Super Admin custom quota update for ${selectedOrg.org_name}`,
        }),
      });
      toast(`Quota override for ${selectedOrg.org_name} updated.`, 'success');
      setSelectedOrg(null);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update organization override.', 'error');
    } finally {
      setSavingOrgOverride(false);
    }
  };

  const handleResetOrgOverride = async () => {
    if (!selectedOrg) return;
    if (!window.confirm(`Reset "${selectedOrg.org_name}" to platform defaults? Custom demo counts and overrides will be removed.`)) return;

    setSavingOrgOverride(true);
    try {
      await saFetch(`/api/super-admin/organizations/${selectedOrg.org_id}/free-quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_to_defaults: true,
          reason: `Super Admin reset ${selectedOrg.org_name} to platform defaults`,
        }),
      });
      toast(`Quota override for ${selectedOrg.org_name} reset to defaults.`, 'success');
      setSelectedOrg(null);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reset organization override.', 'error');
    } finally {
      setSavingOrgOverride(false);
    }
  };

  // User Lookup Handler
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = userQuery.trim();
    if (!query) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await saFetch<{ success: boolean; users?: PlatformUser[] }>(
        `/api/super-admin/users?q=${encodeURIComponent(query)}&limit=15`
      );
      setUserResults(Array.isArray(res.users) ? res.users : []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'User search failed.', 'error');
    } finally {
      setSearchingUsers(false);
    }
  };

  const openEditUser = async (user: PlatformUser) => {
    setSelectedUser(user);
    setUserQuotaLoading(true);
    setUserForm({
      is_free_quotas_enabled: true,
      free_demo_count: '',
      max_demo_duration_minutes: '',
      promo_bonus_allowance: '0',
      reason: `VIP demo quota adjustment for ${user.email}`,
    });

    try {
      const res = await saFetch<{ success: boolean; entitlement?: UserQuotaEntitlement }>(
        `/api/super-admin/users/${user.id}/free-quota`
      );
      if (res.success && res.entitlement) {
        const ent = res.entitlement;
        setUserQuota(ent);
        setUserForm({
          is_free_quotas_enabled: ent.is_free_quotas_enabled,
          free_demo_count: ent.free_demo_count != null ? String(ent.free_demo_count) : (ent.default_free_demo_count != null ? String(ent.default_free_demo_count) : ''),
          max_demo_duration_minutes: ent.max_demo_duration_seconds ? String(Math.round(ent.max_demo_duration_seconds / 60)) : '',
          promo_bonus_allowance: String(ent.promo_bonus_allowance || 0),
          reason: `Super Admin quota grant for ${user.email}`,
        });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load user quota details.', 'error');
    } finally {
      setUserQuotaLoading(false);
    }
  };

  const handleSaveUserOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const reasonText = userForm.reason.trim();
    if (!reasonText) {
      toast('A brief reason is required for manual user quota changes.', 'error');
      return;
    }

    setSavingUserOverride(true);
    try {
      const demoCount = userForm.free_demo_count ? parseInt(userForm.free_demo_count, 10) : 2;
      const durationMins = userForm.max_demo_duration_minutes ? parseInt(userForm.max_demo_duration_minutes, 10) : 10;

      await saFetch(`/api/super-admin/users/${selectedUser.id}/free-quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_free_quotas_enabled: userForm.is_free_quotas_enabled,
          free_demo_count: demoCount,
          max_demo_duration_seconds: durationMins * 60,
          promo_bonus_allowance: parseInt(userForm.promo_bonus_allowance, 10) || 0,
          reason: reasonText,
        }),
      });
      toast(`User quota override for ${selectedUser.email} saved.`, 'success');
      setSelectedUser(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update user quota.', 'error');
    } finally {
      setSavingUserOverride(false);
    }
  };

  const handleResetUserOverride = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Reset "${selectedUser.email}" to inherited defaults? Special individual demo count will be cleared.`)) return;

    setSavingUserOverride(true);
    try {
      await saFetch(`/api/super-admin/users/${selectedUser.id}/free-quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_to_defaults: true,
          reason: `Super Admin reset ${selectedUser.email} to default inherited quota`,
        }),
      });
      toast(`User quota for ${selectedUser.email} restored to inherited defaults.`, 'success');
      setSelectedUser(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reset user quota.', 'error');
    } finally {
      setSavingUserOverride(false);
    }
  };

  const filteredOrgs = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orgEntitlements.filter(
      (org) => !term || (org.org_name || '').toLowerCase().includes(term)
    );
  }, [orgEntitlements, q]);

  if (loading && !policy) {
    return (
      <div className="space-y-6">
        <PageHeader title="Free Demo Quota Policy" description="Loading platform entitlements..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      </div>
    );
  }

  if (error && !policy) {
    return <ErrorBanner message={error} />;
  }

  if (!policy) {
    return <ErrorBanner message="No quota policy found. Please contact support." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Free Demo Quota Policy"
        description="Platform-wide free quota settings with deterministic precedence rules. Organization and individual overrides are evaluated per-user."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBanner message={error} />}

      {/* Platform Policy Section */}
      <Card>
        <CardHeader
          title="Platform-Wide Policy"
          subtitle="Governs all candidate & recruiter free trials across organizations"
          icon={ShieldCheck}
          action={
            <div className="flex items-center gap-2">
              <GhostButton
                onClick={toggleGlobalFreeQuota}
                className={
                  policy.is_free_quotas_enabled
                    ? 'border-rose-500/30 text-accent-rose hover:bg-rose-500/10'
                    : 'border-emerald-500/30 text-accent-emerald hover:bg-emerald-500/10'
                }
              >
                {policy.is_free_quotas_enabled ? 'Disable Free Quotas' : 'Enable Free Quotas'}
              </GhostButton>
              <GhostButton
                icon={Edit2}
                onClick={openEditPolicy}
                className="border-cyan-500/30 text-accent-cyan hover:bg-cyan-500/10"
              >
                Edit Policy
              </GhostButton>
            </div>
          }
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Free Quotas"
            value={policy.is_free_quotas_enabled ? 'Enabled' : 'Disabled'}
            hint="Global practice interview access"
            tone={policy.is_free_quotas_enabled ? 'emerald' : 'amber'}
            icon={policy.is_free_quotas_enabled ? ShieldCheck : ShieldAlert}
          />
          <StatCard
            label="Free Demo Limit"
            value={policy.default_free_demo_count ?? 2}
            hint="Free sessions allowed per candidate"
            tone="cyan"
            icon={Users}
          />
          <StatCard
            label="Session Duration"
            value={`${Math.round((policy.max_demo_duration_seconds || 600) / 60)} min`}
            hint="Server-side session duration cap"
            tone="cyan"
            icon={Clock}
          />
          <StatCard
            label="Promo Allowance"
            value={policy.promo_bonus_allowance ?? 0}
            hint="Additional promotional bonus grants"
            tone="violet"
            icon={Gift}
          />
        </div>
      </Card>

      {/* Signup Welcome Credits (Free Plan) */}
      <Card>
        <CardHeader
          title="Signup Welcome Credits — Free Plan"
          subtitle="One-time ₹0 welcome grant issued exactly once per new signup (server-enforced). Paid plan prices are ₹1 = 1 Credit and are managed under Packages."
          icon={Gift}
          action={
            <div className="flex items-center gap-2">
              <GhostButton
                onClick={toggleSignupFree}
                className={
                  policy.signup_free_enabled
                    ? 'border-rose-500/30 text-accent-rose hover:bg-rose-500/10'
                    : 'border-emerald-500/30 text-accent-emerald hover:bg-emerald-500/10'
                }
              >
                {policy.signup_free_enabled ? 'Disable Welcome Grant' : 'Enable Welcome Grant'}
              </GhostButton>
              <GhostButton
                icon={Edit2}
                onClick={openEditSignup}
                className="border-cyan-500/30 text-accent-cyan hover:bg-cyan-500/10"
              >
                Edit Free Plan
              </GhostButton>
            </div>
          }
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Welcome Grant"
            value={policy.signup_free_enabled ? 'Enabled' : 'Disabled'}
            hint="Issued on verified signup only"
            tone={policy.signup_free_enabled ? 'emerald' : 'amber'}
            icon={policy.signup_free_enabled ? ShieldCheck : ShieldAlert}
          />
          <StatCard
            label="Welcome Credits"
            value={formatNumber(policy.signup_free_credits ?? 10)}
            hint="₹0 — one free assessment worth of credits"
            tone="cyan"
            icon={Gift}
          />
          <StatCard
            label="Grants Per User"
            value={policy.signup_free_max_grants ?? 1}
            hint="One-time only — enforced atomically server-side"
            tone="cyan"
            icon={Clock}
          />
          <StatCard
            label="Assigned To"
            value={
              (policy.signup_free_target_role ?? 'all') === 'candidate'
                ? 'Candidates'
                : (policy.signup_free_target_role ?? 'all') === 'recruiter'
                  ? 'Recruiters'
                  : 'Everyone'
            }
            hint="Which new signups receive the free plan"
            tone="violet"
            icon={Users}
          />
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          ₹1 = 1 Credit everywhere on the platform. The Free plan is a one-time signup grant only —
          paid packages and their prices/credits are edited in <span className="font-semibold text-ink-muted">Super Admin → Packages</span>.
        </p>
      </Card>

      {/* Governance rules */}
      <Card className="border-emerald-400/20 bg-emerald-400/5">
        <CardHeader title="Policy Precedence Rules" icon={ShieldCheck} />
        <ul className="mt-4 space-y-2 text-xs text-ink-muted">
          <li>• Platform safety shutdown &gt; individual override &gt; organization override &gt; package entitlements &gt; platform defaults</li>
          <li>• Individual overrides take precedence over organization overrides for that specific user</li>
          <li>• Organization overrides take precedence over platform defaults for its members</li>
          <li>• Package entitlements are evaluated after organizational overrides</li>
        </ul>
      </Card>

      {/* Overrides Management Section with Tabs */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('organizations')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'organizations'
                  ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/40 shadow-sm'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink border border-transparent'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Organization Overrides</span>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] text-ink-muted font-mono">
                {orgEntitlements.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-cyan-500/15 text-accent-cyan border border-cyan-500/40 shadow-sm'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink border border-transparent'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Individual User Overrides</span>
            </button>
          </div>

          <div className="text-xs text-ink-faint">
            {activeTab === 'organizations'
              ? 'Tenant-scoped quota rules'
              : 'Individual candidate & recruiter grants'}
          </div>
        </div>

        {activeTab === 'organizations' ? (
          <div>
            <div className="mt-4 mb-4">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Search organizations by name…"
                className="max-w-xs"
              />
            </div>

            {loading && orgEntitlements.length === 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <tbody>
                    <TableSkeleton rows={4} cols={6} />
                  </tbody>
                </table>
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="mt-4 h-32 flex items-center justify-center text-ink-muted">
                <p>No organization entitlements found</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-ink-faint">
                      <th className="pb-2 pr-4 font-bold">Organization</th>
                      <th className="pb-2 pr-4 font-bold">Status</th>
                      <th className="pb-2 pr-4 font-bold">Precedence State</th>
                      <th className="pb-2 pr-4 font-bold">Demo Count</th>
                      <th className="pb-2 pr-4 font-bold">Duration Override</th>
                      <th className="pb-2 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org) => {
                      const hasCustomOverride =
                        org.free_demo_count_override != null ||
                        org.max_demo_duration_seconds_override != null ||
                        !org.is_free_quotas_enabled ||
                        (org.promo_bonus_allowance && org.promo_bonus_allowance > 0);

                      return (
                        <tr
                          key={org.org_id}
                          className="border-t border-line/60 align-middle transition-colors hover:bg-surface-2/70"
                        >
                          <td className="py-3 pr-4 font-semibold text-ink">{org.org_name}</td>
                          <td className="py-3 pr-4">
                            <Pill tone={org.is_free_quotas_enabled ? 'emerald' : 'rose'}>
                              {org.is_free_quotas_enabled ? 'Enabled' : 'Disabled'}
                            </Pill>
                          </td>
                          <td className="py-3 pr-4">
                            {hasCustomOverride ? (
                              <Pill tone="cyan">Custom Override</Pill>
                            ) : (
                              <Pill tone="neutral">Inherited</Pill>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs font-bold text-accent-cyan">
                              {org.free_demo_count_override ?? `${policy.default_free_demo_count} (default)`}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs font-bold text-accent-cyan">
                              {org.max_demo_duration_seconds_override != null
                                ? `${org.max_demo_duration_seconds_override}s (${Math.round(org.max_demo_duration_seconds_override / 60)}m)`
                                : `${policy.max_demo_duration_seconds}s (default)`}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEditOrg(org)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink hover:border-cyan-500/40 hover:text-accent-cyan"
                            >
                              <Sliders className="h-3 w-3" />
                              Configure
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <form onSubmit={handleSearchUsers} className="mt-4 mb-4 flex flex-wrap items-center gap-2">
              <SearchInput
                value={userQuery}
                onChange={setUserQuery}
                placeholder="Search user by email, full name, or organization…"
                className="min-w-[280px] flex-1"
              />
              <GhostButton onClick={() => void handleSearchUsers()} disabled={searchingUsers}>
                <Search className="h-3.5 w-3.5 mr-1" />
                {searchingUsers ? 'Searching…' : 'Find User'}
              </GhostButton>
            </form>

            {searchingUsers ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <tbody>
                    <TableSkeleton rows={3} cols={5} />
                  </tbody>
                </table>
              </div>
            ) : userResults.length === 0 ? (
              <div className="mt-4 p-8 border border-dashed border-line rounded-xl text-center">
                <Users className="h-8 w-8 text-ink-faint mx-auto mb-2" />
                <p className="text-xs font-semibold text-ink">Individual User Quota Lookup</p>
                <p className="text-[11px] text-ink-muted mt-1 max-w-md mx-auto">
                  Type a candidate or recruiter email above to inspect their effective quota and grant custom promotional trial demos.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-ink-faint">
                      <th className="pb-2 pr-4 font-bold">User</th>
                      <th className="pb-2 pr-4 font-bold">Role</th>
                      <th className="pb-2 pr-4 font-bold">Organization</th>
                      <th className="pb-2 pr-4 font-bold">Status</th>
                      <th className="pb-2 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userResults.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-line/60 align-middle transition-colors hover:bg-surface-2/70"
                      >
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-semibold text-xs text-ink">{u.fullName || 'User'}</p>
                            <p className="font-mono text-[11px] text-ink-muted">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Pill
                            tone={
                              u.role === 'recruiter'
                                ? 'cyan'
                                : u.role === 'super_admin'
                                ? 'violet'
                                : 'emerald'
                            }
                          >
                            {u.role}
                          </Pill>
                        </td>
                        <td className="py-3 pr-4 text-xs text-ink-muted">
                          {u.organizationName || 'Direct / Platform'}
                        </td>
                        <td className="py-3 pr-4">
                          <Pill tone={u.status === 'active' ? 'emerald' : 'rose'}>{u.status}</Pill>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void openEditUser(u)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink hover:border-cyan-500/40 hover:text-accent-cyan"
                          >
                            <Sliders className="h-3 w-3" />
                            Configure Quota
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Edit Signup Welcome Credits (Free Plan) Modal */}
      {signupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-base font-bold text-ink">Edit Free Plan — Signup Welcome Credits</h3>
              </div>
              <button
                type="button"
                onClick={() => setSignupModalOpen(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSignupForm} className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-inset px-3 py-2.5">
                <span className="text-xs font-semibold text-ink">Free Plan enabled platform-wide</span>
                <input
                  type="checkbox"
                  checked={signupForm.signup_free_enabled}
                  onChange={(e) => setSignupForm({ ...signupForm, signup_free_enabled: e.target.checked })}
                  className="h-4 w-4 accent-cyan-500"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Welcome Credits (₹0, one-time)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  required
                  value={signupForm.signup_free_credits}
                  onChange={(e) => setSignupForm({ ...signupForm, signup_free_credits: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
                <p className="mt-1 text-[11px] text-ink-faint">₹1 = 1 Credit. Granted exactly once per verified signup.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Grants Per User (one-time policy)
                </label>
                <input
                  type="number"
                  value={1}
                  disabled
                  readOnly
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink-muted outline-none font-mono opacity-70 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-ink-faint">Fixed at one-time per account. Enforced atomically in the backend.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Assigned To
                </label>
                <select
                  value={signupForm.signup_free_target_role}
                  onChange={(e) => setSignupForm({ ...signupForm, signup_free_target_role: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none"
                >
                  <option value="all">Everyone (Candidates & Recruiters)</option>
                  <option value="candidate">Candidates Only</option>
                  <option value="recruiter">Recruiters Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSignupModalOpen(false)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSignup}
                  className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {savingSignup ? 'Saving...' : 'Save Free Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Platform Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent-cyan" />
                <h3 className="text-base font-bold text-ink">Edit Platform Free Quota Policy</h3>
              </div>
              <button
                type="button"
                onClick={() => setPolicyModalOpen(false)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePolicyForm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Default Free Demo Count (per user)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={policyForm.default_free_demo_count}
                  onChange={(e) => setPolicyForm({ ...policyForm, default_free_demo_count: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Max Demo Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={policyForm.max_demo_duration_minutes}
                  onChange={(e) => setPolicyForm({ ...policyForm, max_demo_duration_minutes: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
                <p className="mt-1 text-[11px] text-ink-faint">Standard demo limit is 10 to 30 minutes.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Promo Bonus Allowance (Extra Global Demos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={policyForm.promo_bonus_allowance}
                  onChange={(e) => setPolicyForm({ ...policyForm, promo_bonus_allowance: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Eligible Roles
                </label>
                <select
                  value={policyForm.eligible_role}
                  onChange={(e) => setPolicyForm({ ...policyForm, eligible_role: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none"
                >
                  <option value="all">All Roles (Candidates & Recruiters)</option>
                  <option value="candidate">Candidates Only</option>
                  <option value="recruiter">Recruiters Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setPolicyModalOpen(false)}
                  className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer"
                >
                  {savingPolicy ? 'Saving...' : 'Save Policy Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Organization Override Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent-cyan" />
                <div>
                  <h3 className="text-base font-bold text-ink">Tenant Quota Override</h3>
                  <p className="text-[11px] text-ink-muted">{selectedOrg.org_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrgOverride} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Free Quotas for Tenant
                </label>
                <select
                  value={orgForm.is_free_quotas_enabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setOrgForm({ ...orgForm, is_free_quotas_enabled: e.target.value === 'enabled' })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none"
                >
                  <option value="enabled">Enabled (Tenant allows free demos)</option>
                  <option value="disabled">Disabled (No free demos for this tenant)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Demo Count Override (leave blank for platform default: {policy.default_free_demo_count})
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={`Platform default: ${policy.default_free_demo_count}`}
                  value={orgForm.free_demo_count_override}
                  onChange={(e) => setOrgForm({ ...orgForm, free_demo_count_override: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Duration Override in Minutes (leave blank for default: {Math.round(policy.max_demo_duration_seconds / 60)} min)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  placeholder={`Platform default: ${Math.round(policy.max_demo_duration_seconds / 60)} min`}
                  value={orgForm.max_demo_duration_minutes_override}
                  onChange={(e) => setOrgForm({ ...orgForm, max_demo_duration_minutes_override: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Promo Bonus Allowance
                </label>
                <input
                  type="number"
                  min="0"
                  value={orgForm.promo_bonus_allowance}
                  onChange={(e) => setOrgForm({ ...orgForm, promo_bonus_allowance: e.target.value })}
                  className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={handleResetOrgOverride}
                  disabled={savingOrgOverride}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-accent-rose hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to Defaults
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(null)}
                    className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingOrgOverride}
                    className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer"
                  >
                    {savingOrgOverride ? 'Saving...' : 'Save Tenant Override'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Quota Override Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-accent-cyan" />
                <div>
                  <h3 className="text-base font-bold text-ink">User Quota Grant</h3>
                  <p className="text-[11px] text-ink-muted">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {userQuotaLoading ? (
              <div className="py-8 text-center text-xs text-ink-muted">Loading user quota details...</div>
            ) : (
              <form onSubmit={handleSaveUserOverride} className="mt-4 space-y-4">
                {userQuota?.source && (
                  <div className="rounded-xl bg-surface-2 p-3 text-xs">
                    <span className="text-ink-faint">Effective Source: </span>
                    <span className="font-semibold text-accent-cyan capitalize">
                      {userQuota.source.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Free Quotas for User
                  </label>
                  <select
                    value={userForm.is_free_quotas_enabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setUserForm({ ...userForm, is_free_quotas_enabled: e.target.value === 'enabled' })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none"
                  >
                    <option value="enabled">Enabled (User eligible for free demo)</option>
                    <option value="disabled">Disabled (No free demo for this user)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Free Demo Count Override
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={`Platform default: ${policy.default_free_demo_count}`}
                    value={userForm.free_demo_count}
                    onChange={(e) => setUserForm({ ...userForm, free_demo_count: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Max Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder={`Platform default: ${Math.round(policy.max_demo_duration_seconds / 60)} min`}
                    value={userForm.max_demo_duration_minutes}
                    onChange={(e) => setUserForm({ ...userForm, max_demo_duration_minutes: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Promo Bonus Allowance (Extra Free Demos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={userForm.promo_bonus_allowance}
                    onChange={(e) => setUserForm({ ...userForm, promo_bonus_allowance: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">
                    Audit Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Executive VIP trial grant"
                    value={userForm.reason}
                    onChange={(e) => setUserForm({ ...userForm, reason: e.target.value })}
                    className="w-full rounded-xl border border-line bg-inset px-3 py-2 text-xs text-ink outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={handleResetUserOverride}
                    disabled={savingUserOverride}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-accent-rose hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Defaults
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingUserOverride}
                      className="rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-4 py-1.5 text-xs font-bold text-accent-cyan hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer"
                    >
                      {savingUserOverride ? 'Saving...' : 'Save User Override'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}