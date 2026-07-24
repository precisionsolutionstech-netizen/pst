/**
 * One-shot migration: parses legacy api-catalog/blog HTML into src/data/blog.json.
 * Safe to re-run.
 *
 *   node scripts/extract-blog.mjs [path-to-api-catalog]
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || '/Users/sol/apps/apis/api-catalog';
const OUT = join(here, '..', 'src', 'data', 'blog.json');
const OLD_BASE = 'https://precisionsolutionstech-netizen.github.io/api-catalog';
const NEW_BASE = 'https://precisionsolutionstech.com';

const blogDir = join(SRC, 'blog');
const indexHtml = readFileSync(join(blogDir, 'index.html'), 'utf8');

/* ------------------------- blurbs + order from index -------------------- */

const postMeta = new Map(); // slug -> blurb
const postOrder = [];
const blogBlock =
  indexHtml.match(/<h2>On our blog<\/h2>\s*<ul class="post-list">([\s\S]*?)<\/ul>/)?.[1] ?? '';
for (const m of blogBlock.matchAll(
  /<a href="([a-z0-9-]+)\.html">([\s\S]*?)<\/a>\s*<p>([\s\S]*?)<\/p>/g,
)) {
  const slug = m[1];
  postOrder.push(slug);
  postMeta.set(slug, {
    title: decode(m[2]),
    blurb: decode(m[3].replace(/<[^>]*>/g, '')),
  });
}

const medium = [];
const mediumBlock = indexHtml.match(/<h2>On Medium<\/h2>\s*<ul class="post-list">([\s\S]*?)<\/ul>/)?.[1] ?? '';
for (const m of mediumBlock.matchAll(
  /<a href="(https:\/\/medium\.com[^"]+)"[^>]*>([\s\S]*?)<span[\s\S]*?<\/a>\s*<p>([\s\S]*?)<\/p>/g,
)) {
  medium.push({
    title: decode(m[2].replace(/<[^>]*>/g, '').trim()),
    url: m[1],
    blurb: rewriteLinks(decode(m[3])),
  });
}

/* ----------------------------- link rewriting ---------------------------- */

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function rewriteLinks(html) {
  return html
    .replace(/href="\.\.\/apis\/([a-z0-9-]+)\.html(#[^"]*)?"/g, 'href="/apis/$1/$2"')
    .replace(/href="\.\.\/index\.html(#[^"]*)?"/g, (_, hash) => `href="/apis/${hash || ''}"`)
    .replace(/href="\.\.\/pages\.html"/g, 'href="/apis/"')
    .replace(/href="\.\.\/faq\.html"/g, `href="${OLD_BASE}/faq.html"`)
    .replace(/href="([a-z0-9-]+)\.html(#[^"]*)?"/g, 'href="/blog/$1/$2"')
    .replace(/href="index\.html"/g, 'href="/blog/"');
}

/* ------------------------------ per-post parse --------------------------- */

const files = readdirSync(blogDir)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort((a, b) => {
    const ia = postOrder.indexOf(basename(a, '.html'));
    const ib = postOrder.indexOf(basename(b, '.html'));
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

const posts = [];

for (const file of files) {
  const slug = basename(file, '.html');
  const html = readFileSync(join(blogDir, file), 'utf8');
  const listed = postMeta.get(slug);

  const metaTitle =
    html.match(/<title>([\s\S]*?)<\/title>/)?.[1].replace(/&amp;/g, '&').trim() ??
    listed?.title ??
    slug;
  const metaDescription =
    html.match(/<meta name="description" content="([\s\S]*?)"\s*\/?>/)?.[1].replace(/&amp;/g, '&').trim() ??
    listed?.blurb ??
    '';

  const article = html.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? html;
  const h1 =
    article.match(/<h1>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim() ??
    listed?.title ??
    slug;
  const metaLine =
    article.match(/<p class="meta">([\s\S]*?)<\/p>/)?.[1].replace(/&amp;/g, '&').trim() ?? '';

  // body = article minus <header>…</header>
  let contentHtml = article.replace(/<header[^>]*>[\s\S]*?<\/header>/, '').trim();
  contentHtml = rewriteLinks(contentHtml);

  let datePublished =
    html.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1] ?? null;
  let dateModified =
    html.match(/<meta property="article:modified_time" content="([^"]+)"/)?.[1] ?? null;

  // Prefer BlogPosting JSON-LD dates when present
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj['@type'] === 'BlogPosting') {
        datePublished = obj.datePublished ?? datePublished;
        dateModified = obj.dateModified ?? dateModified;
      }
    } catch {
      /* ignore */
    }
  }

  // Fallback: datetime on <time>
  if (!datePublished) {
    datePublished = article.match(/<time datetime="([^"]+)"/)?.[1] ?? null;
  }

  posts.push({
    slug,
    title: listed?.title ?? h1,
    blurb: listed?.blurb ?? metaDescription,
    h1,
    metaTitle,
    metaDescription,
    metaLine,
    datePublished,
    dateModified,
    contentHtml,
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ posts, medium }, null, 2) + '\n');
console.log(`wrote ${posts.length} posts + ${medium.length} Medium links -> ${OUT}`);
for (const p of posts) {
  console.log(`  ${p.slug}  published=${p.datePublished ?? '—'}  chars=${p.contentHtml.length}`);
}
