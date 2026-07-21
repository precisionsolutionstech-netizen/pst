/**
 * One-shot migration: reads each n8n template folder's SUBMISSION.txt (or
 * GUMROAD-DESCRIPTION.md) and emits src/data/workflows.json. Safe to re-run.
 *
 *   node scripts/extract-workflows.mjs [path-to-n8n-repo]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] || '/Users/sol/apps/n8n';
const OUT = join(here, '..', 'src', 'data', 'workflows.json');

const GUMROAD = 'https://solutionsprecision.gumroad.com';
const N8N_CREATOR = 'https://n8n.io/creators/precision-tech/';

/** Marketplace facts per template (prices/links from the live listings). */
const META = [
  {
    dir: '01-rss-daily-email-digest',
    slug: 'rss-daily-email-digest',
    name: 'Daily RSS News Digest Email',
    price: null,
    gumroadUrl: null,
    n8nListed: true,
    n8nListingName: 'Send a daily RSS news digest email with Gmail',
  },
  {
    dir: '02-gmail-sheets-lead-tracker',
    slug: 'gmail-sheets-lead-tracker',
    name: 'Gmail to Google Sheets Lead Tracker',
    price: null,
    gumroadUrl: null,
    n8nListed: true,
    n8nListingName: 'Track and de-duplicate email leads in Google Sheets from Gmail',
  },
  {
    dir: '03-google-forms-slack-notification',
    slug: 'google-forms-slack-priority-routing',
    name: 'Google Forms to Slack with Priority Routing',
    price: null,
    gumroadUrl: null,
    n8nListed: false,
    comingSoon: true,
  },
  {
    dir: '04-gmail-review-sentiment-slack-router',
    slug: 'ecommerce-review-alerts-slack',
    name: 'AI E-commerce Review Alerts to Slack',
    price: '$7',
    gumroadUrl: `${GUMROAD}/l/fwpfg`,
    n8nListed: true,
    n8nListingName: 'Route ecommerce review alerts from Gmail to Slack with OpenAI and Google Sheets',
  },
  {
    dir: '05-google-form-slack-alert',
    slug: 'google-form-slack-alert',
    name: 'Google Form to Slack Alert',
    price: '$7',
    gumroadUrl: `${GUMROAD}/l/leqsxz`,
    n8nListed: false,
  },
  {
    dir: '06-meeting-transcript-action-items-slack',
    slug: 'meeting-transcript-action-items-slack',
    name: 'AI Meeting Transcript to Slack Action Items',
    price: '$9.99',
    gumroadUrl: `${GUMROAD}/l/khulja`,
    n8nListed: true,
    n8nListingName: 'Route meeting action items to Slack using Gmail, OpenAI, and Google Sheets',
  },
  {
    dir: '07-insurance-quote-intake-ai-router',
    slug: 'insurance-quote-intake-ai-lead-scoring',
    name: 'Insurance Quote Intake with AI Lead Scoring',
    price: '$10',
    gumroadUrl: `${GUMROAD}/l/hpbenx`,
    n8nListed: true,
    n8nListingName: 'Route insurance quote leads with OpenAI, Airtable, Sheets, Teams, Slack and Twilio',
  },
  {
    dir: '08-ai-receipt-expense-memory',
    slug: 'gmail-receipts-ai-expense-tracker',
    name: 'Gmail Receipts AI Expense Tracker',
    price: '$10',
    gumroadUrl: `${GUMROAD}/l/ywqgw`,
    n8nListed: true,
    n8nListingName: 'Extract and log Gmail receipt expenses with OpenAI, Sheets and Airtable',
  },
  {
    dir: '09-ai-personal-admin-inbox-assistant',
    slug: 'ai-personal-admin-inbox-assistant',
    name: 'AI Personal Admin Inbox Assistant',
    price: '$10',
    gumroadUrl: `${GUMROAD}/l/ottva`,
    n8nListed: true,
    n8nListingName: 'Extract and log Gmail admin tasks with OpenAI, Google Sheets and Airtable',
  },
  {
    dir: '10-ai-bookkeeper-chat-expense-assistant',
    slug: 'ai-bookkeeper-chat-expense-assistant',
    name: 'AI Bookkeeper Chat Expense Assistant',
    price: null,
    gumroadUrl: null,
    n8nListed: false,
    comingSoon: true,
  },
  {
    dir: '11-credential-setup-coach',
    slug: 'n8n-credential-setup-coach',
    name: 'n8n Credential Setup Coach',
    price: '$5',
    gumroadUrl: `${GUMROAD}/l/xdgmnz`,
    n8nListed: false,
    useGumroadDescription: true,
    shortDescriptionOverride:
      'Interactive n8n chat workflow with 60+ step-by-step credential connection guides: Google, AWS, databases, messaging, AI providers, and more — one simple action at a time, through a tested connection.',
  },
  {
    dir: '12-ai-imap-inbox-cleaner',
    slug: 'ai-imap-inbox-cleaner',
    name: 'AI IMAP Inbox Cleaner',
    price: null,
    gumroadUrl: null,
    n8nListed: false,
    comingSoon: true,
  },
];

