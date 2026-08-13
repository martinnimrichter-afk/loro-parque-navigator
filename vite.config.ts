import { defineConfig } from 'vite';

export default defineConfig({
  base: '/loro-parque-navigator/',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    coverage: { provider: 'v8', include: ['src/**', 'scripts/lib/**'], exclude: ['src/main.ts', 'src/ui/**', 'src/map/init.ts'] }
  }
} as never);
