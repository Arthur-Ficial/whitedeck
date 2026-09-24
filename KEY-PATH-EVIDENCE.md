# .key render paths, measured on a Mac with Keynote - 2026-09-24

Franz's own Mac ran this experiment because Arthur Mac has no Keynote. It answers the open
decision in `BRIEF-FIX-2.md` section 2.3: **native AppleScript path vs pptx-import path.**
Do not re-derive it. Do not guess. These are real numbers from real files.

## The experiment

Two decks, identical content - one `_class: quote` slide carrying a German question, one
`title-bullets` slide carrying a markdown link inside a bullet and a markdown link in its
`Source:` line. The only difference is `logo:` in the frontmatter, because `needsImport(deck)`
in `src/render/key.ts` is true when a logo or a custom layout is present, which is what selects
the import path.

```
whitedeck build native.md -f key -o .   # no logo  -> native AppleScript path
whitedeck build import.md -f key -o .   # logo     -> renderKeyByImport (pptx -> Keynote)
```

Both `.key` files were then opened in Keynote and exported to PDF, and the PDFs were read with
pypdf (link annotations) and pdftotext (visible text).

## The result

| | native AppleScript path | pptx-import path |
|---|---|---|
| clickable link annotations | **0** | **2** (both, with their `#:~:text=` fragments intact) |
| "Type a quote here." on the quote slide | **present** | **absent** |
| "Johnny Appleseed" on the quote slide | **present** | **absent** |
| the real question text | present (as a body bullet) | present |
| raw `https://` printed as visible text | **2** | **0** |

The import path fixes **both** defects at once. The native path fails both.

## Why the native path can never be fixed for links

Keynote's AppleScript dictionary has **no hyperlink support at all**:

```
sdef "/Applications/Keynote Creator Studio.app" | grep -iE "hyperlink|<property name=\"url|link"
(no matches)
```

(That .app is Apple Keynote 15.3.1, just renamed on disk - see the name-collision note in
`KEY-EXPORT-SOLVED.md`.) There is no property to set a link on a text range, which is exactly
why `key.ts` appends ` (url)` as visible text instead. **Franz's requirement - "the links must be
links! clickable!" - is unachievable on the native path.** That decides it: the import path is
the only path that can satisfy it.

## What the import path costs, also measured

Inspected through AppleScript on the imported document:

```
theme = "Custom Theme"   (not "White")
masters = DEFAULT        (one master, not the White theme's set)
slide 1: base=DEFAULT titleShowing=false bodyShowing=false textItems=4
slide 2: base=DEFAULT titleShowing=false bodyShowing=false textItems=5
size = 1920x1080         (preserved)
```

So the price is real: imported slides arrive as **free-form text items on a single DEFAULT
master**, with the title/body placeholders off and the White theme replaced by "Custom Theme".
Every text box stays editable and the slide size is right, but the Keynote Slide Layout inspector
no longer offers the White layouts, and a slide added by hand afterwards does not inherit the
design.

## The recommendation this evidence supports

Ship the import path as the only `.key` path. A deck that shows the theme's dummy copy where the
client's question should be, and prints three-line percent-encoded URLs instead of links, is
broken as a deliverable; losing the master structure in a file Franz mostly presents and lightly
edits is the smaller cost, and it buys Single Source of Truth - one renderer, the verified one.

If you disagree after reading the code, the burden is on the alternative: it must produce
clickable links, and the `sdef` output above says it cannot.

## Reproduce

Files are in the scratchpad of the session that ran it; the recipe above rebuilds them in two
minutes on any Mac with Keynote.
