import { describe, expect, it } from 'vitest';
import { colors, gradients } from './index';

describe('SYLORA design tokens', () => {
  it('defines core brand colors', () => {
    expect(colors.aether).toMatch(/^#/);
    expect(colors.gold).toMatch(/^#/);
  });

  it('defines hero gradient', () => {
    expect(gradients.hero).toContain('linear-gradient');
  });
});
