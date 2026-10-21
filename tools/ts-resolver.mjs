/**
 * Lets Node run the site's TypeScript modules directly.
 *
 * Astro and Vite resolve extensionless imports like './url', but plain
 * Node does not. This hook adds the .ts extension back so the scoring
 * test can import the real source files instead of a copy.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith('.') &&
      !/\.[cm]?[jt]sx?$/.test(specifier)
    ) {
      const base = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.js', '/index.ts', '/index.js']) {
        const candidate = new URL(base.href + ext);
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(candidate.href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
