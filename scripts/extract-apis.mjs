/**
 * One-shot migration: parses the legacy GitHub Pages api-catalog HTML files
 * and emits src/data/apis.json for the Astro site. Safe to re-run.
 *
 * Also extracts each page's unique playground script into public/apis/{slug}.playground.js
 * and copies sibling assets (config JS, Postman JSON) needed by those playgrounds.
 *
 *   node scripts/extract-apis.mjs [path-to-api-catalog]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || '/Users/sol/apps/apis/api-catalog';
const OUT = join(here, '..', 'src', 'data', 'apis.json');
const PUBLIC_APIS = join(here, '..', 'public', 'apis');

const OLD_BASE = 'https://precisionsolutionstech-netizen.github.io/api-catalog';
const NEW_BASE = 'https://precisionsolutionstech.com';

/* ------------------------- categories from index ------------------------ */

const indexHtml = readFileSync(join(SRC, 'index.html'), 'utf8');
const catalog = new Map(); // slug -> { name, category, blurb }

const sectionRe = /<div class="section"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
for (const m of indexHtml.matchAll(sectionRe)) {
  const block = m[1] + '</div>';
  const cat = block.match(/<h2>([\s\S]*?)<\/h2>/)?.[1].replace(/&amp;/g, '&').trim();
  if (!cat) continue;
  const cardRe = /<a href="apis\/([a-z0-9-]+)\.html">([\s\S]*?)<\/a>\s*<p>([\s\S]*?)<\/p>/g;
  for (const c of block.matchAll(cardRe)) {
    catalog.set(c[1], {
      name: c[2].replace(/&amp;/g, '&').trim(),
      category: cat,
      blurb: c[3].replace(/&amp;/g, '&').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    });
  }
}

/* ----------------------------- link rewriting ---------------------------- */

function rewriteLinks(html) {
  return html
    // sibling API pages
    .replace(/(href=")((?:\.\/)?)([a-z0-9-]+)\.html(#[^"]*)?"/g, (_, p, __, s, hash) =>
      catalog.has(s) ? `${p}/apis/${s}/${hash || ''}"` : `${p}${OLD_BASE}/apis/${s}.html${hash || ''}"`)
    // catalog index
    .replace(/href="\.\.\/index\.html(#[^"]*)?"/g, (_, hash) => `href="/apis/${hash || ''}"`)
    // legacy-only pages stay on the old site
    .replace(/href="\.\.\/(faq|pages)\.html"/g, `href="${OLD_BASE}/$1.html"`)
    // blog posts live on this site under /blog/
    .replace(/href="\.\.\/blog\/index\.html"/g, 'href="/blog/"')
    .replace(/href="\.\.\/blog\/([a-z0-9-]+)\.html(#[^"]*)?"/g, 'href="/blog/$1/$2"')
    .replace(/href="\.\.\/blog\/"/g, 'href="/blog/"')
    .replace(/href="\.\.\/sitemap\.xml"/g, `href="/sitemap-index.xml"`)
    // sibling static assets hosted under /apis/ on this site
    .replace(/href="([a-z0-9-]+\.(?:json|js))"/g, 'href="/apis/$1"')
    .replace(/src="([a-z0-9-]+\.js)"/g, 'src="/apis/$1"')
    // legacy button classes -> new design system
    .replace(/class="cta-primary cta-hero"/g, 'class="btn btn-accent"')
    .replace(/class="cta-primary"/g, 'class="btn btn-accent"')
    .replace(/class="secondary"/g, 'class="btn btn-secondary"');
}

/* ------------------------------ per-page parse --------------------------- */

const apisDir = join(SRC, 'apis');
const files = readdirSync(apisDir).filter((f) => f.endsWith('.html'));
const out = [];

mkdirSync(PUBLIC_APIS, { recursive: true });

