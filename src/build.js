#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import puppeteer from 'puppeteer-core';
import { loadContent, lint } from './content.js';
import { renderHTML } from './render.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const c = { dim: '\x1b[2m', red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', bold: '\x1b[1m', off: '\x1b[0m' };

/** Chrome/Edge already on the machine - avoids a 150MB Chromium download. */
function findBrowser() {
  if (process.env.CV_BROWSER) return process.env.CV_BROWSER;
  const pf = process.env['PROGRAMFILES'] ?? 'C:\Program Files';
  const pf86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\Program Files (x86)';
  const local = process.env['LOCALAPPDATA'] ?? '';
  const candidates = [
    join(pf, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Google/Chrome/Application/chrome.exe'),
    local && join(local, 'Google/Chrome/Application/chrome.exe'),
    join(pf86, 'Microsoft/Edge/Application/msedge.exe'),
    join(pf, 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error('No Chrome or Edge found. Set CV_BROWSER to a Chromium executable path.');
  }
  return found;
}

function outputName(cfg, profile) {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const tokens = {
    name: String(profile.name ?? 'CV').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'),
    date: `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`,
    year: String(now.getFullYear()),
    month: p(now.getMonth() + 1),
    day: p(now.getDate()),
    variant: opt('--variant', ''),
  };
  const pattern = opt('--name', cfg.output?.filename ?? '{name}_CV_{date}');
  return pattern.replace(/\{(\w+)\}/g, (m, k) => tokens[k] ?? m)
    .replace(/_{2,}/g, '_').replace(/_$/, '');
}

async function build() {
  const cfg = YAML.parse(readFileSync(join(ROOT, 'cv.config.yaml'), 'utf8')) ?? {};
  const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');
  const content = loadContent(ROOT);

  const warnings = lint(content);
  if (warnings.length) {
    console.log(`${c.yellow}${c.bold}${warnings.length} content note(s):${c.off}`);
    for (const w of warnings) console.log(`  ${c.yellow}!${c.off} ${w}`);
    console.log('');
  } else {
    console.log(`${c.green}✓${c.off} content checks clean\n`);
  }
  if (has('--check')) return;

  const outDir = join(ROOT, cfg.output?.dir ?? 'out');
  mkdirSync(outDir, { recursive: true });

  const html = renderHTML(content, cfg, css);
  const base = outputName(cfg, content.profile);
  const htmlPath = join(outDir, 'preview.html');
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`${c.dim}html  ${c.off}${htmlPath}`);
  if (has('--html-only')) return;

  const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Printing before the webfonts resolve silently produces a fallback-font PDF.
    await page.evaluate(() => document.fonts.ready);
    const pdfPath = join(outDir, `${base}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: cfg.page?.format ?? 'A4',
      margin: cfg.page?.margin ?? { top: '12mm', right: '13mm', bottom: '12mm', left: '13mm' },
      printBackground: true,
      preferCSSPageSize: false,
    });
    // Count pages from the PDF itself. Estimating from content height is always wrong,
    // because `break-inside: avoid` bumps a whole role to the next page rather than
    // splitting it - so the real count can exceed height/pageHeight.
    const bytes = readFileSync(pdfPath);
    const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length || 1;
    console.log(`${c.green}✓ pdf  ${c.off}${pdfPath} ${c.dim}(${pages} page${pages === 1 ? '' : 's'})${c.off}`);
    if (pages > 2) {
      console.log(`  ${c.yellow}!${c.off} ${pages} pages - two is the target. Trim content, ` +
                  `raise \`experience.compactBefore\`, or drop \`theme.lineHeight\`.`);
    }
  } finally {
    await browser.close();
  }
}

if (has('--watch')) {
  let timer;
  const run = () => build().catch((e) => console.error(`${c.red}✗${c.off} ${e.message}`));
  for (const d of ['content', 'src', '.']) {
    watch(join(ROOT, d), { recursive: d === 'content' }, (_, f) => {
      if (!f || !/\.(ya?ml|css|js)$/.test(f)) return;
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
  }
  console.log(`${c.dim}watching content/ and src/ - Ctrl+C to stop${c.off}\n`);
  run();
} else {
  build().catch((e) => { console.error(`${c.red}✗ ${e.message}${c.off}`); process.exit(1); });
}
