import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { StreamErrorGuard } from "@/components/common/StreamErrorGuard";
import { streamGuardScript } from "@/components/common/streamGuardScript";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

/* Pre-paint theme bootstrap: light is the default for every visitor.
   Only an explicit saved choice (localStorage.tp_theme = 'dark') opts into
   dark mode, stamped on <html> before first paint to avoid a theme flash. */
const THEME_INIT_SCRIPT = `(function () {
  try {
    var saved = localStorage.getItem('tp_theme');
    var theme = saved === 'dark' ? 'dark' : 'light';
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
})();`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atlas.progeni.live"),
  title: {
    default: "Progeni Atlas — Autonomous AI Technical Interviews & Skills Evaluation",
    template: "%s | Progeni Atlas",
  },
  description:
    "Enterprise autonomous AI technical interview platform. Conduct real-time two-way voice interviews, multi-language coding assessments, tamper-proof anti-cheat proctoring, and instant calibrated candidate dossiers.",
  keywords: [
    "AI technical interview",
    "autonomous technical interview",
    "AI coding interview",
    "developer screening platform",
    "technical hiring automation",
    "candidate evaluation rubric",
    "real-time proctoring",
    "AI interview agent",
    "two-way voice AI",
    "Progeni Atlas",
    "coding sandbox",
    "system design interview",
    "full stack interview screening",
    "remote hiring intelligence",
  ],
  authors: [{ name: "Progeni Atlas", url: "https://atlas.progeni.live" }],
  creator: "Progeni Atlas",
  publisher: "Progeni Atlas",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://atlas.progeni.live",
  },
  openGraph: {
    title: "Progeni Atlas — Autonomous AI Technical Interviews & Skills Evaluation",
    description:
      "Enterprise autonomous AI technical interview platform with real-time two-way voice, multi-language coding environments, anti-cheat proctoring, and instant candidate dossiers.",
    url: "https://atlas.progeni.live",
    siteName: "Progeni Atlas",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/progeni-atlas-logo.png",
        width: 1200,
        height: 630,
        alt: "Progeni Atlas Autonomous Technical Interview Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Progeni Atlas — Autonomous AI Technical Interviews",
    description:
      "Conduct real-time two-way AI technical interviews with live coding, proctoring, and instant recruiter dossiers.",
    images: ["/progeni-atlas-logo.png"],
    creator: "@ProgeniAtlas",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Script id="stream-guard-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: streamGuardScript }} />
        <JsonLd />
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga4-config"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { anonymize_ip: true });`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        <StreamErrorGuard />
        {children}
      </body>
    </html>
  );
}