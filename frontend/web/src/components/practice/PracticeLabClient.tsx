'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Video,
  Layers,
  FileText,
  Clock,
  Brain,
  Target
} from 'lucide-react';
import { PracticeInterviewSetup } from '@/components/practice/PracticeInterviewSetup';
import { PracticeDrillBrowser } from '@/components/practice/PracticeDrillBrowser';

export function PracticeLabClient() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'drills' || !!searchParams.get('skill') ? 'drills' : 'mock';
  const initialSkill = searchParams.get('skill') || undefined;
  const [activeTab, setActiveTab] = useState<'mock' | 'drills'>(initialMode);

  return (
    <div className="space-y-6">
      {/* Top Mode Segmented Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-surface border border-line">
        <div className="flex items-center p-1 rounded-xl bg-surface-2 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab('mock')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mock'
                ? 'bg-surface text-accent-cyan shadow-xs border border-line'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>AI Mock Interview (10-Min)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drills')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'drills'
                ? 'bg-surface text-accent-cyan shadow-xs border border-line'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Drill Lab</span>
          </button>
        </div>

        {/* Shortcut to Practice Reports */}
        <Link
          href="/candidate/reports?tab=practice"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/25 text-xs font-bold text-accent-cyan transition-all"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Past Practice Reports</span>
        </Link>
      </div>

      {/* Render Active View */}
      {activeTab === 'mock' ? (
        <PracticeInterviewSetup />
      ) : (
        <PracticeDrillBrowser embedded={true} initialSkill={initialSkill} />
      )}
    </div>
  );
}
