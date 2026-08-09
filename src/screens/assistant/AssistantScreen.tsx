/**
 * AI assistant
 * ---------------------------------------------------------------------------
 * The premise of this screen is that an assistant which cannot show its work
 * and cannot be told "no" is a liability on a platform where a wrong action
 * costs someone their income. Three decisions follow from that.
 *
 * ASSISTANT OUTPUT IS A DOCUMENT, NOT A CHAT MESSAGE.
 * The user's turn is a bubble, right-aligned, because it is an utterance. The
 * assistant's turn is full-width body copy with a heading, citations and a
 * proposal block, because it is a short report. Wrapping a report in a speech
 * bubble caps its measure, forbids structure, and quietly tells people not to
 * read it. The asymmetry is the point: it is legible at a glance who is
 * talking and who is answering.
 *
 * EVERY CLAIM CARRIES ITS SOURCE.
 * Each paragraph ends in a numbered reference that resolves in the citations
 * row beneath it. A number the reader can follow is the difference between an
 * analysis and an assertion.
 *
 * NOTHING RUNS WITHOUT APPROVAL.
 * Proposed actions are a separate, explicitly bordered block with a lock, an
 * "awaiting approval" state and per-action approve/dismiss controls. The
 * composer's mode selector is the only place that contract can be changed, and
 * it states the consequence of each mode in text.
 *
 * The refraction hairline is reserved for surfaces the assistant authored, so
 * the eye can always separate generated content from the user's own.
 */

import { useState } from 'react';

import { LivingAvatar } from '../../design-system/avatar/LivingAvatar';
import { AiOrb } from '../../design-system/brand/Logo';
import {
  Avatar,
  Badge,
  Button,
  Icon,
  IconButton,
  Progress,
  Skeleton,
  Stat,
  Surface,
  Tabs,
  Textarea,
} from '../../design-system/primitives';
import { AI_CONVERSATION, ME } from '../data';
import { ListRow } from '../components';

type Turn = (typeof AI_CONVERSATION)[number];
type AssistantTurn = Extract<Turn, { role: 'assistant' }>;
type Decision = 'approved' | 'dismissed';

const MODES = [
  { id: 'copilot', label: 'Copilot' },
  { id: 'autopilot', label: 'Autopilot' },
  { id: 'manual', label: 'Manual' },
];

/**
 * Each mode states its consequence, not its name. "Autopilot" tells you
 * nothing; "runs reversible actions on its own and logs each one" tells you
 * exactly what you are agreeing to.
 */
const MODE_NOTE: Record<string, string> = {
  copilot:
    'Copilot proposes and waits. Nothing reaches your channel, your ledger or your audience without an explicit approval.',
  autopilot:
    'Autopilot runs reversible actions on its own and writes each one to the activity log. Payouts, deletions and going live always stop for approval.',
  manual:
    'Manual answers questions and nothing else. No actions are proposed, and no tools are called.',
};

const RECENT = [
  { id: 'r1', title: 'Retention drop at minute 12', meta: 'Today · 6 messages', icon: 'analytics' as const },
  { id: 'r2', title: 'Rewrite the Kermadec premiere description', meta: 'Yesterday · 3 messages', icon: 'edit' as const },
  { id: 'r3', title: 'Why did the January payout change?', meta: '2 Feb · 11 messages', icon: 'coin' as const },
  { id: 'r4', title: 'Moderation rules for Quiet Studio', meta: '30 Jan · 8 messages', icon: 'moderation' as const },
  { id: 'r5', title: 'Compare encoder presets for 1080p60', meta: '28 Jan · 4 messages', icon: 'sliders' as const },
];

