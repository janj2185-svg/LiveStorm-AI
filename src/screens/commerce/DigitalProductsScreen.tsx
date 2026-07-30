/**
 * Digital products — the seller's side of the Marketplace
 * ---------------------------------------------------------------------------
 * Sellers arrive here for two different reasons and the screen answers them in
 * that order: "how is my catalogue doing" (stats, then the list) and "let me
 * fix one thing" (the edit panel). Mixing those would produce the usual
 * commerce dashboard where the money is buried under a form.
 *
 * The management list is a table by nature — the same four numbers compared
 * down a column — so numerics are mono, tabular and right-aligned. Below 768px
 * a real table would either scroll horizontally or lie, so the row folds into
 * a two-line block and the column headers retire.
 *
 * The publish checklist is the one deliberately blocking element on the screen.
 */

import { useState } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  Icon,
  IconButton,
  Input,
  Select,
  Stat,
  Surface,
  Switch,
  Tabs,
  Textarea,
} from '../../design-system/primitives';
import { ScreenSection, Media } from '../components';
import { PRODUCTS } from '../data';

type Status = 'Published' | 'Draft' | 'Archived';

interface CatalogueRow {
  id: string;
  title: string;
  kind: string;
  price: string;
  units: string;
  revenue: string;
  status: Status;
}

const CATALOGUE: CatalogueRow[] = [
  { id: 'pr2', title: 'Stream Deck Overlay Kit', kind: 'Template', price: '€59', units: '840', revenue: '€49,560', status: 'Published' },
  { id: 'pr1', title: 'Aurora Grade — 42 cinematic LUTs', kind: 'Preset pack', price: '€34', units: '2,104', revenue: '€71,536', status: 'Published' },
  { id: 'pr6', title: 'Latency Monitor for OBS', kind: 'Plugin', price: 'Free', units: '18,204', revenue: '€0', status: 'Published' },
  { id: 'pr5', title: 'Ceramic Texture Brushes', kind: 'Brush set', price: '€19', units: '412', revenue: '€7,828', status: 'Published' },
  { id: 'dp1', title: 'Token Pipeline Starter — Figma variables to OKLCH', kind: 'Template', price: '€45', units: '—', revenue: '—', status: 'Draft' },
  { id: 'dp2', title: 'Broadcast Safe Colour Checklist', kind: 'Template', price: '€12', units: '—', revenue: '—', status: 'Draft' },
  { id: 'dp3', title: 'Overlay Kit v1 (superseded)', kind: 'Template', price: '€39', units: '1,286', revenue: '€50,154', status: 'Archived' },
];

const FILES = [
  { name: 'aurora-grade-log.cube', size: '4.2 MB', type: 'LUT · 33-point cube' },
  { name: 'aurora-grade-rec709.cube', size: '4.2 MB', type: 'LUT · 33-point cube' },
  { name: 'reference-stills.zip', size: '186 MB', type: 'Archive · 42 TIFF files' },
];

const CHECKLIST = [
  { id: 'ck1', label: 'Cover art at 1600 × 1200 or larger', done: true },
  { id: 'ck2', label: 'Description over 120 characters', done: true },
  { id: 'ck3', label: 'At least one downloadable file', done: true },
  { id: 'ck4', label: 'Licence selected', done: true },
  { id: 'ck5', label: 'Tax category set for EU sales', done: false },
  { id: 'ck6', label: 'Refund policy acknowledged', done: false },
];

const TAB_COUNTS: Record<string, number> = {
  published: CATALOGUE.filter((row) => row.status === 'Published').length,
  drafts: CATALOGUE.filter((row) => row.status === 'Draft').length,
  archived: CATALOGUE.filter((row) => row.status === 'Archived').length,
};

const STATUS_TONE = { Published: 'success', Draft: 'warning', Archived: 'neutral' } as const;
const STATUS_ICON = { Published: 'success', Draft: 'edit', Archived: 'inventory' } as const;

