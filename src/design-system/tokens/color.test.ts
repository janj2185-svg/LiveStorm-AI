import { describe, expect, it } from 'vitest';

import {
  COLOR_FAMILIES,
  COLOR_FAMILY_NAMES,
  DEFAULT_THEME,
  buildAllRamps,
  buildRamp,
} from './color';
import { contrastRatio, oklchToHex } from './color-science';


describe('Lumen colour system', () => {
  it('is light-first and materialises every 12-step family in both themes', () => {
    expect(DEFAULT_THEME).toBe('light');
    for (const mode of ['light', 'dark'] as const) {
      const ramps = buildAllRamps(mode);
      expect(Object.keys(ramps)).toEqual(COLOR_FAMILY_NAMES);
      for (const family of COLOR_FAMILY_NAMES) {
        expect(ramps[family]).toHaveLength(12);
        for (const colour of ramps[family]) {
          expect(colour.l).toBeGreaterThan(0);
          expect(colour.l).toBeLessThan(1);
          expect(colour.c).toBeGreaterThanOrEqual(0);
          expect(colour.h).toBeGreaterThanOrEqual(0);
          expect(colour.h).toBeLessThan(360);
        }
      }
    }
  });

  it('shifts porcelain from warm light into cool shadow', () => {
    const ramp = buildRamp('porcelain', 'light');
    // Warm highlights carry positive OKLab b, which converts to a yellow-region hue.
    expect(ramp[0].h).toBeGreaterThan(80);
    expect(ramp[0].h).toBeLessThan(130);
    // Cool ink carries negative b and lands in the blue-violet region.
    expect(ramp[11].h).toBeGreaterThan(270);
    expect(ramp[11].h).toBeLessThan(310);
  });

  it('solves every accent solid against one end of the porcelain ramp', () => {
    for (const mode of ['light', 'dark'] as const) {
      const porcelain = buildRamp('porcelain', mode);
      const candidates = [
        oklchToHex(porcelain[0].l, porcelain[0].c, porcelain[0].h),
        oklchToHex(porcelain[11].l, porcelain[11].c, porcelain[11].h),
      ];
      for (const family of COLOR_FAMILY_NAMES) {
        if (family === 'porcelain') continue;
        const solid = buildRamp(family, mode)[8];
        const solidHex = oklchToHex(solid.l, solid.c, solid.h);
        expect(Math.max(...candidates.map((text) => contrastRatio(text, solidHex)))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it('keeps every semantic hue visually distinct', () => {
    const hues = COLOR_FAMILY_NAMES.filter((name) => name !== 'porcelain').map(
      (name) => COLOR_FAMILIES[name].hue,
    );
    for (let index = 0; index < hues.length; index += 1) {
      const current = hues[index];
      const next = hues[(index + 1) % hues.length];
      const distance = Math.min(Math.abs(current - next), 360 - Math.abs(current - next));
      expect(distance).toBeGreaterThanOrEqual(40);
    }
  });
});
