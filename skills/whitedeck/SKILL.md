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
npx whitedeck build deck.md -f pptx           # editable PowerPoint
npx whitedeck build deck.md -f all -o out/    # html + pdf + pptx (+ native .key on macOS)
npx whitedeck layouts                         # list layouts
npx whitedeck validate deck.md                # JSON report, exit 1 on errors
```

MCP alternative: `claude mcp add whitedeck -- npx -y whitedeck-mcp`
(tools: `whitedeck_build`, `whitedeck_layouts`, `whitedeck_validate`).

## Deck markdown

Slides separated by `---`; layout via directive comment. Front matter: title/author.

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

## Rules of the tool

- Titles get Helvetica Neue Medium 112pt automatically - never restyle output files.
- Image paths resolve relative to the markdown file.
- `-f key` needs macOS + Keynote (runs in background, quits after). Elsewhere use pptx.
