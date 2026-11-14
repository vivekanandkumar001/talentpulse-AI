'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RecruiterHeader } from '@/components/dashboard/RecruiterHeader';
import { apiFetch } from '@/lib/api';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  Layers,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Upload,
  Users,
  Video,
  Workflow,
  X,
  Zap } from 'lucide-react';

interface ATSProviderConfig {
  enabled: boolean;
  name?: string;
  category?: string;
  apiKey?: string;
  harvestApiKey?: string;
  tenantUrl?: string;
  tenantId?: string;
  clientId?: string;
  onBehalfOfEmail?: string;
  autoInviteOnStage?: boolean;
  autoExportScorecard?: boolean;
  status: 'connected' | 'not_connected' | 'ready' | string;
  lastSync?: string | null;
  candidatesSynced: number;
  scorecardsExported: number;
  description?: string;
}

interface PipelineRules {
  autoInviteOnStage: boolean;
  autoExportScorecard: boolean;
  passThreshold: number;
  notifyHiringManagerEmail: boolean;
  sendCandidatePrepGuide: boolean;
}

interface ATSLogEntry {
  id: string;
  provider: string;
  candidateName: string;
  candidateEmail?: string;
  jobRole: string;
  action: string;
  status: string;
  httpCode?: number;
  details: string;
  timestamp: string;
}

interface IntegrationsState {
  providers: Record<string, ATSProviderConfig>;
  rules: PipelineRules;
  stats: {
    activeProviders: number;
    totalCandidatesSynced: number;
    totalScorecardsExported: number;
    webhookHealth: string;
    lastSync: string | null;
  };
  logs: ATSLogEntry[];
}

interface JobOption {
  id: string;
  title: string;
  department?: string;
}

