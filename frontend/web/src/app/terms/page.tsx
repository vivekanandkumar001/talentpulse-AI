import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, LegalSection, LegalBullets } from '@/components/legal/LegalShell';

export const metadata: Metadata = {
  title: 'Candidate Terms of Service | Progeni Atlas',
  description:
    'The terms that govern your use of Progeni Atlas as a candidate or hiring organisation: account eligibility, wallets and credits, payments, recording consent, anti-cheat integrity, termination and liability.',
};

const TOC = [
  { id: 'acceptance', label: '1. Acceptance & eligibility' },
  { id: 'accounts', label: '2. Your account' },
  { id: 'wallet', label: '3. Wallets, credits & billing' },
  { id: 'payments', label: '4. Payments & packs' },
  { id: 'your-content', label: '5. Your content & licence' },
  { id: 'recordings', label: '6. Recordings & evaluation' },
  { id: 'integrity', label: '7. Interview integrity & anti-cheat' },
  { id: 'our-services', label: '8. Our services & IP' },
  { id: 'suspension', label: '9. Suspension & termination' },
  { id: 'disclaimers', label: '10. Disclaimers' },
  { id: 'liability', label: '11. Limitation of liability' },
  { id: 'governing', label: '12. Governing law & disputes' },
  { id: 'kiosks', label: '13. Changes & severability' },
  { id: 'contact', label: '14. Contact' },
];

