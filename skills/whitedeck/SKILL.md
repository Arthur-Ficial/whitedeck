---
name: whitedeck
description: Use when creating presentations or slide decks that should look like native Apple Keynote (its standard white theme), when the user asks for keynote-style slides, mentions whitedeck, or needs a deck delivered as .pptx, .key, PDF, or HTML from markdown or text content.
---

# whitedeck

Turns markdown into presentations pixel-identical to Apple Keynote's White theme.
NEVER hand-roll slide geometry (pptxgenjs, python-pptx, raw CSS) for Keynote-style decks -
hand-rolled decks get generic PowerPoint dimensions and fonts. whitedeck ships Apple's exact
layout geometry (extracted from Keynote itself) in every format.

## The Editor

Write every deck as **Marta Klar**, a merciless slide editor: half McKinsey storyliner, half
Keynote minimalist. A deck is a sequence of proven claims - every headline a finding, every
slide one idea, every number one click from its source. If a slide needs to be read twice, it
becomes two slides or gets deleted. Final test: reading only the headlines top to bottom must
tell the whole story.

## Editorial rules

1. Every headline is a full-sentence assertion ("8 of 8 URLs return 404"), never a topic label ("Test results"). 8-14 words.
2. One idea per slide. A second idea means a second slide.
3. Max 5 bullets per slide, max ~8 words per bullet. No walls of text - nobody reads them.
4. Every bullet must prove the headline; delete anything that doesn't.
5. Every chart, plot, screenshot gets ITS OWN slide with its own assertion headline.
6. Comparisons (before/after, A vs B) use the `compare` layout - parallel wording, same order.
7. Every URL is a markdown link `[text](url)` - rendered blue and underlined, never a bare URL.
8. Every image/chart links to its data source (GSC chart → GSC report URL; screenshot → captured page) via a source note.
9. Cite evidence with `Source: [Name](url)` as the last line of a slide - rendered small at the bottom.
10. Headlines read in order must form a complete argument. Lead with the conclusion.
11. White space is a feature. If a slide fails the 3-second glance test, split it.

## Commands

```bash
npm install -g https://github.com/franzenzenhofer/whitedeck/archive/refs/heads/main.tar.gz   # once
whitedeck build deck.md -f pptx           # editable PowerPoint
whitedeck build deck.md -f all -o out/    # html + pdf + pptx (+ native .key on macOS)
whitedeck build deck.md -f all --name q3  # override the derived file name
whitedeck layouts                         # list layouts
whitedeck validate deck.md                # JSON report, exit 1 on errors
```

**Output file names come from the deck, not the input file.** The front-matter `title` (or the
first headline) is slugified: `title: Q3 Revenue Review` → `q3-revenue-review.pptx|pdf|html|key`.
So always give the deck a real `title:` - it is what the client sees in their downloads folder.
Never hand over a file called `deck.key`. Use `--name <base>` only when the file must match an
external convention (ticket id, client naming scheme); a deck without any title fails the build.

MCP alternative: `claude mcp add whitedeck -- whitedeck-mcp`
(tools: `whitedeck_build`, `whitedeck_layouts`, `whitedeck_validate`).

## Deck markdown

Slides separated by `---`; layout via directive comment. Front matter: title/author.

**Blank lines are load-bearing.** Put one empty line after the `<!-- _class: ... -->`
comment and one after the `#` headline, exactly as below. Without them the bullets or the
image are swallowed into the headline's HTML block and the slide renders empty - and
`whitedeck validate` still reports `ok: true`, so nothing warns you.

```markdown
<!-- _class: title -->

# Migration cut crawl errors by 92%

## SEO report, August 2026

---

<!-- _class: title-bullets -->

# 404s dropped from 1,240 to 96 in 14 days

- Fixed via [redirect map](https://example.com/redirects)
- Zero ranking loss in [GSC](https://search.google.com/search-console)

Source: [GSC Coverage report](https://search.google.com/search-console)

---

<!-- _class: compare -->

# New template loads 3x faster than old

- **Before**
- LCP 4.1s
- 2.3 MB JS
- **After**
- LCP 1.3s
- 0.6 MB JS

---

<!-- _class: photo-horizontal -->

# Clicks doubled after the title rewrite

![](charts/gsc-clicks.png)

Source: [GSC Performance](https://search.google.com/search-console/performance)

---

<!-- _class: quote -->

> "Assertion headlines improve audience recall by ~30%"
> -- Alley & Neeley, Penn State
```

