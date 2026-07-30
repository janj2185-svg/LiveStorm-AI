/**
 * SYLORA design tokens — single source of truth.
 *
 * These TypeScript modules are authoritative. `scripts/build-tokens.mjs`
 * compiles them into three artefacts:
 *
 *   src/design-system/styles/tokens.css   runtime CSS custom properties
 *   design/tokens.figma.json              Figma / Tokens Studio import
 *   design/contrast-audit.json            machine-checked WCAG evidence
 *
 * Nothing in the product may hard-code a colour, size, duration or shadow.
 * If a value is needed and does not exist here, the system is incomplete and
 * the token is added first.
 */

export * from './color';
export * from './typography';
export * from './space';
export * from './motion';
export * from './elevation';