export default function TermsPage() {
  return (
    <LegalShell
      kicker="Legal · Terms"
      title="Candidate Terms of Service"
      summary="What you agree to when you interview, practise or hire on Progeni Atlas — written plainly, including the rules around wallets, recording consent and what AI evaluation does and does not decide."
      lastUpdated="14 November 2026"
      toc={TOC}
    >
      <LegalSection id="acceptance" title="1. Acceptance & eligibility">
        <p>
          By creating an account, entering an interview lobby, or clicking “I agree”, you enter into a
          binding agreement with Progeni Atlas Technologies (“Progeni Atlas”, “we”). You must be at least{' '}
          <strong>18 years old</strong> and capable of contracting under your local law.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="2. Your account">
        <LegalBullets
          items={[
            <>Keep your credentials, OTP and pairing tokens confidential; activity under your account is your activity.</>,
            <><strong>Identity verification</strong> — one natural person, one candidate account; recruiter organisations use joined org memberships, not separate personal accounts.</>,
            <>You must keep profile, resume, education and contact details accurate; interviews scored against a fabricated resume are void.</>,
            <>We may require identity verification (OTP, email domain) before granting wallet grants or interview access.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="wallet" title="3. Wallets, credits & billing">
        <LegalBullets
          items={[
            <><strong>₹1 = 1 credit.</strong> ₹0.5/min is charged at interview settlement (server-authoritative, per-minute), not at launch.</>,
            <><strong>Free demo allocation</strong> — 2 demo interviews per new candidate (admin-configurable). Unused demo licences do not roll into future interview settlement until consumed; demo charges are ₹0.</>,
            <><strong>Settlement is final</strong> once an interview completes or wraps per the timer. Partial-minute consumption is rounded by the server; no manual refunds from client-side math.</>,
            <><strong>Balance never goes negative</strong> — in-room block happens when the recruiter wallet runs dry; the candidate experience stays uninterrupted.</>,
            <><strong>Welcome credits</strong> are one-time, promotional, non-transferable, non-convertible, and redeemable only for platform services.</>,
            <>Credits are personal — selling, gifting, or pooling accounts breaches these terms.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="payments" title="4. Payments & packs">
        <p>
          Credit packs are sold in INR through Razorpay (UPI, cards, netbanking). Successful purchase is
          server-confirmed by Razorpay callback before any credit is granted — we never grant credits client-side.
          Prices and pack definitions are managed by the Platform administrator; consumption and refunds are governed
          by <a href="/refund" className="text-accent-cyan hover:underline">Refund &amp; Cancellation Policy</a>.
          Organisations purchasing subscriptions do so under a separate org agreement; nothing in these terms
          overrides an executed enterprise contract.
        </p>
      </LegalSection>

      <LegalSection id="your-content" title="5. Your content & licence">
        <p>
          You keep ownership of your resume, portfolio snippets and answers. By uploading them, you grant us a
          strictly limited, worldwide, royalty-free licence to process them solely to (a) run your interview,
          (b) generate your evaluation artefacts, (c) improve evaluator quality from de-identified aggregates, and
          (d) comply with law. We do not sell candidate content and never use your recording to train foundation
          models without your explicit opt-in.
        </p>
      </LegalSection>

      <LegalSection id="recordings" title="6. Recordings & evaluation">
        <p>
          Interview audio/video is recorded only after the lobby consent is checked. Recordings, transcripts, scores
          and dossiers may be shared with the hiring organisation and its authorised reviewers. Your right to human
          review of any AI-assisted score is guaranteed on request via privacy@progeni.live with your checkpoint ID.
          Details on what is scored, retained and deletable are in the{' '}
          <a href="/ai-transparency" className="text-accent-cyan hover:underline">AI Transparency &amp; AEDT Notice</a>.
        </p>
      </LegalSection>

      <LegalSection id="integrity" title="7. Interview integrity & anti-cheat">
        <LegalBullets
          items={[
            <><strong>Prohibited</strong> — reading prepared answers aloud from a script; pasting JD/answers into live model prompts; camera bypass or feed substitution; earphones with a prompter; impersonation; using another person’s identity; sharing the room link after pairing.</>,
            <><strong>Phone companion</strong> — pairing links are single-use, short-lived, session-bound and revocable on entry/exit. You may not screen-record the recruiter side nor the companion feed for publication.</>,
            <><strong>Detection signals</strong> — tab-focus departures, gaze drift events, copy/paste attempts, multi-face presence, duplicate submissions, and speech-vs-text mismatch scoring. Signals are flagged, not auto-rejected; a human decides resume/onboarding eligibility.</>,
            <>Integrity violations may result in session termination, score voiding, account suspension, and (where the session was used for an active job application) notice to the employer.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="our-services" title="8. Our services & intellectual property">
        <p>
          Progeni Atlas owns the platform, software, designs, question banks, rubric taxonomy, branding and all
          underlying models. You may not copy, decompile, white-label, scrape, load-balance-probe or reverse engineer
          any part of the Platform. LLM outputs delivered to you (reports, questions, coaching notes) are shared on the
          same dual licence as our models’ underlying providers — you may read and act upon them, but may not claim
          authorship of the Platform’s evaluation engine.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="9. Suspension & termination">
        <LegalBullets
          items={[
            <>We may suspend sessions that breach integrity rules, without notice, where continued participation harms the interview or the employer.</>,
            <>Account closure on your request — active demo credit balances are void; paid balances are handled per the Refund Policy.</>,
            <>We may terminate accounts for repeated integrity violations, fraud, chargebacks, or lawful requests — with notice unless immediate action is required.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="disclaimers" title="10. Disclaimers">
        <p>
          AI evaluation is decision-support, not a psychometric certification. Scores reflect observed performance in
          a single session under defined constraints; they do not guarantee job performance, eligibility, placement,
          or employment. The Platform is provided “as is” and “as available”; scheduled maintenance and internet/gateway
          failure are inevitable and we are not liable for missed interviews caused by your bandwidth, camera or
          device, except where credits were wrongly settled (we refund in full).
        </p>
      </LegalSection>

      <LegalSection id="liability" title="11. Limitation of liability">
        <p>
          In no event shall our aggregate liability exceed the greater of <strong>(a) ₹5,000</strong> or{' '}
          <strong>(b) the credits you purchased in the 30 days prior to the event</strong>, except for liability that cannot
          be excluded by law (death, personal injury, fraud). We are not liable for indirect, incidental, punitive or
          consequential damages — including lost opportunity, lost income or emotional distress.
        </p>
      </LegalSection>

      <LegalSection id="governing" title="12. Governing law & disputes">
        <p>
          These terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the
          courts at Bengaluru, Karnataka, India; parties will first attempt good-faith resolution via
          legal@progeni.live with a 30-day window. Both sides waive class action where enforceable.
        </p>
      </LegalSection>

      <LegalSection id="kiosks" title="13. Changes & severability">
        <p>
          Material changes are announced in-product and by email 14 days in advance. If any clause is held
          unenforceable, the remainder stays in force; where a clause is invalid, we will give it effect to the
          maximum extent permitted.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact">
        <p>
          <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a> ·
          <a href="mailto:support@progeni.live" className="text-accent-cyan hover:underline">support@progeni.live</a><br />
          Progeni Atlas Technologies · India (Bengaluru, Karnataka)
        </p>
      </LegalSection>
    </LegalShell>
  );
}
