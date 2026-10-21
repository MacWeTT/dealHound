import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const at = (folder: string) => {
  return fileURLToPath(new URL(folder, import.meta.url));
};

export default defineConfig({
  resolve: { alias: { '@tests': at('./tests'), '@locales': at('./locales'), '@': at('./src') } },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
});
