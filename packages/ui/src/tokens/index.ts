/** SYLORA design tokens — light futuristic Lumen aesthetic */

export const colors = {
  canvas: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.72)',
  ink: '#1A2230',
  inkMuted: '#5C6678',
  border: 'rgba(26, 34, 48, 0.08)',
  aether: '#0A8FA0',
  aetherBright: '#3DD4E8',
  pulse: '#7B5FD6',
  bloom: '#D44FA0',
  gold: '#D4A843',
  goldBright: '#F0D78C',
  success: '#2A8F5E',
  danger: '#D64545',
} as const;

export const gradients = {
  hero: 'linear-gradient(135deg, #3DD4E8 0%, #7B5FD6 50%, #D44FA0 100%)',
  gold: 'linear-gradient(135deg, #F0D78C 0%, #D4A843 100%)',
  glassBorder: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
} as const;

export const typography = {
  fontSans: '"Inter", system-ui, sans-serif',
  fontDisplay: '"Instrument Serif", Georgia, serif',
  sizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    '4xl': '2.75rem',
  },
} as const;

export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
} as const;

export const radii = {
  sm: '8px',
  md: '12px',
  lg: '20px',
  xl: '28px',
  full: '9999px',
} as const;

export const shadows = {
  soft: '0 8px 32px rgba(26, 34, 48, 0.08)',
  glow: '0 0 40px rgba(61, 212, 232, 0.25)',
  goldGlow: '0 0 32px rgba(212, 168, 67, 0.35)',
} as const;

export const motion = {
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '280ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '600ms cubic-bezier(0.16, 1, 0.3, 1)',
} as const;