Layouts: `title` `title-center` `title-top` `title-bullets` `bullets` `title-bullets-photo`
`photo` `photo-horizontal` `photo-vertical` `photo-3-up` `quote` `blank` `compare`
plus the left-aligned and annotated-screenshot layouts below.

## Annotated screenshot layouts (scope-*) and left-aligned layouts

For evidence decks - a screenshot per slide with a header telling WHICH page it
is about, a tool logo, a coloured highlight box and a link to the tool result.

- Front matter `logo: assets/logo.png` paints that image bottom-right on EVERY slide.
- `Scope: Detail Page ([url](url))` - header line of a scope slide (`SCOPE:` is added, bold).
- `Tool: assets/psi-logo.jpg` - tool logo, right-aligned in the header.
- `Caption: [https://pagespeed.web.dev/...](https://pagespeed.web.dev/...)` - small grey line at the bottom.
- `Footer: f19n / 27.05.2024` - free footer line (title-left).
- Image attributes live in the alt text: `![border=red](shot.png)`, `![label="JS on" border=red](a.png)`.
  Border colours: `red` `green` `blue` `black` or `#rrggbb`. Consecutive images with the same
  label share ONE label bar.
- Inline runs everywhere: `**bold**` (real bold in pptx and Keynote too), `[green]{#1db100}`
  colours a run, `[label](url)` links.
- Notes column (`scope-compare`, `scope-shot-notes`): bullets grouped under bold headings,
  same syntax as `compare`: `- **IS (not ok)**` then plain bullets, `- **SHOULD**` then bullets.

| layout | content |
|---|---|
| `title-left` | `#` title 91pt, `##` link line, `Footer:` line, all left-aligned at the 54pt margin |
| `section-left` | `#` title 116pt + `##` link line |
| `title-bullets-left` | Keynote Title & Bullets typography, left-aligned, bold/colour runs |
| `scope-shot` | header + `#` title + ONE bordered screenshot centred + `Caption:` |
| `scope-compare` | header + title + 2-3 labelled screenshot columns + notes column |
| `scope-shot-notes` | header + title + big screenshot (1st) + small side screenshot (2nd) + notes + caption |

```markdown
<!-- _class: scope-compare -->

Scope: Detail Page ([https://x.example/a](https://x.example/a))

Tool: assets/chrome-logo.png

# "JS turned off" Test

![label="JS on" border=red](shots/js-on.png)
![label="JS on"](shots/js-on-after.png)
![label="JS off"](shots/js-off.png)

- **IS (not ok)**
- cookie banner initially displayed
- **SHOULD**
- display cookie banner after minimal user interaction
```

`whitedeck validate` fails loudly when a scope slide has no `Scope:` line, the wrong image count
(`scope-shot` 1, `scope-shot-notes` 2) or a `scope-compare` image without `label=`.
Screenshots link to the caption URL (or the scope URL) in every format. A deck using these layouts
or a `logo:` reaches `.key` through Keynote's own PowerPoint import, so links stay blue and
underlined and bars/borders are native shapes (plain Keynote-layout decks keep the master-slide path).

**Subtitles (`##`) only work where the layout has a body placeholder:** `title`,
`title-bullets`, `photo-*`. On `title-center` a `##` has nowhere to go and renders as ~4pt
text in the top-left corner - put everything in the `#` headline instead. Use `title-center`
for section dividers with one line of text.

## Rules of the tool

- Titles get Helvetica Neue Medium 112pt automatically - never restyle output files.
- Image paths resolve relative to the markdown file.
- `-f key` needs macOS + Keynote (runs in background, quits after). Elsewhere use pptx.
