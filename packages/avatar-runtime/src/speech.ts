/**
 * Speech → mouth openness.
 *
 * When live audio analysis is available, prefer RMS intensity. Otherwise we
 * synthesise a conversational cadence from the utterance text so the lips keep
 * moving even without a TTS stream hooked up yet.
 */

const VOWELS = new Set('aeiouyаеєиіїоуюяAEIOUYАЕЄИІЇОУЮЯ'.split(''));

export function speechIntensityFromAudio(rms: number): number {
  // Conversational speech RMS after normalisation typically sits 0.02–0.25.
  const gated = Math.max(0, rms - 0.015);
  return clamp(gated * 4.2, 0, 1);
}

export function speechIntensityFromText(
  utterance: string | null | undefined,
  ageMs: number,
  speaking: boolean,
): number {
  if (!speaking) return 0;
  const text = (utterance ?? '').trim();
  if (!text) {
    // Soft syllable pulse when we know she is talking but have no transcript.
    const pulse = 0.35 + 0.35 * Math.sin(ageMs / 90);
    const micro = 0.15 * Math.sin(ageMs / 37);
    return clamp(pulse + micro, 0, 1);
  }

  const chars = Array.from(text);
  // ~12 chars/sec conversational rate with natural pauses on punctuation.
  const cursor = (ageMs / 1000) * 12;
  const index = Math.floor(cursor) % Math.max(chars.length, 1);
  const ch = chars[index] ?? ' ';

  if (/[\s.,!?;:—-]/.test(ch)) {
    return 0.04 * Math.abs(Math.sin(ageMs / 200));
  }

  const vowel = VOWELS.has(ch);
  const base = vowel ? 0.62 : 0.28;
  const flutter = 0.18 * Math.sin(ageMs / 55 + index);
  return clamp(base + flutter, 0, 1);
}

export function mouthOpenFromIntensity(intensity: number, smile: number): number {
  // Smiling speech opens less vertically — matches real cheek lift.
  const smileDamp = 1 - smile * 0.22;
  return clamp(intensity * smileDamp, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
