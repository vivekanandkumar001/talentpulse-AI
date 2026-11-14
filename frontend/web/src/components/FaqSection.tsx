'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, X, MessageCircle, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { FAQ_DATA, FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq-data';

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  Platform: 'Platform',
  Pricing: 'Pricing',
  Proctoring: 'Proctoring',
  Recruiters: 'For recruiters',
  Security: 'Security',
  Candidates: 'For candidates',
};

export const FaqSection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaqCategory | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const counts = useMemo(() => {
    const map = new Map<FaqCategory, number>(FAQ_CATEGORIES.map((c) => [c, 0]));
    for (const item of FAQ_DATA) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, []);

  const clearFilters = () => {
    setQuery('');
    setActiveCategory('All');
  };

  return (
    <section
      id="faq"
      className="w-full scroll-mt-20 border-b border-line bg-surface-deep px-5 py-20 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ─── Left rail — sticky context + contact ─── */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 space-y-6">
              <span className="kicker">FAQ</span>
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight leading-[1.1]">
                Everything you need to know.
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Answers on the platform, pricing, proctoring, integrations and data security — distilled for hiring
                teams. Still blocked? Our solutions engineers reply within one business day.
              </p>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: ShieldCheck, label: 'SOC 2-ready' },
                  { icon: Zap, label: 'Live in < 30 min' },
                  { icon: MessageCircle, label: '1-day SLA' },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold text-ink-muted"
                  >
                    <Icon className="h-3.5 w-3.5 text-accent-cyan" />
                    {label}
                  </span>
                ))}
              </div>

              {/* Contact card */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink leading-tight">Still have questions?</p>
                    <p className="text-[11px] text-ink-faint font-mono mt-0.5">Solutions team · 1-business-day SLA</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-ink-muted leading-relaxed">
                  SSO / SCIM, custom rubrics, ATS webhooks, procurement and security reviews — we walk you through it.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink hover:border-accent-blue/50 hover:text-accent-blue transition-all"
                >
                  Talk to our solutions team
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <p className="text-[10px] text-ink-faint font-mono leading-relaxed">
                Last updated Nov 2026 · SOC 2 / GDPR / DPDP aligned
              </p>
            </div>
          </div>

          {/* ─── Right rail — search + categorized accordion ─── */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input
                type="text"
                role="searchbox"
                aria-label="Search frequently asked questions"
                placeholder="Search answers — e.g. pricing, ATS, proctoring, GDPR…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-12 text-sm text-ink placeholder:text-ink-faint/80 outline-none transition-all focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-faint hover:bg-surface-2 hover:text-ink transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="FAQ categories">
              <button
                type="button"
                onClick={() => setActiveCategory('All')}
                aria-pressed={activeCategory === 'All'}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  activeCategory === 'All'
                    ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue'
                    : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                All · {FAQ_DATA.length}
              </button>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {CATEGORY_LABELS[cat]} · {counts.get(cat)}
                </button>
              ))}
            </div>

            {/* Answers */}
            <div className="space-y-3">
              {filtered.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-line bg-surface overflow-hidden transition-all hover:border-line-strong open:border-accent-blue/40 open:shadow-[0_10px_28px_-12px_rgba(15,23,42,0.14)]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-5 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-cyan">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="mt-1 block text-sm font-bold leading-snug text-ink">
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint transition-transform duration-300 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-line/50 px-5 pb-5 pt-4 text-sm leading-relaxed text-ink-muted sm:px-6">
                    {item.answer}
                  </div>
                </details>
              ))}

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
                  <Search className="mx-auto h-7 w-7 text-ink-faint" />
                  <p className="mt-3 text-sm font-bold text-ink">No answers match &ldquo;{query}&rdquo;</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Try a broader term — or ask our team directly. We reply within one business day.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-inset transition-all"
                    >
                      Clear filters
                    </button>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent-blue px-4 py-2 text-xs font-bold text-on-brand hover:brightness-110 transition-all"
                    >
                      Ask us
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Result counter */}
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-faint">
              Showing {filtered.length} of {FAQ_DATA.length} questions{activeCategory !== 'All' ? ` in ${CATEGORY_LABELS[activeCategory as FaqCategory]}` : ''}
              {query.trim() ? ` for “${query.trim()}”` : ''}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
