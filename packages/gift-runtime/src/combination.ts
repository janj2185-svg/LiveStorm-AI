import type { RuntimeManifest } from "./schema";

export interface CombinableGiftEvent {
  eventId: string;
  occurredAtMs: number;
  combinationIds: readonly string[];
}

export interface CoordinatedCombination {
  combinationKey: string;
  eventIds: readonly [string, string];
  occurredAtMs: number;
}

export class CombinationCoordinator {
  readonly #rules: RuntimeManifest["combinations"];
  readonly #recent: CombinableGiftEvent[] = [];

  constructor(rules: RuntimeManifest["combinations"]) {
    this.#rules = [...rules].sort((a, b) => a.combination_id.localeCompare(b.combination_id));
  }

  accept(event: CombinableGiftEvent): CoordinatedCombination | undefined {
    const maxWindowMs = Math.max(0, ...this.#rules.map((rule) => rule.window_seconds * 1000));
    const threshold = event.occurredAtMs - maxWindowMs;
    const candidates = this.#recent
      .filter((prior) => prior.occurredAtMs >= threshold && prior.eventId !== event.eventId)
      .sort((a, b) => b.occurredAtMs - a.occurredAtMs || a.eventId.localeCompare(b.eventId));
    let result: CoordinatedCombination | undefined;
    for (const rule of this.#rules) {
      if (!event.combinationIds.includes(rule.combination_id)) continue;
      const ruleThreshold = event.occurredAtMs - rule.window_seconds * 1000;
      for (const prior of candidates) {
        if (prior.occurredAtMs < ruleThreshold) continue;
        const compatible = [...prior.combinationIds]
          .filter((id) => rule.compatible_combination_ids.includes(id))
          .sort()[0];
        if (compatible) {
          result = {
            combinationKey: `${rule.combination_id}+${compatible}`,
            eventIds: [prior.eventId, event.eventId],
            occurredAtMs: event.occurredAtMs
          };
          break;
        }
      }
      if (result) break;
    }
    this.#recent.push({ ...event, combinationIds: [...event.combinationIds] });
    this.#recent.sort((a, b) => b.occurredAtMs - a.occurredAtMs || a.eventId.localeCompare(b.eventId));
    this.#recent.splice(50);
    return result;
  }
}
