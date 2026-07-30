/**
 * Marketplace
 * ---------------------------------------------------------------------------
 * A storefront for work made by people the buyer already follows, so the unit
 * of trust is the creator rather than the platform. That is why the creator
 * row sits above the rating on every card: on SYLORA "who made this" outranks
 * "how many stars did strangers give it".
 *
 * The ordering — one editorial hero, then category, then filters, then grid —
 * follows how browsing actually decays. People arrive curious (hero), narrow
 * by kind (chips), narrow by constraint (filters), then scan (grid). Putting
 * filters above the chips would ask for a budget before anyone knows what is
 * on sale.
 *
 * Ratings are shown as stars *and* the number, because a five-star row is fast
 * to read but impossible to compare: 4.7 and 4.9 look identical as stars.
 */

import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Chip,
  Icon,
  IconButton,
  Select,
  Slider,
  Surface,
  Switch,
} from '../../design-system/primitives';
import { Media, ScreenSection } from '../components';
import { PRODUCTS } from '../data';

const CATEGORIES = [
  'Presets',
  'Templates',
  'Sample libraries',
  'Brushes',
  'Plugins',
  'Courses',
  'Overlays',
  'LUTs',
];

/**
 * Review counts are a separate signal from sales: a pack can sell 18,000 times
 * and be reviewed 400 times, and hiding that ratio would flatter the rating.
 */
const REVIEWS: Record<string, string> = {
  pr1: '1,284',
  pr2: '396',
  pr3: '742',
  pr4: '4,118',
  pr5: '208',
  pr6: '3,067',
};

const STAFF_PICKS = [
  {
    id: 'pr3',
    note: 'Recorded over eleven nights on the Jämtland coast. The wind takes are the reason to buy it.',
    curator: 'Curated by the SYLORA audio desk',
  },
  {
    id: 'pr2',
    note: 'The only overlay kit we have tested that ships with real focus states and a colour-blind safe alert palette.',
    curator: 'Curated by the accessibility team',
  },
  {
    id: 'pr4',
    note: 'Six thousand people finished it. The exercises use their own channel data, which is why they finish it.',
    curator: 'Curated by SYLORA Learning',
  },
  {
    id: 'pr5',
    note: 'Brushes built from photographs of real glaze tests, so the grain never repeats across a large canvas.',
    curator: 'Curated by Yuki Tanaka',
  },
];

/**
 * Rating display.
 * The star row is decorative — the accessible name carries the number, so a
 * screen reader hears "4.8 out of 5" rather than five identical star labels.
 */
function Stars({ value, reviews }: { value: number; reviews: string }) {
  return (
    <span className="sy-mkt-rating">
      <span className="sy-mkt-rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <Icon
            key={step}
            name="achievement"
            size={13}
            className={value >= step - 0.25 ? 'is-full' : 'is-empty'}
            filled={value >= step - 0.25}
          />
        ))}
      </span>
      <span className="sy-mono sy-mkt-rating__value">{value.toFixed(1)}</span>
      <span className="sy-caption sy-fg-quiet">({reviews})</span>
      <span className="sy-sr-only">{value.toFixed(1)} out of 5, from {reviews} reviews</span>
    </span>
  );
}

function ProductCard({ product }: { product: (typeof PRODUCTS)[number] }) {
  return (
    <Surface as="article" className="sy-pcard" padding="none" elevation="surface" interactive>
      <div className="sy-pcard__cover">
        <Media seed={product.id} ratio="4/3" radius="none" />
        <Badge className="sy-pcard__kind" tone="neutral" variant="solid">
          {product.kind}
        </Badge>
        <IconButton
          icon="heart"
          label={`Save ${product.title} to wishlist`}
          variant="glass"
          size="sm"
          className="sy-pcard__wish"
        />
      </div>
      <div className="sy-pcard__body">
        <h3 className="sy-pcard__title sy-clamp-2">{product.title}</h3>
        <span className="sy-pcard__creator">
          <Avatar name={product.creator} size={20} />
          <span className="sy-caption sy-fg-muted sy-truncate">{product.creator}</span>
        </span>
        <Stars value={product.rating} reviews={REVIEWS[product.id]} />
        <div className="sy-pcard__foot">
          <span className={`sy-mono sy-pcard__price${product.price === 'Free' ? ' is-free' : ''}`}>
            {product.price}
          </span>
          <span className="sy-caption sy-fg-quiet">{product.sales} sold</span>
        </div>
      </div>
    </Surface>
  );
}

