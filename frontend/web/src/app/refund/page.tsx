import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, LegalSection, LegalBullets } from '@/components/legal/LegalShell';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | Progeni Atlas',
  description:
    'Credit pack refunds, interview settlement, system-failure compensation, org subscriptions, cancellation and chargeback policy for Progeni Atlas wallets and the ₹1 = 1 credit model.',
};

const TOC = [
  { id: 'summary', label: '1. At-a-glance summary' },
  { id: 'packs', label: '2. Credit pack refunds' },
  { id: 'interviews', label: '3. Interview settlement' },
  { id: 'system-failure', label: '4. System failure & auto-refund' },
  { id: 'cancellation', label: '5. Cancellation' },
  { id: 'org-subscriptions', label: '6. Org / enterprise subscriptions' },
  { id: 'failed-payments', label: '7. Failed or duplicate payments' },
  { id: 'chargeback', label: '8. Chargebacks & disputes' },
  { id: 'process', label: '9. How to claim & SLA' },
  { id: 'contact', label: '10. Contact & escalation' },
];

export default function RefundPage() {
  return (
    <LegalShell
      kicker="Legal · Refunds"
      title="Refund & Cancellation Policy"
      summary="When credits are refundable, when interview charges are reversed, and how to claim — written against our actual wallet ledger, not generic legalese."
      lastUpdated="14 November 2026"
      toc={TOC}
    >
      <LegalSection id="summary" title="1. At-a-glance summary">
        <LegalBullets
          items={[
            <><strong>Unused credit packs</strong> — refundable within 7 days of purchase, in full, if none of the pack’s credits were consumed and no interview was settled against them.</>,
            <><strong>Consumed credits</strong> — non-refundable once spent on interviews, in line with our settlement rules.</>,
            <><strong>Welcome / promotional credits</strong> — never refundable and never convertible to cash.</>,
            <><strong>Demo licences (2 free interviews)</strong> — non-refundable; they were never paid for.</>,
            <><strong>System failure affecting your interview</strong> — the settled charge for the affected minutes is reversed automatically (see Section 4).</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="packs" title="2. Credit pack refunds">
        <LegalBullets
          items={[
            <>Packs are refunded at the price actually paid via Razorpay reference, through the original payment method; GST, if applicable, follows Indian law.</>,
            <>Refunds process in 5–7 working days after approval. Wallet balance is adjusted atomically with the refund transaction — the ledger shows both entries.</>,
            <><strong>Top-up promo bonus</strong> (e.g., bonus credits on large packs) is excluded from the refund base: refund = pack price × (unused base credits / total base credits granted).</>,
            <>If a pack is partially consumed, you receive a pro-rata refund of the unused fraction — in credits-equivalent INR unless you ask for the original payment method.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="interviews" title="3. Interview settlement">
        <LegalBullets
          items={[
            <>Interviews are charged <strong>at settlement</strong>, per minute, against the hiring organisation’s wallet (recruiter-funded for assigned interviews; candidate-funded for practice mocks where applicable).</>,
            <><strong>₹0.5/min</strong> applies; a 10-minute practice mock costs ≈ ₹5 when no free demo is available.</>,
            <>If you disconnect below the scheduled duration, charges only apply to minutes used (with a one-minute minimum), matching the server ledger — not the client countdown.</>,
            <>Interview outcome (pass/fail) never triggers a refund; scores are irreversible artefacts of your session.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="system-failure" title="4. System failure & automatic credit refund">
        <p>When the platform materially fails you during an interview, the affected settlement is reversed <strong>automatically within one working day</strong>:</p>
        <LegalBullets
          items={[
            <><strong>Audio/video relay outage</strong> — full session refund + demo licence restore.</>,
            <><strong>AI evaluator unavailable</strong> (LLM provider outage) — charge reversed; session can be retaken with a fresh question set.</>,
            <><strong>Pairing handshake failure</strong> — no charge ever occurs (sessions are only settled upon room join).</>,
            <><strong>Double-settlement</strong> — ledger already guarantees idempotency (tx ID per session); any duplicated charge is auto-reversed on detection.</>,
            <><strong>Partial outage</strong> (over 20% of turns unscorable) — pro-rata reversal of affected minutes.</>,
          ]}
        />
        <p>
          If an automatic reversal did not trigger, email{' '}
          <a href="mailto:support@progeni.live" className="text-accent-cyan hover:underline">support@progeni.live</a>{' '}
          with your checkpoint ID (visible in the lobby URL) — resolution within 2 business days.
        </p>
      </LegalSection>

      <LegalSection id="cancellation" title="5. Cancellation">
        <LegalBullets
          items={[
            <>Candidates — cancel before room entry: no charge, demo licence unchanged. After entry: settlement applies per Section 3.</>,
            <>Recruiters — reschedule or cancel invites via dashboard; settled charges are void if the session never started.</>,
            <>Org subscriptions — cancellation stops future auto-renewal; paid but unused credits remain spendable for wallet services per the pack-recovery rules above.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="org-subscriptions" title="6. Org / enterprise subscriptions">
        <p>
          Enterprise agreements (seats, pooled credits, custom rate cards) are governed by the executed contract.
          Overriding rules — pack refunds within 7 days, system-failure reversal, and dispute SLA (48h) — apply to
          enterprise wallets identically, unless the signed master services agreement states otherwise.
        </p>
      </LegalSection>

      <LegalSection id="failed-payments" title="7. Failed or duplicate payments">
        <p>
          Payment failures are rare and never silent: the ledger only grants credits after Razorpay’s server-to-server
          success callback. Duplicate charges (rare gateway retries) are identified automatically and reversed inside
          24h; if not, claim via support with both Razorpay transaction references.
        </p>
      </LegalSection>

      <LegalSection id="chargeback" title="8. Chargebacks & disputes">
        <p>
          Initiate a billing complaint with us first. Chargebacks filed on valid, successfully rendered interview
          settlements without prior contact are treated as dispute abuse: we may return consumed credits to organisation
          wallets and suspend candidate accounts flagged by the Razorpay risk engine. We always communicate first —
          no silent account bans.
        </p>
      </LegalSection>

      <LegalSection id="process" title="9. How to claim & SLA">
        <LegalBullets
          items={[
            <>Email support@progeni.live with checkpoint ID / order ID, or the receipt from your Razorpay app.</>,
            <><strong>2 business days</strong> acknowledgment, <strong>5–7 working days</strong> decision and credit reversal.</>,
            <>Escalations — legal@progeni.live; if you remain unsatisfied, you may complain to your consumer forum or RBI’s Ombudsman (India) as applicable.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" title="10. Contact & escalation">
        <p>
          <a href="mailto:support@progeni.live" className="text-accent-cyan hover:underline">support@progeni.live</a> ·
          <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a> ·
          <a href="mailto:privacy@progeni.live" className="text-accent-cyan hover:underline">privacy@progeni.live</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
