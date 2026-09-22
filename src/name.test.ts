import { describe, expect, it } from 'vitest';
import { parseDeck } from './parse/deck.js';
import { deckFileBase, slugify } from './name.js';

describe('slugify', () => {
  it('turns a headline into a lowercase hyphenated slug', () => {
    expect(slugify('Q3 Revenue Review: What Changed')).toBe('q3-revenue-review-what-changed');
  });

  it('transliterates German umlauts and sharp s', () => {
    expect(slugify('Über Größe & Maß')).toBe('ueber-groesse-mass');
  });

  it('strips accents from other latin scripts', () => {
    expect(slugify('Café Décisions')).toBe('cafe-decisions');
  });

  it('drops emoji and punctuation without leaving double hyphens', () => {
    expect(slugify('🚀 Launch -- now!')).toBe('launch-now');
  });

  it('truncates at a word boundary, never mid-word', () => {
    const slug = slugify('alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
    expect(`${slug}-`).toContain('alpha-bravo-');
    for (const word of slug.split('-')) {
      expect('alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima'.split(' ')).toContain(word);
    }
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('***')).toBe('');
  });
});

describe('deckFileBase', () => {
  it('prefers the front-matter title over the input file name', () => {
    const deck = parseDeck('---\ntitle: Q3 Revenue Review\n---\n\n# Something else\n');
    expect(deckFileBase(deck, 'deck')).toBe('q3-revenue-review');
  });

  it('falls back to the first slide headline when there is no front matter title', () => {
    const deck = parseDeck('# The Future of Search\n\n## subtitle\n');
    expect(deckFileBase(deck, 'deck')).toBe('the-future-of-search');
  });

  it('uses the input file name when the deck carries no title at all', () => {
    const deck = parseDeck('- just a bullet\n');
    expect(deckFileBase(deck, 'Client Notes')).toBe('client-notes');
  });

  it('fails loudly when no name can be derived', () => {
    const deck = parseDeck('- just a bullet\n');
    expect(() => deckFileBase(deck, undefined)).toThrow(/no title/i);
  });

  it('ignores inline markdown in the headline', () => {
    const deck = parseDeck('# The **fast** `whitedeck` way\n');
    expect(deckFileBase(deck, 'deck')).toBe('the-fast-whitedeck-way');
  });
});
