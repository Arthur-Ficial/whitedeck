import { runMarp } from './marp.js';
export const renderPdf = async (deck, outPath) => {
    await runMarp(deck, outPath, ['--pdf']);
};
