import type { Deck } from './parse/deck.js';

/* Output files are named after the deck itself, so a folder of builds reads like a
   list of talks ("q3-revenue-review.key") instead of a row of "deck.key" clones. */

const MAX_SLUG_LENGTH = 60;

/* NFKD strips accents, but German needs real transliteration: "Größe" is "groesse",
   not "grosse", and NFKD leaves both umlaut dots and the sharp s untouched. */
const TRANSLITERATE: Readonly<Record<string, string>> = {
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', ø: 'oe', å: 'aa', đ: 'd', ł: 'l', þ: 'th',
};

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_WORD = /[^a-z0-9]+/;

const asciiWords = (value: string): string[] => {
  const transliterated = [...value.toLowerCase()].map((char) => TRANSLITERATE[char] ?? char).join('');
  return transliterated.normalize('NFKD').replace(COMBINING_MARKS, '').split(NON_WORD).filter(Boolean);
};

/** Filesystem-safe, human-readable slug: lowercase ASCII words joined by hyphens. */
export const slugify = (value: string): string => {
  const kept: string[] = [];
  let length = 0;
  for (const word of asciiWords(value)) {
    const added = kept.length === 0 ? word.length : word.length + 1;
    if (length + added > MAX_SLUG_LENGTH) break;
    kept.push(word);
    length += added;
  }
  return kept.join('-');
};

const deckTitle = (deck: Deck): string | undefined =>
  deck.meta.title ?? deck.slides.find((slide) => slide.title !== undefined)?.title;

/**
 * Base file name for every rendered format: the deck's own title, else the input file
 * name. Throws when neither exists - an unnamed file is worse than a clear error.
 */
export const deckFileBase = (deck: Deck, inputName: string | undefined): string => {
  const fromDeck = slugify(deckTitle(deck) ?? '');
  if (fromDeck !== '') return fromDeck;
  const fromInput = slugify(inputName ?? '');
  if (fromInput !== '') return fromInput;
  throw new Error('Cannot name the output: the deck has no title. Add a "# Headline" or pass --name <base>.');
};

/**
 * Guards an explicitly given base name (--name, MCP `name`): it names a file inside the
 * output folder, never a path - otherwise a deck could write outside the folder it was
 * pointed at.
 */
export const checkedBaseName = (name: string): string => {
  if (/[/\\]/.test(name) || name === '.' || name === '..') {
    throw new Error(`Output name "${name}" is a path - pass a plain file name and use -o for the folder.`);
  }
  if (name.trim() === '') throw new Error('Output name is empty - pass a file name or drop --name.');
  return name;
};
