import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  badge?: string;
  className?: string;
  hideTextOnMobile?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  href = '/',
  badge,
  className = '',
  hideTextOnMobile = false,
}) => {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 sm:gap-3 group cursor-pointer select-none whitespace-nowrap shrink-0 ${className}`}
      title="progeni.live — Autonomous AI Interviews"
      aria-label="progeni.live"
    >
      {/* progeni.live monogram emblem */}
      <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all duration-200 group-hover:scale-105">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-xs"
          aria-hidden="true"
        >
          <rect width="48" height="48" rx="11" fill="url(#brand-tile-gradient)" />
          <circle cx="27" cy="18.6" r="7.4" stroke="#ffffff" strokeWidth="5.4" fill="none" />
          <rect x="13.4" y="11.2" width="6.6" height="25.8" rx="3.3" fill="#ffffff" />
          <circle cx="35.8" cy="34.6" r="4.6" fill="#22d3ee" />
          <defs>
            <linearGradient id="brand-tile-gradient" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2f6bff" />
              <stop offset="55%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0b1f3f" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wordmark — progeni.live */}
      <div className={`${hideTextOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-1.5 whitespace-nowrap`}>
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans whitespace-nowrap flex items-baseline">
          <span className="text-ink">progeni</span>
          <span className="text-accent-blue">.live</span>
        </span>

        {/* AI Tech Pill Badge */}
        <span className="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue border border-accent-blue/30 ml-0.5 whitespace-nowrap">
          {badge || 'AI'}
        </span>
      </div>
    </Link>
  );
};
