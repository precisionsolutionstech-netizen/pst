// Build-time extraction of API endpoint details from the per-API playground
// scripts, so every API page ships a real, copy-pasteable request in its HTML.
//
// The playground JS overwrites #generated-code on load; this only guarantees
// that crawlers and JS-less clients still see a working snippet.
//
// Run: npm run gen:code-samples   (wired into `npm run build`)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pgDir = join(root, 'public', 'apis');
const apis = JSON.parse(readFileSync(join(root, 'src', 'data', 'apis.json'), 'utf8'));

/** Pull `name = 'value'` / `name: 'value'` regardless of spacing or quote style. */
function scalar(src, name) {
  const m = src.match(new RegExp(`\\b${name}\\s*[:=]\\s*['"\`]((?:[^'"\`\\\\]|\\\\.)*)['"\`]`));
  if (!m) return null;
  try { return JSON.parse(`"${m[1].replace(/"/g, '\\"')}"`); } catch { return m[1]; }
}

/** Brace/bracket-match a JS object or array literal starting at or after `from`. */
function literalAt(src, from) {
  const oi = src.indexOf('{', from), ai = src.indexOf('[', from);
  const start = oi === -1 ? ai : ai === -1 ? oi : Math.min(oi, ai);
  if (start === -1) return null;
  const open = src[start], close = open === '{' ? '}' : ']';
  let depth = 0, inStr = null, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return { literal: src.slice(start, i + 1), end: i + 1 };
  }
  return null;
}

/**
 * Recover the first worked example, in order of fidelity:
 *   1. the SAMPLES map (evaluated with its prelude, so referenced vars resolve)
 *   2. a `body = "..."` JSON string constant
 *   3. the default value of the #body-json textarea in the page content
 */
