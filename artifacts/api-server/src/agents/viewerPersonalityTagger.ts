export type PersonalityTag =
  | "joker"
  | "battle_fan"
  | "playful"
  | "supportive"
  | "loyal_supporter"
  | "gifter_champion";

const TEXT_PATTERNS: Record<string, RegExp[]> = {
  joker: [
    /[😂🤣😹😆🤪]/u,
    /\b(lol|lmao|haha|кек|жарт|смішно|хаха|rofl|😄|ха-ха)\b/i,
  ],
  battle_fan: [
    /\b(батл|battle|1v1|бій|fight|vs\.?|хто переможе|хто кращий|хто виграє|дуель|поєдинок)\b/i,
  ],
  playful: [
    /[🎮🎯🕹️]/u,
    /\b(game|гра|пограємо|весело|fun|cool|крутяк|гуляємо)\b/i,
  ],
  supportive: [
    /[🔥💪❤️🫶💯🏆🫡]/u,
    /\b(молодець|красавчик|топ|красавка|keep going|так тримати|підтримую|підтримка|love|люблю|сила|beast|goat|легенда|гордість)\b/i,
  ],
};

const TOXIC_PATTERNS: RegExp[] = [
  /\b(відстій|ненавиджу|hate|хейт|noob|нуб|лузер|garbage|trash|troll|тролль|убирайся)\b/i,
];

export function detectTextTags(text: string): PersonalityTag[] {
  const tags: PersonalityTag[] = [];
  for (const [tag, patterns] of Object.entries(TEXT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) {
      tags.push(tag as PersonalityTag);
    }
  }
  return tags;
}

export function isToxicComment(text: string): boolean {
  return TOXIC_PATTERNS.some((p) => p.test(text));
}

export function detectStatsTags(profile: {
  totalComments: number;
  totalGifts: number;
  totalCoinsSpent: number;
}): PersonalityTag[] {
  const tags: PersonalityTag[] = [];
  if (profile.totalGifts >= 5 || profile.totalCoinsSpent >= 2000) {
    tags.push("gifter_champion");
  }
  if (
    profile.totalComments >= 30 ||
    (profile.totalGifts >= 2 && profile.totalComments >= 10)
  ) {
    tags.push("loyal_supporter");
  }
  return tags;
}

export function mergeTagsString(
  existing: string,
  newTags: PersonalityTag[],
): string {
  const current = existing
    ? existing.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const merged = new Set([...current, ...newTags]);
  return [...merged].join(",");
}

export function parseTags(tagsStr: string): string[] {
  return tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

export function tagsToMood(textTags: PersonalityTag[], isToxic: boolean): string | null {
  if (isToxic) return "negative";
  if (textTags.includes("joker") || textTags.includes("playful")) return "playful";
  if (textTags.includes("supportive")) return "positive";
  return null;
}
