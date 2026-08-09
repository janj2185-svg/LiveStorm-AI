import type { AvatarFrame, AvatarMood, FrameWeights } from './types.js';

/**
 * Map continuous face parameters onto the five photoreal stills we ship.
 * Blink is an overlay that wins the composite when eyelids close.
 */
export function composeFrameWeights(input: {
  mood: AvatarMood;
  smile: number;
  mouthOpen: number;
  blink: number;
  speaking: boolean;
}): FrameWeights {
  const { mood, smile, mouthOpen, blink, speaking } = input;

  let warm = 0;
  let listen = 0;
  let speak = 0;
  let neutral = 1;

  if (mood === 'attentive' || mood === 'thoughtful') {
    listen = mood === 'thoughtful' ? 0.72 : 0.85;
    neutral = 1 - listen;
  } else if (mood === 'delighted') {
    warm = 0.55 + smile * 0.35;
    speak = mouthOpen * 0.35;
    neutral = Math.max(0, 1 - warm - speak);
  } else if (mood === 'warm' || speaking) {
    warm = 0.25 + smile * 0.55;
    speak = mouthOpen * (speaking ? 0.95 : 0.45);
    const sum = warm + speak;
    if (sum > 1) {
      warm /= sum;
      speak /= sum;
    }
    neutral = Math.max(0, 1 - warm - speak);
  } else {
    warm = smile * 0.35;
    speak = mouthOpen * 0.25;
    neutral = Math.max(0, 1 - warm - speak);
  }

  const openSum = neutral + warm + listen + speak;
  if (openSum > 0) {
    const openScale = 1 - blink;
    neutral = (neutral / openSum) * openScale;
    warm = (warm / openSum) * openScale;
    listen = (listen / openSum) * openScale;
    speak = (speak / openSum) * openScale;
  }

  return {
    neutral,
    warm,
    listen,
    speak,
    blink,
  };
}

export function dominantFrame(weights: FrameWeights): AvatarFrame {
  const entries: Array<[AvatarFrame, number]> = [
    ['blink', weights.blink],
    ['speak', weights.speak],
    ['warm', weights.warm],
    ['listen', weights.listen],
    ['neutral', weights.neutral],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'neutral';
}
