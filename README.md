# precisionsolutionstech.com

Static marketing/SEO site for Precision Solutions Tech: developer APIs (RapidAPI) and n8n
workflow templates (Gumroad + n8n creator marketplace). Built with [Astro](https://astro.build),
zero backend, pure HTML output.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs static site to dist/
npm run preview    # serve the built dist/ locally
```

## Content model

| Data | Source | Regenerate with |
|---|---|---|
| `src/data/apis.json` (20 APIs) | Legacy GitHub Pages repo `~/apps/apis/api-catalog` | `node scripts/extract-apis.mjs` |
| `src/data/workflows.json` (12 workflows) | n8n repo `~/apps/n8n/templates/*/SUBMISSION.txt` | `node scripts/extract-workflows.mjs` |

Both JSON files are committed, so the site builds standalone (CI never needs the other repos).
To add a product, add an entry to the JSON (or re-run the script) — the page, sitemap entry,
and index cards are generated automatically.

Pages live in `src/pages/`; the shared layout (nav, footer, meta, Open Graph, JSON-LD) is
`src/layouts/Base.astro`; design system is `src/styles/global.css`.

## SEO notes

- Every page sets a unique `<title>`, meta description, and `rel=canonical` on
  `https://precisionsolutionstech.com`.
- JSON-LD: `Organization` + `WebSite` site-wide; `BreadcrumbList` everywhere;
  `TechArticle`/`FAQPage`/`SoftwareApplication` on API pages; `Product` with `Offer` on paid
  workflow pages.
- `sitemap-index.xml` is generated at build time by `@astrojs/sitemap`; `public/robots.txt`
  references it.
- The legacy GitHub Pages catalog pages carry `rel=canonical` pointing at this domain so
  existing rankings transfer, plus a meta refresh / JS redirect per page. Re-apply with
  `node scripts/canonicalize-old-site.mjs` after editing `~/apps/apis/api-catalog`.

## Deploy (Cloudflare Pages)

One-time setup, done in the Cloudflare dashboard:

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings: framework preset **Astro**, build command `npm run build`,
   output directory `dist`. Deploy.
4. **Custom domains** tab → add `precisionsolutionstech.com` (and `www.precisionsolutionstech.com`).
5. At your domain registrar, either:
   - move DNS to Cloudflare (recommended — the dashboard walks you through nameservers), or
   - add the CNAME records Cloudflare shows you.
6. HTTPS is automatic. Every `git push` to `main` redeploys.

After the domain is live, in Google Search Console:

1. Add `precisionsolutionstech.com` as a domain property (DNS TXT verification).
2. Submit `https://precisionsolutionstech.com/sitemap-index.xml`.
3. On the old GitHub Pages property, use **Change of Address** to point at the new domain.
