// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
