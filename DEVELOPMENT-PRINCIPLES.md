# whitedeck Development Principles

Born from the 2026-08-24 image-swallowing incident (see TICKETS.md T0): a deck-breaking bug
shipped through gates that were "100% integration tested, zero mocks". These principles exist
so that CLASS of failure - not just that bug - can never happen again.

## P1 - Test the artifact the user receives, never the intermediate

A test that asserts on an internal string (`expect(md).toContain('<h1 style=...')`) proves
nothing about what the user sees. Every feature test must assert on the final artifact:
the HTML DOM, the PDF's embedded objects, the pptx XML, the opened .key. If a feature test
stops at an intermediate representation, it is not done.

## P2 - If your output feeds a parser, your test must include that parser

toMarpMarkdown output is consumed by markdown-it. Asserting substrings on markdown text that
a third-party parser will reinterpret is testing your imagination. The contract test re-parses
the emitted markdown with the real downstream parser and asserts element counts (imgs, lis,
footers). This is a conservation law: N images in the Deck model → N `<img>` in the DOM.

## P3 - Conservation-law invariants on every format

For every build, cheap invariants that catch whole bug classes:
- images in deck == images embedded (HTML `<img>` count, PDF `/Subtype /Image` count, pptx media files, .key media)
- every bullet text appears in output text
- every link URL appears in output
These run on the kitchen-sink fixture (P4) in the normal test suite.

## P4 - Kitchen-sink fixture: all features on the same slides

Bugs live in feature INTERACTIONS (shrunk title × image; footer × columns). Every new feature
MUST be added to one fixture deck that combines it with existing features on the same slide -
long title + image + link + source note + nested bullets - and that deck builds to ALL formats
as a gate. A feature tested only in isolation is untested.

## P5 - Adversarial fixtures at every threshold

Toy content ("Hello Keynote", "The ocean") never crosses thresholds. For every conditional in
rendering (shrink trigger, wrap, column split), fixtures must sit on BOTH sides of the boundary:
the longest realistic German compound-word headline AND a short one. If a code path has a
branch, a fixture must force each branch through to the final artifact.

## P6 - One-off verification tools become permanent gates or they are deleted

The pixel-comparison harness caught layout bugs by eye - then was left behind as a manual
one-off, and the very next emitter change shipped broken. Any tool used once to validate
must become a repeatable command (`npm run verify:visual`) runnable forever, or be deleted
so nobody believes protection exists where there is none.

## P7 - Re-verify the flagship artifact after every emitter/renderer change

Unit fixtures are not the product. After ANY change to parse/emit/render code, rebuild the
real dogfood deck (examples/demo.md at minimum, the newest real client deck when available)
in ALL formats and diff the payload invariants against the previous build. Stale "known good"
outputs are deleted or rebuilt - never trusted.

## P8 - Silent degradation is forbidden

Unsupported input (tables, unknown syntax) must fail validation loudly with a clear message,
never pass through mangled. A user must find out at `validate`, not in front of a client.

## P9 - Raw escape hatches need structural guards

Whenever we inject a lower-level representation into a higher-level stream (raw HTML into
markdown), the injection goes through ONE helper that enforces the structural rules
(blank-line block separation), never ad-hoc string pushes. The helper has its own property
test. Escape hatches are where parsers change the rules on you.

## P10 - A green suite that didn't run the failing path is red

Before claiming done: name the exact user journey the change affects, run THAT journey
end-to-end on the built binary, and look at the output with your own eyes (render to image
for visual features). "All tests pass" is a statement about the tests, not the product.
