# whitedeck

## Golden Goal

> **Any AI agent or human can run `npx whitedeck build deck.md` on plain markdown and get a
> presentation indistinguishable from a native Apple Keynote White-theme deck - as HTML, PDF,
> editable PPTX, and native .key - with every layout's geometry provably identical to Apple's own
> values (single source of truth: `src/theme/white.json`), driven by a unix CLI, a Claude skill,
> and an MCP server, 100% integration tested with zero mocks.**

## Gates (all must pass before any commit)

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Architecture

- `src/theme/white.json` - THE single source of truth: all 12 Keynote White layouts with exact
  EMU/px geometry, fonts, point sizes, colors, bullets. Extracted from Apple's own Keynote-to-pptx
  export by `src/theme/extract.ts`. Never edit by hand; re-extract instead.
- `src/theme/white.ts` - typed accessor (`WHITE`, `LAYOUT_IDS`, `layoutOf`). All consumers go
  through this, never through the JSON directly.
- `src/parse/deck.ts` - markdown to Deck model. `---` separates slides,
  `<!-- _class: layout-id -->` picks a layout, heuristics otherwise.
- `src/render/css.ts` - white.json to Marp theme CSS (HTML/PDF path).
- `src/render/html.ts` / `pdf.ts` - spawn the real Marp CLI (`src/render/marp.ts`).
- `src/render/pptx.ts` - native editable OOXML via PptxGenJS, exact EMU geometry.
- `src/render/key.ts` - native .key via AppleScript driving Keynote.app (macOS only; runs in the
  background, closes its documents, quits Keynote again if whitedeck launched it).
- `src/cli.ts` - unix-style CLI (`build`, `layouts`, `validate`, `init`).
- `src/mcp/server.ts` - MCP server exposing `whitedeck_build|layouts|validate`.
- `skills/whitedeck/SKILL.md` - the Claude skill.

## Rules

- TDD red-to-green for every change: failing test first, watch it fail, minimal code, watch it pass.
- Integration tests only, ZERO mocks: tests spawn the real Marp, real Chrome, real Keynote,
  real MCP stdio client, and the real built CLI.
- Keynote-dependent tests auto-skip off macOS (CI runners have no Keynote).
- Geometry truth: every output format's positions/sizes/fonts must equal `white.json` exactly.
- Never commit Apple-owned assets (their XML, stock images, fonts). Geometry facts only.
- TypeScript strict, files <= 200 lines target, named exports, fail fast, no fallbacks.