export function MarketplaceScreen() {
  const [category, setCategory] = useState('Presets');
  const [maxPrice, setMaxPrice] = useState(160);
  const [freeOnly, setFreeOnly] = useState(false);
  const featured = PRODUCTS[0];

  return (
    <div className="sy-screen">
      <div className="sy-screen__inner sy-mkt">
        {/* The hero sells one thing properly rather than six things badly. It
            carries the same information as a grid card at four times the size,
            which is what makes it read as an editorial choice, not an advert. */}
        <ScreenSection>
          <Surface className="sy-mkt-hero" padding="none" elevation="raised" radius="xl">
            <div className="sy-mkt-hero__media">
              <Media seed={`${featured.id}-hero`} ratio="16/10" radius="none" scrim>
                <span className="sy-mkt-hero__ribbon">
                  <Icon name="premium" size={14} />
                  Editor&apos;s choice
                </span>
              </Media>
            </div>
            <div className="sy-mkt-hero__body">
              <span className="sy-overline sy-fg-accent">Colour grading · February drop</span>
              <h1 className="sy-title-2 sy-mkt-hero__title">
                Forty-two cinematic LUTs, graded on a calibrated reference monitor
              </h1>
              <p className="sy-body-sm sy-fg-muted sy-measure">
                Mateo built this set over two winters of street work in Bilbao and Lisbon. Every LUT
                ships with a log and a Rec.709 variant, plus the reference stills he graded against.
              </p>
              <div className="sy-mkt-hero__meta">
                <Avatar name={featured.creator} size={28} />
                <span className="sy-body-sm sy-truncate">{featured.creator}</span>
                <span className="sy-mkt-hero__dot" aria-hidden="true" />
                <Stars value={featured.rating} reviews={REVIEWS[featured.id]} />
              </div>
              <div className="sy-mkt-hero__buy">
                <span className="sy-mono-lg">{featured.price}</span>
                <span className="sy-caption sy-fg-quiet sy-mkt-hero__was">
                  <s>€48</s> until 28 February
                </span>
                <span className="sy-grow" />
                <Button variant="ghost" icon="heart" size="md">
                  Wishlist
                </Button>
                <Button variant="primary" icon="marketplace" size="md">
                  Add to cart
                </Button>
              </div>
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection>
          <div className="sy-scroller sy-mkt-cats" role="group" aria-label="Product categories">
            {CATEGORIES.map((name) => (
              <Chip key={name} selected={category === name} onClick={() => setCategory(name)}>
                {name}
              </Chip>
            ))}
          </div>

          {/* Filters are a surface, not a drawer: on a marketplace the constraint
              set *is* the query, and hiding it makes people forget what they asked
              for when the grid comes back nearly empty. */}
          <Surface className="sy-mkt-filters" elevation="flat" padding="md" radius="lg">
            <div className="sy-mkt-filters__price">
              <div className="sy-between sy-row">
                <span className="sy-label">Maximum price</span>
                <span className="sy-mono sy-fg-muted">€0 – €{maxPrice}</span>
              </div>
              <Slider value={maxPrice} min={0} max={200} onChange={setMaxPrice} label="Maximum price in euro" />
            </div>
            <Select
              label="Minimum rating"
              defaultValue="4.5"
              options={[
                { value: '0', label: 'Any rating' },
                { value: '4', label: '4.0 and above' },
                { value: '4.5', label: '4.5 and above' },
                { value: '4.8', label: '4.8 and above' },
              ]}
            />
            <Select
              label="Sort by"
              defaultValue="relevance"
              options={[
                { value: 'relevance', label: 'Most relevant' },
                { value: 'new', label: 'Newest first' },
                { value: 'sales', label: 'Best selling' },
                { value: 'rating', label: 'Highest rated' },
                { value: 'price-asc', label: 'Price: low to high' },
              ]}
            />
            <div className="sy-mkt-filters__toggle">
              <Switch
                checked={freeOnly}
                onChange={setFreeOnly}
                label="Free only"
                description="Hide anything with a price"
              />
            </div>
          </Surface>
        </ScreenSection>

        <ScreenSection
          title={`${category} and related`}
          eyebrow={`${PRODUCTS.length} results`}
          action={
            <Button variant="ghost" size="sm" icon="grid">
              Comfortable
            </Button>
          }
        >
          <div className="sy-grid sy-enter sy-market-grid" style={{ ['--min' as string]: '236px' }}>
            {PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </ScreenSection>

        <ScreenSection
          title="Staff picks"
          eyebrow="Chosen by people, not by ranking"
          action={
            <Button variant="ghost" size="sm" iconEnd="chevronRight">
              All picks
            </Button>
          }
        >
          <div className="sy-scroller">
            {STAFF_PICKS.map((pick) => {
              const product = PRODUCTS.find((item) => item.id === pick.id)!;
              return (
                <Surface
                  key={pick.id}
                  as="article"
                  className="sy-mkt-pick"
                  padding="none"
                  elevation="surface"
                  interactive
                >
                  <Media seed={`${pick.id}-pick`} ratio="16/9" radius="none" />
                  <div className="sy-mkt-pick__body">
                    <span className="sy-overline sy-fg-creator">{product.kind}</span>
                    <h3 className="sy-headline sy-clamp-2">{product.title}</h3>
                    <p className="sy-body-sm sy-fg-muted sy-clamp-3">{pick.note}</p>
                    <p className="sy-caption sy-fg-quiet">{pick.curator}</p>
                    <div className="sy-mkt-pick__foot">
                      <span className="sy-mono sy-pcard__price">{product.price}</span>
                      <Stars value={product.rating} reviews={REVIEWS[product.id]} />
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        </ScreenSection>
      </div>
    </div>
  );
}
