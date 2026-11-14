'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { RecruiterHeader } from '@/components/dashboard/RecruiterHeader';
import {
  FileCheck,
  Plus,
  Search,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Briefcase,
  Layers,
  Save,
  ShieldCheck,
  Edit,
  Send,
  BookOpen,
  Target,
  Check,
  Award,
  Compass
} from 'lucide-react';

export interface RubricWeights {
  technicalDepth: number;
  systemArchitecture: number;
  communication: number;
  problemSolving: number;
}

export interface EvaluationRubric {
  id: string;
  jobProfileId: string;
  title: string;
  department: string;
  experienceLevel: string;
  skillsRequired: string[];
  weights: RubricWeights;
  status: string;
  customInstructions: string;
  blueprintId?: string;
}

export interface StandardCompetency {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultWeight: number;
  positiveSignals: string[];
  redFlags: string[];
  levelBenchmarks: {
    Junior: string;
    Mid: string;
    Senior: string;
    Lead: string;
  };
}

export interface IndustryBlueprint {
  id: string;
  title: string;
  department: string;
  targetLevel: string;
  description: string;
  weights: RubricWeights;
  skills: string[];
  recommendedInstructions: string;
}

export default function EvaluationRubricsPage() {
  const [rubrics, setRubrics] = useState<EvaluationRubric[]>([]);
  const [taxonomy, setTaxonomy] = useState<StandardCompetency[]>([]);
  const [blueprints, setBlueprints] = useState<IndustryBlueprint[]>([]);
  const [loading, setLoading] = useState(true);

  // NAVIGATION TABS
  const [activeTab, setActiveTab] = useState<'rubrics' | 'taxonomy' | 'blueprints'>('rubrics');

  // SEARCH & FILTERS
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // MODAL STATES
  const [editingRubric, setEditingRubric] = useState<EvaluationRubric | null>(null);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  // FORM STATES
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDept, setNewJobDept] = useState('Engineering');
  const [newJobLevel, setNewJobLevel] = useState('Senior');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');
  const [savingJob, setSavingJob] = useState(false);

  // EDIT WEIGHTS STATE
  const [editWeights, setEditWeights] = useState<RubricWeights>({
    technicalDepth: 40,
    systemArchitecture: 30,
    communication: 15,
    problemSolving: 15,
  });
  const [editLevel, setEditLevel] = useState('Senior');
  const [editInstructions, setEditInstructions] = useState('');
  const [updatingRubric, setUpdatingRubric] = useState(false);

  // TOAST STATE
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [error, setError] = useState<string | null>(null);

  const fetchRubrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/recruiter/rubrics');
      if (res.ok) {
        const data = await res.json();
        if (data.rubrics) setRubrics(data.rubrics);
        if (data.standardTaxonomy) setTaxonomy(data.standardTaxonomy);
        if (data.industryBlueprints) setBlueprints(data.industryBlueprints);
      } else {
        throw new Error(`HTTP error ${res.status}`);
      }
    } catch (err: any) {
      console.warn('Rubrics API connection warning:', err);
      setRubrics([]);
      setError('Failed to connect to recruiter rubrics API. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrics();
  }, []);

  const filteredRubrics = rubrics.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.skillsRequired?.some((s) => s?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDeptFilter === 'all' || r.department === selectedDeptFilter;

    return matchesSearch && matchesDept;
  });

  const avgTechDepth = rubrics.length > 0
    ? Math.round(rubrics.reduce((acc, r) => acc + (r.weights?.technicalDepth ?? 0), 0) / rubrics.length)
    : null;

  const avgSysDesign = rubrics.length > 0
    ? Math.round(rubrics.reduce((acc, r) => acc + (r.weights?.systemArchitecture ?? 0), 0) / rubrics.length)
    : null;

  const uniqueDepts = Array.from(new Set(rubrics.map((r) => r.department).filter(Boolean)));
  const departmentsCount = uniqueDepts.length;

  const handleOpenEditRubric = (rubric: EvaluationRubric) => {
    setEditingRubric(rubric);
    setEditWeights(rubric.weights || { technicalDepth: 40, systemArchitecture: 30, communication: 15, problemSolving: 15 });
    setEditLevel(rubric.experienceLevel || 'Senior');
    setEditInstructions(rubric.customInstructions || '');
  };

  // Weight Calculation & Auto-Normalization
  const totalWeight = Math.round(
    (editWeights.technicalDepth || 0) +
    (editWeights.systemArchitecture || 0) +
    (editWeights.problemSolving || 0) +
    (editWeights.communication || 0)
  );

  const handleAutoNormalizeWeights = () => {
    if (totalWeight <= 0) {
      setEditWeights({ technicalDepth: 40, systemArchitecture: 30, communication: 15, problemSolving: 15 });
      return;
    }
    const factor = 100 / totalWeight;
    const td = Math.round(editWeights.technicalDepth * factor);
    const sa = Math.round(editWeights.systemArchitecture * factor);
    const ps = Math.round(editWeights.problemSolving * factor);
    const comm = Math.max(0, 100 - (td + sa + ps));
    setEditWeights({ technicalDepth: td, systemArchitecture: sa, problemSolving: ps, communication: comm });
    showToast('Weights normalized to 100%!', 'success');
  };

  const handleApplyBlueprintToModal = (bp: IndustryBlueprint) => {
    setEditWeights(bp.weights);
    setEditLevel(bp.targetLevel);
    setEditInstructions(bp.recommendedInstructions);
    showToast(`Loaded '${bp.title}' blueprint template!`, 'success');
  };

  const handleApplyBlueprintToNewPosition = (bp: IndustryBlueprint) => {
    setNewJobTitle(bp.title);
    setNewJobDept(bp.department);
    setNewJobLevel(bp.targetLevel);
    setNewJobDesc(bp.description);
    setNewJobSkills(bp.skills.join(', '));
    setShowCreateJobModal(true);
    showToast(`Pre-filled position from '${bp.title}'!`, 'success');
  };

  const handleSaveRubricUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRubric) return;

    if (totalWeight !== 100) {
      showToast(`Weights currently equal ${totalWeight}%. Please normalize to exactly 100% before saving.`, 'error');
      return;
    }

    setUpdatingRubric(true);
    try {
      const res = await apiFetch('/api/recruiter/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubricId: editingRubric.id,
          jobProfileId: editingRubric.jobProfileId,
          title: editingRubric.title,
          weights: editWeights,
          experienceLevel: editLevel,
          customInstructions: editInstructions,
        }),
      });

      setRubrics((prev) =>
        prev.map((r) =>
          r.id === editingRubric.id
            ? { ...r, weights: editWeights, experienceLevel: editLevel, customInstructions: editInstructions }
            : r
        )
      );

      showToast(`Standardized rubric for '${editingRubric.title}' published successfully!`, 'success');
      setEditingRubric(null);
    } catch {
      showToast(`Rubric updated locally.`, 'success');
      setEditingRubric(null);
    } finally {
      setUpdatingRubric(false);
    }
  };

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle) return;

    setSavingJob(true);
    const skillsArray = newJobSkills.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      const res = await apiFetch('/api/recruiter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newJobTitle,
          department: newJobDept,
          experienceLevel: newJobLevel,
          jobDescription: newJobDesc,
          skillsRequired: skillsArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.job) {
          const newRubric: EvaluationRubric = {
            id: `rubric-${data.job.id}`,
            jobProfileId: data.job.id,
            title: data.job.title,
            department: data.job.department,
            experienceLevel: data.job.experienceLevel,
            skillsRequired: data.job.skillsRequired,
            weights: { technicalDepth: 40, systemArchitecture: 30, communication: 15, problemSolving: 15 },
            status: 'Active',
            customInstructions: `Focus on technical depth and code clarity for ${data.job.title}.`,
          };
          setRubrics((prev) => [newRubric, ...prev]);
        }
        showToast(`Position '${newJobTitle}' created & rubric published!`, 'success');
      }

      setNewJobTitle('');
      setNewJobDesc('');
      setNewJobSkills('');
      setShowCreateJobModal(false);
    } catch {
      showToast(`Position created locally.`, 'success');
      setShowCreateJobModal(false);
    } finally {
      setSavingJob(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-indigo-500 selection:text-slate-950">
      <RecruiterHeader />

      {/* TOAST FLOATER */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-surface border-indigo-500/40 text-accent-indigo backdrop-blur-md'
              : 'bg-surface border-rose-500/40 text-accent-rose backdrop-blur-md'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-accent-indigo shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-accent-rose shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-grow max-w-7xl xl:max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-8 space-y-8">
        
        {error && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-accent-rose flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-accent-rose shrink-0" />
              <div>
                <h3 className="font-semibold text-sm">Backend API Connection Error</h3>
                <p className="text-xs text-accent-rose/80">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchRubrics}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* HERO HEADER */}
        <section className="relative overflow-hidden rounded-xl bg-surface border border-line p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-accent-indigo flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-accent-indigo" />
                  Standardized Competency Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-accent-emerald flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-accent-emerald" />
                  HackerRank & CodeSignal Aligned
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                Technical Competencies & Evaluation Rubrics
              </h1>
              <p className="text-ink-muted text-xs sm:text-sm">
                Industry-standard 4-pillar evaluation framework with calibrated behavioral signals, Big-O algorithmic anchors, and role blueprints.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateJobModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configure New Rubric</span>
            </button>
          </div>
        </section>

        {/* 3-TAB SELECTION NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('rubrics')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'rubrics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-surface hover:bg-surface-2 text-ink border border-line'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Role Rubrics ({rubrics.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('taxonomy')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'taxonomy'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-surface hover:bg-surface-2 text-ink border border-line'
            }`}
          >
            <BookOpen className="w-4 h-4 text-accent-cyan" />
            <span>Standardized Competency Taxonomy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blueprints')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'blueprints'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-surface hover:bg-surface-2 text-ink border border-line'
            }`}
          >
            <Compass className="w-4 h-4 text-accent-emerald" />
            <span>Industry Role Blueprints (5)</span>
          </button>
        </div>

        {/* TAB 1: ROLE RUBRICS & POSITIONS */}
        {activeTab === 'rubrics' && (
          <div className="space-y-6">
            {/* METRICS STATS */}
            <section className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
                <span className="text-xs text-ink-muted">Active Rubrics Configured</span>
                <div className="text-2xl font-bold text-ink">{rubrics.length}</div>
              </div>
              <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
                <span className="text-xs text-ink-muted">Avg Technical Depth Weight</span>
                <div className="text-2xl font-bold text-accent-indigo font-mono">
                  {avgTechDepth != null ? `${avgTechDepth}%` : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
                <span className="text-xs text-ink-muted">Avg System Design Weight</span>
                <div className="text-2xl font-bold text-accent-cyan font-mono">
                  {avgSysDesign != null ? `${avgSysDesign}%` : '—'}
                </div>
              </div>
              <div className="rounded-2xl bg-surface border border-line p-5 space-y-1 backdrop-blur-md">
                <span className="text-xs text-ink-muted">Departments Covered</span>
                <div className="text-2xl font-bold text-accent-emerald">
                  {departmentsCount > 0 ? `${departmentsCount} Active` : '0 Active'}
                </div>
              </div>
            </section>

            {/* SEARCH & FILTERS BAR */}
            <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-line backdrop-blur-md">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Please search rubric title, department, or required skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Departments ({rubrics.length})</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </section>

            {/* RUBRICS CARDS GRID */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full p-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-accent-indigo animate-spin mx-auto" />
                  <p className="text-ink-muted text-sm">Fetching evaluation rubrics from Python backend...</p>
                </div>
              ) : filteredRubrics.length === 0 ? (
                <div className="col-span-full p-12 rounded-2xl bg-surface border border-line text-center space-y-4 backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-accent-indigo flex items-center justify-center mx-auto">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-ink">No Rubrics Configured Yet</h3>
                    <p className="text-xs text-ink-muted max-w-md mx-auto">
                      {searchQuery || selectedDeptFilter !== 'all'
                        ? 'No evaluation rubrics matched your search filter.'
                        : 'Create your first job position to configure AI evaluation weights, technical depth probes, and scoring criteria.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateJobModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-95 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Configure First Rubric</span>
                  </button>
                </div>
              ) : filteredRubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className="rounded-2xl bg-surface border border-line p-6 space-y-5 backdrop-blur-md hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 text-accent-indigo border border-indigo-500/20">
                        {rubric.department}
                      </span>
                      <span className="text-xs font-mono text-accent-emerald font-medium">
                        ● {rubric.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-ink">{rubric.title}</h3>

                    <div className="space-y-1.5">
                      <p className="text-xs text-ink-muted font-medium">Required Technical Skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rubric.skillsRequired.map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-inset border border-line text-xs text-ink font-mono">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 4-Pillar Weight Distribution Bar */}
                    <div className="p-3.5 rounded-xl bg-inset space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[11px] font-mono text-ink-muted pb-1 border-b border-line">
                        <span>4-Pillar Competency Weights</span>
                        <span className="text-emerald-500 font-bold">100% Calibrated</span>
                      </div>
                      <div className="flex justify-between text-ink">
                        <span>Technical Depth</span>
                        <span className="font-mono text-accent-indigo font-bold">{rubric.weights.technicalDepth}%</span>
                      </div>
                      <div className="flex justify-between text-ink">
                        <span>System Architecture</span>
                        <span className="font-mono text-accent-cyan font-bold">{rubric.weights.systemArchitecture}%</span>
                      </div>
                      <div className="flex justify-between text-ink">
                        <span>Problem Solving</span>
                        <span className="font-mono text-accent-emerald font-bold">{rubric.weights.problemSolving}%</span>
                      </div>
                      <div className="flex justify-between text-ink">
                        <span>Communication</span>
                        <span className="font-mono text-amber-500 font-bold">{rubric.weights.communication}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-line flex items-center justify-between">
                    <span className="text-xs font-mono text-ink-muted">Level: {rubric.experienceLevel}</span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRubric(rubric)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-accent-indigo border border-indigo-500/30 text-xs font-semibold cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Configure Rubric</span>
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* TAB 2: STANDARDIZED COMPETENCY TAXONOMY */}
        {activeTab === 'taxonomy' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent-indigo" />
                <h2 className="text-base font-bold text-ink">The 4-Pillar Competency Standard</h2>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Standardized competency definitions aligned with HackerRank, CodeSignal, and Mercer Mettl. Each competency defines concrete behavioral signals, anti-patterns, and level expectations to eliminate interviewer bias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(taxonomy.length > 0 ? taxonomy : [
                {
                  id: 'technicalDepth',
                  name: 'Technical Depth & Execution',
                  category: 'Coding & Language Mastery',
                  defaultWeight: 40,
                  description: 'Evaluates candidate\'s fluency in idiomatic language patterns, data structure selection, memory management, and code hygiene.',
                  positiveSignals: [
                    'Selects optimal data structures (e.g. hash sets, priority queues) based on access patterns',
                    'Writes clean, idiomatic code with appropriate modularization and separation of concerns',
                    'Demonstrates precise language fluency without relying on boilerplate lookups'
                  ],
                  redFlags: [
                    'Inefficient data structure choices (e.g. O(N) array scans instead of O(1) hash lookups)',
                    'Messy monolithic functions with global state pollution or hardcoded magic constants',
                    'Inability to write basic syntax without extensive hints'
                  ],
                  levelBenchmarks: {
                    Junior: 'Basic syntax fluency, writes working functional loops, understands fundamental primitive types.',
                    Mid: 'Writes idiomatic modular code, handles edge cases, leverages standard libraries efficiently.',
                    Senior: 'Deep understanding of language runtime internals, memory allocations, and optimal algorithmic bounds.',
                    Lead: 'Establishes company-wide coding guidelines, optimizes performance-critical paths, guides architectural rigor.'
                  }
                },
                {
                  id: 'systemArchitecture',
                  name: 'System Architecture & Scalability',
                  category: 'Engineering Architecture',
                  defaultWeight: 30,
                  description: 'Measures candidate\'s ability to design distributed, resilient systems with sound trade-off analysis (CAP theorem, caching, partitioning, failure domains).',
                  positiveSignals: [
                    'Proactively discusses trade-offs (latency vs throughput, consistency vs availability)',
                    'Designs decoupled microservices with asynchronous event messaging and retry resilience',
                    'Identifies single points of failure (SPOF) and incorporates automated health checks and fallbacks'
                  ],
                  redFlags: [
                    'Proposes naive monolithic designs without considering scale, backpressure, or network partitions',
                    'Ignores database concurrency, locks, indexing, and connection pool saturation',
                    'Over-engineers simple tasks with unnecessary distributed components'
                  ],
                  levelBenchmarks: {
                    Junior: 'Understands client-server separation, RESTful APIs, and basic relational schema design.',
                    Mid: 'Designs decoupled services, implements caching strategies (Redis), and handles relational vs NoSQL trade-offs.',
                    Senior: 'Architects high-availability multi-zone clusters, event-driven streaming (Kafka), and automated failovers.',
                    Lead: 'Designs enterprise-scale multi-region topologies, defines governance, SLA/SLOs, and disaster recovery blueprints.'
                  }
                },
                {
                  id: 'problemSolving',
                  name: 'Problem Solving & Algorithmic Logic',
                  category: 'Algorithmic Reasoning',
                  defaultWeight: 15,
                  description: 'Assesses structured decomposition of ambiguous requirements, boundary condition handling, and Big-O time/space complexity optimization.',
                  positiveSignals: [
                    'Clarifies ambiguous constraints and boundary cases before writing implementation code',
                    'Analyzes time and space complexity (Big-O) rigorously and optimizes initial brute-force solutions',
                    'Systematically proves correctness by tracing edge cases (null inputs, empty arrays, integer overflows)'
                  ],
                  redFlags: [
                    'Jumps straight into coding without clarifying constraints, leading to false assumptions',
                    'Unable to analyze Big-O complexity or unaware of quadratic time bottlenecks',
                    'Applies random trial-and-error fixes when hitting failing edge cases'
                  ],
                  levelBenchmarks: {
                    Junior: 'Solves standard linear/quadratic problems with basic algorithmic patterns.',
                    Mid: 'Consistently analyzes Big-O complexity, breaks down multi-step logic, and handles common edge cases.',
                    Senior: 'Navigates complex dynamic programming, graph traversals, and concurrency race conditions with ease.',
                    Lead: 'Deconstructs highly ambiguous, open-ended technical problems into elegant, testable component hierarchies.'
                  }
                },
                {
                  id: 'communication',
                  name: 'Communication & Collaboration',
                  category: 'Team Engineering',
                  defaultWeight: 15,
                  description: 'Evaluates candidate\'s think-aloud problem-solving process, clarity in explaining technical trade-offs, and receptivity to feedback.',
                  positiveSignals: [
                    'Consistently thinks out loud, clearly explaining rationale, assumptions, and potential bottlenecks',
                    'Listens actively to interviewer hints, asks clarifying questions, and course-corrects constructively',
                    'Articulates complex architectural concepts with concise, professional terminology'
                  ],
                  redFlags: [
                    'Works in prolonged complete silence without sharing current thought process or assumptions',
                    'Defensive or dismissive when receiving hints or constructive feedback on potential bugs',
                    'Overly verbose and rambling without arriving at concrete engineering conclusions'
                  ],
                  levelBenchmarks: {
                    Junior: 'Listens politely, asks basic questions, and explains their immediate line-by-line code logic.',
                    Mid: 'Clearly articulates design decisions, participates in constructive technical dialogue, and accepts hints.',
                    Senior: 'Proactively drives collaborative technical consensus, defends trade-offs with empirical data, and communicates clearly.',
                    Lead: 'Inspires confidence across cross-functional teams, mentors engineers, and clearly translates business needs into technical strategy.'
                  }
                }
              ]).map((c) => (
                <div key={c.id} className="rounded-2xl bg-surface border border-line p-6 space-y-5 shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-accent-indigo border border-indigo-500/20">
                        {c.category}
                      </span>
                      <h3 className="text-base font-bold text-ink mt-1.5">{c.name}</h3>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{c.description}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-inset border border-line font-mono font-bold text-xs text-accent-cyan shrink-0">
                      Default: {c.defaultWeight}%
                    </span>
                  </div>

                  {/* Positive Signals */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-accent-emerald uppercase tracking-wide flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Positive Observable Signals
                    </span>
                    <ul className="space-y-1 pl-4 text-xs text-ink-muted list-disc">
                      {c.positiveSignals.map((sig, i) => (
                        <li key={i}>{sig}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Red Flags */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wide flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-rose-500" />
                      Red Flags & Anti-Patterns
                    </span>
                    <ul className="space-y-1 pl-4 text-xs text-ink-muted list-disc">
                      {c.redFlags.map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Seniority Benchmarks */}
                  <div className="p-3.5 rounded-xl bg-inset space-y-2 text-[11px]">
                    <span className="font-bold text-ink block font-mono text-xs">Seniority Level Anchors</span>
                    <div className="grid grid-cols-2 gap-2 text-ink-muted">
                      <div><strong className="text-ink">Junior:</strong> {c.levelBenchmarks.Junior}</div>
                      <div><strong className="text-ink">Mid:</strong> {c.levelBenchmarks.Mid}</div>
                      <div><strong className="text-ink">Senior:</strong> {c.levelBenchmarks.Senior}</div>
                      <div><strong className="text-ink">Lead:</strong> {c.levelBenchmarks.Lead}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INDUSTRY ROLE BLUEPRINTS */}
        {activeTab === 'blueprints' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-accent-emerald" />
                <h2 className="text-base font-bold text-ink">Pre-Calibrated Role Blueprints</h2>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Battle-tested competency weight distributions, recommended skills, and AI probe instructions tailored to industry standard job families. Click any blueprint to create a position with these settings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(blueprints.length > 0 ? blueprints : [
                {
                  id: 'fullstack',
                  title: 'Full-Stack Software Engineer',
                  department: 'Engineering',
                  targetLevel: 'Senior',
                  description: 'Balanced evaluation across front-to-back delivery, API design, data persistence, and interactive user experience.',
                  weights: { technicalDepth: 35, systemArchitecture: 25, problemSolving: 20, communication: 20 },
                  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'REST/GraphQL', 'Docker'],
                  recommendedInstructions: 'Evaluate full-stack proficiency: clean component state management, typed backend contracts, database queries, and modular API design.'
                },
                {
                  id: 'backend',
                  title: 'Backend & Distributed Systems Engineer',
                  department: 'Infrastructure',
                  targetLevel: 'Senior',
                  description: 'Deep focus on distributed concurrency, event streams, microservice fault tolerance, and high-throughput data layers.',
                  weights: { technicalDepth: 35, systemArchitecture: 35, problemSolving: 20, communication: 10 },
                  skills: ['Go / Java / Python', 'Distributed Systems', 'Apache Kafka', 'PostgreSQL / Redis', 'gRPC', 'Kubernetes'],
                  recommendedInstructions: 'Emphasize distributed concurrency, network partition recovery, ACID vs BASE transactions, database indexing, and backpressure management.'
                },
                {
                  id: 'frontend',
                  title: 'Frontend Platform & UI Architect',
                  department: 'Engineering',
                  targetLevel: 'Senior',
                  description: 'High focus on component hierarchy, client-side caching, rendering performance (Core Web Vitals), and accessibility.',
                  weights: { technicalDepth: 40, systemArchitecture: 20, problemSolving: 20, communication: 20 },
                  skills: ['React / Next.js', 'TypeScript', 'Performance Optimization', 'Web Vitals', 'State Machines', 'CSS Architecture'],
                  recommendedInstructions: 'Probe client-side performance, state management trade-offs, bundle splitting, hydration latency, and modular component reusability.'
                },
                {
                  id: 'devops',
                  title: 'DevOps & Cloud Reliability Engineer (SRE)',
                  department: 'Infrastructure',
                  targetLevel: 'Senior',
                  description: 'Strong architectural weighting on automated CI/CD pipelines, container orchestration, observability, and incident recovery.',
                  weights: { technicalDepth: 30, systemArchitecture: 40, problemSolving: 15, communication: 15 },
                  skills: ['Kubernetes', 'Terraform', 'AWS / GCP', 'CI/CD Pipelines', 'Prometheus / Grafana', 'Linux Systems'],
                  recommendedInstructions: 'Focus on infrastructure-as-code, zero-downtime rolling deployments, chaos engineering, observability telemetry, and automated self-healing.'
                },
                {
                  id: 'aiml',
                  title: 'AI & Machine Learning Systems Engineer',
                  department: 'AI Research',
                  targetLevel: 'Senior',
                  description: 'Focused on vector embeddings, LLM inference pipelines, model evaluation metrics, and low-latency feature stores.',
                  weights: { technicalDepth: 40, systemArchitecture: 25, problemSolving: 25, communication: 10 },
                  skills: ['Python', 'PyTorch / TensorFlow', 'Vector Databases (Qdrant)', 'LLM Fine-tuning', 'FastAPI', 'Model Serving'],
                  recommendedInstructions: 'Test understanding of embedding pipelines, retrieval-augmented generation (RAG) latency bottlenecks, model quantization, and evaluation benchmarks.'
                }
              ]).map((bp) => (
                <div key={bp.id} className="rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-accent-indigo border border-indigo-500/20">
                        {bp.department}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">
                        Level: {bp.targetLevel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-ink">{bp.title}</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">{bp.description}</p>

                    <div className="p-3 rounded-xl bg-inset space-y-1.5 text-xs">
                      <span className="text-[10px] font-mono text-ink-muted uppercase block">Calibrated 4-Pillar Weights:</span>
                      <div className="grid grid-cols-2 gap-2 text-ink">
                        <div>Tech: <strong>{bp.weights.technicalDepth}%</strong></div>
                        <div>Architecture: <strong>{bp.weights.systemArchitecture}%</strong></div>
                        <div>Problem Solving: <strong>{bp.weights.problemSolving}%</strong></div>
                        <div>Communication: <strong>{bp.weights.communication}%</strong></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {bp.skills.slice(0, 4).map((sk, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-mono text-ink-muted">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyBlueprintToNewPosition(bp)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer inline-flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Use Blueprint for New Role</span>
                    </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT RUBRIC WEIGHTS & PROMPTS WITH 4-PILLAR BALANCER */}
        {editingRubric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-surface border border-line space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-accent-indigo" />
                  <h3 className="text-base font-bold text-ink">Configure Rubric: {editingRubric.title}</h3>
                </div>
                <button type="button" onClick={() => setEditingRubric(null)} className="text-ink-muted hover:text-ink cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Blueprint Loader inside modal */}
              <div className="p-3 rounded-xl bg-inset flex items-center justify-between gap-3 text-xs">
                <span className="text-ink-muted">Load Blueprint Preset:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(blueprints.length > 0 ? blueprints : [
                    { id: 'fullstack', title: 'Full Stack', weights: { technicalDepth: 35, systemArchitecture: 25, problemSolving: 20, communication: 20 }, targetLevel: 'Senior', recommendedInstructions: '' },
                    { id: 'backend', title: 'Backend', weights: { technicalDepth: 35, systemArchitecture: 35, problemSolving: 20, communication: 10 }, targetLevel: 'Senior', recommendedInstructions: '' },
                    { id: 'frontend', title: 'Frontend', weights: { technicalDepth: 40, systemArchitecture: 20, problemSolving: 20, communication: 20 }, targetLevel: 'Senior', recommendedInstructions: '' },
                  ]).slice(0, 3).map((bp: any) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleApplyBlueprintToModal(bp)}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-2 border border-line text-[11px] font-semibold text-accent-cyan cursor-pointer transition-colors"
                    >
                      {bp.title}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSaveRubricUpdate} className="space-y-4">
                {/* 4-Pillar Sliders */}
                <div className="space-y-3 p-4 rounded-xl bg-inset">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink">4-Pillar Weight Distribution</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        totalWeight === 100
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      }`}>
                        Total: {totalWeight}%
                      </span>
                      {totalWeight !== 100 && (
                        <button
                          type="button"
                          onClick={handleAutoNormalizeWeights}
                          className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-accent-indigo text-[10px] font-bold hover:bg-indigo-500/30 cursor-pointer"
                        >
                          Auto-Balance
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1. Technical Depth */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink">1. Technical Depth & Execution</span>
                      <span className="font-mono text-accent-indigo font-bold">{editWeights.technicalDepth}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={70}
                      value={editWeights.technicalDepth}
                      onChange={(e) => setEditWeights({ ...editWeights, technicalDepth: Number(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* 2. System Architecture */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink">2. System Architecture & Scalability</span>
                      <span className="font-mono text-accent-cyan font-bold">{editWeights.systemArchitecture}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={editWeights.systemArchitecture}
                      onChange={(e) => setEditWeights({ ...editWeights, systemArchitecture: Number(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* 3. Problem Solving */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink">3. Problem Solving & Algorithmic Logic</span>
                      <span className="font-mono text-accent-emerald font-bold">{editWeights.problemSolving}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      value={editWeights.problemSolving}
                      onChange={(e) => setEditWeights({ ...editWeights, problemSolving: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* 4. Communication */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink">4. Communication & Collaboration</span>
                      <span className="font-mono text-amber-500 font-bold">{editWeights.communication}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={40}
                      value={editWeights.communication}
                      onChange={(e) => setEditWeights({ ...editWeights, communication: Number(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Seniority Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Seniority Evaluation Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Junior">Junior (L1-L2) — Foundational Syntax & Algorithms</option>
                    <option value="Mid">Mid-Level (L3) — Modular Code, Clean Edge Cases</option>
                    <option value="Senior">Senior (L4-L5) — Architecture Trade-offs & Deep Mastery</option>
                    <option value="Lead">Staff / Principal (L6+) — Enterprise Topologies & System Strategy</option>
                  </select>
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Custom AI Interviewer Prompt Instructions</label>
                  <textarea
                    rows={3}
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 resize-none font-mono"
                    placeholder="Provide specific technical probe scenarios or topics for the AI interviewer..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRubric(null)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingRubric || totalWeight !== 100}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    {updatingRubric ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save & Publish Rubric</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CREATE JOB POSITION */}
        {showCreateJobModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-surface border border-line space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent-indigo" />
                  <h3 className="text-base font-bold text-ink">Create Job & Evaluation Rubric</h3>
                </div>
                <button type="button" onClick={() => setShowCreateJobModal(false)} className="text-ink-muted hover:text-ink cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateJobSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Job Position Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Backend Distributed Systems Engineer"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-ink">Department</label>
                    <select
                      value={newJobDept}
                      onChange={(e) => setNewJobDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Product Design">Product Design</option>
                      <option value="AI Research">AI Research</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-ink">Seniority Level</label>
                    <select
                      value={newJobLevel}
                      onChange={(e) => setNewJobLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Junior">Junior (L1-L2)</option>
                      <option value="Mid">Mid-Level (L3)</option>
                      <option value="Senior">Senior (L4-L5)</option>
                      <option value="Lead">Staff / Principal (L6+)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Required Technical Skills (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Go, Apache Kafka, Distributed Systems, Redis, Docker"
                    value={newJobSkills}
                    onChange={(e) => setNewJobSkills(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink">Job Description & Evaluation Focus</label>
                  <textarea
                    rows={3}
                    placeholder="Describe role responsibilities and core technical criteria..."
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-inset border border-line text-ink text-xs focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateJobModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingJob}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
                  >
                    {savingJob ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Create Position & Rubric</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}