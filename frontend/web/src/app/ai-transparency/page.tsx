import React from 'react';
import type { Metadata } from 'next';
import { LegalShell, LegalSection, LegalBullets } from '@/components/legal/LegalShell';

export const metadata: Metadata = {
  title: 'AI Transparency & AEDT Notice | Progeni Atlas',
  description:
    'How the AI interviewer works, what is scored and why, what our models never infer, the NYC Local Law 144 / EU AI Act notices you are entitled to, and how to request a human review of your evaluation.',
};

const TOC = [
  { id: 'notice', label: '1. AEDT notice (read this first)' },
  { id: 'pipeline', label: '2. How the pipeline works' },
  { id: 'what-scored', label: '3. What is and isn’t scored' },
  { id: 'never-inferred', label: '4. What we never infer' },
  { id: 'bias', label: '5. Bias monitoring & audit' },
  { id: 'human-review', label: '6. Your right to human review' },
  { id: 'reporting', label: '7. Reporting a bad question' },
  { id: 'for-employers', label: '8. What employers deploying us must do' },
  { id: 'model-card', label: '9. Model card (high level)' },
  { id: 'contact', label: '10. Contact' },
];

export default function AiTransparencyPage() {
  return (
    <LegalShell
      kicker="Trust · AI Transparency"
      title="How the AI interviewer actually decides"
      summary="A plain-language disclosure of what our models do, what they can’t see, where the limits are, and what you can do about it — the document hiring regulators ask for, written for candidates."
      lastUpdated="14 November 2026"
      toc={TOC}
    >
      <LegalSection id="notice" title="1. AEDT notice (read this first)">
        <div className="rounded-2xl border border-amber-600/40 bg-amber-50 p-4 space-y-2 text-[13px] leading-6">
          <p className="font-bold text-amber-800 uppercase text-[11px] tracking-widest">Candidate notice · NYC Local Law 144 · Illinois AIVIA · EU AI Act</p>
          <div className="text-ink/90">
          <p>
            Progeni Atlas may be used by employers as an <strong>automated employment decision tool</strong> that assists
            in technical screening. As required by applicable law, this page tells you:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li><strong>What it does</strong> — conducts an adaptive Q&amp;A session using LLM-generated questions from the target role, resume and your spoken/typed answers, and scores them against structured rubrics.</li>
            <li><strong>Who relies on it</strong> — the hiring organisation receiving your dossier; they make the final employment decision, not the software.</li>
            <li><strong>Your rights</strong> — request an alternative assessment or a human review of the automated evaluation at any time before/after the session (step-by-step in Section 6).</li>
            <li><strong>Audit status</strong> — we publish score-distribution parity summaries on request; a full third-party AEDT bias audit is renewed on a defined cycle. Employers in NYC remain responsible under their own local-law obligations.</li>
          </ol>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="pipeline" title="2. How the pipeline works, end to end">
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Resume extraction</strong> — your PDF/DOCX is converted to text; skills are matched against our curated skill catalog (+ LLM fallback for niche skills). No images are analysed.</li>
          <li><strong>Question synthesis</strong> — at room join, an LLM produces ≤4 progressive questions grounded in (a) the target job description, (b) your verified resume anchors, (c) current interview stage. Every question is deterministic-enough to defend (it’s stored alongside the session).</li>
          <li><strong>Live turns</strong> — questions are spoken via TTS; your answers are recorded, transcribed, submitted per-turn by silence detection or manual send.</li>
          <li><strong>Evaluation</strong> — each turn is scored for Relevance / Depth / Correctness by a rubric-conditioned LLM judge, with a rules fallback; the judge sees your answer and the expected concepts, nothing else.</li>
          <li><strong>Aggregation</strong> — per-turn scores combine into an overall score (0–100), a recommendation band and a structured dossier (strengths, gaps, key highlights). Skill stars derive from weighted evidence.</li>
          <li><strong>Delivery</strong> — candidate report, recruiter dossier, skill readiness updates. Recording retained per your/org retention policy.</li>
        </ol>
      </LegalSection>

      <LegalSection id="what-scored" title="3. What is and isn’t scored">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-emerald mb-2">Scored</p>
            <ul className="list-disc pl-4 space-y-1 text-[13px]">
              <li>Relevance &amp; structure of answers</li>
              <li>Depth of reasoning &amp; trade-off awareness</li>
              <li>Factual correctness vs expected concepts</li>
              <li>Speech clarity (volume &amp; energy handled by human judges through transcript)</li>
              <li>Follow-up fidelity (can you defend your choices?)</li>
              <li>Step-reasoning in coding turns</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-rose mb-2">Not scored</p>
            <ul className="list-disc pl-4 space-y-1 text-[13px]">
              <li>Accent, dialect, micro-expressions, gait, gaze</li>
              <li>Personality “types”, EQ-from-face, ethnicity, gender, age cues</li>
              <li>Camera presence alone (used only as an anti-cheat integrity flag)</li>
              <li>Demographic or socioeconomic signals of any kind</li>
              <li>Past surnames, location, school prestige beyond resume evidence</li>
            </ul>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="never-inferred" title="4. What we never infer">
        <p>
          We do not run emotion recognition, attractiveness models, voice biometric identity matching for marketing,
          ethnicity classifiers or health inference anywhere in the candidate pipeline — and we will not ship them.
          Proctoring signals (tab switch, copy/paste, multi-face) are strictly boolean integrity flags surfaced for the
          human reviewer; they are not used in scoring.
        </p>
      </LegalSection>

      <LegalSection id="bias" title="5. Bias monitoring & independent audit">
        <LegalBullets
          items={[
            <><strong>Parity monitoring</strong> — every release ships score-distribution comparisons across cohorts (gender, self-declared ethnicity, age band, region) for the same job profile and question set.</>,
            <><strong>Calibration set</strong> — a fixed human-labelled calibration corpus regression-tests judge prompts before changes ship; unjustifiable score drift blocks the release.</>,
            <><strong>Third-party audit</strong> — employers deploying us to screen within New York City must procure an annual independent bias audit. We provide the audit-data extract + summary on request (turnaround: 10 working days).</>,
            <><strong>Override path</strong> — rejection recommendations are advisory; any system-derived recommendation can be overturned by the hiring manager with one click, and overturned decisions are logged for drift analysis.</>,
          ]}
        />
        <p id="anti-bias" className="scroll-mt-28 text-xs text-ink-faint border border-line rounded-xl p-3 mt-2 bg-surface">
          <strong>Anti-bias commitment:</strong> if you believe your evaluation was impacted by demographic bias, write
          to privacy@progeni.live with your checkpoint ID describing the outcome you experienced — include the section
          heading(s) you think disadvantaged you. Every such report is reviewed by two humans and logged to the bias
          ledger. Response within 10 working days.
        </p>
      </LegalSection>

      <LegalSection id="human-review" title="6. Your right to human review">
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Email</strong> <a href="mailto:privacy@progeni.live" className="text-accent-cyan hover:underline">privacy@progeni.live</a> with subject “Human review request” and your checkpoint ID (visible in the lobby URL before joining, e.g. <code className="text-accent-cyan">1d5e2836…</code>).</li>
          <li><strong>We attach</strong> your full session artefacts (audio, transcript, scores, proctoring flags) to a review task and a second human evaluator re-scores from scratch.</li>
          <li><strong>You get</strong> — a written verdict within 10 working days: upheld, amended, or voided (credits reversed too if voided for evaluator error).</li>
        </ol>
        <p className="text-xs text-ink-faint">This mirrors Article 22 GDPR-type safeguards and Illinois AIVIA consent rights — we do not burden you with jurisdiction-specific forms.</p>
      </LegalSection>

      <LegalSection id="reporting" title="7. Reporting a bad question">
        <p>
          If a question was wrong (hallucinated facts, leaked answers, ambiguity), report it right in the post-session
          screen — feedback is keyed to the exact turn, or email privacy@progeni.live with “Bad question | [question
          text]”. Reports go to the evaluator-quality pipeline; validated erroneous questions are blacklisted from
          future jobs matching your profile.
        </p>
      </LegalSection>

      <LegalSection id="for-employers" title="8. What employers deploying us must do">
        <LegalBullets
          items={[
            <>Treat the recommendation bands as decision support — final hiring decisions are yours, attributable, auditable.</>,
            <>NYC-employers: perform/ procure the annual AEDT bias audit; publish the summary; provide the AEDT notice + alternative-assessment opt-out to NYC-based candidates.</>,
            <>EU/EEA-employers: treat us as high-risk-annex tooling; perform conformity documentation, human-in-the-loop oversight, record-keeping (Article 27 logging).</>,
            <>Always surface our checkpoint IDs to candidates in invite emails — they need them to invoke privacy rights.</>,
            <>Never use proctoring flags or scores outside the hiring context you disclosed.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="model-card" title="9. Model card (high level)">
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              {[
                ['Model family', 'GPT-class via OpenAI / Gemini · openRouter fallback · deterministic rubric judge'],
                ['Fine-tuning', 'Prompt-conditioned evaluation, no per-candidate training'],
                ['Tools', 'LiveKit WebRTC, MediaPipe vision (on-device), Qdrant rubric retrieval, PyMuPDF'],
                ['Inputs', 'Resume text (PDF/DOCX), JD text, live transcript, screen integrity signals'],
                ['Outputs', 'turn scores, overall score 0-100, recommendation band, dossier'],
                ['Failure modes', 'Hallucinated micro-facts (mitigated by bounded generation + rubric-conditioned judging); silence inflation (capped by per-turn timers)'],
                ['Limits', 'Not psychometric-grade; one session ≠ capability; accent-agnostic by transcript'],
                ['Last evaluation', 'November 2026 — score distributions parity-balanced across cohorts'],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="align-top px-4 py-2 font-semibold text-ink w-44">{k}</td>
                  <td className="px-4 py-2 text-ink-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="contact" title="10. Contact">
        <p>
          <a href="mailto:privacy@progeni.live" className="text-accent-cyan hover:underline">privacy@progeni.live</a> ·
          <a href="mailto:legal@progeni.live" className="text-accent-cyan hover:underline">legal@progeni.live</a> ·
          <a href="/contact" className="text-accent-cyan hover:underline">Enterprise enquiries →</a>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