export function DigitalProductsScreen() {
  const [tab, setTab] = useState('published');
  const [payWhatYouWant, setPayWhatYouWant] = useState(false);

  const filter: Status = tab === 'drafts' ? 'Draft' : tab === 'archived' ? 'Archived' : 'Published';
  const rows = CATALOGUE.filter((row) => row.status === filter);
  const outstanding = CHECKLIST.filter((item) => !item.done).length;

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-dp">
        <header className="sy-dp__head">
          <div className="sy-dp__head-text">
            <span className="sy-overline sy-fg-accent">Seller tools</span>
            <h1 className="sy-title-2">Digital products</h1>
            <p className="sy-body-sm sy-fg-muted sy-measure">
              Seven products across four formats. Payouts settle on the 5th of each month for
              everything cleared before the 1st.
            </p>
          </div>
          <div className="sy-dp__head-actions">
            <Button variant="outline" icon="upload">
              Import
            </Button>
            <Button variant="primary" icon="plus">
              New product
            </Button>
          </div>
        </header>

        <ScreenSection>
          <div className="sy-cols sy-cols--4">
            <Surface elevation="surface" padding="md" radius="lg">
              <Stat label="Revenue, last 30 days" value="€18,412.90" delta="+12.4%" icon="coin" tone="success" />
            </Surface>
            <Surface elevation="surface" padding="md" radius="lg">
              <Stat label="Units sold" value="1,206" delta="+8.1%" icon="marketplace" tone="accent" />
            </Surface>
            <Surface elevation="surface" padding="md" radius="lg">
              <Stat label="Conversion rate" value="3.84%" delta="-0.6%" icon="pulse" tone="warning" />
            </Surface>
            <Surface elevation="surface" padding="md" radius="lg">
              <Stat label="Average order value" value="€41.20" delta="+3.9%" icon="analytics" tone="accent" />
            </Surface>
          </div>
        </ScreenSection>

        <ScreenSection>
          <Tabs
            variant="segmented"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'published', label: 'Published', badge: TAB_COUNTS.published },
              { id: 'drafts', label: 'Drafts', badge: TAB_COUNTS.drafts },
              { id: 'archived', label: 'Archived', badge: TAB_COUNTS.archived },
            ]}
          />

          <Surface className="sy-dp-table" elevation="surface" padding="none" radius="lg">
            <div className="sy-dp-table__head" aria-hidden="true">
              <span>Product</span>
              <span className="sy-dp-num">Price</span>
              <span className="sy-dp-num">Units</span>
              <span className="sy-dp-num">Revenue</span>
              <span>Status</span>
              <span />
            </div>
            <ul>
              {rows.map((row) => (
                <li key={row.id} className="sy-dp-row">
                  <div className="sy-dp-row__product">
                    <span className="sy-dp-row__cover">
                      <Media seed={row.id} ratio="1/1" radius="none" />
                    </span>
                    <span className="sy-dp-row__text">
                      <span className="sy-label sy-clamp-2">{row.title}</span>
                      <span className="sy-caption sy-fg-quiet">{row.kind}</span>
                    </span>
                  </div>
                  <span className="sy-mono sy-dp-num" data-label="Price">
                    {row.price}
                  </span>
                  <span className="sy-mono sy-dp-num sy-fg-muted" data-label="Units">
                    {row.units}
                  </span>
                  <span className="sy-mono sy-dp-num" data-label="Revenue">
                    {row.revenue}
                  </span>
                  <span className="sy-dp-row__status">
                    <Badge tone={STATUS_TONE[row.status]} variant="soft" icon={STATUS_ICON[row.status]}>
                      {row.status}
                    </Badge>
                  </span>
                  <IconButton
                    icon="moreVertical"
                    label={`Actions for ${row.title}`}
                    variant="ghost"
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          </Surface>
        </ScreenSection>

        <ScreenSection title="Editing: Aurora Grade — 42 cinematic LUTs" eyebrow="Published · last edited 2 days ago">
          <div className="sy-cols sy-cols--sidebar">
            <div className="sy-stack sy-gap-5">
              <Surface elevation="surface" padding="lg" radius="lg" className="sy-stack sy-gap-4">
                <Input
                  label="Title"
                  defaultValue="Aurora Grade — 42 cinematic LUTs"
                  hint="Shown on the card, the product page and the receipt."
                />
                <Textarea
                  label="Description"
                  rows={4}
                  defaultValue={
                    'Forty-two looks graded on a calibrated reference monitor over two winters of street work. Each LUT ships as a log and a Rec.709 variant, with the reference stills used to grade them.'
                  }
                  hint="Markdown is supported. The first two lines are used as the search snippet."
                />

                <div className="sy-dp-pricing">
                  <Input label="Price" defaultValue="34" inputSize="md" icon="coin" trailing={<span className="sy-caption sy-fg-quiet">EUR</span>} />
                  <Select
                    label="Licence"
                    defaultValue="commercial"
                    options={[
                      { value: 'personal', label: 'Personal use only' },
                      { value: 'commercial', label: 'Commercial, single seat' },
                      { value: 'team', label: 'Commercial, up to 10 seats' },
                      { value: 'extended', label: 'Extended — resale permitted' },
                    ]}
                  />
                </div>

                <div className="sy-dp-pwyw">
                  <Switch
                    checked={payWhatYouWant}
                    onChange={setPayWhatYouWant}
                    label="Let buyers pay more"
                    description="The price becomes a minimum. Roughly one buyer in nine pays above it."
                  />
                  {payWhatYouWant && (
                    <div className="sy-dp-pwyw__suggest">
                      <Input label="Suggested amount" defaultValue="45" icon="coin" />
                      <p className="sy-caption sy-fg-muted">
                        Suggested amounts above 1.5× the minimum reduce total revenue in our data.
                      </p>
                    </div>
                  )}
                </div>
              </Surface>

              <Surface elevation="surface" padding="lg" radius="lg">
                <div className="sy-between sy-row sy-dp-files__head">
                  <h3 className="sy-headline">Files</h3>
                  <Button variant="outline" size="sm" icon="upload">
                    Add file
                  </Button>
                </div>
                <ul className="sy-dp-files">
                  {FILES.map((file) => (
                    <li key={file.name}>
                      <span className="sy-tile-icon sy-tone-accent">
                        <Icon name="attach" size={18} />
                      </span>
                      <span className="sy-dp-files__text">
                        <span className="sy-label sy-truncate">{file.name}</span>
                        <span className="sy-caption sy-fg-quiet">{file.type}</span>
                      </span>
                      <span className="sy-mono sy-fg-muted sy-dp-files__size">{file.size}</span>
                      <IconButton icon="trash" label={`Remove ${file.name}`} variant="ghost" size="sm" tone="danger" />
                    </li>
                  ))}
                </ul>
                <p className="sy-caption sy-fg-quiet sy-dp-files__total">
                  3 files · 194.4 MB total · delivered as a single signed download link
                </p>
              </Surface>
            </div>

            {/*
              The checklist gates publishing because every unmet item is a
              promise to a buyer that the platform would otherwise have to break
              on the seller's behalf: a missing tax category means an incorrect
              invoice in 27 countries, and an unacknowledged refund policy means
              a dispute with no agreed terms. Gating here is cheaper for
              everyone than a refund queue later, so Publish stays disabled and
              says exactly what is missing rather than failing on submit.
            */}
            <Surface elevation="raised" padding="lg" radius="lg" className="sy-dp-check">
              <h3 className="sy-headline">Publish checklist</h3>
              <p className="sy-caption sy-fg-muted">
                {CHECKLIST.length - outstanding} of {CHECKLIST.length} requirements met
              </p>
              <ul className="sy-dp-check__list">
                {CHECKLIST.map((item) => (
                  <li key={item.id} className={item.done ? 'is-done' : 'is-todo'}>
                    <span className="sy-dp-check__mark">
                      <Icon name={item.done ? 'check' : 'close'} size={13} />
                    </span>
                    <span className="sy-body-sm">{item.label}</span>
                  </li>
                ))}
              </ul>
              <div className="sy-dp-check__actions">
                <Button variant="primary" fullWidth disabled icon="upload">
                  Publish
                </Button>
                <p className="sy-caption sy-fg-warning sy-dp-check__blocked">
                  <Icon name="warning" size={13} />
                  {outstanding} requirements left before this can go live
                </p>
                <Checkbox checked={false} label="Notify my 12.4K followers when it publishes" />
              </div>
            </Surface>
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}
