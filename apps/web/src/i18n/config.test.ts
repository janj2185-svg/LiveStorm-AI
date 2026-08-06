import { describe, expect, it } from 'vitest';
import { locales } from './config';
import en from '../../messages/en.json';
import uk from '../../messages/uk.json';
import pl from '../../messages/pl.json';

describe('i18n message parity', () => {
  const keys = (obj: object, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
      typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );

  it('uk and pl have same keys as en', () => {
    const enKeys = new Set(keys(en));
    for (const locale of [uk, pl]) {
      const localeKeys = new Set(keys(locale));
      expect(localeKeys).toEqual(enKeys);
    }
  });

  it('defines three locales', () => {
    expect(locales).toEqual(['en', 'uk', 'pl']);
  });
});
