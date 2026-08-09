import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sylora/avatar-runtime': new URL(
        './packages/avatar-runtime/src/index.ts',
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'packages/avatar-runtime/tests/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
