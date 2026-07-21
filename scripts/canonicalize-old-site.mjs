/**
 * Points the legacy GitHub Pages api-catalog at the new domain:
 *  - rewrites rel=canonical on index.html and every apis/*.html to
 *    the matching precisionsolutionstech.com URL
 *  - adds a meta refresh + JS redirect to that URL
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
const REDIRECT_MARK = 'pst-redirect';

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function redirectSnippet(newUrl) {
  return [
    `<meta http-equiv="refresh" content="0;url=${newUrl}" data-${REDIRECT_MARK}>`,
    `<script data-${REDIRECT_MARK}>location.replace(${JSON.stringify(newUrl)});</script>`,
  ].join('\n    ');
}

function updatePage(file, oldCanonical, newUrl) {
  let html = readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(
    new RegExp(`<link rel="canonical" href="${escapeRe(oldCanonical)}"\\s*/?>`),
    `<link rel="canonical" href="${newUrl}">`,
  );
  // also catch the trailing-slash variant used on index pages
  html = html.replace(
    /<link rel="canonical" href="https:\/\/precisionsolutionstech-netizen\.github\.io\/api-catalog\/?">/,
    `<link rel="canonical" href="${newUrl}">`,
  );
  // keep canonical current if a prior run already rewrote it
  html = html.replace(
    /<link rel="canonical" href="https:\/\/precisionsolutionstech\.com\/[^"]*">/,
    `<link rel="canonical" href="${newUrl}">`,
  );

  if (html.includes(`data-${REDIRECT_MARK}`)) {
    html = html.replace(
      /<meta http-equiv="refresh"[^>]*data-pst-redirect[^>]*>/,
      `<meta http-equiv="refresh" content="0;url=${newUrl}" data-${REDIRECT_MARK}>`,
    );
    html = html.replace(
      /<script data-pst-redirect>location\.replace\([^)]*\);<\/script>/,
      `<script data-${REDIRECT_MARK}>location.replace(${JSON.stringify(newUrl)});</script>`,
    );
  } else {
    html = html.replace(
      /(<meta charset="UTF-8">\s*)/,
      `$1\n    ${redirectSnippet(newUrl)}\n    `,
    );
  }

  if (!html.includes(NOTE_MARK)) {
    html = html.replace(
      /(<body>\s*<div class="(?:wrap|container)">)/,
      `$1\n<p class="${NOTE_MARK}" style="margin:0 0 20px;padding:10px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;font-size:0.92rem;">This catalog has moved to <a href="${newUrl}"><strong>precisionsolutionstech.com</strong></a> — the new canonical home of our APIs.</p>`,
    );
  } else {
    // keep the banner link pointed at the correct new URL
    html = html.replace(
      new RegExp(
        `(<p class="${NOTE_MARK}"[^>]*>This catalog has moved to <a href=")[^"]+(">)`,
      ),
      `$1${newUrl}$2`,
    );
  }

  if (html !== before) {
    writeFileSync(file, html);
    console.log(`updated ${file} → ${newUrl}`);
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
