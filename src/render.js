import { formatRange, parseDate } from './content.js';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Minimal inline markup: **bold**, *italic*, `code`, [text](url). */
const inline = (s) => esc(s).replace(/\s+/g, ' ').trim()
  .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<em>$1</em>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

const tag = (name, cls, html) => (html ? `<${name} class="${cls}">${html}</${name}>` : '');
const section = (title, body) => (body ? `<section class="sec"><h2>${esc(title)}</h2>${body}</section>` : '');

function header(p) {
  const contact = [
    p.location && esc(p.location),
    p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,
    p.phone && `<a href="tel:${esc(String(p.phone).replace(/[^\d+]/g, ''))}">${esc(p.phone)}</a>`,
    ...(p.links ?? []).map((l) =>
      `<a href="${esc(l.url)}">${esc(l.label || String(l.url).replace(/^https?:\/\/(www\.)?/, ''))}</a>`),
    p.dateOfBirth && esc(p.dateOfBirth),
    p.address && esc(p.address),
  ].filter(Boolean);

  return `<header class="hdr">
    <h1>${esc(p.name)}</h1>
    ${tag('p', 'title', p.title ? esc(p.title) : '')}
    <p class="contact">${contact.join('<span class="sep">·</span>')}</p>
  </header>`;
}

function role(r, cfg) {
  const cutoff = cfg.experience?.compactBefore ? parseDate(cfg.experience.compactBefore) : null;
  // Per-role `compact` wins over the date rule in both directions, so one weak entry can
  // be tightened without moving a cutoff that would catch its neighbours too.
  const compact = r.compact ?? (cutoff && r._end && !r._end.present && r._end.ms < cutoff.ms);

  const org = [esc(r.company), r.client && `<span class="client">client: ${esc(r.client)}</span>`]
    .filter(Boolean).join(' <span class="sep">·</span> ');

  const bullets = compact ? '' : (r.highlights ?? []).map((h) => `<li>${inline(h)}</li>`).join('');
  const showProjects = !compact || cfg.experience?.showProjectsWhenCompact;
  const projects = !showProjects ? '' : (r.projects ?? []).map((pr) =>
    `<li><span class="pname">${esc(pr.name)}</span>: ${inline(pr.description)}${
      (pr.tech ?? []).length ? `<span class="ptech">${pr.tech.map(esc).join(' · ')}</span>` : ''
    }</li>`).join('');

  return `<article class="role${compact ? ' compact' : ''}">
    <div class="rhead">
      <div>
        <h3>${esc(r.role)}</h3>
        <p class="org">${org}</p>
      </div>
      <div class="meta">
        <span class="dates">${esc(formatRange(r._start, r._end))}${
          r.engagement ? `<span class="engagement">${esc(r.engagement)}</span>` : ''}</span>
        ${r.location ? `<span class="loc">${esc(r.location)}</span>` : ''}
      </div>
    </div>
    ${tag('p', 'rsummary', r.summary ? inline(r.summary) : '')}
    ${tag('ul', 'bullets', bullets)}
    ${projects ? `<div class="projects"><span class="plabel">Selected work</span><ul>${projects}</ul></div>` : ''}
    ${(r.tech ?? []).length ? `<p class="tech">${r.tech.map(esc).join(' · ')}</p>` : ''}
  </article>`;
}

const renderers = {
  summary: (c) => (c.profile.summary ? section('Summary', `<p class="summary">${inline(c.profile.summary)}</p>`) : ''),

  experience: (c, cfg) => section('Experience', c.experience.map((r) => role(r, cfg)).join('')),

  skills: (c) => section('Skills', c.skills.filter((g) => (g.items ?? []).length).map((g) =>
    `<div class="skillrow"><span class="skname">${esc(g.name)}</span><span class="skitems">${
      g.items.map(esc).join(' · ')}</span></div>`).join('')),

  education: (c) => section('Education', c.education.map((e) => `<article class="edu">
      <div class="rhead">
        <div>
          <h3>${esc(e.degree)}</h3>
          <p class="org">${esc(e.school)}</p>
        </div>
        <div class="meta">
          <span class="dates">${esc(formatRange(e._start, e._end))}</span>
          ${e.location ? `<span class="loc">${esc(e.location)}</span>` : ''}
        </div>
      </div>
      ${tag('p', 'rsummary', e.note ? inline(e.note) : '')}
    </article>`).join('')),

  languages: (c) => section('Languages', !c.languages.length ? '' :
    `<p class="langs">${c.languages.map((l) =>
      `<span class="lang"><strong>${esc(l.name)}</strong> ${esc(l.level)}</span>`).join('')}</p>`),
};

export function renderHTML(content, cfg, css) {
  const order = cfg.sections?.length ? cfg.sections : Object.keys(renderers);
  const body = order.map((n) => renderers[n]?.(content, cfg) ?? '').join('');
  const t = cfg.theme ?? {};
  const vars = `:root{--accent:${t.accent ?? '#1f4d7a'};--text:${t.text ?? '#1a1a1a'};` +
    `--muted:${t.muted ?? '#5a5f66'};--font:${t.fontStack ?? 'Arial, sans-serif'};` +
    `--display:${t.displayFont ?? t.fontStack ?? 'Arial, sans-serif'};` +
    `--fs:${t.baseFontSize ?? '9.6pt'};--lh:${t.lineHeight ?? 1.42};}`;
  const fontLink = t.fontImport ? `<link rel="stylesheet" href="${esc(t.fontImport)}">` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(content.profile.name)} CV</title>
${fontLink}
<style>${vars}\n${css}</style></head>
<body><main class="cv">${header(content.profile)}${body}</main></body></html>`;
}
