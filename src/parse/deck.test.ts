import { describe, expect, it } from 'vitest';
import { parseDeck } from './deck.js';

describe('parseDeck', () => {
  it('parses front matter, slide separators and explicit layout directives', () => {
    const deck = parseDeck(
      [
        '---',
        'title: Demo Deck',
        'author: Franz',
        '---',
        '',
        '<!-- _class: title -->',
        '# Big Title',
        '## The Subtitle',
        '',
        '---',
        '',
        '<!-- _class: title-bullets -->',
        '# Agenda',
        '- First point',
        '- Second point',
        '  - Nested detail',
        '',
      ].join('\n'),
    );

    expect(deck.meta.title).toBe('Demo Deck');
    expect(deck.meta.author).toBe('Franz');
    expect(deck.slides).toHaveLength(2);

    expect(deck.slides[0]).toMatchObject({
      layout: 'title',
      title: 'Big Title',
      subtitle: 'The Subtitle',
    });

    expect(deck.slides[1]).toMatchObject({
      layout: 'title-bullets',
      title: 'Agenda',
      bullets: [
        { text: 'First point', level: 0 },
        { text: 'Second point', level: 0 },
        { text: 'Nested detail', level: 1 },
      ],
    });
  });

  it('applies layout heuristics: first slide title, quote, photo, default title-bullets', () => {
    const deck = parseDeck(
      [
        '# Opening',
        '',
        '---',
        '',
        '> "Stay hungry, stay foolish."',
        '> -- Steve Jobs',
        '',
        '---',
        '',
        '![beach](beach.jpg)',
        '',
        '---',
        '',
        '# Points',
        '- one',
      ].join('\n'),
    );

    expect(deck.slides.map((s) => s.layout)).toEqual(['title', 'quote', 'photo', 'title-bullets']);
    expect(deck.slides[1]).toMatchObject({
      quote: '"Stay hungry, stay foolish."',
      attribution: 'Steve Jobs',
    });
    expect(deck.slides[2]?.images).toEqual(['beach.jpg']);
  });

  it('parses an empty slide as blank layout', () => {
    const deck = parseDeck('# T\n\n---\n\n<!-- _class: blank -->\n\n---\n\n\n');
    expect(deck.slides[1]?.layout).toBe('blank');
    expect(deck.slides[2]?.layout).toBe('blank');
  });

  it('strips inline code markers so text matches Keynote rendering', () => {
    const deck = parseDeck('# T\n- run `npx whitedeck` now');
    expect(deck.slides[0]?.bullets[0]?.text).toBe('run npx whitedeck now');
  });

  it('captures a trailing Source: line separately from bullets', () => {
    const deck = parseDeck('# T\n- point\n\nSource: [GSC](https://search.google.com/search-console)');
    expect(deck.slides[0]?.bullets).toHaveLength(1);
    expect(deck.slides[0]?.source).toBe('Source: [GSC](https://search.google.com/search-console)');
  });

  it('keeps markdown links intact inside bullets', () => {
    const deck = parseDeck('# T\n- see [the docs](https://example.com)');
    expect(deck.slides[0]?.bullets[0]?.text).toBe('see [the docs](https://example.com)');
  });

  it('groups compare slides into side-by-side columns at bold-only bullets', () => {
    const deck = parseDeck(
      '<!-- _class: compare -->\n# Faster\n- **Before**\n- LCP 4.1s\n- 2.3 MB JS\n- **After**\n- LCP 1.3s\n- 0.6 MB JS',
    );
    const slide = deck.slides[0];
    expect(slide?.layout).toBe('compare');
    expect(slide?.columns).toHaveLength(2);
    expect(slide?.columns?.[0]).toMatchObject({ header: 'Before' });
    expect(slide?.columns?.[0]?.bullets.map((b) => b.text)).toEqual(['LCP 4.1s', '2.3 MB JS']);
    expect(slide?.columns?.[1]).toMatchObject({ header: 'After' });
  });

  it('fails fast on unknown layout names', () => {
    expect(() => parseDeck('<!-- _class: does-not-exist -->\n# X')).toThrow(/does-not-exist/);
  });
});
