import { useState, type FormEvent } from "react";
import type { GiftApiClient } from "./api";
import type { Category, DefinitionDraft, GiftDefinition, GiftTier } from "./types";

const TIERS: GiftTier[] = [
  "simple", "rare", "epic", "legendary", "mythical", "exclusive",
  "seasonal", "holiday", "collectible", "limited", "vip", "ultra_premium"
];

interface DefinitionFormProps {
  api: GiftApiClient;
  categories: Category[];
  onCategory: (category: Category) => void;
  onDefinition: (definition: GiftDefinition) => void;
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function nullableText(value: string): string | null {
  return value.trim() || null;
}

function iso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function DefinitionForm({ api, categories, onCategory, onDefinition }: DefinitionFormProps) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState({ slug: "", name: "", description: "" });
  const [draft, setDraft] = useState({
    category_id: "",
    slug: "",
    name: "",
    description: "",
    price_minor: "100",
    creator_revenue_share_bps: "0",
    tier: "simple" as GiftTier,
    available_from: "",
    available_until: "",
    supply_cap: "",
    per_user_limit: "",
    required_subscription_tier: "",
    minimum_level: "",
    required_achievement: "",
    required_event: "",
    search_tags: "",
    locale_metadata: "{}"
  });

  const createCategory = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await api.createCategory({
        slug: category.slug,
        name: category.name,
        description: nullableText(category.description)
      });
      onCategory(created);
      setDraft((current) => ({ ...current, category_id: created.id }));
      setCategory({ slug: "", name: "", description: "" });
      setMessage(`Created category ${created.name}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Category creation failed");
    } finally {
      setBusy(false);
    }
  };

  const createDefinition = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload: DefinitionDraft = {
        category_id: draft.category_id,
        slug: draft.slug,
        name: draft.name,
        description: draft.description,
        price_minor: Number(draft.price_minor),
        creator_revenue_share_bps: Number(draft.creator_revenue_share_bps),
        tier: draft.tier,
        available_from: iso(draft.available_from),
        available_until: iso(draft.available_until),
        supply_cap: nullableNumber(draft.supply_cap),
        per_user_limit: nullableNumber(draft.per_user_limit),
        required_subscription_tier: nullableText(draft.required_subscription_tier),
        minimum_level: nullableNumber(draft.minimum_level),
        required_achievement: nullableText(draft.required_achievement),
        required_event: nullableText(draft.required_event),
        search_tags: draft.search_tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        locale_metadata: JSON.parse(draft.locale_metadata) as Record<string, string>
      };
      const created = await api.createDefinition(payload);
      onDefinition(created);
      setMessage(`Created definition ${created.id}.`);
      setShow(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Definition creation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`definition-drawer ${show ? "open" : ""}`}>
      <button type="button" className="drawer-toggle" onClick={() => setShow((value) => !value)} aria-expanded={show}>
        {show ? "Close metadata" : "Create category / definition"}
      </button>
      {show && (
        <div className="definition-grid">
          <form onSubmit={(event) => void createCategory(event)}>
            <span className="eyebrow">Catalog structure</span>
            <h3>Create category</h3>
            <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" minLength={3} value={category.slug} onChange={(event) => setCategory({ ...category, slug: event.target.value })} /></label>
            <label>Name<input required minLength={2} value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} /></label>
            <label>Description<textarea maxLength={500} value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} /></label>
            <button type="submit" disabled={busy}>Create category</button>
          </form>
          <form className="definition-form" onSubmit={(event) => void createDefinition(event)}>
            <span className="eyebrow">Commercial metadata</span>
            <h3>Create gift definition</h3>
            <label>Category<select required value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>
              <option value="">Select a real category</option>
              {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select></label>
            <label>Slug<input required minLength={3} value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
            <label>Name<input required minLength={2} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="wide">Description<textarea required minLength={3} maxLength={4000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label>Price (minor units)<input required type="number" min="1" value={draft.price_minor} onChange={(event) => setDraft({ ...draft, price_minor: event.target.value })} /></label>
            <label>Creator share (bps)<input required type="number" min="0" max="10000" value={draft.creator_revenue_share_bps} onChange={(event) => setDraft({ ...draft, creator_revenue_share_bps: event.target.value })} /></label>
            <label>Tier<select value={draft.tier} onChange={(event) => setDraft({ ...draft, tier: event.target.value as GiftTier })}>
              {TIERS.map((tier) => <option value={tier} key={tier}>{tier.replaceAll("_", " ")}</option>)}
            </select></label>
            <label>Available from<input type="datetime-local" value={draft.available_from} onChange={(event) => setDraft({ ...draft, available_from: event.target.value })} /></label>
            <label>Available until<input type="datetime-local" value={draft.available_until} onChange={(event) => setDraft({ ...draft, available_until: event.target.value })} /></label>
            <label>Supply cap<input type="number" min="1" value={draft.supply_cap} onChange={(event) => setDraft({ ...draft, supply_cap: event.target.value })} /></label>
            <label>Per-user limit<input type="number" min="1" value={draft.per_user_limit} onChange={(event) => setDraft({ ...draft, per_user_limit: event.target.value })} /></label>
            <label>Subscription tier<input maxLength={32} value={draft.required_subscription_tier} onChange={(event) => setDraft({ ...draft, required_subscription_tier: event.target.value })} /></label>
            <label>Minimum level<input type="number" min="0" value={draft.minimum_level} onChange={(event) => setDraft({ ...draft, minimum_level: event.target.value })} /></label>
            <label>Required achievement<input maxLength={96} value={draft.required_achievement} onChange={(event) => setDraft({ ...draft, required_achievement: event.target.value })} /></label>
            <label>Required event<input maxLength={96} value={draft.required_event} onChange={(event) => setDraft({ ...draft, required_event: event.target.value })} /></label>
            <label className="wide">Search tags (comma separated)<input value={draft.search_tags} onChange={(event) => setDraft({ ...draft, search_tags: event.target.value })} /></label>
            <label className="wide">Locale metadata JSON<textarea className="code-mini" value={draft.locale_metadata} onChange={(event) => setDraft({ ...draft, locale_metadata: event.target.value })} /></label>
            <button className="primary wide" type="submit" disabled={busy || !draft.category_id}>Create definition</button>
          </form>
        </div>
      )}
      {message && <p className="preview-status" role="status">{message}</p>}
    </section>
  );
}