export function AssistantScreen() {
  const [mode, setMode] = useState('copilot');
  const [draft, setDraft] = useState(
    'Also check whether the drop is worse for viewers who joined from Discover rather than from a follow.',
  );
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const decide = (action: string, decision: Decision) =>
    setDecisions((current) => ({ ...current, [action]: decision }));

  return (
    <div className="sy-screen sy-assistant">
      <div className="sy-assistant__inner sy-screen__inner">
        {/* The orb here is the assistant's live status, not decoration: a turn
            is in flight further down the thread, so it must not sit at rest.
            The scope note wraps onto its own line rather than squeezing the
            title row, so it survives a 393px surface without truncation. */}
        <header className="sy-assistant__head">
          <LivingAvatar
            className="sy-assistant__presence"
            name="Sylora"
            size={72}
            reaction="think"
            utterance="Дивлюсь вашу аналітику і готую відповідь."
            showMeta={false}
          />
          <h1 className="sy-title-3 sy-grow">Assistant</h1>
          <Badge tone="accent" variant="soft" icon="brain">
            Reason 3
          </Badge>
          <IconButton icon="plus" label="Start a new conversation" variant="ghost" />
          <p className="sy-caption sy-fg-muted sy-assistant__scope">
            Reads your analytics, encoder logs and ledger. Nothing outside your own account.
          </p>
        </header>

        <div className="sy-thread">
          {AI_CONVERSATION.map((turn) =>
            turn.role === 'user' ? (
              <div key={turn.id} className="sy-turn sy-turn--user">
                <div className="sy-turn__bubble">
                  <p className="sy-body">{turn.body}</p>
                </div>
                <p className="sy-caption sy-fg-quiet sy-turn__byline">
                  <Avatar name={ME.name} size={20} />
                  {ME.name} · 09:41
                </p>
              </div>
            ) : (
              <AssistantAnswer
                key={turn.id}
                turn={turn}
                decisions={decisions}
                onDecide={decide}
                autopilot={mode === 'autopilot'}
              />
            ),
          )}

          <GeneratingAnswer />
        </div>
      </div>

      {/*
        The composer sits outside the scrolling region, so it is always reachable
        without covering the answer being read. It also keeps the mode selector
        permanently visible, which matters when the mode is what decides whether
        a proposed action needs approval at all.
      */}
      <div className="sy-composer-dock">
        <div className="sy-composer sy-screen__inner">
          <Surface className="sy-composer__shell" elevation="raised" radius="xl" padding="none">
            <Textarea
              className="sy-composer__field"
              label="Message the assistant"
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a stream, a number, or something you want drafted"
            />
            <div className="sy-composer__bar">
              <IconButton icon="attach" label="Attach a clip, log or spreadsheet" variant="ghost" size="sm" />
              <IconButton icon="mic" label="Dictate instead of typing" variant="ghost" size="sm" />
              <span className="sy-composer__rule" aria-hidden="true" />
              <Tabs
                className="sy-composer__modes"
                variant="segmented"
                tabs={MODES}
                active={mode}
                onChange={setMode}
              />
              <span className="sy-grow" />
              <IconButton icon="send" label="Send message" variant="primary" />
            </div>
          </Surface>
          <p className="sy-caption sy-fg-quiet sy-composer__note" aria-live="polite">
            <Icon name={mode === 'autopilot' ? 'warning' : 'lock'} size={13} />
            {MODE_NOTE[mode]}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * One assistant answer.
 *
 * Body, then sources, then proposals — the order a sceptical reader wants:
 * what do you claim, on what evidence, and what are you asking me to allow.
 */
function AssistantAnswer({
  turn,
  decisions,
  onDecide,
  autopilot,
}: {
  turn: AssistantTurn;
  decisions: Record<string, Decision>;
  onDecide: (action: string, decision: Decision) => void;
  autopilot: boolean;
}) {
  const paragraphs = turn.body.split('\n\n');
  const [readingAloud, setReadingAloud] = useState(false);

  return (
    <article className="sy-turn sy-turn--assistant" aria-label="Assistant answer">
      <header className="sy-turn__head">
        <AiOrb size={30} state={readingAloud ? 'speaking' : 'idle'} />
        <h2 className="sy-label">SYLORA Assistant</h2>
        <span className="sy-caption sy-fg-quiet">
          {readingAloud ? 'Reading aloud · 09:41' : '09:41 · 2.4s'}
        </span>
        <span className="sy-grow" />
        {/* The orb is the read-aloud indicator as well as the toggle's state,
            so someone who has scrolled past the button can still tell which
            answer is being spoken. */}
        <IconButton
          icon="volume"
          label={readingAloud ? 'Stop reading aloud' : 'Read this answer aloud'}
          aria-pressed={readingAloud}
          variant="ghost"
          size="xs"
          onClick={() => setReadingAloud((value) => !value)}
        />
        <IconButton icon="bookmark" label="Save this answer" variant="ghost" size="xs" />
        <IconButton icon="share" label="Share this answer" variant="ghost" size="xs" />
      </header>

      <div className="sy-turn__body">
        {paragraphs.map((paragraph, index) => (
          <p key={paragraph.slice(0, 24)} className="sy-body sy-measure">
            {paragraph}
            {turn.citations[index] && (
              <sup className="sy-cite-ref">
                <span className="sy-sr-only">Source </span>
                {index + 1}
              </sup>
            )}
          </p>
        ))}
      </div>

      {/* Sources sit directly under the claim they support, not behind a
          disclosure: a citation you have to go looking for is decoration. */}
      <div className="sy-cites">
        <span className="sy-caption sy-fg-quiet sy-cites__label">
          <Icon name="link" size={13} />
          Grounded in
        </span>
        {turn.citations.map((citation, index) => (
          <button key={citation} type="button" className="sy-cite">
            <span className="sy-cite__index">{index + 1}</span>
            <span className="sy-cite__label sy-truncate">{citation}</span>
            <Icon name="external" size={13} />
          </button>
        ))}
      </div>

      <Surface className="sy-proposal sy-refract" elevation="raised" radius="xl" padding="md">
        <header className="sy-proposal__head">
          <span className="sy-tile-icon sy-proposal__lock">
            <Icon name="lock" size={18} />
          </span>
          <div className="sy-grow">
            <h3 className="sy-label">Proposed actions</h3>
            <p className="sy-caption sy-fg-muted">
              {autopilot
                ? 'Autopilot would run these and log them. They are still shown before they happen.'
                : 'Nothing here has run. Each one waits for you.'}
            </p>
          </div>
          <Badge tone={autopilot ? 'warning' : 'neutral'} variant="outline">
            {autopilot ? 'Auto-run' : 'Awaiting approval'}
          </Badge>
        </header>

        <ul className="sy-proposal__list">
          {turn.actions.map((action, index) => {
            const decision = decisions[action];
            return (
              <li key={action} className={`sy-proposal__item${decision ? ` is-${decision}` : ''}`}>
                <span className="sy-proposal__index sy-mono">{index + 1}</span>
                <div className="sy-grow">
                  <p className="sy-body-sm">{action}</p>
                  <p className="sy-caption sy-fg-quiet">
                    {index === 0
                      ? 'Creates a draft in Studio. Reversible, nothing is published.'
                      : 'Changes an encoder setting on your next broadcast. Reversible.'}
                  </p>
                </div>
                {decision === 'approved' ? (
                  <span className="sy-proposal__state sy-caption sy-fg-success">
                    <Icon name="success" size={15} />
                    Approved
                  </span>
                ) : decision === 'dismissed' ? (
                  <span className="sy-proposal__state sy-caption sy-fg-quiet">
                    <Icon name="close" size={15} />
                    Dismissed
                  </span>
                ) : (
                  <span className="sy-proposal__controls">
                    <Button variant="primary" size="xs" icon="check" onClick={() => onDecide(action, 'approved')}>
                      Approve
                    </Button>
                    <IconButton
                      icon="close"
                      label={`Dismiss: ${action}`}
                      variant="ghost"
                      size="xs"
                      onClick={() => onDecide(action, 'dismissed')}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Surface>

      <footer className="sy-turn__foot">
        <Button variant="ghost" size="xs" icon="repost">
          Regenerate
        </Button>
        <Button variant="ghost" size="xs" icon="heart">
          Helpful
        </Button>
        <Button variant="ghost" size="xs" icon="flag">
          Report an error
        </Button>
      </footer>
    </article>
  );
}

/**
 * The turn that is still being produced.
 *
 * It names the step it is on rather than showing an anonymous spinner, because
 * "reading your encoder logs" is both a progress indicator and a disclosure of
 * what the assistant is touching. The skeleton lines are unequal on purpose —
 * three identical bars read as a loading graphic, uneven ones read as text
 * arriving.
 */
function GeneratingAnswer() {
  return (
    <article
      className="sy-turn sy-turn--assistant is-generating sy-refract sy-refract--bloom"
      aria-label="Assistant is answering"
    >
      <header className="sy-turn__head">
        <AiOrb size={30} state="thinking" />
        <h2 className="sy-label">SYLORA Assistant</h2>
        <span className="sy-caption sy-fg-accent" aria-live="polite">
          Reading encoder logs · 12 Jan – 2 Feb
        </span>
        <span className="sy-grow" />
        <Button variant="ghost" size="xs" icon="stop">
          Stop
        </Button>
      </header>

      <div className="sy-turn__body sy-generating" aria-hidden="true">
        <Skeleton width="94%" height={13} />
        <Skeleton width="100%" height={13} />
        <Skeleton width="72%" height={13} />
      </div>

      <p className="sy-caption sy-fg-quiet sy-generating__note">
        Drafting the transition script against your last four broadcasts.
      </p>
    </article>
  );
}

/**
 * Context panel.
 *
 * Everything here is a fact about the assistant rather than about the answer:
 * what it has cost this month, which model is answering and where it runs, and
 * what was asked before. None of it is required to use the screen, which is the
 * condition for living in a panel that only exists above 1280px.
 */
export function AssistantContextPanel() {
  return (
    <div className="sy-stack sy-gap-6">
      <section className="sy-stack sy-gap-3">
        <h3 className="sy-label sy-assistant-context__title">Usage this month</h3>
        <Stat label="Assistant requests" value="3,412" delta="+18.2%" icon="sparkles" />
        <Progress value={68} label="3,412 of 5,000 included requests used" />
        <p className="sy-caption sy-fg-quiet">
          3,412 of 5,000 included. Resets 1 March; overage is billed at €0.004 per request.
        </p>
      </section>

      <section className="sy-stack sy-gap-3">
        <h3 className="sy-label sy-assistant-context__title">Model and privacy</h3>
        <Surface elevation="flat" padding="sm" radius="lg" className="sy-model-card">
          <div className="sy-model-card__head">
            <span className="sy-tile-icon sy-model-card__icon">
              <Icon name="brain" size={18} />
            </span>
            <div className="sy-grow">
              <p className="sy-label">SYLORA Reason 3</p>
              <p className="sy-caption sy-fg-quiet">Hosted in Frankfurt · eu-central-1</p>
            </div>
          </div>
          <p className="sy-caption sy-fg-muted sy-model-card__note">
            <Icon name="lock" size={13} />
            Your streams, messages and analytics are never used to train shared models, and never
            leave the EU. Retention for debugging is 30 days.
          </p>
          <Button variant="secondary" size="xs" iconEnd="chevronRight">
            Change model
          </Button>
        </Surface>
      </section>

      <section className="sy-stack sy-gap-2">
        <h3 className="sy-label sy-assistant-context__title">Recent conversations</h3>
        {RECENT.map((item) => (
          <ListRow
            key={item.id}
            onClick={() => undefined}
            leading={
              <span className="sy-tile-icon sy-assistant-context__icon">
                <Icon name={item.icon} size={16} />
              </span>
            }
            title={item.title}
            subtitle={item.meta}
            trailing={<Icon name="chevronRight" size={16} />}
          />
        ))}
      </section>
    </div>
  );
}
