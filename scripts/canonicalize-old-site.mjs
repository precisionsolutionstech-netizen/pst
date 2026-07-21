/**
 * Points the legacy GitHub Pages api-catalog at the new domain:
 *  - rewrites rel=canonical on index.html and every apis/*.html to
 *    the matching precisionsolutionstech.com URL
 *  - adds a visible "moved" notice linking to the new page
 * Idempotent; run after any old-site regeneration.
 *
 *   node scripts/canonicalize-old-site.mjs [path-to-api-catalog]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = process.argv[2] || '/Users/sol/apps/apis/api-catalog';
const OLD_BASE = 'https://precisionsolutionstech-netizen.github.io/api-catalog';
const NEW_BASE = 'https://precisionsolutionstech.com';

const NOTE_MARK = 'moved-note';

function updatePage(file, oldCanonical, newCanonical, noteHtml) {
  let html = readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(
    new RegExp(`<link rel="canonical" href="${oldCanonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*/?>`),
    `<link rel="canonical" href="${newCanonical}">`,
  );
  // also catch the trailing-slash variant used on index pages
  html = html.replace(
    /<link rel="canonical" href="https:\/\/precisionsolutionstech-netizen\.github\.io\/api-catalog\/?">/,
    `<link rel="canonical" href="${newCanonical}">`,
  );

  if (!html.includes(NOTE_MARK)) {
    html = html.replace(
      /(<body>\s*<div class="(?:wrap|container)">)/,
      `$1\n<p class="${NOTE_MARK}" style="margin:0 0 20px;padding:10px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;font-size:0.92rem;">This catalog has moved to <a href="${newCanonical}"><strong>precisionsolutionstech.com</strong></a> — the new canonical home of our APIs.</p>`,
    );
  }

  if (html !== before) {
    writeFileSync(file, html);
    console.log(`updated ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}

// catalog index -> new /apis/ index
updatePage(join(SRC, 'index.html'), `${OLD_BASE}/`, `${NEW_BASE}/apis/`);

// every API detail page -> matching new detail page
const apisDir = join(SRC, 'apis');
for (const f of readdirSync(apisDir).filter((f) => f.endsWith('.html')).sort()) {
  const slug = basename(f, '.html');
  updatePage(join(apisDir, f), `${OLD_BASE}/apis/${slug}.html`, `${NEW_BASE}/apis/${slug}/`);
}
