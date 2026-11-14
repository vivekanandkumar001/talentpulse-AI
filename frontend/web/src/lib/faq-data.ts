export type FaqCategory = 'Platform' | 'Pricing' | 'Proctoring' | 'Recruiters' | 'Security' | 'Candidates';

export interface FaqItem {
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = ['Platform', 'Pricing', 'Proctoring', 'Recruiters', 'Security', 'Candidates'];

export const FAQ_DATA: FaqItem[] = [
  // ─── Platform & Product ───────────────────────────────────────────────
  {
    category: 'Platform',
    question: 'What is Progeni Atlas?',
    answer:
      'Progeni Atlas is an enterprise-grade autonomous AI technical interview and skills assessment platform. It conducts live two-way voice interviews, multi-language coding assessments in a secure browser sandbox, enforces anti-cheat proctoring, and automatically generates calibrated recruiter scoring dossiers.',
  },
  {
    category: 'Platform',
    question: 'How does autonomous AI technical interviewing work?',
    answer:
      'Candidates join through a web link with zero software installation. An autonomous AI interviewer engages the candidate in live adaptive dialogue, poses real-world coding problems, executes code in a secure cloud sandbox, and generates an evidence-linked evaluation report across technical depth, problem-solving and architecture.',
  },
  {
    category: 'Platform',
    question: 'Which engineering roles and technical tracks are supported?',
    answer:
      'Full-Stack Development, Backend Systems Engineering, Frontend Architecture, DevOps & Site Reliability Engineering (SRE), Machine Learning Engineering, System Design and Data Structures & Algorithms.',
  },
  {
    category: 'Platform',
    question: 'How fast is the setup, and do I need engineering time to integrate?',
    answer:
      'From signup to first live interview is under 30 minutes — create organization, generate an invite link, paste it into your ATS or email. No engineering time, SDKs or browser extensions required; everything runs in the browser.',
  },
  {
    category: 'Platform',
    question: 'What happens after an interview completes?',
    answer:
      'Within minutes of the session ending, the AI pipeline produces a calibrated dossier: rubric-aligned scores with quotes from the transcript, a code-quality assessment, proctoring summary, and a recommendation. Dossiers are exportable as PDF or synced to your ATS.',
  },
  {
    category: 'Platform',
    question: 'Does Progeni Atlas work for non-engineering roles?',
    answer:
      'Progeni Atlas is optimized for engineering and data roles. Product-management, design and operations hiring flows are supported via custom rubrics configured by your admin panel.',
  },

  // ─── Pricing & Credits ────────────────────────────────────────────────
  {
    category: 'Pricing',
    question: 'How does billing work — is it per-interview or subscription?',
    answer:
      'Progeni Atlas uses transparent duration-based billing: ₹1.00 = 1 Credit, billed strictly at 1 Credit per 3 minutes of interview time (₹0.33 per minute). No seats, no subscriptions, no minimum commit — you only pay for assessed minutes.',
  },
  {
    category: 'Pricing',
    question: 'What is included in the free trial?',
    answer:
      'Every new organization receives 2 complimentary 10-minute demo screenings. They are fully featured — the AI interviewer, live sandbox and generated dossier work exactly as in production sessions.',
  },
  {
    category: 'Pricing',
    question: 'Are there enterprise volume discounts or annual contracts?',
    answer:
      'Yes. Annual commitments and volume tiers unlock discounted credit rates (up to 30% off), dedicated success management, SSO/SCIM provisioning and custom SLA terms. Contact sales for a proposal tailored to your hiring plan.',
  },

  // ─── Proctoring & Integrity ──────────────────────────────────────────
  {
    category: 'Proctoring',
    question: 'How does Progeni Atlas prevent AI cheating and unauthorized assistance?',
    answer:
      'A multi-layered anti-cheat framework: companion smartphone camera pairing for 360° room proctoring, gaze-alignment verification, single-voice biometric tracking, and copy-paste telemetry — without intrusive surveillance software or kernel-level installs.',
  },
  {
    category: 'Proctoring',
    question: 'How are false flags handled?',
    answer:
      'Every flag is evidence-linked (timestamp + transcript quote + telemetry), never auto-disqualifying. Recruiters review flags inside the dossier before making decisions. Candidates can always request a manual review through our support team.',
  },

  // ─── For Recruiters ──────────────────────────────────────────────────
  {
    category: 'Recruiters',
    question: 'Can I integrate Progeni Atlas with my ATS?',
    answer:
      'Yes. Native webhook + API integrations with Greenhouse, Workday and Lever, plus generic REST/webhook endpoints for other systems. Candidate invites, statuses and final dossiers sync both directions automatically.',
  },
  {
    category: 'Recruiters',
    question: 'Can I customize the evaluation rubric per role?',
    answer:
      'Yes. Rubrics are per-role and fully configurable — competencies, weights, difficulty curve, question pool domains and pass/recommendation thresholds — all managed from your super-admin panel.',
  },

  // ─── Security & Compliance ────────────────────────────────────────────
  {
    category: 'Security',
    question: 'Where is candidate data stored, and who can see it?',
    answer:
      'Data is stored in encrypted MongoDB Atlas clusters with TLS 1.3 in transit and AES-256 at rest. Interview audio and code are processed in isolated worker sandboxes. Access is role-gated (candidate / recruiter / admin / super-admin) with full audit logs.',
  },
  {
    category: 'Security',
    question: 'Is Progeni Atlas compliant with GDPR / India DPDP?',
    answer:
      'Yes. Configurable data retention and right-to-erasure workflows are available to organisations, and candidates receive an AI/AEDT notice before every session. Full details, including your right to human review and how to request deletion, live in our Privacy Policy at /privacy and AI Transparency notice at /ai-transparency.',
  },

  // ─── For Candidates ───────────────────────────────────────────────────
  {
    category: 'Candidates',
    question: 'What should a candidate expect in the interview?',
    answer:
      'A friendly, adaptive two-way voice conversation with a short coding task in your browser. Everything runs on the web link sent in the invite — no downloads, registrations or webcam-only requirements beyond standard browser permissions.',
  },
];
