# pst

My public website. It's the storefront: product pages, purchase links, support docs.

## Deploying

**Deploy = merge to `main` and push.** There is no separate deploy step and no
staging gate. Consequences, treat these as hard rules:

- A merge to `main` is a production release. Never merge to `main` just to save work
  or to get off a branch.
- Do all work on a branch. Ask before merging to `main`, every time.
- Never push directly to `main`.
- Anything that reaches `main` is live immediately: no placeholder copy, no TODO
  prices, no broken or dead purchase links, no draft pages linked from navigation.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build` (runs `scripts/gen-code-samples.mjs`, then `astro build`)
- Regenerate API snippets + OpenAPI specs only: `npm run gen:code-samples`

`gen-code-samples.mjs` parses `public/apis/*.playground.js` for each API's host,
path, method and example body, then writes `src/data/api-code-samples.json` and
`public/apis/<slug>/openapi.json`. If you add an API, add its playground script
first; the script reports any API whose endpoint it could not resolve.

## Rules

- Purchase links and prices are revenue. Verify them against the app repo rather than
  copying from memory or from another page.
- Twinkeep pages must offer both channels: Mac App Store and Gumroad.
