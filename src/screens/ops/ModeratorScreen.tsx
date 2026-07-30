/**
 * Moderator dashboard
 * ---------------------------------------------------------------------------
 * A triage tool, not a report reader. The layout is a two-pane queue: the list
 * on the left never moves, the evidence for the selected case fills the right,
 * and the decision sits at the bottom of the evidence rather than beside the
 * queue — so no action can be taken from the list alone.
 *
 * ON SHOWING AI CONFIDENCE AS A NUMBER
 * The model's output is a calibrated probability, and the whole job of this
 * screen is to let a human decide how much of it to trust. A label collapses
 * that: "High" would cover 0.71 and 0.96 alike, and those two cases warrant
 * genuinely different amounts of reading. A number also makes the model
 * auditable — a moderator can say "it was 0.63 and I disagreed", which is a
 * sentence you cannot write about a badge. The bar beside it exists only to
 * make the column rankable at a glance; the number is the fact.
 *
 * The recommendation is always phrased as a recommendation and is never
 * pre-applied. Destructive outcomes additionally require an explicit
 * acknowledgement, because a suspension is the one thing here that cannot be
 * undone quietly.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Icon,
  Select,
  Stat,
  Surface,
  type IconName,
  type Tone,
} from '../../design-system/primitives';
import { ScreenSection } from '../components';
import { MODERATION_QUEUE, type ModerationCase } from '../data';

/* ------------------------------------------------------------------ */
/* Case dressing                                                       */
/* ------------------------------------------------------------------ */

const SEVERITY: Record<ModerationCase['severity'], { tone: Tone; icon: IconName; variant: 'soft' | 'solid' }> = {
  Critical: { tone: 'danger', icon: 'error', variant: 'solid' },
  High: { tone: 'danger', icon: 'warning', variant: 'soft' },
  Medium: { tone: 'warning', icon: 'warning', variant: 'soft' },
  Low: { tone: 'neutral', icon: 'info', variant: 'soft' },
};

/** Queue order is severity first, then age. A 2-minute Critical outranks a
 *  1-hour Low no matter how long the Low has been waiting. */