for (const file of files.sort()) {
  const slug = basename(file, '.html');
  const html = readFileSync(join(apisDir, file), 'utf8');
  const meta = catalog.get(slug);
  if (!meta) {
    console.warn(`skip (not in index): ${slug}`);
    continue;
  }

  const metaTitleRaw = html.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim() ?? meta.name;
  const metaTitle = metaTitleRaw
    .replace(/\s*\|\s*RapidAPI\s*$/i, ' | Precision Solutions Tech')
    .replace(/&amp;/g, '&');
  const metaDescription =
    html.match(/<meta name="description" content="([\s\S]*?)"\s*\/?>/)?.[1].replace(/&amp;/g, '&').trim() ?? meta.blurb;

  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() ?? meta.name;

  const article = html.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? html;

  // hero = <header> inside article, minus the h1
  let heroHtml = '';
  const heroMatch = article.match(/<header[^>]*>([\s\S]*?)<\/header>/);
  if (heroMatch) {
    heroHtml = heroMatch[1].replace(/<h1>[\s\S]*?<\/h1>/, '').trim();
  }

  // Keep all top-level sections, including each page's unique playground + code blocks.
  const sections = [];
  const secRe = /<section\b[^>]*>[\s\S]*?<\/section>/g;
  for (const s of article.matchAll(secRe)) {
    const block = s[0];
    if (block.indexOf('<section', 8) !== -1) {
      console.warn(`WARNING nested <section> in ${slug}`);
    }
    sections.push(block);
  }

  let contentHtml = sections.join('\n');
  contentHtml = contentHtml.replace(/<script[\s\S]*?<\/script>/g, '');
  // one h1 per page: demote any h1 inside migrated body copy
  contentHtml = contentHtml.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>');
  contentHtml = rewriteLinks(contentHtml);
  heroHtml = rewriteLinks(heroHtml.replace(/<script[\s\S]*?<\/script>/g, ''));
  heroHtml = heroHtml.replace(/<h1([^>]*)>/g, '<h2$1>').replace(/<\/h1>/g, '</h2>');

  // Per-page playground scripts (unique host, samples, endpoints). External deps first.
  const playgroundDeps = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/g)) {
    const src = m[1];
    if (/^https?:\/\//i.test(src) || src.includes('ld+json')) continue;
    const assetName = basename(src);
    const from = join(apisDir, assetName);
    if (existsSync(from)) {
      copyFileSync(from, join(PUBLIC_APIS, assetName));
      playgroundDeps.push(`/apis/${assetName}`);
    } else {
      console.warn(`missing playground dep for ${slug}: ${assetName}`);
    }
  }

  // Copy sibling assets linked from HTML (e.g. Postman collections)
  for (const m of html.matchAll(/(?:href|src)="([a-z0-9-]+\.(?:json|js))"/g)) {
    const assetName = m[1];
    const from = join(apisDir, assetName);
    if (existsSync(from)) {
      copyFileSync(from, join(PUBLIC_APIS, assetName));
    }
  }

  let playgroundScript = null;
  const inlineScripts = [...html.matchAll(
    /<script(?![^>]*\btype="application\/ld\+json")(?![^>]*\bsrc=)(?![^>]*\bdata-pst-redirect)[^>]*>([\s\S]*?)<\/script>/g,
  )]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (inlineScripts.length > 1) {
    console.warn(`WARNING ${slug}: ${inlineScripts.length} non-ld inline scripts; concatenating`);
  }
  if (inlineScripts.length > 0) {
    const jsPath = join(PUBLIC_APIS, `${slug}.playground.js`);
    writeFileSync(jsPath, inlineScripts.join('\n\n') + '\n');
    playgroundScript = `/apis/${slug}.playground.js`;
  } else if (contentHtml.includes('id="playground"') || contentHtml.includes('class="playground"')) {
    console.warn(`WARNING ${slug}: playground markup present but no inline script found`);
  }

  // JSON-LD: carry over FAQPage + SoftwareApplication with URLs moved to new domain
  const jsonLd = [];
  let dateModified = null;
  let datePublished = null;
  const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(ldRe)) {
    let obj;
    try {
      obj = JSON.parse(m[1]);
    } catch {
      console.warn(`bad JSON-LD in ${slug}`);
      continue;
    }
    if (obj['@type'] === 'TechArticle') {
      dateModified = obj.dateModified ?? null;
      datePublished = obj.datePublished ?? null;
    }
    if (obj['@type'] === 'FAQPage' || obj['@type'] === 'SoftwareApplication') {
      const moved = JSON.parse(
        JSON.stringify(obj)
          .replaceAll(`${OLD_BASE}/apis/${slug}.html`, `${NEW_BASE}/apis/${slug}/`)
          .replaceAll(`${OLD_BASE}/`, `${NEW_BASE}/`)
          .replaceAll(OLD_BASE, NEW_BASE),
      );
      jsonLd.push(moved);
    }
  }

  const rapidapiUrl = html.match(/https:\/\/rapidapi\.com\/precisionsolutionstech\/api\/[a-z0-9-]+/)?.[0] ?? null;

  out.push({
    slug,
    name: meta.name,
    category: meta.category,
    blurb: meta.blurb,
    h1,
    metaTitle,
    metaDescription,
    rapidapiUrl,
    datePublished,
    dateModified,
    heroHtml,
    contentHtml,
    playgroundScript,
    playgroundDeps,
    jsonLd,
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} APIs -> ${OUT}`);
for (const a of out) {
  const hasPg = /id="playground"|class="playground"/.test(a.contentHtml);
  console.log(
    `  ${a.slug}  [${a.category}]  sections=${(a.contentHtml.match(/<section/g) || []).length}  playground=${hasPg ? 'yes' : 'NO'}  script=${a.playgroundScript ? 'yes' : 'NO'}  deps=${a.playgroundDeps.length}  ld=${a.jsonLd.length}`,
  );
}
