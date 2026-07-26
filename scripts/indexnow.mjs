/**
 * Submit URLs to IndexNow (Bing and other participating engines).
 *
 *   node scripts/indexnow.mjs
 *   node scripts/indexnow.mjs https://precisionsolutionstech.com/blog/foo
 *   node scripts/indexnow.mjs url1 url2 ...
 *
 * With no args, submits the homepage + sitemap index.
 */
const KEY = '7d2bed5630ab4c21adbf32797b64a578';
const HOST = 'precisionsolutionstech.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

const defaults = [
  `https://${HOST}/`,
  `https://${HOST}/sitemap-index.xml`,
];

const urlList = process.argv.slice(2);
const urls = (urlList.length ? urlList : defaults).map((u) => {
  if (u.startsWith('http')) return u;
  return `https://${HOST}${u.startsWith('/') ? u : `/${u}`}`;
});

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
console.log('Submitted:', urls.join('\n  '));

if (!res.ok && res.status !== 202) {
  process.exit(1);
}
