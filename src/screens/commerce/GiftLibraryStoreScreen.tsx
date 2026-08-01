/**
 * SYLORA Official Gift Library Store
 * ---------------------------------------------------------------------------
 * Gallery for the 100-gift Official Gift Library. Filters by Rare / Epic /
 * Legendary / Mythic / Divine, search, price, technical status, and preview
 * affordances. Catalog data is authored under artifacts/gift-library and
 * mirrored here for the Lumen gallery — never from LiveStorm placeholders.
 *
 * Wallet send / WebSocket delivery require a running SYLORA API; this screen
 * surfaces honest technical status instead of fake success.
 */

import { useMemo, useState } from 'react';

import { Badge, Button, Icon, SearchInput, Surface } from '../../design-system/primitives';
import { ScreenSection } from '../components';
import catalogJson from './gift-library-catalog.json';

type Rarity = 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Divine';
type GiftStatus = 'SPEC_ONLY' | 'PARTIAL_ASSETS' | 'ASSETS_BUILT_NOT_READY' | 'READY' | string;

interface CatalogGift {
  index: number;
  name: string;
  slug: string;
  rarity: Rarity;
  api_tier: string;
  cost: number;
  duration_ms: number;
  status: GiftStatus;
  form_family: string;
  vfx_family: string;
}

interface Catalog {
  project: string;
  library: string;
  total: number;
  rarity_counts: Record<string, number>;
  ready_count: number;
  assets_built_not_ready_count?: number;
  partial_count?: number;
  spec_only_count: number;
  policy: string;
  gifts: CatalogGift[];
}

const CATALOG = catalogJson as Catalog;
const RARITIES: Rarity[] = ['Rare', 'Epic', 'Legendary', 'Mythic', 'Divine'];

function formatPrice(n: number): string {
  return n.toLocaleString('en-US');
}

function statusTone(status: GiftStatus): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'READY') return 'success';
  if (status === 'ASSETS_BUILT_NOT_READY') return 'warning';
  if (status === 'PARTIAL_ASSETS') return 'danger';
  return 'neutral';
}

