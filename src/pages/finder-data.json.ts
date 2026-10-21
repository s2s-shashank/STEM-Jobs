/**
 * Static JSON feed for the Career Finder popup.
 *
 * The popup is on every page, so we do not want to inline a big blob of
 * occupation data into each HTML file. Instead Astro writes this file once
 * at build time and the browser fetches it the first time the popup opens.
 *
 * It is a real file in the build output - no server needed.
 */
import type { APIRoute } from 'astro';
import { buildFinderPayload } from '../lib/finder';

export const prerender = true;

export const GET: APIRoute = () => {
  const payload = buildFinderPayload();
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
