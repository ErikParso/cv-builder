import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const read = (p) => {
  try {
    return YAML.parse(readFileSync(p, 'utf8')) ?? {};
  } catch (e) {
    // Content is split across many files - an error that does not name one is useless.
    throw new Error(`${p}
  ${e.message}`);
  }
};

/** Parse `2019-09`, `2019-09-30` or `present` into a sortable value. */
export function parseDate(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === 'present' || s === 'current' || s === 'now') return { present: true, ms: Infinity };
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s);
  if (!m) throw new Error(`Bad date "${v}" - use YYYY-MM, YYYY-MM-DD or "present".`);
  const [, y, mo, d] = m;
  return { present: false, year: +y, month: +mo, day: d ? +d : null, ms: Date.UTC(+y, +mo - 1, +(d ?? 1)) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatDate = (d) => (!d ? '' : d.present ? 'Present' : `${MONTHS[d.month - 1]} ${d.year}`);

export function formatRange(start, end) {
  const a = formatDate(start), b = formatDate(end);
  return a && b ? `${a} - ${b}` : a || b;
}

export function loadContent(root) {
  const dir = join(root, 'content');
  const profile = read(join(dir, 'profile.yaml'));

  const expDir = join(dir, 'experience');
  const experience = !existsSync(expDir) ? [] : readdirSync(expDir)
    .filter((f) => /\.ya?ml$/i.test(f) && !f.startsWith('_'))
    .map((f) => {
      const role = read(join(expDir, f));
      return { ...role, _file: f, _start: parseDate(role.start), _end: parseDate(role.end) };
    })
    .filter((r) => !r.hidden)
    // Most recent first; ongoing roles float to the top, ties broken by start date.
    .sort((a, b) => (b._end?.ms ?? 0) - (a._end?.ms ?? 0) || (b._start?.ms ?? 0) - (a._start?.ms ?? 0));

  const load = (f) => (existsSync(join(dir, f)) ? read(join(dir, f)) : {});
  return {
    profile,
    experience,
    skills: load('skills.yaml').groups ?? [],
    education: (load('education.yaml').items ?? []).map((e) => ({
      ...e, _start: parseDate(e.start), _end: parseDate(e.end),
    })).sort((a, b) => (b._end?.ms ?? 0) - (a._end?.ms ?? 0)),
    languages: load('languages.yaml').items ?? [],
  };
}

/** Non-fatal content warnings, surfaced on every build. */
export function lint(content) {
  const w = [];
  const { profile, experience, skills } = content;

  if (!profile.name) w.push('profile.yaml: `name` is missing.');
  if (!profile.summary) w.push('profile.yaml: no `summary` - it is the most-read part of a CV.');
  if (!(profile.links ?? []).some((l) => /linkedin/i.test(l.label ?? l.url ?? ''))) {
    w.push('profile.yaml: no LinkedIn link.');
  }

  const weak = /^(responsible for|worked on|helped with|involved in|participated in)\b/i;
  const gerund = /^[A-Z][a-z]+ing\b/;
  // Measure what a reader sees: link URLs and emphasis markers take up no visible width.
  const visible = (t) => t
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1')
    .replace(/[*`]/g, '');
  for (const r of experience) {
    const where = `experience/${r._file}`;
    if (!r.role || !r.company) w.push(`${where}: missing role or company.`);
    for (const h of r.highlights ?? []) {
      const line = String(h).replace(/\s+/g, ' ').trim();
      if (weak.test(line)) w.push(`${where}: weak opener - "${line.slice(0, 55)}..."`);
      else if (gerund.test(line)) w.push(`${where}: "-ing" opener, prefer past tense - "${line.slice(0, 45)}..."`);
      const len = visible(line).length;
      if (len > 200) w.push(`${where}: bullet is ${len} visible chars, max 200 - "${line.slice(0, 45)}..."`);
    }
    // Only meaningful for a role that argues through bullets; a project-list role
    // does not, and nagging it for metrics would be noise.
    if (r._end?.present && (r.highlights ?? []).length &&
        !r.highlights.some((h) => /\d/.test(String(h)))) {
      w.push(`${where}: current role has no numbers in any bullet.`);
    }
  }

  // Overlapping dates. Either a typo, or genuinely parallel work - and if it is parallel,
  // the CV has to SAY so, because the reader hits the same confusion this check does.
  for (let i = 0; i < experience.length; i++) {
    for (let j = i + 1; j < experience.length; j++) {
      const a = experience[i], b = experience[j];
      if (!a._start || !a._end || !b._start || !b._end) continue;
      if (!(a._start.ms < b._end.ms && b._start.ms < a._end.ms)) continue;

      const declared = [a, b].filter((r) => r.concurrent);
      if (!declared.length) {
        w.push(`overlapping dates: ${a._file} and ${b._file} - if that is deliberate, set ` +
               `\`concurrent: true\` on the parallel role; otherwise one of the dates is wrong.`);
      } else if (!declared.some((r) => r.engagement)) {
        w.push(`${declared[0]._file}: marked concurrent but has no \`engagement\` label - a reader ` +
               `sees two overlapping full-time jobs. Add e.g. \`engagement: Part-time\`.`);
      }
    }
  }

  for (const g of skills) {
    if (!(g.items ?? []).length) w.push(`skills.yaml: group "${g.name}" is empty.`);
  }

  // Em/en dashes and spaced hyphens used as sentence separators read as machine-written.
  // Use a period, comma, colon or parentheses instead.
  const dashy = /[–—]|\s-\s/;
  const prose = [
    ['profile.yaml: summary', profile.summary],
    ...experience.flatMap((r) => [
      [`experience/${r._file}: summary`, r.summary],
      ...(r.highlights ?? []).map((h, i) => [`experience/${r._file}: highlight ${i + 1}`, h]),
      ...(r.projects ?? []).map((pr) => [`experience/${r._file}: project "${pr.name}"`, pr.description]),
    ]),
    ...content.education.map((e) => [`education.yaml: ${e.degree}`, e.note]),
  ];
  for (const [where, text] of prose) {
    if (text && dashy.test(String(text))) {
      w.push(`${where}: dash used as a separator - prefer a period, comma, colon or parentheses.`);
    }
  }
  return w;
}