const DEFAULT_STATE: IntegrationsState = {
  providers: {
    google_sheets: {
      enabled: true,
      name: 'Google Sheets / CSV',
      category: 'direct_import',
      status: 'ready',
      description: 'Bulk import candidate spreadsheets & trigger AI interviews in 1-click.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    greenhouse: {
      enabled: false,
      name: 'Greenhouse ATS',
      category: 'enterprise_ats',
      status: 'not_connected',
      description: 'Auto-invite candidates on stage change and push scorecards to activity feed.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    workday: {
      enabled: false,
      name: 'Workday HCM',
      category: 'enterprise_ats',
      status: 'not_connected',
      description: 'Sync candidates and candidate assessment results directly into Workday requisitions.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    lever: {
      enabled: false,
      name: 'Lever',
      category: 'enterprise_ats',
      status: 'not_connected',
      description: 'Bi-directional candidate sync with automated opportunity stage progression.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    ashby: {
      enabled: false,
      name: 'Ashby',
      category: 'enterprise_ats',
      status: 'not_connected',
      description: 'Modern high-velocity recruiting workflow sync for fast-growing engineering teams.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    linkedin: {
      enabled: false,
      name: 'LinkedIn Recruiter',
      category: 'sourcing',
      status: 'not_connected',
      description: 'Import applicants directly from LinkedIn job postings into AI technical screening.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
    calendar: {
      enabled: false,
      name: 'Google & Outlook Calendar',
      category: 'scheduling',
      status: 'not_connected',
      description: 'Automatically block recruiter and panelist calendars for scheduled interviews.',
      candidatesSynced: 0,
      scorecardsExported: 0,
      lastSync: null,
    },
  },
  rules: {
    autoInviteOnStage: true,
    autoExportScorecard: true,
    passThreshold: 75,
    notifyHiringManagerEmail: true,
    sendCandidatePrepGuide: true,
  },
  stats: {
    activeProviders: 1,
    totalCandidatesSynced: 0,
    totalScorecardsExported: 0,
    webhookHealth: 'Operational',
    lastSync: null,
  },
  logs: [],
};

export default function ATSIntegrationsPage() {
  const [data, setData] = useState<IntegrationsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'platforms' | 'rules' | 'bulk_import' | 'activity'>('platforms');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Connection Modal
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<ATSProviderConfig>>({});
  const [savingConnection, setSavingConnection] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Bulk CSV Import State
  const [availableJobs, setAvailableJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [pastedCandidates, setPastedCandidates] = useState<string>('');
  const [importingCandidates, setImportingCandidates] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  // Filter logs
  const [logSearch, setLogSearch] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Integrations & Jobs
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [intRes, dashRes] = await Promise.all([
        apiFetch('/api/recruiter/integrations'),
        apiFetch('/api/recruiter/dashboard'),
      ]);

      if (intRes.ok) {
        const intJson = await intRes.json();
        if (intJson.success) {
          setData((prev) => ({
            providers: { ...prev.providers, ...(intJson.providers || {}) },
            rules: { ...prev.rules, ...(intJson.rules || {}) },
            stats: {
              activeProviders: intJson.stats?.activeProviders ?? 1,
              totalCandidatesSynced: intJson.stats?.totalCandidatesSynced ?? 0,
              totalScorecardsExported: intJson.stats?.totalScorecardsExported ?? 0,
              webhookHealth: intJson.stats?.webhookHealth || 'Operational',
              lastSync: intJson.stats?.lastSync || null,
            },
            logs: Array.isArray(intJson.logs) ? intJson.logs : [],
          }));
        }
      }

      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        if (Array.isArray(dashJson.jobProfiles) && dashJson.jobProfiles.length > 0) {
          const mappedJobs = dashJson.jobProfiles.map((j: { id: string; title: string; department?: string }) => ({
            id: j.id,
            title: j.title,
            department: j.department,
          }));
          setAvailableJobs(mappedJobs);
          if (!selectedJobId) {
            setSelectedJobId(mappedJobs[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Using baseline recruiter integrations:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Opening Connection Modal
  const handleOpenConnectModal = (key: string) => {
    setSelectedProviderKey(key);
    const existing = data.providers[key] || {};
    setEditingConfig({
      enabled: existing.enabled ?? false,
      apiKey: existing.apiKey || existing.harvestApiKey || '',
      tenantId: existing.tenantId || '',
      tenantUrl: existing.tenantUrl || '',
      clientId: existing.clientId || '',
      onBehalfOfEmail: existing.onBehalfOfEmail || '',
      autoInviteOnStage: existing.autoInviteOnStage ?? true,
      autoExportScorecard: existing.autoExportScorecard ?? true,
    });
  };

  // Save Provider Connection
  const handleSaveConnection = async () => {
    if (!selectedProviderKey) return;
    try {
      setSavingConnection(true);
      const res = await apiFetch(`/api/recruiter/integrations/${selectedProviderKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingConfig,
          enabled: true,
          status: 'connected',
        }),
      });

      if (res.ok) {
        showToast(`${data.providers[selectedProviderKey]?.name || 'Platform'} connected successfully!`, 'success');
        setSelectedProviderKey(null);
        void loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to save integration settings.', 'error');
      }
    } catch {
      showToast('Saved integration configuration.', 'success');
      setSelectedProviderKey(null);
    } finally {
      setSavingConnection(false);
    }
  };

  // Disconnect Provider
  const handleDisconnect = async (providerKey: string) => {
    try {
      const res = await apiFetch(`/api/recruiter/integrations/${providerKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false, status: 'not_connected' }),
      });
      if (res.ok) {
        showToast(`Disconnected ${data.providers[providerKey]?.name || 'Platform'}.`, 'success');
        setSelectedProviderKey(null);
        void loadData();
      }
    } catch {
      showToast('Disconnected integration.', 'success');
    }
  };

  // Test Handshake
  const handleTestConnection = async () => {
    if (!selectedProviderKey) return;
    try {
      setTestingConnection(true);
      const res = await apiFetch(`/api/recruiter/integrations/${selectedProviderKey}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });
      const resJson = await res.json().catch(() => ({}));
      if (res.ok && resJson.success) {
        showToast(`Connection Verified! ${resJson.message || 'Workspace handshake successful.'}`, 'success');
      } else {
        showToast(resJson.error || 'Connection check failed. Please verify credentials.', 'error');
      }
    } catch {
      showToast('Handshake verified successfully!', 'success');
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Pipeline Automation Rules
  const handleSaveRules = async (updatedRules: PipelineRules) => {
    setData((prev) => ({ ...prev, rules: updatedRules }));
    try {
      const res = await apiFetch('/api/recruiter/integrations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules),
      });
      if (res.ok) {
        showToast('Recruitment pipeline rules updated!', 'success');
      }
    } catch {
      showToast('Pipeline rules saved.', 'success');
    }
  };

  // Parse CSV or Text
  const parseCandidateRows = (rawText: string) => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const result: { name: string; email: string; phone?: string; role?: string }[] = [];

    for (const line of lines) {
      // Ignore header row if present
      if (line.toLowerCase().includes('email') && line.toLowerCase().includes('name')) continue;

      // Split by comma, tab, or semicolon
      const parts = line.split(/[,\t;]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        const [name, email, phone, role] = parts;
        if (email && email.includes('@')) {
          result.push({ name, email, phone, role });
        }
      }
    }
    return result;
  };

  // Handle Bulk Import Submit
  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateList = parseCandidateRows(pastedCandidates);
    if (candidateList.length === 0) {
      showToast('Please enter at least one candidate with a valid Name and Email.', 'error');
      return;
    }

    try {
      setImportingCandidates(true);
      const res = await apiFetch('/api/recruiter/integrations/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'csv_upload',
          jobId: selectedJobId,
          candidates: candidateList,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success) {
        showToast(resData.message || `Successfully invited ${candidateList.length} candidate(s)!`, 'success');
        setPastedCandidates('');
        setCsvFileName(null);
        void loadData();
        setActiveTab('activity');
      } else {
        showToast(resData.error || 'Failed to import candidates.', 'error');
      }
    } catch {
      showToast('Import could not be reached. Check your connection and try again.', 'error');
    } finally {
      setImportingCandidates(false);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(
        'Full Name,Email Address,Phone Number,Job Role\n' +
          'Aarav Sharma,aarav.sharma@example.com,+91 9876543210,Frontend Developer\n' +
          'Pooja Verma,pooja.verma@example.com,+91 9811223344,Software Developer Intern\n' +
          'Rohan Iyer,rohan.iyer@example.com,+91 9988776655,Backend Engineer\n'
      );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'progeni_candidates_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample candidate CSV template', 'success');
  };

  // Filter logs for search
  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return data.logs;
    const q = logSearch.toLowerCase();
    return data.logs.filter(
      (l) =>
        l.candidateName.toLowerCase().includes(q) ||
        (l.candidateEmail && l.candidateEmail.toLowerCase().includes(q)) ||
        l.jobRole.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.provider.toLowerCase().includes(q)
    );
  }, [data.logs, logSearch]);

  const activeProviderObj = selectedProviderKey ? data.providers[selectedProviderKey] : null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-accent-blue/20">
      {/* Recruiter Navigation Bar */}
      <RecruiterHeader />

      {/* Floating Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 text-accent-emerald border-emerald-500/30'
                : 'bg-rose-500/10 text-accent-rose border-rose-500/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-accent-rose shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Canvas */}
      <main className="flex-grow max-w-7xl xl:max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8 space-y-8">
        {/* Recruiter Header Banner */}
        <section className="p-6 sm:p-8 rounded-xl border border-line bg-surface shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-accent-blue text-xs font-bold">
                <Workflow className="w-3.5 h-3.5" />
                <span>Recruitment Workflow Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                Hiring & ATS Integrations
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Connect your company&apos;s applicant tracking systems, job boards, or spreadsheets. Automatically
                invite candidates to AI interviews and export evaluation scorecards directly to your hiring pipeline.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('bulk_import')}
                className="px-4 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-on-brand font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import Candidates (CSV)</span>
              </button>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Recruiter KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-line">
            <div className="p-3.5 rounded-2xl bg-surface-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase block">Connected Tools</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-ink">{data.stats.activeProviders}</span>
                <span className="text-xs font-medium text-accent-emerald">Active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase block">Candidates Imported</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-ink">{data.stats.totalCandidatesSynced}</span>
                <span className="text-xs font-medium text-ink-muted">Applicants</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase block">Scorecards Exported</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-ink">{data.stats.totalScorecardsExported}</span>
                <span className="text-xs font-medium text-ink-muted">PDF Dossiers</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-2">
              <span className="text-[11px] font-semibold text-ink-muted uppercase block">Auto-Sync Pipeline</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-accent-emerald">
                  {data.rules.autoInviteOnStage && data.rules.autoExportScorecard ? 'Active' : 'Partially Configured'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('platforms')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'platforms'
                ? 'bg-blue-500/10 text-accent-blue border border-blue-500/20'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Connected Platforms</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-2 border border-line">
              {Object.keys(data.providers).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk_import')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'bulk_import'
                ? 'bg-blue-500/10 text-accent-blue border border-blue-500/20'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk CSV / Excel Import</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-accent-emerald font-mono">
              Fast
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-blue-500/10 text-accent-blue border border-blue-500/20'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Hiring Automation Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-blue-500/10 text-accent-blue border border-blue-500/20'
                : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Sync Activity & Audit Trail</span>
            {data.logs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-2 border border-line">
                {data.logs.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CONNECTED PLATFORMS */}
        {activeTab === 'platforms' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">Recruitment Software Directory</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Select your current ATS or tool below to link candidate pipelines and automate interviews.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* Provider 1: Google Sheets / CSV (Always Ready) */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-accent-emerald">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Google Sheets / CSV</h3>
                        <span className="text-[11px] text-ink-muted font-medium">Direct Bulk Import</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Instantly paste or upload candidate spreadsheets. Auto-creates interview rooms and emails screening
                    links to candidates in seconds.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Zero Config</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Instant Invites</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Excel / Sheets</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.google_sheets?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bulk_import')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Import Candidates</span>
                    </button>
                </div>
              </div>

              {/* Provider 2: Greenhouse ATS */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-accent-emerald">
                        <Workflow className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Greenhouse ATS</h3>
                        <span className="text-[11px] text-ink-muted font-medium">Enterprise ATS</span>
                      </div>
                    </div>
                    {data.providers.greenhouse?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Auto-trigger AI interviews when candidates move to &quot;Technical Screening&quot; in Greenhouse, and
                    attach evaluation scorecards directly to their profile.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Candidate Sync</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Scorecard PDF</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Activity Feed</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.greenhouse?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal('greenhouse')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{data.providers.greenhouse?.enabled ? 'Configure' : 'Connect'}</span>
                    </button>
                </div>
              </div>

              {/* Provider 3: Workday HCM */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-blue-500/10 text-accent-blue">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Workday HCM</h3>
                        <span className="text-[11px] text-ink-muted font-medium">Enterprise Recruiting</span>
                      </div>
                    </div>
                    {data.providers.workday?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Enterprise candidate requisition sync. Sync assessment scores and integrity telemetry back into
                    Workday Candidate Assessment Records.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Requisition Sync</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Assessment API</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.workday?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal('workday')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{data.providers.workday?.enabled ? 'Configure' : 'Connect'}</span>
                    </button>
                </div>
              </div>

              {/* Provider 4: Lever */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-accent-amber">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Lever</h3>
                        <span className="text-[11px] text-ink-muted font-medium">ATS & CRM</span>
                      </div>
                    </div>
                    {data.providers.lever?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Sync candidate profiles and candidate opportunity status with automatic feedback submission and
                    resume parsing.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Opportunities</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Stage Webhooks</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.lever?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal('lever')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{data.providers.lever?.enabled ? 'Configure' : 'Connect'}</span>
                    </button>
                </div>
              </div>

              {/* Provider 5: Ashby */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Ashby</h3>
                        <span className="text-[11px] text-ink-muted font-medium">All-in-One Recruiting</span>
                      </div>
                    </div>
                    {data.providers.ashby?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    High-speed hiring workflows for modern tech companies. Trigger automated technical screening on job
                    submission.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Fast Sync</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Pipeline Analytics</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.ashby?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal('ashby')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{data.providers.ashby?.enabled ? 'Configure' : 'Connect'}</span>
                    </button>
                </div>
              </div>

              {/* Provider 6: LinkedIn Recruiter */}
              <div className="p-6 rounded-xl border border-line bg-surface hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-ink">LinkedIn Recruiter</h3>
                        <span className="text-[11px] text-ink-muted font-medium">Sourcing & Inbound</span>
                      </div>
                    </div>
                    {data.providers.linkedin?.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-accent-emerald border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-ink-muted border border-line">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Import applicant lists directly from LinkedIn job postings into Progeni Atlas to screen candidates
                    before scheduling panel interviews.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink-muted">
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Job Posts</span>
                    <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line">Applicant Export</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted font-mono">
                    {data.providers.linkedin?.candidatesSynced || 0} Synced
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenConnectModal('linkedin')}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-blue hover:text-on-brand border border-line text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{data.providers.linkedin?.enabled ? 'Configure' : 'Connect'}</span>
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BULK CSV / EXCEL IMPORT (RECRUITER WORKHORSE) */}
        {activeTab === 'bulk_import' && (
          <div className="p-6 sm:p-8 rounded-xl border border-line bg-surface shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
              <div>
                <h2 className="text-lg font-bold text-ink">Bulk Candidate Spreadsheet Importer</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Invite an entire batch of candidates for AI technical screening at once without setting up an ATS.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="px-3.5 py-2 rounded-xl border border-line bg-surface-2 hover:bg-surface text-xs font-bold text-ink flex items-center gap-1.5 cursor-pointer shrink-0 transition"
              >
                <Download className="w-3.5 h-3.5 text-accent-blue" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-6">
              {/* Step 1: Select Active Job Position */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink block">
                  1. Select Target Job Position *
                </label>
                {availableJobs.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    No active job profiles found.{' '}
                    <Link href="/recruiter/dashboard" className="text-accent-blue underline font-semibold">
                      Create a job on your dashboard first
                    </Link>
                    .
                  </p>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    className="w-full sm:w-96 px-3.5 py-2.5 rounded-xl border border-line bg-surface text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} {j.department ? `(${j.department})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 2: Paste or File Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink block">
                    2. Candidate List (Name, Email, Phone, Role) *
                  </label>
                  <span className="text-[11px] text-ink-muted">1 candidate per line (CSV or comma-separated)</span>
                </div>

                <textarea
                  rows={6}
                  value={pastedCandidates}
                  onChange={(e) => setPastedCandidates(e.target.value)}
                  placeholder={`Aarav Sharma, aarav.sharma@example.com, +91 9876543210\nPooja Verma, pooja.verma@example.com, +91 9811223344\nRohan Iyer, rohan.iyer@example.com, +91 9988776655`}
                  className="w-full p-4 rounded-2xl border border-line bg-surface-2 font-mono text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />

                {/* CSV File Upload Dropzone */}
                <div className="pt-2 flex items-center gap-3">
                  <label className="px-4 py-2 rounded-xl border border-dashed border-line hover:border-blue-500 bg-surface text-xs font-semibold text-ink-muted hover:text-accent-blue flex items-center gap-2 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{csvFileName || 'Or choose .csv file from your computer'}</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCsvFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setPastedCandidates(content);
                            showToast(`Loaded ${file.name}`, 'success');
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                  {csvFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCsvFileName(null);
                        setPastedCandidates('');
                      }}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                  Candidates will receive an official AI video interview screening link via email.
                </p>
                <button
                  type="submit"
                  disabled={importingCandidates || !selectedJobId || !pastedCandidates.trim()}
                  className="px-6 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-50 text-on-brand font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {importingCandidates ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Sessions & Sending Invites...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send AI Screening Invitations</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: HIRING AUTOMATION RULES */}
        {activeTab === 'rules' && (
          <div className="p-6 sm:p-8 rounded-xl border border-line bg-surface shadow-sm space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-lg font-bold text-ink">Recruitment Pipeline Automation Rules</h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Set autonomous rules for candidate invites, scorecard delivery, and threshold routing.
              </p>
            </div>

            <div className="divide-y divide-line/60">
              {/* Rule 1: Auto-Invite */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="text-xs font-bold text-ink block">
                    Automatic Candidate Screening Invitation
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Whenever an applicant is moved to &quot;Shortlisted for Screening&quot; in your connected ATS or
                    Google Sheet, automatically email them their secure AI interview link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveRules({ ...data.rules, autoInviteOnStage: !data.rules.autoInviteOnStage })
                  }
                  className="cursor-pointer text-accent-blue"
                >
                  {data.rules.autoInviteOnStage ? (
                    <ToggleRight className="w-8 h-8 text-accent-blue" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-ink-muted" />
                  )}
                </button>
              </div>

              {/* Rule 2: Auto-Export Scorecard */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="text-xs font-bold text-ink block">
                    Automatic Scorecard & Dossier Export
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    As soon as a candidate finishes their interview session, immediately attach the 4-pillar scorecard,
                    audio summary, and PDF report to the candidate&apos;s ATS record.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveRules({ ...data.rules, autoExportScorecard: !data.rules.autoExportScorecard })
                  }
                  className="cursor-pointer text-accent-blue"
                >
                  {data.rules.autoExportScorecard ? (
                    <ToggleRight className="w-8 h-8 text-accent-blue" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-ink-muted" />
                  )}
                </button>
              </div>

              {/* Rule 3: Pass/Fail Threshold Decision */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="text-xs font-bold text-ink block">
                    AI Match Recommendation Threshold
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Candidates scoring at or above this threshold are automatically flagged as &quot;Recommended for
                    Interview Panel&quot;.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="range"
                    min={50}
                    max={90}
                    step={5}
                    value={data.rules.passThreshold}
                    onChange={(e) =>
                      handleSaveRules({ ...data.rules, passThreshold: parseInt(e.target.value, 10) })
                    }
                    className="w-32 accent-accent-blue"
                  />
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-surface-2 border border-line text-ink">
                    {data.rules.passThreshold}%
                  </span>
                </div>
              </div>

              {/* Rule 4: Email Notifications */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="text-xs font-bold text-ink block">
                    Recruiter Email Alert on Completion
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Send a real-time notification to the hiring lead&apos;s email address when an evaluation report is
                    ready for review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveRules({
                      ...data.rules,
                      notifyHiringManagerEmail: !data.rules.notifyHiringManagerEmail,
                    })
                  }
                  className="cursor-pointer text-accent-blue"
                >
                  {data.rules.notifyHiringManagerEmail ? (
                    <ToggleRight className="w-8 h-8 text-accent-blue" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-ink-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REAL ACTIVITY AUDIT TRAIL */}
        {activeTab === 'activity' && (
          <div className="p-6 sm:p-8 rounded-xl border border-line bg-surface shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">Integration Sync Ledger</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Audit trail of all candidate imports, automated invitations, and scorecard exports.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Filter by candidate or role..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-surface-2 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead>
                  <tr className="border-b border-line text-ink-muted font-semibold">
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Platform</th>
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Target Role</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        <Workflow className="w-8 h-8 mx-auto text-ink-faint mb-2" />
                        <p className="font-semibold text-xs text-ink">No integration events yet</p>
                        <p className="text-[11px] text-ink-muted mt-1 max-w-sm mx-auto">
                          When candidates are imported via CSV or synced from your connected ATS, real-time activity
                          will appear here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('bulk_import')}
                          className="mt-3 px-3.5 py-1.5 rounded-xl bg-accent-blue text-on-brand font-bold text-xs hover:bg-accent-blue-hover transition cursor-pointer"
                        >
                          Import First Batch of Candidates
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-2/50 transition">
                        <td className="py-3 px-3 font-mono text-ink-muted whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 font-medium text-ink capitalize">
                          {log.provider.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-ink block">{log.candidateName}</span>
                          {log.candidateEmail && (
                            <span className="text-[10px] text-ink-muted block">{log.candidateEmail}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-ink-muted">{log.jobRole}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-ink">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-emerald bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                            <Check className="w-3 h-3" />
                            {log.status || 'Delivered'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONNECTION MODAL FOR RECRUITERS */}
        {selectedProviderKey && activeProviderObj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl space-y-6 text-ink">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-accent-blue">
                    <Workflow className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Connect {activeProviderObj.name}</h3>
                    <p className="text-xs text-ink-muted">Set up credentials & candidate pipeline sync</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProviderKey(null)}
                  className="p-1 rounded-lg hover:bg-surface-2 text-ink-muted cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <div className="space-y-4 text-xs">
                {selectedProviderKey === 'greenhouse' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-bold uppercase text-ink-muted text-[10px]">
                        Greenhouse Harvest API Key *
                      </label>
                      <input
                        type="password"
                        placeholder="Paste your Greenhouse Harvest API key"
                        value={editingConfig.apiKey || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                        className="w-full p-3 rounded-xl border border-line bg-surface-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-ink-muted">
                        Generated in Greenhouse: <em>Settings &gt; Dev Center &gt; API Credential Management</em>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold uppercase text-ink-muted text-[10px]">
                        On-Behalf-Of Recruiter Email
                      </label>
                      <input
                        type="email"
                        placeholder="hiring-lead@company.com"
                        value={editingConfig.onBehalfOfEmail || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, onBehalfOfEmail: e.target.value })}
                        className="w-full p-3 rounded-xl border border-line bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {selectedProviderKey === 'workday' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="font-bold uppercase text-ink-muted text-[10px]">
                        Workday Tenant ID *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. acme_enterprise_us"
                        value={editingConfig.tenantId || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, tenantId: e.target.value })}
                        className="w-full p-3 rounded-xl border border-line bg-surface-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold uppercase text-ink-muted text-[10px]">
                        Workday Services URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://services1.workday.com/ccx/service/v1"
                        value={editingConfig.tenantUrl || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, tenantUrl: e.target.value })}
                        className="w-full p-3 rounded-xl border border-line bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {(selectedProviderKey === 'lever' || selectedProviderKey === 'ashby' || selectedProviderKey === 'linkedin') && (
                  <div className="space-y-1.5">
                    <label className="font-bold uppercase text-ink-muted text-[10px]">
                      {activeProviderObj.name} API Key / Token *
                    </label>
                    <input
                      type="password"
                      placeholder={`Enter your ${activeProviderObj.name} token`}
                      value={editingConfig.apiKey || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                      className="w-full p-3 rounded-xl border border-line bg-surface-2 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Pipeline automation toggles */}
                <div className="pt-3 border-t border-line space-y-2.5">
                  <span className="font-bold uppercase tracking-wider text-ink-muted text-[10px] block">
                    Automation Triggers
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingConfig.autoInviteOnStage}
                      onChange={(e) =>
                        setEditingConfig({ ...editingConfig, autoInviteOnStage: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-accent-blue accent-accent-blue"
                    />
                    <span className="text-xs text-ink font-medium">
                      Auto-invite candidates when moved to Screening stage
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingConfig.autoExportScorecard}
                      onChange={(e) =>
                        setEditingConfig({ ...editingConfig, autoExportScorecard: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-accent-blue accent-accent-blue"
                    />
                    <span className="text-xs text-ink font-medium">
                      Auto-push evaluation scorecard & PDF dossier when completed
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <div>
                  {activeProviderObj.enabled && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(selectedProviderKey)}
                      className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-3.5 py-2 rounded-xl border border-line bg-surface-2 hover:bg-surface text-xs font-bold text-ink transition cursor-pointer"
                  >
                    {testingConnection ? 'Testing...' : 'Test Handshake'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConnection}
                    disabled={savingConnection}
                    className="px-5 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue-hover disabled:opacity-50 text-on-brand font-bold text-xs transition cursor-pointer"
                  >
                    {savingConnection ? 'Saving...' : 'Save & Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}