# cv-builder

YAML in `content/` is the source of truth. `npm run build` renders it to HTML and prints a
PDF with Chrome.

```
npm install
npm run build      # -> out/Erik_Parso_CV_2026-08-25.pdf  (+ out/preview.html)
npm run watch      # rebuild on every save
npm run html       # HTML only, skip the PDF (fast)
npm run check      # lint the content, produce nothing
```

No Chromium download — it drives the Chrome or Edge already installed. Override with
`CV_BROWSER=/path/to/chrome` if detection misses.

## Layout

```
content/
  profile.yaml            name, contact, headline, summary
  experience/
    _TEMPLATE.yaml        copy this to add a role (files starting with _ are ignored)
    2019-09-sigp-skoda.yaml
    ...                   one file per role, ordered by date not filename
  skills.yaml
  education.yaml
  languages.yaml
cv.config.yaml            theme, page size, section order, output filename
src/                      loader, linter, renderer, stylesheet
out/                      generated - gitignored
REVIEW.md                 what was wrong with the old PDF and why
```

One file per role means adding a job is adding a file, and reviewing a change is reading one
small diff.

## Adding a role

```sh
cp content/experience/_TEMPLATE.yaml content/experience/2022-03-somewhere.yaml
```

Fill it in and rebuild. Ordering comes from `start`/`end`, so the filename prefix is only for
your own benefit when listing the directory. Set `hidden: true` on a role to keep the file but
drop it from the build.

Bullets, summaries and project descriptions accept `**bold**`, `*italic*`, `` `code` ``
and `[text](https://url)` — links stay clickable in the PDF.

A role can present itself two ways, and mixing them per role is fine:

- **`highlights:`** — achievement bullets. Right for a job: what you did and what came of it.
- **`projects:`** — a list of `name` / `description` / `tech`. Right for a portfolio role,
  where the reader wants what each thing does and what it is built with.

Set `compact: true` on a role to render just its summary and tech, no bullets — the
per-role override of `experience.compactBefore`, for tightening one weak entry without
moving a cutoff that would catch its neighbours.

## The linter

Every build reports content problems without blocking it:

- missing summary or LinkedIn
- bullets opening with "Responsible for" / "Worked on" / an "-ing" gerund
- bullets over 200 characters
- a current role with no numbers in any bullet
- **overlapping employment dates**, unless the parallel role declares itself (below)
- bullets whose *rendered* length exceeds 200 chars (link URLs do not count)
- empty skill groups
- output over two pages

`npm run check` runs these alone.

## Roles that ran in parallel

Two overlapping date ranges look like a mistake, to the linter and to a recruiter. Declare
the parallel one and both problems go away:

```yaml
concurrent: true          # silences the overlap warning
engagement: Part-time     # renders as "Jan 2025 - Jun 2025 · Part-time"
```

`concurrent` alone is not enough — the build still warns, because suppressing the check
without labelling the role leaves the reader looking at two simultaneous full-time jobs.
`engagement` takes any short string: Part-time, Contract, Freelance, Internship.

## Tailoring per application

The honest version of "tailor your CV" is a handful of small edits, not a second document:

- rewrite `profile.summary` and `profile.title` to aim at the specific role
- reorder `sections` in `cv.config.yaml` (put `skills` above `experience` when the tech
  match is the pitch)
- reorder the groups in `skills.yaml` — the top one is the one that gets read
- `hidden: true` on roles that do not help
- `--variant` tags the filename: `node src/build.js --variant acme --name "{name}_CV_{variant}_{date}"`

## Config worth knowing

`cv.config.yaml`:

- `theme.accent` — one colour drives headings, rules and links
- `theme.baseFontSize` / `lineHeight` — the two knobs for fitting a page
- `experience.compactBefore` — roles ending before this date render as one line plus tech,
  no bullets. The cheapest way to buy space back from old jobs.
- `output.filename` — tokens `{name} {date} {year} {month} {day} {variant}`

## Fitting two pages

The build prints the **real** page count, read back out of the generated PDF — not an
estimate from content height. The two disagree, because `break-inside: avoid` moves a whole
role to the next page rather than splitting it, so a document that fits by raw height can
still paginate to three. Trim until the build says 2.

In rough order of what costs least:

1. `experience.compactBefore`, or `compact: true` on one old role
2. shorter project descriptions — one line each is the target
3. `theme.lineHeight`, then `theme.baseFontSize`
4. `hidden: true` on the oldest role

## Notes on the output

Single column, real selectable text, no images, tables or multi-column tricks — it parses
cleanly in applicant tracking systems. `pdftotext out/*.pdf -` shows you roughly what a
parser sees.
