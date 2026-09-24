# whitedeck

**Keynote-quality white slides from markdown.** One markdown file in - HTML, PDF, editable PPTX
and native Keynote `.key` out, all pixel-identical to Apple Keynote's standard White theme.

```bash
npm install -g https://github.com/franzenzenhofer/whitedeck/archive/refs/heads/main.tar.gz
whitedeck init my-deck.md
whitedeck build my-deck.md -f all
```

## Why

AI agents (and humans) constantly need clean, professional slides. Every generator produces
"AI-looking" decks. whitedeck instead replicates the most battle-tested minimal design there is -
Apple Keynote's White theme - with **provably exact geometry**: every placeholder position, size,
font and point size is extracted from Apple's own Keynote export into a single source of truth
(`src/theme/white.json`) and asserted by integration tests in every output format.

## Output formats

| Format | Engine | Notes |
|--------|--------|-------|
| `html` | [Marp CLI](https://github.com/marp-team/marp-cli) + generated Keynote-exact CSS theme | self-contained file |
| `pdf`  | same render, printed via headless Chrome | one 16:9 page per slide |
| `pptx` | [PptxGenJS](https://github.com/gitbrent/PptxGenJS), native OOXML | fully **editable**, exact EMU geometry |
| `key`  | the pptx, imported and saved by the real Keynote.app, then reopened and checked | the verified pptx: clickable links, no theme dummy copy; the build throws on either (macOS only) |

## Writing decks

Slides are separated by `---`. A comment picks one of the 12 Keynote White layouts;
without it, whitedeck infers a sensible one.

```markdown
---
title: My Deck
author: Me
---

<!-- _class: title -->
# Big Title
## Subtitle

---

<!-- _class: title-bullets -->
# Agenda
- First point
- Second point
  - Nested detail

---

<!-- _class: quote -->
> "Simplicity is the ultimate sophistication."
> -- Leonardo da Vinci

---

<!-- _class: photo-horizontal -->
# The ocean
## A caption
![](ocean.png)

Source: [GSC Performance](https://search.google.com/search-console)

---

<!-- _class: compare -->
# New template loads 3x faster than old
- **Before**
- LCP 4.1s
- **After**
- LCP 1.3s
```

Links `[text](url)` render blue and underlined in every format (real hyperlinks in PPTX).
A final `Source: [Name](url)` line becomes a small source note at the bottom of the slide.
Titles that would overflow their box auto-shrink, exactly like Keynote.

List all layouts: `whitedeck layouts`

```
title            title-center     title-top        title-bullets
bullets          title-bullets-photo               photo
photo-horizontal photo-vertical   photo-3-up       quote            blank
compare          (virtual: side-by-side bullet columns on Keynote geometry)
title-left       section-left     title-bullets-left   (left-aligned at a 54pt margin)
scope-shot       scope-compare    scope-shot-notes     (annotated screenshot slides)
```

Annotated screenshot slides carry a `Scope:` header line, a `Tool:` logo, bordered
screenshots (`![border=red label="JS on"](shot.png)`), a notes column and a `Caption:` link;
`logo: x.png` in the front matter paints a logo on every slide; `**bold**` and `[x]{#1db100}`
colour runs survive into PPTX and Keynote. See `examples/scope-demo.md` and the skill.

## CLI

```bash
whitedeck build deck.md -f html,pdf,pptx -o out/   # render formats
whitedeck build - -f pptx < deck.md                # stdin
whitedeck build deck.md -o out/board-q3.pptx       # exact file, format from the extension
whitedeck build deck.md -f all --name board-q3     # explicit base name
whitedeck layouts --json                           # machine-readable layout list
whitedeck validate deck.md                         # JSON report, exit 1 on errors
whitedeck init [name]                              # scaffold an example deck
```

### Output file names

Outputs are named after the **deck**, not after the input file: the front-matter `title`
(or, without one, the first headline) becomes a slug.

```
---
title: Q3 Revenue Review
---
```

→ `q3-revenue-review.html`, `q3-revenue-review.pdf`, `q3-revenue-review.pptx`,
`q3-revenue-review.key` - whatever the markdown file or the stdin pipe was called.
Umlauts transliterate (`Über Größe` → `ueber-groesse`), slugs are capped at 60 characters
on a word boundary. Override with `--name <base>` or `-o <dir>/<file>.<format>`. A deck with
no title and no input file name (stdin) is an error, not a file called `deck`.

## For AI agents

- **Claude skill**: `skills/whitedeck/SKILL.md` ships with the package - including the
  editorial persona (assertion headlines, max 5 bullets, one chart per slide, everything
  linked to its data source).
- **MCP server**: `whitedeck-mcp` (stdio) exposes `whitedeck_build`, `whitedeck_layouts`,
  `whitedeck_validate`:

```bash
claude mcp add whitedeck -- whitedeck-mcp
```

## Development

TDD red-to-green, 100% integration tested, zero mocks - tests drive the real Marp, real Chrome,
real Keynote.app and a real MCP stdio client:

```bash
npm install
npm run typecheck && npm run lint && npm run test && npm run build
```

## License

MIT (c) 2026 Franz Enzenhofer

Not affiliated with or endorsed by Apple Inc. Keynote is a trademark of Apple Inc. whitedeck
contains no Apple assets - only independently measured layout geometry.
