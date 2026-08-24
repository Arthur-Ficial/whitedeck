---
name: whitedeck
description: Use when creating presentations or slide decks that should look like native Apple Keynote (its standard white theme), when the user asks for keynote-style slides, mentions whitedeck, or needs a deck delivered as .pptx, .key, PDF, or HTML from markdown or text content.
---

# whitedeck

Turns markdown into presentations pixel-identical to Apple Keynote's White theme.
NEVER hand-roll slide geometry (pptxgenjs, python-pptx, raw CSS) for Keynote-style decks -
hand-rolled decks get generic PowerPoint dimensions and fonts and look nothing like Keynote.
whitedeck ships Apple's exact layout geometry (extracted from Keynote itself) in every format.

## Commands

```bash
npx whitedeck build deck.md -f pptx           # editable PowerPoint
npx whitedeck build deck.md -f all -o out/    # html + pdf + pptx (+ native .key on macOS)
npx whitedeck build - -f pptx < deck.md       # stdin
npx whitedeck layouts                         # list the 12 layouts
npx whitedeck validate deck.md                # JSON report, exit 1 on errors
```

MCP alternative: `claude mcp add whitedeck -- npx -y whitedeck-mcp`
(tools: `whitedeck_build`, `whitedeck_layouts`, `whitedeck_validate`).

## Deck markdown

Slides separated by `---`. Pick a layout per slide with a comment directive; omit it for
sensible defaults (first slide → title, blockquote → quote, image-only → photo).

```markdown
---
title: Deck Title
author: Name
---

<!-- _class: title -->
# Big Title
## Subtitle

---

<!-- _class: title-bullets -->
# Section
- Point one
- Point two
  - Nested detail

---

<!-- _class: quote -->
> "Quoted text."
> -- Attribution

---

<!-- _class: photo-horizontal -->
# Caption title
![](image.png)
```

## Layouts

`title` `title-center` `title-top` `title-bullets` `bullets` `title-bullets-photo`
`photo` `photo-horizontal` `photo-vertical` `photo-3-up` `quote` `blank`

## Rules

- Keep slides sparse like real Keynote decks: one idea per slide, few words.
- Titles get Helvetica Neue Medium 112pt automatically - never restyle output files.
- Image paths are resolved relative to the markdown file.
- `-f key` requires macOS with Keynote installed; whitedeck drives Keynote in the
  background and quits it again. Fails fast elsewhere - do not retry, use pptx instead.