export function GiftLibraryStoreScreen() {
  const [rarity, setRarity] = useState<Rarity | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogGift | null>(null);
  const [mode, setMode] = useState<'mobile' | 'desktop'>('desktop');
  const [testSendNote, setTestSendNote] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.gifts.filter((gift) => {
      if (rarity !== 'All' && gift.rarity !== rarity) return false;
      if (!q) return true;
      return (
        gift.name.toLowerCase().includes(q) ||
        gift.slug.includes(q) ||
        gift.form_family.includes(q) ||
        gift.vfx_family.includes(q)
      );
    });
  }, [rarity, query]);

  const onTestSend = (gift: CatalogGift) => {
    if (gift.status !== 'READY') {
      setTestSendNote(
        `Test-send blocked for “${gift.name}”: status is ${gift.status}. Wallet + WebSocket delivery require a published READY gift on a running SYLORA API (Docker Compose not available in this agent environment).`,
      );
      return;
    }
    setTestSendNote(`Test-send would POST /v1/gifts/sends for ${gift.slug} on the live API.`);
  };

  return (
    <div className="sy-gift-library" data-mode={mode}>
      <ScreenSection eyebrow="SYLORA Official Gift Library" title="Gift Store">
        <p className="sy-body sy-fg-quiet">
          One hundred original SYLORA gifts. Filters by rarity, honest technical status, and no
          LiveStorm catalog.
        </p>
      </ScreenSection>

      <Surface className="sy-gift-library__summary" padding="lg">
        <div className="sy-gift-library__stats">
          <div>
            <span className="sy-caption sy-fg-muted">Total</span>
            <strong>{CATALOG.total}</strong>
          </div>
          <div>
            <span className="sy-caption sy-fg-muted">READY</span>
            <strong>{CATALOG.ready_count}</strong>
          </div>
          <div>
            <span className="sy-caption sy-fg-muted">Assets built</span>
            <strong>{CATALOG.assets_built_not_ready_count ?? 0}</strong>
          </div>
          <div>
            <span className="sy-caption sy-fg-muted">Spec only</span>
            <strong>{CATALOG.spec_only_count}</strong>
          </div>
        </div>
        <p className="sy-body sy-fg-quiet">{CATALOG.policy}</p>
        <div className="sy-gift-library__mode">
          <Button
            size="sm"
            variant={mode === 'desktop' ? 'primary' : 'outline'}
            onClick={() => setMode('desktop')}
          >
            Desktop Ultra
          </Button>
          <Button
            size="sm"
            variant={mode === 'mobile' ? 'primary' : 'outline'}
            onClick={() => setMode('mobile')}
          >
            Mobile LOD
          </Button>
        </div>
      </Surface>

      <div className="sy-gift-library__toolbar">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, slug, form, VFX…"
        />
        <div className="sy-gift-library__filters" role="tablist" aria-label="Rarity filters">
          <button
            type="button"
            className={rarity === 'All' ? 'is-active' : undefined}
            onClick={() => setRarity('All')}
          >
            All
          </button>
          {RARITIES.map((tier) => (
            <button
              key={tier}
              type="button"
              className={rarity === tier ? 'is-active' : undefined}
              onClick={() => setRarity(tier)}
            >
              {tier} ({CATALOG.rarity_counts[tier] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {testSendNote ? (
        <Surface className="sy-gift-library__note" padding="md" role="status">
          {testSendNote}
        </Surface>
      ) : null}

      <div className="sy-gift-library__grid">
        {filtered.map((gift) => (
          <button
            key={gift.slug}
            type="button"
            className="sy-gift-library__card"
            onClick={() => setSelected(gift)}
          >
            <div className="sy-gift-library__card-top">
              <Badge tone="accent">{gift.rarity}</Badge>
              <Badge tone={statusTone(gift.status)}>{gift.status.replaceAll('_', ' ')}</Badge>
            </div>
            <h3 className="sy-gift-library__name">{gift.name}</h3>
            <p className="sy-caption sy-fg-muted">{gift.slug}</p>
            <div className="sy-gift-library__card-foot">
              <span>{formatPrice(gift.cost)} credits</span>
              <span>{(gift.duration_ms / 1000).toFixed(1)}s</span>
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="sy-gift-library__drawer" role="dialog" aria-label={`${selected.name} details`}>
          <Surface padding="lg">
            <div className="sy-gift-library__drawer-head">
              <div>
                <p className="sy-caption sy-fg-muted">#{selected.index.toString().padStart(3, '0')}</p>
                <h2 className="sy-title-3">{selected.name}</h2>
                <p className="sy-fg-quiet">{selected.slug}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} aria-label="Close">
                <Icon name="close" size={18} />
              </Button>
            </div>
            <div className="sy-gift-library__meta">
              <div>
                <span className="sy-caption">Rarity</span>
                <strong>{selected.rarity}</strong>
              </div>
              <div>
                <span className="sy-caption">API tier</span>
                <strong>{selected.api_tier}</strong>
              </div>
              <div>
                <span className="sy-caption">Price</span>
                <strong>{formatPrice(selected.cost)}</strong>
              </div>
              <div>
                <span className="sy-caption">Status</span>
                <strong>{selected.status}</strong>
              </div>
              <div>
                <span className="sy-caption">Form</span>
                <strong>{selected.form_family}</strong>
              </div>
              <div>
                <span className="sy-caption">VFX</span>
                <strong>{selected.vfx_family}</strong>
              </div>
            </div>
            <p className="sy-body">
              Artifacts path: <code>artifacts/gift-library/{selected.slug}/</code>
            </p>
            <div className="sy-gift-library__actions">
              <Button
                variant="outline"
                onClick={() =>
                  setTestSendNote(
                    selected.status === 'ASSETS_BUILT_NOT_READY' || selected.status === 'READY'
                      ? `Preview files live at artifacts/gift-library/${selected.slug}/preview.mp4 (replay locally). Fullscreen Three.js runtime requires Gift Studio + verified asset URLs.`
                      : `No preview media yet for ${selected.slug} — SPEC ONLY.`,
                  )
                }
              >
                Preview / Replay
              </Button>
              <Button variant="primary" onClick={() => onTestSend(selected)}>
                Test send
              </Button>
            </div>
            <p className="sy-caption sy-fg-muted">
              Platforms: Web (Three.js), Flutter client catalog, Gift Studio authoring. Real wallet
              delivery and second-user WebSocket receive are not marked complete without a live API.
            </p>
          </Surface>
        </div>
      ) : null}
    </div>
  );
}
