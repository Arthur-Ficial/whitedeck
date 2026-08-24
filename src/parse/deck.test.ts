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

  it('fails fast on unknown layout names', () => {
    expect(() => parseDeck('<!-- _class: does-not-exist -->\n# X')).toThrow(/does-not-exist/);
  });
});
