import React from 'react';
import { FAQ_DATA } from '@/lib/faq-data';

/**
 * Enterprise SEO, GEO (Generative Engine Optimization), and AEO (Answer Engine Optimization)
 * JSON-LD Structured Data Schema for Progeni Atlas.
 *
 * Schemas included:
 * - Organization: Entity authority for search & generative engines (Google, Perplexity, ChatGPT).
 * - WebApplication / SoftwareApplication: Product taxonomy, pricing, capabilities, rating.
 * - WebSite: Site authority and canonical navigation.
 * - FAQPage: AEO powerhouse for voice search, Google AI Overviews, and direct snippet answers.
 */
export function JsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://atlas.progeni.live/#organization',
    name: 'Progeni Atlas',
    alternateName: ['Progeni Atlas AI', 'Progeni Technical Interview Platform'],
    url: 'https://atlas.progeni.live',
    logo: {
      '@type': 'ImageObject',
      url: 'https://atlas.progeni.live/progeni-atlas-logo.png',
      width: '1200',
      height: '630',
    },
    description:
      'Enterprise-grade autonomous AI technical interview and skills assessment platform conducting real-time two-way voice interviews, live coding assessments, and anti-cheat proctoring.',
    sameAs: [
      'https://github.com/vivekanandkumar001/Progeni-Atlas',
      'https://atlas.progeni.live',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'Customer Support',
        email: 'support@progeni.live',
        availableLanguage: ['English', 'Hindi'],
      },
    ],
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': 'https://atlas.progeni.live/#webapp',
    name: 'Progeni Atlas',
    url: 'https://atlas.progeni.live',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any modern web browser (Chrome, Firefox, Safari, Edge)',
    softwareVersion: '2.0.0',
    description:
      'Autonomous technical interviewing software featuring live adaptive voice AI, browser-based coding sandbox, multi-device proctoring, and instant calibrated scorecards.',
    offers: {
      '@type': 'Offer',
      price: '1.00',
      priceCurrency: 'INR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '1.00',
        priceCurrency: 'INR',
        name: 'Duration-based billing: 1 Credit (₹1.00) per 3 minutes of interview time',
      },
    },
    featureList: [
      'Autonomous two-way real-time voice & video AI interviewer',
      'Multi-language coding sandbox with terminal execution (Python, TypeScript, C++, Java, Go)',
      'Multi-modal proctoring with companion phone camera sync and gaze tracking',
      'Instant calibrated scoring dossiers with role-specific competency rubrics',
      'Enterprise ATS integrations with Greenhouse, Workday, Lever, and webhooks',
      'Transparent duration-based billing (₹1 per 3 minutes, 2 free trial demo screenings)',
    ],
    // NOTE: no aggregateRating here. A self-declared 4.9/128 rating without real,
    // verifiable on-page reviews violates Google's structured-data guidelines and
    // risks a manual action. Add one back only with genuine review data.
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://atlas.progeni.live/#website',
    url: 'https://atlas.progeni.live',
    name: 'Progeni Atlas',
    description:
      'Autonomous AI Technical Interviews & Enterprise Candidate Skills Evaluation Platform.',
    publisher: {
      '@id': 'https://atlas.progeni.live/#organization',
    },
  };

  // AEO (Answer Engine Optimization) FAQ Schema
  // Optimized for Google AI Overviews, Perplexity Q&A, and Voice Assistants.
  // Derived from the same FAQ_DATA consumed by the visible FAQ section so the
  // structured data always matches what users actually read.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://atlas.progeni.live/#faq',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

