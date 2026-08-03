/**
 * Submit URLs to IndexNow (Bing and other participating engines).
 *
 *   node scripts/indexnow.mjs
 *   node scripts/indexnow.mjs --sitemap
 *   node scripts/indexnow.mjs https://precisionsolutionstech.com/blog/foo
 *   node scripts/indexnow.mjs /apis/pdf-compression /workflows/rss-daily-email-digest/
 *
 * With no args, submits the homepage + sitemap index.
 * --sitemap fetches the live sitemap and submits every page URL.
 */
const KEY = '7d2bed5630ab4c21adbf32797b64a578';
const HOST = 'precisionsolutionstech.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const SITEMAP_INDEX = `https://${HOST}/sitemap-index.xml`;

const defaults = [`https://${HOST}/`, SITEMAP_INDEX];

function normalizeUrl(u) {
  const trimmed = u.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) return trimmed;
  return `https://${HOST}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

async function urlsFromSitemap() {
  const indexXml = await (await fetch(SITEMAP_INDEX)).text();
  const sitemapLocs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = new Set();

  for (const loc of sitemapLocs) {
    const xml = await (await fetch(loc)).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(m[1].trim());
    }
  }

  return [...urls];
}

const args = process.argv.slice(2).filter(Boolean);

let urls;
if (args.includes('--sitemap')) {
  urls = await urlsFromSitemap();
} else if (args.length) {
  urls = args.map(normalizeUrl).filter(Boolean);
} else {
  urls = defaults;
}

if (!urls.length) {
  console.error('No URLs to submit');
  process.exit(1);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls,
};

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const text = await res.text();
console.log(res.status, res.statusText, text || '(empty body)');
console.log(`Submitted ${urls.length} URL(s):`);
for (const u of urls) console.log(`  ${u}`);

if (!res.ok && res.status !== 202) {
  process.exit(1);
}
