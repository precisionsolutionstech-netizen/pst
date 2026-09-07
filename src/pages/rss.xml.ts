import type { APIRoute } from 'astro';
import blog from '../data/blog.json';

const SITE = 'https://precisionsolutionstech.com';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

type Post = {
  slug: string;
  title: string;
  blurb?: string;
  metaDescription?: string;
  datePublished?: string | null;
};

export const GET: APIRoute = () => {
  const posts = ((blog as { posts: Post[] }).posts ?? [])
    .slice()
    .sort((a, b) => (b.datePublished || '').localeCompare(a.datePublished || ''));

  const items = posts
    .map((p) => {
      const url = `${SITE}/blog/${p.slug}/`;
      // Four posts carry no publication date in the data; RSS treats pubDate as
      // optional, so emit it only where we actually know it.
      const pubDate = p.datePublished
        ? `\n      <pubDate>${new Date(`${p.datePublished}T09:00:00Z`).toUTCString()}</pubDate>`
        : '';
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.metaDescription || p.blurb || '')}</description>${pubDate}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Precision Solutions Tech — Blog</title>
    <link>${SITE}/blog/</link>
    <description>API design, data normalization, automation workflows and native macOS tools.</description>
    <language>en</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