function sampleBody(src, contentHtml) {
  // SAMPLES map, or a single SAMPLE / BATCH_SAMPLE constant (object or array).
  const m = src.match(/\b((?:[A-Z][A-Z_]*_)?SAMPLES?)\b\s*[:=]\s*[[{]/);
  if (m) {
    const lit = literalAt(src, m.index);
    if (lit) {
      // Evaluate everything up to the end of the constant so INLINE_SCHEMA-style
      // references defined earlier in the IIFE are in scope.
      const bodyStart = src.search(/\(\s*function\s*\(\s*\)\s*\{/) === 0 ? src.indexOf('{') + 1 : 0;
      const prelude = src.slice(bodyStart, lit.end);
      for (const code of [`${prelude}; return ${m[1]};`, `return (${lit.literal});`]) {
        try {
          const val = new Function(code)();
          if (Array.isArray(val)) { if (val.length) return val; continue; }
          const first = val && typeof val === 'object' ? Object.values(val)[0] : null;
          if (first && typeof first === 'object') return first;
        } catch { /* fall through to the next strategy */ }
      }
    }
  }

  const raw = scalar(src, 'body');
  if (raw && raw.trim().startsWith('{')) {
    try { return JSON.parse(raw); } catch { /* not JSON, keep looking */ }
  }

  const ta = contentHtml.match(/<textarea[^>]*id="body-json"[^>]*>([\s\S]*?)<\/textarea>/);
  if (ta && ta[1].trim()) {
    const decoded = ta[1]
      .replace(/&quot;/g, '"').replace(/&#34;/g, '"')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").trim();
    try { return JSON.parse(decoded); } catch { /* leave unset */ }
  }
  return null;
}

/** Multipart APIs take a file, not a JSON document. */
function isFileUpload(src, contentHtml) {
  if (/fileUpload\s*=\s*true/.test(src)) return true;
  if (/fileUpload\s*=\s*false/.test(src)) return false;
  const usesForm = /new FormData\(|mode:\s*'formdata'|formdata/.test(src);
  const hasJsonBody = /<textarea[^>]*id="body-json"/.test(contentHtml);
  return usesForm && !hasJsonBody;
}

function methodFor(src, path) {
  if (/--request\s+POST|method\s*:\s*['"]POST['"]|method:'POST'/.test(src)) return 'POST';
  if (/^\/health\b/.test(path)) return 'GET';
  return /method\s*:\s*['"]GET['"]/.test(src) ? 'GET' : 'POST';
}

const indent = (json, pad) => JSON.stringify(json, null, 2).split('\n').join(`\n${pad}`);

function snippets({ host, path, method, body, upload }) {
  const url = `https://${host}${path}`;
  const auth = [
    `  --header 'x-rapidapi-key: YOUR_RAPIDAPI_KEY' \\`,
    `  --header 'x-rapidapi-host: ${host}'`,
  ];

  let curl;
  if (upload) {
    curl = [
      `curl --request ${method} \\`, `  --url '${url}' \\`, ...auth.slice(0, 1),
      `  --header 'x-rapidapi-host: ${host}' \\`,
      `  --form 'file=@/path/to/your-file.pdf'`,
    ].join('\n');
  } else if (method === 'POST') {
    curl = [
      `curl --request POST \\`, `  --url '${url}' \\`, ...auth.slice(0, 1),
      `  --header 'x-rapidapi-host: ${host}' \\`,
      `  --header 'content-type: application/json' \\`,
      `  --data '${indent(body ?? {}, '  ')}'`,
    ].join('\n');
  } else {
    curl = [`curl --request GET \\`, `  --url '${url}' \\`, ...auth].join('\n');
  }

  const jsHeaders = [
    `    'x-rapidapi-key': process.env.RAPIDAPI_KEY,`,
    `    'x-rapidapi-host': '${host}',`,
    ...(method === 'POST' && !upload ? [`    'content-type': 'application/json',`] : []),
  ];
  const javascript = upload
    ? [
        `const form = new FormData();`,
        `form.append('file', fileInput.files[0]);`,
        ``,
        `const res = await fetch('${url}', {`,
        `  method: '${method}',`,
        `  headers: {`, ...jsHeaders, `  },`,
        `  body: form,`,
        `});`, ``, `const data = await res.json();`, `console.log(data);`,
      ].join('\n')
    : [
        `const res = await fetch('${url}', {`,
        `  method: '${method}',`,
        `  headers: {`, ...jsHeaders, `  },`,
        ...(method === 'POST' ? [`  body: JSON.stringify(${indent(body ?? {}, '  ')}),`] : []),
        `});`, ``, `const data = await res.json();`, `console.log(data);`,
      ].join('\n');

  const pyHeaders = [
    `headers = {`,
    `    "x-rapidapi-key": os.environ["RAPIDAPI_KEY"],`,
    `    "x-rapidapi-host": "${host}",`,
    ...(method === 'POST' && !upload ? [`    "content-type": "application/json",`] : []),
    `}`,
  ];
  const pyCall = upload
    ? [``, `with open("your-file.pdf", "rb") as fh:`,
       `    res = requests.post(url, files={"file": fh}, headers=headers, timeout=60)`]
    : method === 'POST'
      ? [``, `payload = ${JSON.stringify(body ?? {}, null, 4)}`, ``,
         `res = requests.post(url, json=payload, headers=headers, timeout=30)`]
      : [``, `res = requests.get(url, headers=headers, timeout=30)`];
  const python = [
    `import os, requests`, ``, `url = "${url}"`, ...pyHeaders, ...pyCall,
    `res.raise_for_status()`, `print(res.json())`,
  ].join('\n');

  return { curl, javascript, python };
}

// Paths the playgrounds compute at runtime (or get wrong), pinned to what the
// page itself documents. Keep this table empty-by-default: only add an entry
// when the static extraction cannot see the real endpoint.
const PATH_OVERRIDES = {
  // path() switches on payload shape; the recovered sample is the batch array.
  'http-error-root-trigger-analyzer': '/analyze/batch',
  // Playground posts the conversion body to '/health'; the page documents POST /convert.
  'html-to-markdown': '/convert',
};

const out = {};
const notes = [];

for (const api of apis) {
  let src;
  try { src = readFileSync(join(pgDir, `${api.slug}.playground.js`), 'utf8'); }
  catch { notes.push(`${api.slug}: no playground script`); continue; }

  const host = scalar(src, 'host');
  const path = PATH_OVERRIDES[api.slug] || scalar(src, 'path') || '/';
  if (!host) { notes.push(`${api.slug}: could not resolve host`); continue; }
  if (PATH_OVERRIDES[api.slug]) notes.push(`${api.slug}: path pinned to ${path}`);

  const method = methodFor(src, path);
  const upload = isFileUpload(src, api.contentHtml);
  const body = method === 'POST' && !upload ? sampleBody(src, api.contentHtml) : null;
  if (method === 'POST' && !upload && !body) notes.push(`${api.slug}: no example body recovered`);

  out[api.slug] = { host, path, method, upload, ...snippets({ host, path, method, body, upload }) };
}

writeFileSync(join(root, 'src', 'data', 'api-code-samples.json'), JSON.stringify(out, null, 2) + '\n');

const real = Object.values(out).filter((o) => o.upload || o.method === 'GET' || !/--data '\{\}'/.test(o.curl)).length;
console.log(`gen-code-samples: ${Object.keys(out).length}/${apis.length} APIs, ${real} with a concrete request`);
notes.forEach((n) => console.log(`   - ${n}`));
