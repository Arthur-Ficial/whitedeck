import type { Deck } from '../parse/deck.js';
import { runMarp } from './marp.js';

export const renderHtml = async (deck: Deck, outPath: string): Promise<void> => {
  await runMarp(deck, outPath, []);
};
