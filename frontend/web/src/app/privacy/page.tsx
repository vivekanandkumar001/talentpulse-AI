import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, LegalSection, LegalBullets } from '@/components/legal/LegalShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Progeni Atlas',
  description:
    'How Progeni Atlas collects, uses, stores and deletes candidate and recruiter data, including interview recordings, AI-scored evaluation results, wallet and payment information, and your rights under GDPR, India DPDP and US AEDT laws.',
};

const TOC = [
  { id: 'who-we-are', label: '1. Who we are' },
  { id: 'what-we-collect', label: '2. What we collect' },
  { id: 'how-we-use', label: '3. How we use your data' },
  { id: 'legal-bases', label: '4. Legal bases' },
  { id: 'subprocessors', label: '5. Sub-processors' },
  { id: 'recordings', label: '6. Recordings & consent' },
  { id: 'your-rights', label: '7. Your rights (GDPR / DPDP)' },
  { id: 'aedt', label: '8. Automated hiring decisions (AEDT)' },
  { id: 'security', label: '9. Security practices' },
  { id: 'cookies', label: '10. Cookies & telemetry' },
  { id: 'retention', label: '11. Data retention' },
  { id: 'children', label: '12. Children' },
  { id: 'changes', label: '13. Changes to this policy' },
  { id: 'contact', label: '14. Contact & DPO' },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      kicker="Legal · Privacy"
      title="Privacy Policy"
      summary="What Progeni Atlas collects, why, how long we keep it, who we share with, and the rights you have over your data — explained in plain language, without legal grey-zone wording."
      lastUpdated="14 November 2026"
      toc={TOC}
    >
      <LegalSection id="who-we-are" title="1. Who we are">
        <p>
          Progeni Atlas Technologies (“Progeni Atlas”, “we”, “our”) operates the progeni.live platform, including
          web, mobile companion and API surfaces (the “Platform”). We act as a <strong>data controller</strong> for
          candidate-facing accounts (wallet, practice, signup, support) and as a <strong>data processor</strong> for
          employer organisations that deploy Progeni Atlas to screen their candidates — in those deployments, the
          employer is the controller of the candidate’s evaluation data and we process it on their instructions.
        </p>
      </LegalSection>

      <LegalSection id="what-we-collect" title="2. What we collect">
        <p>We collect the following categories of data:</p>
        <LegalBullets
          items={[
            <><strong>Account data</strong> — name, email, phone, password hash, role (candidate/recruiter/admin), organisation, optional professional links (GitHub, LinkedIn, portfolio).</>,
            <><strong>Resume &amp; profile data</strong> — resume files (PDF/DOCX) and text extracted from them, skills summary, education history, experience summary.</>,
            <><strong>Interview data</strong> — session metadata, question/answer turns, live transcripts, audio recordings, response quality signals, AI evaluation scores, recommendations and structured dossier artefacts.</>,
            <><strong>Integrity / proctoring telemetry</strong> — tab-focus departure events, copy/paste attempts, multi-face and presence indicators derived on-device or in-browser. These signals are used only for evaluation integrity and are never used for advertising or sale.</>,
            <><strong>Wallet &amp; payment metadata</strong> — credit balance, transaction ledger, invoices, and Razorpay payment references. We never store raw card or UPI PIN data.</>,
            <><strong>Technical data</strong> — IP address, user-agent, device/browser fingerprints used for security and abuse prevention, and short-lived pairing tokens for phone-camera pairing.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How we use your data">
        <LegalBullets
          items={[
            <><strong>To deliver the interview experience</strong> — pairing, live audio/video relay, adaptive question synthesis, per-turn evaluation, and report generation.</>,
            <><strong>To score and report candidates</strong> — applying structured rubrics against question-specific expected concepts; producing scores, recommendations and skill-level summaries.</>,
            <><strong>To operate billing</strong> — free demo allocation, per-minute settlement (₹1 = 1 credit, ₹0.5/min), refunds and invoice generation.</>,
            <><strong>To keep the platform safe</strong> — fraud prevention, anti-cheat, account security, rate limiting and abuse investigation.</>,
            <><strong>To improve evaluation quality</strong> — aggregated, de-identified rubric score distributions used to calibrate evaluators. We do not train foundational models on your recording without explicit opt-in consent.</>,
            <><strong>To comply with law</strong> — responding to lawful requests, tax and audit obligations.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="legal-bases" title="4. Legal bases (why this is allowed)">
        <LegalBullets
          items={[
            <><strong>Contract</strong> — providing the Platform you signed up for (account, interview, wallet, reports).</>,
            <><strong>Consent</strong> — audio/video recording and proctored evaluation require an explicit, unambiguous consent checkbox before every session. You can withdraw consent prospectively; note withdrawing stops the interview from continuing (it cannot be salvaged mid-recording).</>,
            <><strong>Legitimate interests</strong> — security, abuse prevention, fraud detection and service improvement, balanced against your rights.</>,
            <><strong>Legal obligation</strong> — retention required by applicable regulation, tax law and lawful process.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="subprocessors" title="5. Sub-processors">
        <p>We rely on a small set of vetted infrastructure providers. Data leaving India stays limited to what each service needs:</p>
        <LegalBullets
          items={[
            <><strong>LLM providers</strong> (OpenAI, Google Gemini, OpenRouter) — receive interview turns as text/audio transcripts for question synthesis and answer evaluation. They do not receive your camera stream.</>,
            <><strong>LiveKit</strong> — WebRTC media relay for audio/video transport and phone-camera companion pairing. Media is transient and not retained on LiveKit storage.</>,
            <><strong>MongoDB Atlas</strong> — primary operational datastore (encrypted at rest and in transit).</>,
            <><strong>Qdrant</strong> — vector search over rubric/question banks (job-content embeddings; not candidate video).</>,
            <><strong>Razorpay</strong> — payment processing for credit packs (INR). We receive payment references and amounts, never your payment instrument.</>,
            <><strong>Voice synthesis / speech recognition</strong> — where enabled for the interview companion, short text snippets may be sent for speech processing under each provider’s data terms.</>,
            <><strong>Email delivery providers</strong> — transactional email (verification, OTP, schedule confirmations).</>,
          ]}
        />
        <p className="text-xs text-ink-faint">
          A current list of sub-processors and their data-residency commitments is available on request at{' '}
          <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a>.
        </p>
      </LegalSection>

      <LegalSection id="recordings" title="6. Recordings, transcripts & your consent">
        <p>
          Every recorded session requires an explicit consent confirmation in the pre-flight lobby before the room
          opens. This consent covers: capture of audio and camera during the interview, transcription, AI evaluation,
          and delivery of the evaluation artefacts to the hiring organisation and you.
        </p>
        <LegalBullets
          items={[
            <>Recordings are retained for a configurable window (default: 12 months from session completion, then deleted) unless an employer’s retention policy is contractually longer.</>,
            <>Transcripts may be retained longer where needed for audit, appeals or lawful process; retention expiry is enforced by our data governance control, not by a person’s memory.</>,
            <>You may request deletion of a recording and transcript by emailing privacy@progeni.live with your checkpoint ID. Where the employer has a contractual or legal retention obligation, we will tell you plainly instead of pretending to delete it.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="your-rights" title="7. Your rights (GDPR & India DPDP)">
        <p>Whether you live in the EU/EEA/UK, India or elsewhere, you have the following rights over your personal data on the Platform:</p>
        <LegalBullets
          items={[
            <><strong>Access</strong> — ask for a copy of your data, including sessions, scores, transcripts and wallet history.</>,
            <><strong>Rectification</strong> — fix inaccurate profile, resume or feedback data.</>,
            <><strong>Erasure</strong> — ask us to delete your account and associated artefacts (subject to legal retention holds).</>,
            <><strong>Portability</strong> — export scores, transcripts and wallet ledger in machine-readable JSON.</>,
            <><strong>Restriction &amp; objection</strong> — object to automated evaluation of future interviews; request human review instead.</>,
            <><strong>Withdraw consent</strong> — prospective, via settings; ongoing sessions are aborted per Section 4.</>,
            <><strong>Complaint</strong> — to your national data protection authority (EU/EEA/UK) or to the Data Protection Board of India under the DPDP Act, 2023.</>,
          ]}
        />
        <p>
          Exercise any of these rights by writing to{' '}
          <a href="mailto:privacy@progeni.live" className="text-accent-cyan hover:underline">privacy@progeni.live</a>{' '}
          with the subject “Data Rights Request”. We respond within <strong>30 calendar days</strong>. We never charge
          for exercising your rights except for manifestly repetitive requests.
        </p>
      </LegalSection>

      <LegalSection id="aedt" title="8. Automated hiring decisions (AEDT)">
        <p>
          Under New York City Local Law 144, Illinois AI Video Interview Act and emerging EU AI Act transparency
          rules, an AI tool that substantially assists an employment decision may be classified as an automated
          employment decision tool (AEDT). Progeni Atlas is designed to give employers the controls such laws require:
        </p>
        <LegalBullets
          items={[
            <><strong>Notice before the session</strong> — the pre-flight lobby states that evaluation uses AI, what it assesses, and that a human recruiter remains the decision owner.</>,
            <><strong>Bias impact assessment</strong> — we maintain internal parity monitoring across demographic cohorts where lawful demographic data exists (e.g., self-reported at organisation level). Employers operating in NYC are required to conduct or obtain an independent AEDT bias audit at least once a year; we produce an employer-reportable audit summary on request.</>,
            <><strong>Human review on request</strong> — any candidate can request that a human reviewer re-score a flagged session, via privacy@progeni.live with the checkpoint ID.</>,
            <><strong>No biometric categorisation</strong> — we do not infer ethnicity, gender, health, emotion or personality from your face or voice, and we have no models that do so. Proctoring signals are binary integrity flags only.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="security" title="9. Security practices">
        <LegalBullets
          items={[
            <>Encryption in transit (TLS 1.2+) and at rest; organisation-scoped access control (RBAC) for all recruiter/admin surfaces.</>,
            <>Single-use, SHA-256 hashed, rate-limited pairing tokens for phone-camera companion connections (5-minute TTL).</>,
            <>Interview and cloud-infrastructure secrets managed via environment injection; no secrets in source control.</>,
            <>Sandboxed code execution for the live coding workspace — no outbound network, no file system persistence, strict CPU/memory limits.</>,
            <>Wallet balance is server-authoritative; atomic ledger with idempotency keys prevents double-charge or negative balances.</>,
            <>Regular dependency and configuration reviews; CVE tracking through application security tooling.</>,
          ]}
        />
        <p className="text-xs text-ink-faint">
          Claims on this page describe current practices, not third-party certification. No independent auditor has
          issued a certification of this platform yet; employers requiring contractual audit evidence should request it
          from legal@progeni.live.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="10. Cookies & similar telemetry">
        <p>
          We use functional cookies/tokens for authentication sessions and security — nothing else. We do not run
          advertising or cross-site tracking pixels, and we do not fingerprint you for marketing. Session replay and
          heatmap tooling is absent from candidate surfaces. Disabling cookies will prevent sign-in.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="11. Data retention">
        <p>Retention is policy-driven by data class, enforced by our data governance control panel:</p>
        <LegalBullets
          items={[
            <>Recordings — default 12 months, org-configurable.</>,
            <>Transcripts &amp; scores — lifetime of the candidate relationship + 24 months, or org contract term.</>,
            <>Wallet ledger — minimum 7 years (financial record), anonymised beyond.</>,
            <>Account deletion — verified within 30 days of erasure request, except records under legal hold.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="children" title="12. Children">
        <p>
          The Platform is not directed at anyone under 18 years of age. We do not knowingly collect data from minors.
          If you believe a minor has registered, contact privacy@progeni.live and we will delete the account and
          associated artefacts.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to this policy">
        <p>
          We will update this page when our practices change. Material changes are announced in-product and by email at
          least 14 days before taking effect. The “Last updated” line at the top is authoritative.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact & Data Protection Officer">
        <p>
          For data-rights requests, grievances or regulatory enquiries, write to the Progeni Atlas Privacy Office:
          <br />
          <a href="mailto:privacy@progeni.live" className="text-accent-cyan hover:underline">privacy@progeni.live</a>
          {' '}for data-subject access, erasure, export and correction requests ·{' '}
          <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a>
          {' '}for legal, contractual and regulatory enquiries.<br />
          We respond within 30 calendar days. Recruiter/employer matters are normally resolved faster through your org
          administrator.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
