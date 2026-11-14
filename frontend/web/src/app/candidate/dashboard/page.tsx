import React from 'react';
import { Metadata } from 'next';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { HeroStrip } from '@/components/dashboard/HeroStrip';
import { QuickStartColumns } from '@/components/dashboard/QuickStartColumns';
import { SnapshotStrip } from '@/components/dashboard/SnapshotStrip';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { CompetencyMap } from '@/components/dashboard/CompetencyMap';
import { FeedbackSummary } from '@/components/dashboard/FeedbackSummary';
import { PracticeDrillList } from '@/components/dashboard/PracticeDrillList';
import { PrepChecklist } from '@/components/dashboard/PrepChecklist';
import { ResumeSyncFooter } from '@/components/dashboard/ResumeSyncFooter';

export const metadata: Metadata = {
  title: 'Candidate Home | Progeni Atlas',
  description:
    'Your placement preparation command center — interviews, aptitude assessments, competency map, recent activity and practice drills in one flat workspace.',
};

export default function CandidateHomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans overflow-x-clip selection:bg-cyan-500/30 selection:text-accent-cyan">
      <DashboardHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Hero — dense, flat, no card */}
        <section id="overview" className="pt-5 pb-5 border-b border-line">
          <HeroStrip />
        </section>

        {/* START HERE — two equal, side-by-side tracks */}
        <section id="start-here" className="pt-6 pb-5 border-b border-line">
          <div className="flex items-baseline justify-between gap-4 mb-4 px-0">
            <h2 className="kicker">Start Here</h2>
            <span className="text-[10px] text-ink-faint font-mono uppercase tracking-wider">Either track · equal weight</span>
          </div>
          <QuickStartColumns />
        </section>

        {/* Dense snapshot rail */}
        <section id="snapshot" className="py-6 border-b border-line">
          <SnapshotStrip />
        </section>

        {/* Body grid — recent activity + competency map + checklist */}
        <section id="progress" className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6 border-b border-line pb-6">
          <div className="lg:col-span-7 card-panel p-5 sm:p-6">
            <RecentActivity />
          </div>
          <div className="lg:col-span-5 card-panel p-5 sm:p-6">
            <CompetencyMap />
          </div>
        </section>

        {/* Feedback + drills + checklist */}
        <section id="feedback" className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-6">
          <div className="lg:col-span-5 card-panel p-5 sm:p-6">
            <FeedbackSummary />
          </div>
          <div id="drills" className="lg:col-span-4 card-panel p-5 sm:p-6">
            <PracticeDrillList />
          </div>
          <div id="checklist" className="lg:col-span-3 card-panel p-5 sm:p-6">
            <PrepChecklist />
          </div>
        </section>

        {/* Slim resume sync */}
        <section id="resume" className="pt-6">
          <ResumeSyncFooter />
        </section>
      </main>
    </div>
  );
}
