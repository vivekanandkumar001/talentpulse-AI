'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  X,
  Briefcase,
  Building2,
  Sparkles,
  Users,
  FileCheck,
  ShieldCheck,
  Award,
  Video,
  FileText,
  Compass,
  CreditCard,
  PhoneCall,
  CheckCircle2,
  Mail,
  Send,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { logout } from '@/lib/api';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const isAuthPage = Boolean(
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/verify-otp') ||
    pathname?.startsWith('/forgot-password')
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role?: string; full_name?: string; email?: string } | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check stored user session reactively, suppressing logged-in state on auth routes
  useEffect(() => {
    const syncUser = () => {
      if (isAuthPage) {
        setCurrentUser(null);
        return;
      }
      try {
        const raw = localStorage.getItem('tp_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.email || parsed.id || parsed._id)) {
            setCurrentUser(parsed);
            return;
          }
        }
      } catch {}
      setCurrentUser(null);
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    window.addEventListener('tp_auth_change', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('tp_auth_change', syncUser);
    };
  }, [pathname, isAuthPage]);

  const getDashboardLink = (role?: string) => {
    const r = (role || '').toLowerCase();
    if (r === 'super_admin') return '/super-admin';
    if (r === 'recruiter' || r === 'admin' || r === 'hr') return '/recruiter/dashboard';
    return '/candidate/dashboard';
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactModalOpen(false);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    }, 2200);
  };

  return (
    <>
      {/* 
        HEADER DESIGN MATCHING SCREENSHOT:
        - Dark navy top border strip ()
        - Clean white background (bg-surface )
        - Typography: Bold dark navy font (text-ink-muted font-bold text-[15px])
        - Menu Items: Home, About Us ˅, Services ˅, Portfolio ˅, Pay Us Now, Career, Contact Us
      */}
      <header className="sticky top-0 z-50 w-full border-b border-line bg-surface/95 backdrop-blur-md shadow-xs transition-colors">
        <div className="max-w-7xl xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex items-center justify-between h-16 sm:h-18">
            
            {/* ================= LEFT SECTION: BRAND LOGO ================= */}
            <div className="flex items-center gap-6 lg:gap-10">
              <BrandLogo href="/" />

              {/* ================= CENTER SECTION: NAVIGATION MENU FROM SCREENSHOT ================= */}
              <nav ref={dropdownRef} className="hidden xl:flex items-center gap-6 2xl:gap-8">
                
                {/* 1. Home */}
                <Link
                  href="/"
                  className="text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors py-2 whitespace-nowrap shrink-0"
                >
                  Home
                </Link>

                {/* 2. About Us ˅ */}
                <div
                  className="relative py-3 whitespace-nowrap shrink-0 group"
                  onMouseEnter={() => setActiveDropdown('about')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href="/about"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-1 text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="whitespace-nowrap">About Us</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-muted  transition-transform duration-200 ${
                        activeDropdown === 'about' ? 'rotate-180 text-accent-blue' : 'group-hover:rotate-180'
                      }`}
                    />
                  </Link>

                  {activeDropdown === 'about' && (
                    <div className="absolute left-0 top-full -mt-1 w-72 rounded-xl bg-surface border border-line p-2 shadow-lg backdrop-blur-xl animate-fadeIn z-50">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                        About Progeni Atlas
                      </p>
                      <Link
                        href="/about#mission"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Award className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Our Mission &amp; Vision
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Merit-driven automated AI interview intelligence
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/about#integrity"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <ShieldCheck className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Anti-Bias &amp; Integrity
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Transparent rubrics and compliant evaluation
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/about#principles"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Users className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Engineering Pillars
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Core architecture and evaluation design
                          </p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 3. Services ˅ */}
                <div
                  className="relative py-3 whitespace-nowrap shrink-0 group"
                  onMouseEnter={() => setActiveDropdown('services')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href="/services"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-1 text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="whitespace-nowrap">Services</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-muted  transition-transform duration-200 ${
                        activeDropdown === 'services' ? 'rotate-180 text-accent-blue' : 'group-hover:rotate-180'
                      }`}
                    />
                  </Link>

                  {activeDropdown === 'services' && (
                    <div className="absolute left-0 top-full -mt-1 w-80 rounded-xl bg-surface border border-line p-2 shadow-lg backdrop-blur-xl animate-fadeIn z-50">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                        AI Services &amp; Solutions
                      </p>
                      <Link
                        href="/services#interviewer"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Sparkles className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            AI Voice &amp; Video Interviewer
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Adaptive real-time proctored evaluation
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/services#coding"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Live Coding &amp; Sandboxes
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Multi-language runtime &amp; whiteboard
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/services#dossiers"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Briefcase className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Candidate Dossiers &amp; Reports
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Full-turn transcripts, scoring, &amp; metrics
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/services#rubrics"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <FileCheck className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Custom Evaluation Rubrics
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Tailor weights for tech, soft skills, and logic
                          </p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 4. Portfolio ˅ */}
                <div
                  className="relative py-3 whitespace-nowrap shrink-0 group"
                  onMouseEnter={() => setActiveDropdown('portfolio')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href="/portfolio"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-1 text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="whitespace-nowrap">Portfolio</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-ink-muted  transition-transform duration-200 ${
                        activeDropdown === 'portfolio' ? 'rotate-180 text-accent-blue' : 'group-hover:rotate-180'
                      }`}
                    />
                  </Link>

                  {activeDropdown === 'portfolio' && (
                    <div className="absolute left-0 top-full -mt-1 w-72 rounded-xl bg-surface border border-line p-2 shadow-lg backdrop-blur-xl animate-fadeIn z-50">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                        Platform Showcase
                      </p>
                      <Link
                        href="/portfolio#showcase"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Video className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Interactive Platform Tour
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Experience the full interview suite
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/portfolio#tracks"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Building2 className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Engineering Tracks
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Practice syllabus and playbooks
                          </p>
                        </div>
                      </Link>
                      <Link
                        href="/candidate/practice"
                        prefetch={false}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-inset  transition-colors group"
                      >
                        <Compass className="w-4 h-4 text-accent-blue mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-ink  group-hover:text-accent-blue whitespace-nowrap">
                            Practice Drill Lab
                          </p>
                          <p className="text-[11px] text-ink-faint ">
                            Interactive scenario library for applicants
                          </p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 5. Pricing */}
                <Link
                  href="/pricing"
                  className="flex items-center gap-1 text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors py-2 whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">Pricing</span>
                </Link>

                {/* 6. Career */}
                <Link
                  href="/career"
                  className="text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors py-2 whitespace-nowrap shrink-0"
                >
                  Career
                </Link>

                {/* 7. Contact Us */}
                <Link
                  href="/contact"
                  className="text-[15px] font-semibold text-ink-muted  hover:text-accent-blue  transition-colors py-2 whitespace-nowrap shrink-0"
                >
                  Contact Us
                </Link>

              </nav>
            </div>

            {/* ================= RIGHT SECTION: ACTION BUTTONS + MENU TOGGLE ================= */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <ThemeToggle />
              {/* Action buttons (tablet & desktop) */}
              <div className="hidden sm:flex items-center gap-3">
                {!isAuthPage && currentUser ? (
                  <>
                    <Link
                      href={getDashboardLink(currentUser.role)}
                      prefetch={false}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        try { await logout(); } catch {}
                        setCurrentUser(null);
                        window.location.href = '/login?logout=1';
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-line hover:bg-inset text-ink-muted px-3 py-1.5 text-xs font-medium transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center rounded-lg border border-line text-ink-muted hover:bg-inset px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Login
                    </Link>

                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>

              {/* ================= MOBILE / TABLET HAMBURGER TOGGLE ================= */}
              <div className="flex items-center gap-2 xl:hidden">
                <button
                  type="button"
                  aria-label="Toggle navigation menu"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="rounded-xl border border-line p-1.5 sm:p-2 text-ink-muted  hover:bg-surface-2  transition-colors cursor-pointer shrink-0"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ================= MOBILE DRAWER MENU ================= */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-line bg-surface/98  px-4 py-4 space-y-3 animate-fadeIn z-50">
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Home
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                About Us
              </Link>
              <Link
                href="/services"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Services
              </Link>
              <Link
                href="/portfolio"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Portfolio
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Pricing
              </Link>
              <Link
                href="/career"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Career
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-ink-muted  hover:bg-surface-2  rounded-lg"
              >
                Contact Us
              </Link>
            </div>

            <div className="pt-3 border-t border-line">
              {!isAuthPage && currentUser ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={getDashboardLink(currentUser.role)}
                    prefetch={false}
                    onClick={() => setMobileOpen(false)}
                    className="text-center rounded-full bg-accent-blue text-on-brand px-4 py-2 text-xs font-bold"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileOpen(false);
                      try { await logout(); } catch {}
                      setCurrentUser(null);
                      window.location.href = '/login?logout=1';
                    }}
                    className="text-center rounded-full border border-line-strong  text-ink-muted  px-4 py-2 text-xs font-bold"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-center rounded-full border-2 border-accent-blue  text-ink-muted  px-4 py-2 text-xs font-bold"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-center rounded-full bg-accent-blue text-on-brand px-4 py-2 text-xs font-bold"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ================= CONTACT US MODAL ================= */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-2/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-xl bg-surface  border border-line  p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-ink-muted hover:text-ink-muted  hover:bg-surface-2  transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-accent-blue text-on-brand flex items-center justify-center shadow-md">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink-muted ">Contact Us</h3>
                <p className="text-xs text-ink-faint">Reach our team for inquiries &amp; enterprise support</p>
              </div>
            </div>

            {contactSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-bold text-ink ">Message Received!</h4>
                <p className="text-xs text-ink-faint max-w-xs mx-auto">
                  Thank you for contacting Progeni Atlas. Our support team will reach out within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Please enter your name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Please enter your email address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-muted  mb-1">
                    Message / Requirement
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Please describe how we can help you..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line-strong  bg-inset  text-sm text-ink  focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-on-brand font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
