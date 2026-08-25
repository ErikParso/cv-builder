# Review of `ErikParso_cv260423.pdf`

What was wrong with the original, and what the rebuild in `content/` does about it.
Ordered by how much each one costs you.

---

## 1. Two roles overlap and the CV never says why — resolved

The Škoda role reads **09/2019 – Current**. The Synot Games role reads
**01/01/2025 – 30/06/2025**. Read literally, that is two simultaneous full-time jobs, and it
sits in the first two entries where every reader starts.

It turned out not to be an error — Synot was **part-time, run in parallel** with the Škoda
work. But the original CV gave the reader no way to know that, so the honest interpretation
available to them was "one of these dates is wrong". A recruiter who spots an apparent
contradiction does not ask; they discount the document.

Fixed by saying it on the page: the Synot entry now renders as
*Jan 2025 – Jun 2025 · Part-time*. In `content/experience/2025-01-synot-games.yaml` that is
two fields — `concurrent: true` (silences the linter) and `engagement: Part-time` (tells the
human). Setting only the first still warns, on the grounds that silencing the check without
labelling the role recreates the original problem.

**Worth reconsidering separately:** *Software Architect* is the most senior title on the CV,
and it currently sits second, tagged part-time, under a *Software Developer* role. If
architecture is the direction you want, that ordering is working against you.

A second overlap — Asseco (06/2019 – 10/2019) against Škoda (09/2019 – present) — was a
two-month artefact of an approximate end date. Asseco now ends 08/2019, which reads as a
clean handover between SIGP clients with no gap on either side. All overlap warnings clear.

## 2. No summary

The CV opened with a date of birth. The first thing on the page should be three lines saying
what you are, how long, and what you want next — it is the only part most readers finish.
Added as `profile.summary`, and it should be re-pointed at each application.

## 3. Duties, not results — and not a single number

Every bullet described the job description rather than your effect on it: *"Implementing web
applications"*, *"Sustaining and integrating new features"*, *"fixing bugs"*. That is a list
anyone in the role could write.

There was **not one number in the entire document** — no user counts, no markets, no team
size, no release frequency, no latency or cost figure. Six years on a car manufacturer's
public web estate and nothing quantifies the scale.

The bullets are rewritten into past-tense verb-first form, but I could only rewrite what was
there. The numbers have to come from you. The builder warns when a current role has no digits
in any bullet. Things worth digging for:

- How many applications, and across how many markets/countries?
- Traffic on the Škoda apps — monthly users, sessions, anything.
- Team size at Škoda, and at Synot (where you mentored a handover).
- Release frequency before vs. after the microfrontend migration. This is your best story
  and it currently gets one line.
- Build/pipeline time, bundle size, or test coverage before vs. after.

## 4. "-ing" openers and inconsistent bullet casing

*"Implementing"*, *"Sustaining"*, *"Creating"*, *"Writing"*, *"Updating"* — gerunds read as
ongoing chores. Past tense reads as completed work. Several bullets also started lowercase
(*"fixing bugs"*, *"collaboration with"*, *"pull request reviews"*) mid-list. Linted now.

## 5. Personal data you should not be publishing

Date of birth and full street address (*Lichardova 2804/21*) were both on page one. Neither
helps you, both are an anti-signal in most markets, and the address is a privacy leak on a
document you email to strangers. City + country is the convention. Dropped — `profile.yaml`
documents how to re-add them if some employer genuinely demands it.

**LinkedIn is missing**, which is more conspicuous than any of the above. Add it.

## 6. Employer and client are conflated

Two separate entries were both titled *"SIGP Systems"* — one *(Škoda Auto)*, one *(Asseco
Solutions)*. As written it looks like you left the company and came back four months later.
The schema now has explicit `company` and `client` fields, so the consultancy relationship is
legible.

## 7. Ancient work eats the page

Roughly 40% of the CV went to 2016–2019: an internship database-comparison tool, a diploma
thesis, three separate KROS sub-projects with dates. Meanwhile the six-year current role gets
comparable space.

The rule is that space follows recency. KROS is now three lines, SW-TECH one. The builder has
a `compactBefore` setting that strips bullets from anything older than a cutoff date, so you
can tighten further without deleting the content.

## 8. Wall-of-text prose

The Asseco and KROS entries were dense paragraphs — one ran seven lines with no break.
Nobody reads that. Everything is now a summary line plus scannable bullets.

## 9. The skills section dates you

It advertised **Enzyme** (deprecated years ago), **Cordova**, **Xamarin Forms**,
**Bootstrap 3/4**, **TFS**, and **"Angular 6+"** — a version pin from 2018. Casing was random
(`ANGULAR 6+`, `asp.net core`, `TYPESCRIPT`, `cypress`).

Worst line: **"Microsoft Azure (basics)"**. Never write "basics" on a CV. Either it clears the
bar for mentioning or it does not.

There was also **no AI section at all**, which is the single largest gap given where you are
heading. `skills.yaml` has the group stubbed and empty, and the linter nags until you fill it.

## 10. Small stuff, all of it fixable

- Typo: *"Fronted was developed with Angular"* → Frontend.
- *"intern application"* / *"intern tools"* → internal.
- *"is able to self actualize"* → self-updating.
- Date formats mixed three styles: `09/2019`, `30/06/2017`, `01/01/2025`. Now uniform.
- `Asp.Net core` → `ASP.NET Core` throughout.
- The Europass language grid (four separate CEFR levels in a table) is form-filling
  boilerplate. One line per language. It was also internally inconsistent — C1 reading, B2
  speaking, C1 writing.
- Three pages for this content. Now two, with room left for the AI years.
- Filename `cv260423` is ambiguous (23 Apr 2026? 26 Apr 2023?). Output is now
  `Erik_Parso_CV_YYYY-MM-DD.pdf`.

---

## What to do next

1. **Add LinkedIn** to `content/profile.yaml` — the last thing the linter still flags.
2. **Decide how much the trading project should say.** It is currently one line about
   preflight controls, which is the defensible framing, but it names a live exchange. There
   is a `TODO` on the bullet.
3. **Numbers on the Skoda role.** The bullets there are still duties rather than results —
   how many apps, how many markets, team size, release frequency before vs. after the
   microfrontend migration. That last one is your best story and it currently gets one line.
