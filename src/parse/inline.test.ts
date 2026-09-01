import { describe, expect, it } from 'vitest';
import { inlineToPlain } from './inline.js';

describe('inlineToPlain', () => {
  it('renders a link as "label (url)"', () => {
    expect(inlineToPlain('see [the shop](https://example.com/)')).toBe(
      'see the shop (https://example.com/)',
    );
  });

  it('does NOT print the URL twice when the label is the URL', () => {
    // full-URL examples are a deck convention; "https://x (https://x)" is wrong
    expect(inlineToPlain('[https://www.example.com/](https://www.example.com/)')).toBe(
      'https://www.example.com/',
    );
  });

  it('strips emphasis and code markers Keynote cannot render', () => {
    expect(inlineToPlain('**IS** and `code`')).toBe('IS and code');
  });

  it('leaves plain text untouched', () => {
    expect(inlineToPlain('just words')).toBe('just words');
  });
});
