import { runMarp } from './marp.js';
export const renderHtml = async (deck, outPath) => {
    await runMarp(deck, outPath, []);
};