const SEVERITY_RANK: Record<ModerationCase['severity'], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const QUEUE = [...MODERATION_QUEUE].sort(
  (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
);

interface CaseDetail {
  where: string;
  context: { id: string; author: string; body: string; flagged?: boolean }[];
  reporterNote: string;
  history: {
    accountAge: string;
    followers: string;
    priorActions: string;
    priorDetail: string;
    appeals: string;
  };
  clauses: { id: string; title: string; text: string }[];
}

const DETAIL: Record<string, CaseDetail> = {
  mc4: {
    where: 'Live chat · Dr. Ngozi Adeyemi · ROV dive 214 · 09:44 UTC',
    context: [
      { id: 'a', author: 'kwame.b', body: 'is the ROV feed always this clean at 60m?' },
      { id: 'b', author: 'fastcash_promo', body: 'SYLORA payouts are frozen this week — verify your wallet here to keep earning: syl0ra-verify.top/claim', flagged: true },
      { id: 'c', author: 'fastcash_promo', body: 'only 40 slots left, mods are asleep', flagged: true },
      { id: 'd', author: 'ModRachel', body: 'Do not click that link. Reporting now.' },
    ],
    reporterNote:
      'Same wallet-verification link posted in eleven different live chats inside four minutes. The domain is a homoglyph of sylora.com and was registered yesterday.',
    history: {
      accountAge: '2 days',
      followers: '4',
      priorActions: '0',
      priorDetail: 'No prior actions — account created 9 Feb 2026',
      appeals: 'None',
    },
    clauses: [
      { id: '4.3', title: 'Deceptive links and impersonation', text: 'Directing people to a domain that imitates SYLORA in order to collect credentials or payment details is prohibited and is actioned on first offence.' },
      { id: '4.2', title: 'Platform manipulation', text: 'Posting substantially identical content across multiple spaces or channels within a short window is treated as coordinated spam.' },
    ],
  },
  mc1: {
    where: 'Spaces · Design Systems Guild, Live Production Crew, Kiln Notes, Quiet Studio · 09:38 UTC',
    context: [
      { id: 'a', author: 'throwaway_8812', body: 'Free overlay pack for the first 200 people, drop your handle below and I will DM the file', flagged: true },
      { id: 'b', author: 'throwaway_8812', body: 'Free overlay pack for the first 200 people, drop your handle below and I will DM the file', flagged: true },
      { id: 'c', author: 'devon_k', body: 'this is the fourth space I have seen this in today' },
    ],
    reporterNote:
      'Identical message in four spaces within 90 seconds. Two members report receiving a DM with an executable rather than the promised overlay pack.',
    history: {
      accountAge: '3 weeks',
      followers: '61',
      priorActions: '1',
      priorDetail: 'Warned 28 Jan 2026 — unsolicited DMs',
      appeals: 'None',
    },
    clauses: [
      { id: '4.2', title: 'Platform manipulation', text: 'Posting substantially identical content across multiple spaces or channels within a short window is treated as coordinated spam.' },
      { id: '5.1', title: 'Unsolicited file distribution', text: 'Sending executable files through direct messages without a prior request is prohibited regardless of the file\u2019s contents.' },
    ],
  },
  mc2: {
    where: 'Live chat · Amara Okonkwo · Rebuilding the token pipeline · 09:22 UTC',
    context: [
      { id: 'a', author: 'sana.p', body: 'does the gamut mapping run at build time or runtime?' },
      { id: 'b', author: 'marcus_ade', body: 'asked and answered twenty minutes ago, maybe pay attention instead of typing', flagged: true },
      { id: 'c', author: 'marcus_ade', body: 'every stream it is the same three people asking the same beginner questions', flagged: true },
      { id: 'd', author: 'sana.p', body: 'sorry, I joined late' },
    ],
    reporterNote:
      'Reported by the stream owner rather than the target. Note reads: "Not a slur, but this is the third stream where he has gone after newer viewers and I am losing people from chat."',
    history: {
      accountAge: '2 years',
      followers: '1,840',
      priorActions: '2',
      priorDetail: 'Warned 4 Dec 2025, warned 19 Jan 2026 — both chat conduct',
      appeals: '1 · rejected',
    },
    clauses: [
      { id: '6.1', title: 'Targeted harassment', text: 'Repeatedly directing demeaning remarks at an identifiable person, including in live chat, is actionable even where no slur is used.' },
      { id: '6.4', title: 'Pattern of conduct', text: 'Where two or more prior warnings exist for the same behaviour, the next action escalates by one step.' },
    ],
  },
  mc3: {
    where: 'VOD · Sam Whitfield · “Late night build” · 41:12–48:30',
    context: [
      { id: 'a', author: 'Audio fingerprint', body: 'Match: “Jämtland” — Tobias Lindqvist. 7 minutes 18 seconds, 94% spectral match.' },
      { id: 'b', author: 'Licence check', body: 'No licence on file for this channel. Rights holder is a SYLORA creator with automated claims disabled.', flagged: true },
      { id: 'c', author: 'Stream metadata', body: 'Description credits “music by Tobias” with a link to the artist’s space.' },
    ],
    reporterNote:
      'Automated detection, no human reporter. The uploader credited the artist in the description, and the artist has not filed a claim.',
    history: {
      accountAge: '4 years',
      followers: '31.9K',
      priorActions: '0',
      priorDetail: 'No prior actions',
      appeals: 'None',
    },
    clauses: [
      { id: '8.4', title: 'Music licensing', text: 'Recorded music requires a licence on file. Attribution in a description is not a licence.' },
      { id: '8.6', title: 'Rights-holder discretion', text: 'Where the rights holder is a SYLORA creator with automated claims disabled, contact them before any removal.' },
    ],
  },
  mc5: {
    where: 'Comment · Priya Raghunathan · “Regression diagnostics” · 08:47 UTC',
    context: [
      { id: 'a', author: 'priya.teaches', body: 'A p-value is the probability of data this extreme if the null were true.' },
      { id: 'b', author: 'lin.wei', body: 'This is overstated. Under a mis-specified model the p-value is not interpretable at all, so the framing here is misleading.', flagged: true },
      { id: 'c', author: 'priya.teaches', body: 'Fair — I should have said "under the assumed model". Pinning this.' },
    ],
    reporterNote:
      'Reported as misinformation by a third party. The creator has already replied and accepted the correction.',
    history: {
      accountAge: '3 years',
      followers: '8,204',
      priorActions: '0',
      priorDetail: 'No prior actions',
      appeals: 'None',
    },
    clauses: [
      { id: '2.6', title: 'Disputed claims', text: 'Good-faith disagreement about a technical claim is not misinformation. Action requires demonstrable harm, not incorrectness.' },
      { id: '2.1', title: 'Scope of the policy', text: 'Corrections made in the same thread are treated as resolution and close the case.' },
    ],
  },
};

/**
 * Three of these four are better when they fall, so they state the direction
 * in words rather than as a signed delta: a shrinking queue rendered in red
 * would teach a moderator to read the colour backwards on the one screen
 * where reading a signal backwards is expensive.
 */
const QUEUE_STATS = [
  { label: 'Open cases', value: '47', delta: 'down 12 in 1h', icon: 'moderation' as IconName },
  { label: 'Median response', value: '4m 12s', delta: 'down 48s today', icon: 'clock' as IconName },
  { label: 'Actions today', value: '218', delta: '+31 vs yesterday', icon: 'check' as IconName },
  { label: 'Appeal rate', value: '3.1%', delta: 'down 0.4pp · 30d', icon: 'flag' as IconName },
];

export function ModeratorScreen() {
  const [selectedId, setSelectedId] = useState(QUEUE[0].id);
  const [acknowledged, setAcknowledged] = useState(false);
  const [timeoutLength, setTimeoutLength] = useState('24h');

  const active = QUEUE.find((item) => item.id === selectedId) ?? QUEUE[0];
  const detail = DETAIL[active.id];

  const select = (id: string) => {
    setSelectedId(id);
    // The acknowledgement is per case. Carrying it across a selection change
    // would mean the moderator confirmed a case they had not opened yet.
    setAcknowledged(false);
  };

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-mod">
        <header className="sy-mod__head">
          <div className="sy-mod__title">
            <span className="sy-overline sy-fg-accent">Trust &amp; safety</span>
            <h1 className="sy-title-2">Moderation queue</h1>
            <p className="sy-body-sm sy-fg-muted">
              English &amp; German · your shift ends 18:00 CET
            </p>
          </div>
          <div className="sy-mod__head-actions">
            <Button variant="outline" size="sm" icon="filter">
              Filters
            </Button>
            <Button variant="secondary" size="sm" icon="courses">
              Policy handbook
            </Button>
          </div>
        </header>

        <section className="sy-mod__stats" aria-label="Queue health">
          {QUEUE_STATS.map((stat) => (
            <Surface key={stat.label} padding="sm" elevation="surface">
              <Stat label={stat.label} value={stat.value} delta={stat.delta} icon={stat.icon} />
            </Surface>
          ))}
        </section>

        <div className="sy-mod__work">
          {/* Queue ---------------------------------------------------- */}
          <section className="sy-mod__queue" aria-label="Triage queue">
            <header className="sy-mod__queue-head">
              <h2 className="sy-title-3">Triage</h2>
              <span className="sy-caption sy-fg-quiet sy-mono">{QUEUE.length} shown · 47 open</span>
            </header>
            <p className="sy-caption sy-fg-quiet sy-mod__advisory">
              <Icon name="info" size={13} />
              Recommendations are advisory. Nothing is applied until you apply it.
            </p>

            <Surface padding="none" elevation="surface">
              <ul className="sy-mod__cases">
                {QUEUE.map((item) => {
                  const severity = SEVERITY[item.severity];
                  const selected = item.id === active.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`sy-mod-case${selected ? ' is-selected' : ''}`}
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => select(item.id)}
                      >
                        <span className="sy-mod-case__top">
                          <Badge tone={severity.tone} variant={severity.variant} icon={severity.icon}>
                            {item.severity}
                          </Badge>
                          <span className="sy-caption sy-fg-quiet sy-mono">{item.reporter}</span>
                          <span className="sy-grow" />
                          <span className="sy-caption sy-fg-quiet sy-mono">{item.age}</span>
                        </span>
                        <span className="sy-label sy-mod-case__target sy-truncate">{item.target}</span>
                        <span className="sy-body-sm sy-fg-muted sy-clamp-2">{item.reason}</span>
                        {/* Confidence is a magnitude, not a status, so the bar
                            keeps one colour at every value. Colouring it would
                            imply the model is more right when it is more sure. */}
                        <span className="sy-mod-case__ai">
                          <Icon name="sparkles" size={13} />
                          <span className="sy-caption sy-truncate">{item.aiRecommendation}</span>
                          <span className="sy-mod-case__conf">
                            <span className="sy-meter sy-mod-case__meter" aria-hidden="true">
                              <span
                                className="sy-meter__fill"
                                style={{ inlineSize: `${Math.round(item.aiConfidence * 100)}%` }}
                              />
                            </span>
                            <span className="sy-caption sy-mono sy-mod-case__pct">
                              {(item.aiConfidence * 100).toFixed(0)}%
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          </section>

          {/* Detail --------------------------------------------------- */}
          <section className="sy-mod__detail" aria-label={`Case ${active.id}`}>
            <Surface padding="lg" elevation="surface" className="sy-mod__pane">
              <header className="sy-mod-detail__head">
                <div className="sy-mod-detail__ident">
                  <Avatar name={active.target.replace(/^@/, '')} size={40} />
                  <div className="sy-mod-detail__ident-text">
                    <h2 className="sy-headline sy-truncate">{active.target}</h2>
                    <p className="sy-caption sy-fg-muted">{active.reason}</p>
                  </div>
                </div>
                <div className="sy-mod-detail__ident-meta">
                  <Badge
                    tone={SEVERITY[active.severity].tone}
                    variant={SEVERITY[active.severity].variant}
                    icon={SEVERITY[active.severity].icon}
                  >
                    {active.severity}
                  </Badge>
                  <span className="sy-caption sy-fg-quiet sy-mono">
                    {active.id.toUpperCase()} · {active.age} old
                  </span>
                </div>
              </header>

              {/* The reported line is shown with what came before and after it.
                  A quote with its context stripped out is how good-faith
                  comments get actioned. */}
              <div className="sy-mod-detail__block">
                <h3 className="sy-label sy-mod-detail__label">Reported content, in context</h3>
                <p className="sy-caption sy-fg-quiet sy-mod-detail__where">{detail.where}</p>
                <ol className="sy-mod-excerpt">
                  {detail.context.map((line) => (
                    <li
                      key={line.id}
                      className={`sy-mod-excerpt__line${line.flagged ? ' is-flagged' : ''}`}
                    >
                      {line.flagged && (
                        <span className="sy-mod-excerpt__mark">
                          <Icon name="flag" size={12} />
                          <span className="sy-sr-only">Reported</span>
                        </span>
                      )}
                      <span className="sy-caption sy-mono sy-mod-excerpt__author">{line.author}</span>
                      <span className="sy-body-sm">{line.body}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="sy-mod-detail__cols">
                <div className="sy-mod-detail__block">
                  <h3 className="sy-label sy-mod-detail__label">Reporter notes</h3>
                  <p className="sy-body-sm sy-fg-muted">{detail.reporterNote}</p>
                </div>

                <div className="sy-mod-detail__block">
                  <h3 className="sy-label sy-mod-detail__label">Target history</h3>
                  <div className="sy-mod-detail__kv">
                    <div className="sy-kv">
                      <span className="sy-kv__key">Account age</span>
                      <span className="sy-kv__value sy-mono">{detail.history.accountAge}</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Followers</span>
                      <span className="sy-kv__value sy-mono">{detail.history.followers}</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Prior actions</span>
                      <span className="sy-kv__value sy-mono">{detail.history.priorActions}</span>
                    </div>
                    <div className="sy-kv">
                      <span className="sy-kv__key">Appeals</span>
                      <span className="sy-kv__value sy-mono">{detail.history.appeals}</span>
                    </div>
                  </div>
                  <p className="sy-caption sy-fg-quiet sy-mod-detail__history-note">
                    {detail.history.priorDetail}
                  </p>
                </div>
              </div>

              <div className="sy-mod-rec">
                <span className="sy-mod-rec__icon">
                  <Icon name="sparkles" size={16} />
                </span>
                <div className="sy-mod-rec__text">
                  <span className="sy-label">
                    Assistant recommends: {active.aiRecommendation}
                  </span>
                  <p className="sy-caption sy-fg-muted">
                    Confidence {(active.aiConfidence * 100).toFixed(0)}% — a calibrated
                    probability, not a verdict. You decide; the decision is logged under your
                    name.
                  </p>
                </div>
              </div>

              {/* Action bar. Reversible outcomes first, then the two that are
                  not, behind an acknowledgement the moderator has to make. */}
              <div className="sy-mod-actions">
                <div className="sy-mod-actions__row">
                  <Button variant="secondary" size="sm" icon="check">
                    Dismiss
                  </Button>
                  <Button variant="secondary" size="sm" icon="warning">
                    Warn
                  </Button>
                  <div className="sy-mod-actions__timeout">
                    <Select
                      label="Timeout duration"
                      value={timeoutLength}
                      onChange={(event) => setTimeoutLength(event.target.value)}
                      options={[
                        { value: '1h', label: '1 hour' },
                        { value: '24h', label: '24 hours' },
                        { value: '7d', label: '7 days' },
                        { value: '30d', label: '30 days' },
                      ]}
                      className="sy-mod-actions__select"
                    />
                    <Button variant="secondary" size="sm" icon="clock">
                      Timeout
                    </Button>
                  </div>
                </div>

                <div className="sy-mod-actions__danger">
                  <Checkbox
                    checked={acknowledged}
                    onChange={setAcknowledged}
                    label={
                      <>
                        I have read clause{' '}
                        <span className="sy-mono">{detail.clauses[0].id}</span> and reviewed this
                        account&rsquo;s history.
                      </>
                    }
                  />
                  <div className="sy-mod-actions__row">
                    <Button
                      variant="outline"
                      tone="danger"
                      size="sm"
                      icon="lock"
                      disabled={!acknowledged}
                    >
                      Suspend 30 days
                    </Button>
                    <Button
                      variant="primary"
                      tone="danger"
                      size="sm"
                      icon="close"
                      disabled={!acknowledged}
                    >
                      Ban and purge
                    </Button>
                    {!acknowledged && (
                      <span className="sy-caption sy-fg-quiet sy-mod-actions__gate">
                        <Icon name="lock" size={13} />
                        Confirm above to enable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Surface>

            <ScreenSection title="Policy reference">
              <Surface padding="lg" elevation="surface">
                <ul className="sy-mod__policy">
                  {detail.clauses.map((clause) => (
                    <li key={clause.id} className="sy-mod-clause">
                      <span className="sy-mono sy-mod-clause__id">{clause.id}</span>
                      <div className="sy-mod-clause__text">
                        <span className="sy-label">{clause.title}</span>
                        <p className="sy-body-sm sy-fg-muted">{clause.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" iconEnd="external" className="sy-mod__policy-all">
                  Open the full community policy
                </Button>
              </Surface>
            </ScreenSection>
          </section>
        </div>
      </div>
    </div>
  );
}
