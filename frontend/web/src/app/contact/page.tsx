'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Sparkles,
  Building2,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [inquiryType, setInquiryType] = useState('Enterprise Demo');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setEmail('');
      setCompany('');
      setMessage('');
    }, 3000);
  };

  const contactCards = [
    {
      icon: Mail,
      title: 'Email Us Directly',
      desc: 'Our enterprise solutions team responds within 4 business hours.',
      value: 'sales@progeni.live',
      sub: 'support@progeni.live',
    },
    {
      icon: Phone,
      title: 'Global Phone Line',
      desc: 'Monday – Friday, 9:00 AM – 6:00 PM EST.',
      value: '+1 (800) 555-PULSE',
      sub: '+44 20 7946 0912 (UK/EU)',
    },
    {
      icon: MapPin,
      title: 'Headquarters',
      desc: 'Visit our primary innovation and engineering hub.',
      value: '500 Howard Street, Suite 400',
      sub: 'San Francisco, CA 94105',
    },
  ];

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-20 lg:py-24">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-10 right-1/3 w-[500px] h-[350px] bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-accent-cyan text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Connect With Our Team
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink tracking-tight leading-[1.1]">
            Let&apos;s Discuss Your{' '}
            <span className="bg-gradient-to-r from-accent-blue via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              Hiring Goals
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-ink-muted">
            Have questions about custom rubrics, ATS integrations, enterprise volume licensing, or candidate practice sessions? We&apos;re here to assist.
          </p>
        </div>
      </section>

      {/* Main Grid: Form + Info Cards */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Direct Info Cards (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider block mb-1">
                  DIRECT CONTACT
                </span>
                <h2 className="text-2xl font-black text-ink">We&apos;re Always Accessible</h2>
                <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
                  Reach out through any of our direct channels or submit an enterprise inquiry form.
                </p>
              </div>

              <div className="space-y-4">
                {contactCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className="p-6 rounded-2xl border border-line bg-surface-deep shadow-xs space-y-2 hover:border-cyan-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-blue text-on-brand flex items-center justify-center shadow-xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-ink">{card.title}</h4>
                          <p className="text-[11px] text-ink-muted">{card.desc}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-line text-xs font-mono">
                        <p className="font-bold text-accent-blue ">{card.value}</p>
                        <p className="text-ink-muted text-[11px] mt-0.5">{card.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-accent-emerald shrink-0 mt-0.5" />
                <p className="text-xs text-ink-muted leading-relaxed">
                  Enterprise inquiries are covered by mutual NDA. Your candidate data and job specifications remain confidential.
                </p>
              </div>
            </div>

            {/* Right Column: Contact Inquiry Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-xl border border-line bg-surface-deep shadow-xl relative">
                <h3 className="text-xl font-bold text-ink mb-1">Send an Inquiry</h3>
                <p className="text-xs text-ink-muted mb-6">
                  Fill in your details below and our team will get in touch promptly.
                </p>

                {submitted ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                    <h4 className="text-xl font-bold text-ink">Inquiry Submitted Successfully!</h4>
                    <p className="text-xs text-ink-muted max-w-sm mx-auto">
                      Thank you for contacting Progeni Atlas. A technical solutions specialist will contact you at <span className="font-semibold text-ink">{email || 'your email'}</span> within 4 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Please enter your full name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Please enter your work email address"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Company / Organization
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Please enter your company name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">
                          Inquiry Type
                        </label>
                        <select
                          value={inquiryType}
                          onChange={(e) => setInquiryType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        >
                          <option value="Enterprise Demo">Schedule Enterprise Demo</option>
                          <option value="Pricing & Licensing">Pricing &amp; Volume Licensing</option>
                          <option value="ATS Integration">ATS Integration (Greenhouse/Lever)</option>
                          <option value="Candidate Support">Candidate Practice Support</option>
                          <option value="Partnerships">Partnership &amp; Alliances</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">
                        How can we help? *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Please tell us about your team size, expected interview volume, or specific technical stacks..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover   text-on-brand font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Enterprise Inquiry</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
