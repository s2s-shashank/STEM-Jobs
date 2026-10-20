/**
 * Build internal links that respect the site's base path.
 *
 * The site is published at github.com/s2s-shashank/stem-jobs, so every
 * internal URL needs the /stem-jobs prefix. Astro applies that automatically
 * to assets it generates, but not to hrefs we write by hand.
 */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  if (path.startsWith('//')) return path; // protocol-relative, leave alone
  return `${BASE}${path}`;
}
