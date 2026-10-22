// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { existsSync, readdirSync } from 'node:fs';

// The data files are not in the repository: the workflow downloads them
// before every build. Without them the site would build with empty pages,
// so stop here and say what to do.
const dataDir = new URL('./src/data/generated/', import.meta.url);
const dataFiles = existsSync(dataDir)
  ? readdirSync(dataDir).filter((name) => name.endsWith('.json'))
  : [];
if (dataFiles.length === 0) {
  throw new Error(
    'No data files found in src/data/generated/. ' +
      'Run the pipeline first: python3 -m pipeline.build_data',
  );
}

// https://astro.build/config
export default defineConfig({
  // The site is 100% static HTML: every page is rendered at build time from
  // the JSON files in src/data, so there is no server and no client framework.
  output: 'static',
  site: 'https://s2s-shashank.github.io',
  // GitHub Pages project sites live under /<repo-name>/
  base: '/stem-jobs/',
  trailingSlash: 'never',
  build: {
    // Keep the output small and cache-friendly.
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [sitemap()],
  compressHTML: true,
});
