/**
 * Builds src/data/page-lastmod.json — a URL-path -> ISO date map that
 * @astrojs/sitemap turns into <lastmod> (see astro.config.mjs).
 *
 * Why a committed file rather than computing it during the build: the dates
 * come from git history, and CI clones are shallow, so running this in the
 * build would silently collapse every page onto the build date. That is the
 * blanket lastmod Google learns to ignore. Run it locally, commit the result.
 *
 *   node scripts/gen-lastmod.mjs
 *
 * Where a page has a real content date (apis.json / blog.json carry
 * dateModified, already used for JSON-LD) that wins — those pages genuinely
 * have not changed since, and saying so keeps crawl budget on the pages that
 * have. Everything else falls back to the last commit that touched the page's
 * template or the data behind it.
 *
 * The shared layout is deliberately NOT considered: a nav tweak in Base.astro
 * is not a change to all 69 pages, and pretending it is defeats the point.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OUT = join(root, 'src', 'data', 'page-lastmod.json');

const readJson = (p) => JSON.parse(readFileSync(join(root, 'src', 'data', p), 'utf8'));

/** Last commit date touching a path, as an ISO day. Null if git can't say. */
function gitDate(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
}

const dateCache = new Map();
function dateOf(...relPaths) {
  const dates = relPaths.map((p) => {
    if (!dateCache.has(p)) dateCache.set(p, gitDate(p));
    return dateCache.get(p);
  });
  const known = dates.filter(Boolean).sort();
  return known.length ? known[known.length - 1] : null;
}

const PAGES = 'src/pages';
const DATA = 'src/data';
const map = {};
const set = (url, date) => {
  if (date) map[url] = date;
};

/* ----------------------------- static pages ----------------------------- */

set('/', dateOf(`${PAGES}/index.astro`, `${DATA}/apps.json`));
set('/about/', dateOf(`${PAGES}/about/index.astro`));
set('/legal/privacy/', dateOf(`${PAGES}/legal/privacy/index.astro`));
set('/legal/privacy/precisdesk/', dateOf(`${PAGES}/legal/privacy/precisdesk/index.astro`));
set(
  '/apps/precisdesk/support/',
  dateOf(`${PAGES}/apps/precisdesk/support/index.astro`),
);

/* ------------------------------ index pages ----------------------------- */

set('/apis/', dateOf(`${PAGES}/apis/index.astro`, `${DATA}/apis.json`));
set('/apps/', dateOf(`${PAGES}/apps/index.astro`, `${DATA}/apps.json`));
set('/blog/', dateOf(`${PAGES}/blog/index.astro`, `${DATA}/blog.json`));
set('/workflows/', dateOf(`${PAGES}/workflows/index.astro`, `${DATA}/workflows.json`));

/* --------------------- APIs + blog: real content dates ------------------- */

for (const api of readJson('apis.json')) {
  set(`/apis/${api.slug}/`, api.dateModified || api.datePublished);
}

for (const post of readJson('blog.json').posts) {
  set(`/blog/${post.slug}/`, post.dateModified || post.datePublished);
}

/* ------------------------ apps, features, workflows ---------------------- */

const appsDate = dateOf(`${PAGES}/apps/[slug].astro`, `${DATA}/apps.json`);
for (const app of readJson('apps.json')) {
  set(`/apps/${app.slug}/`, appsDate);
}

const featureDate = dateOf(`${PAGES}/apps/[slug]/[feature].astro`, `${DATA}/app-features.json`);
const features = readJson('app-features.json');
for (const [app, list] of Object.entries(features)) {
  for (const feature of list) {
    set(`/apps/${app}/${feature.slug}/`, featureDate);
  }
}

const workflowsDate = dateOf(`${PAGES}/workflows/[slug].astro`, `${DATA}/workflows.json`);
for (const wf of readJson('workflows.json')) {
  set(`/workflows/${wf.slug}/`, workflowsDate);
}

/* --------------------------------- write -------------------------------- */

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);

const missing = Object.values(sorted).filter((d) => !d).length;
console.log(`page-lastmod.json: ${Object.keys(sorted).length} URLs${missing ? `, ${missing} without a date` : ''}`);
