import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const THROTTLE_MS = 15 * 60 * 1000;
const MAX_CALLS_PER_STREAM = 30;

// ── Nickname detection ────────────────────────────────────────────────────────
// Detects when a viewer states their name/nickname in a chat message.
// Returns { name, isChangeRequest } or null if no name found.

const NICKNAME_PATTERNS: Array<{ re: RegExp; group: number }> = [
  // Ukrainian
  { re: /мене звати\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i,                group: 1 },
  { re: /звати мене\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i,                group: 1 },
  { re: /зви мене\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i,                  group: 1 },
  { re: /називай мене\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i,              group: 1 },
  { re: /моє (ім.я|прізвисько|нік)\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i, group: 2 },
  { re: /я\s+([А-ЯҐЄІЇа-яґєії][а-яґєії]{2,14})\s*$/i,              group: 1 },
  { re: /мій нік\s+([А-ЯҐЄІЇа-яґєії\w]{2,20})/i,                   group: 1 },
  // Russian
  { re: /меня зовут\s+([А-ЯЁа-яё\w]{2,20})/i,                       group: 1 },
  { re: /зови меня\s+([А-ЯЁа-яё\w]{2,20})/i,                        group: 1 },
  { re: /называй меня\s+([А-ЯЁа-яё\w]{2,20})/i,                     group: 1 },
  // English
  { re: /(?:my name is|call me|i'?m called|you can call me)\s+([\w]{2,20})/i, group: 1 },
  { re: /(?:my nickname is|my nick is)\s+([\w]{2,20})/i,             group: 1 },
];

const NICKNAME_CHANGE_PATTERNS: RegExp[] = [
  /краще звати мене/i,
  /тепер звати мене/i,
  /краще називай мене/i,
  /тепер називай мене/i,
  /змін(и|іть) (звертання|нік)/i,
  /хочу щоб ти звав мене/i,
  /call me .+ instead/i,
  /changed? (?:my name|nickname) to/i,
];

export function detectNicknameInMessage(text: string): { name: string; isChangeRequest: boolean } | null {
  if (!text || text.length < 3 || text.length > 200) return null;

  const isChangeRequest = NICKNAME_CHANGE_PATTERNS.some((p) => p.test(text));

  for (const { re, group } of NICKNAME_PATTERNS) {
    const m = text.match(re);
    if (m?.[group]) {
      const name = m[group].trim();
      // Filter out common false positives
      if (/^(ні|да|ок|все|так|тут|ну|це|хто|що|де|як|ти|я|він|вона)$/i.test(name)) continue;
      if (name.length < 2 || name.length > 20) continue;
      return { name, isChangeRequest };
    }
  }
  return null;
}

const throttleMap = new Map<string, number>();
const streamCallCount = new Map<number, number>();

const SIGNAL_PATTERNS: RegExp[] = [
  /\b(я з |я живу в |я з міста |i'?m from |i live in |jestem z )/i,
  /\bмені \d{1,2} (рок|лет|год|роки|years)/i,
  /\bi'?m \d{1,2} years/i,
  /\bя (працюю|програміст|розробник|будівельник|лікар|вчитель|кухар|водій|дизайнер|студент)\b/i,
  /\b(день народження|my birthday|urodziny)\b/i,
  /(завжди|зазвичай) (приходжу|заходжу|дивлюсь) (після|вранці|ввечері|вночі|о \d)/i,
  /\b(я люблю |обожнюю |фанат |i love |i'?m a (huge )?fan of )/i,
  /\b(мій (улюблений|хобі|захоплення))\b/i,
];

const EPHEMERAL_PATTERNS: RegExp[] = [
  /\b(зараз |іду |пішов |їм |відпочиваю|зайду пізніше|пишу з|дивлюсь зараз)\b/i,
  /\b(brb|afk|going to eat|be right back|gtg)\b/i,
  /\b(ні|да|ок|добре|класно|молодець|дякую|пошли|давай)\b/i,
];

export function hasPersonalFactSignal(text: string): boolean {
  if (text.length < 8) return false;
  if (EPHEMERAL_PATTERNS.some((p) => p.test(text))) return false;
  return SIGNAL_PATTERNS.some((p) => p.test(text));
}

export function isThrottled(streamerId: number, viewerName: string): boolean {
  const key = `${streamerId}:${viewerName}`;
  const lastCall = throttleMap.get(key) ?? 0;
  if (Date.now() - lastCall < THROTTLE_MS) return true;
  const count = streamCallCount.get(streamerId) ?? 0;
  if (count >= MAX_CALLS_PER_STREAM) return true;
  return false;
}

function markCall(streamerId: number, viewerName: string): void {
  const key = `${streamerId}:${viewerName}`;
  throttleMap.set(key, Date.now());
  streamCallCount.set(streamerId, (streamCallCount.get(streamerId) ?? 0) + 1);
}

export function clearStreamCount(sessionId: number): void {
  streamCallCount.delete(sessionId);
}

export async function extractViewerFacts(opts: {
  text: string;
  viewerName: string;
  streamerId: number;
  existingFactKeys: string[];
}): Promise<Array<{ key: string; value: string }> | null> {
  if (!openai) return null;
  if (!hasPersonalFactSignal(opts.text)) return null;
  if (isThrottled(opts.streamerId, opts.viewerName)) return null;

  markCall(opts.streamerId, opts.viewerName);

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Extract ONE durable personal fact from the viewer's message.
Return JSON: {"key": "...", "value": "..."} or {"key": null} if nothing useful.
key must be one of: location, age, occupation, interest, birthday, schedule_pattern, personal_fact
value: short descriptive phrase (max 25 words, third person about the viewer)
Rules:
- ONLY durable facts (location, hobby, job, age, recurring schedule)
- SKIP: opinions about stream, current actions, generic chat ("lol", "nice")
- SKIP if already known: ${opts.existingFactKeys.join(", ") || "none"}`,
        },
        {
          role: "user",
          content: `Viewer "${opts.viewerName}" said: "${opts.text}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw) as { key?: string | null; value?: string };

    if (!parsed.key || !parsed.value) return null;
    const factValue = parsed.value;
    if (factValue.length < 5) return null;
    if (EPHEMERAL_PATTERNS.some((p) => p.test(factValue))) return null;

    console.log(
      `[ViewerFacts] 🧠 extracted | viewer=${opts.viewerName} | ${parsed.key}="${parsed.value}"`,
    );
    return [{ key: parsed.key, value: parsed.value }];
  } catch (err: any) {
    console.warn("[ViewerFacts] extraction error:", err?.message);
    return null;
  }
}
