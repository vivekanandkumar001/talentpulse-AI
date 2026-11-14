'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export interface LegalTocItem {
  id: string;
  label: string;
}

interface LegalShellProps {
  kicker: string;
  title: string;
  summary: string;
  lastUpdated: string;
  toc: LegalTocItem[];
  children: React.ReactNode;
}

/**
 * Shared enterprise-grade shell for legal/policy pages.
 * Two-column layout: sticky table of contents + prose body with anchor sections.
 */
export function LegalShell({ kicker, title, summary, lastUpdated, toc, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-[11px] font-bold font-mono uppercase tracking-[0.2em] text-accent-cyan">
            <span className="w-6 h-px bg-accent-cyan/60" aria-hidden="true" />
            {kicker}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink max-w-3xl">
            {title}
          </h1>
          <p className="mt-3 text-base text-ink-muted max-w-2xl leading-relaxed">{summary}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono text-ink-faint border border-line rounded-full px-3 py-1 bg-inset">
            <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
            Last updated: {lastUpdated}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 w-full grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-14">
        {/* TOC */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <nav aria-label="On this page" className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint px-2 pb-2 border-b border-line">
              On this page
            </p>
            <ul className="mt-2 space-y-0.5">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-ink-muted hover:text-ink hover:bg-inset transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-line px-2">
              <p className="text-[11px] text-ink-faint leading-snug">
                Questions? Contact <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a>
              </p>
            </div>
          </nav>
        </aside>

        {/* Prose */}
        <article className="min-w-0 max-w-3xl text-[15px] leading-7 text-ink-muted">
          {children}
        </article>
      </div>

      {/* Cross-links */}
      <div className="border-t border-line bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-faint">
          <span className="font-semibold text-ink-muted">Related documents</span>
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-ink transition-colors">Candidate Terms of Service</Link>
          <Link href="/refund" className="hover:text-ink transition-colors">Refund &amp; Cancellation Policy</Link>
          <Link href="/ai-transparency" className="hover:text-ink transition-colors">AI Transparency &amp; AEDT Notice</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

/** Shared typography for legal prose sections. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 pt-8 first:pt-0">
      <h2 className="text-xl font-extrabold text-ink tracking-tight border-b border-line pb-2">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalBullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-accent-cyan">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}