/* --------------------------- tiny markdown -> html ----------------------- */

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function stripEmoji(s) {
  return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) { flushPara(); closeList(); continue; }
    if (/^-{3,}$/.test(trimmed)) { flushPara(); closeList(); continue; }

    const h = trimmed.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flushPara(); closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(stripEmoji(h[2]))}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushPara(); closeList();
      out.push(`<blockquote><p>${inline(trimmed.replace(/^>\s?/, ''))}</p></blockquote>`);
      continue;
    }

    const ol = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    const ul = trimmed.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    closeList();
    para.push(trimmed);
  }
  flushPara();
  closeList();
  return out.join('\n');
}

/* --------------------------------- build -------------------------------- */

const out = [];

for (const meta of META) {
  const dir = join(SRC, 'templates', meta.dir);
  let title = meta.name;
  let shortDescription = '';
  let body = '';

  const submissionPath = join(dir, 'SUBMISSION.txt');
  const gumroadDescPath = join(dir, 'GUMROAD-DESCRIPTION.md');

  if (!meta.useGumroadDescription && existsSync(submissionPath)) {
    const txt = readFileSync(submissionPath, 'utf8');
    title = txt.match(/^TITLE\n(.+)$/m)?.[1].trim() ?? meta.name;
    shortDescription = txt.match(/SHORT DESCRIPTION\n([\s\S]*?)(?:\n\n|\nIMPORTANT)/)?.[1].replace(/\s+/g, ' ').trim() ?? '';
    const split = txt.indexOf('\n---\n');
    body = split !== -1 ? txt.slice(split + 5) : txt;
    // drop maintainer-only notes
    body = body
      .replace(/^IMPORTANT:.*$/gm, '')
      .replace(/^Source of truth:.*$/gm, '');
  } else if (existsSync(gumroadDescPath)) {
    const md = readFileSync(gumroadDescPath, 'utf8');
    const h1 = md.match(/^#\s+(.*)$/m);
    title = h1 ? stripEmoji(h1[1]) : meta.name;
    body = md.replace(/^#\s+.*$/m, '');
    const firstPara = body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#') && !l.startsWith('>'));
    shortDescription = firstPara ? firstPara.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') : '';
    if (meta.shortDescriptionOverride) shortDescription = meta.shortDescriptionOverride;
  } else {
    console.warn(`no source doc for ${meta.dir}`);
  }

  const contentHtml = mdToHtml(body);
  const categoriesMatch = !meta.useGumroadDescription && existsSync(submissionPath)
    ? readFileSync(submissionPath, 'utf8').match(/CATEGORIES\n((?:- .+\n)+)/)
    : null;
  const categories = categoriesMatch
    ? categoriesMatch[1].trim().split('\n').map((l) => l.replace(/^- /, '').trim())
    : ['Productivity'];

  out.push({
    slug: meta.slug,
    name: meta.name,
    listingTitle: title,
    shortDescription,
    categories,
    price: meta.price,
    gumroadUrl: meta.gumroadUrl,
    n8nListed: meta.n8nListed ?? false,
    n8nListingName: meta.n8nListingName ?? null,
    n8nCreatorUrl: N8N_CREATOR,
    comingSoon: meta.comingSoon ?? false,
    contentHtml,
  });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} workflows -> ${OUT}`);
for (const w of out) {
  console.log(`  ${w.slug}  price=${w.price ?? 'free/-'}  gumroad=${w.gumroadUrl ? 'yes' : 'no'}  n8n=${w.n8nListed}  desc=${w.shortDescription.slice(0, 50)}...`);
}
