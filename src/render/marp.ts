import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Deck } from '../parse/deck.js';
import { themeCss } from './css.js';
import { toMarpMarkdown } from './marp-md.js';

const execFileAsync = promisify(execFile);

const require = createRequire(import.meta.url);

const marpBinary = (): string => {
  const pkg = require.resolve('@marp-team/marp-cli/package.json');
  return join(dirname(pkg), 'marp-cli.js');
};

/** Render a deck through the real Marp CLI into the given output file (.html or .pdf). */
export const runMarp = async (deck: Deck, outPath: string, extraArgs: readonly string[]): Promise<void> => {
  const workDir = await mkdtemp(join(tmpdir(), 'whitedeck-marp-'));
  try {
    const mdPath = join(workDir, 'deck.md');
    const themePath = join(workDir, 'keynote-white.css');
    await writeFile(mdPath, toMarpMarkdown(deck));
    await writeFile(themePath, themeCss());
    await execFileAsync(process.execPath, [
      marpBinary(),
      mdPath,
      '--theme-set',
      themePath,
      '--allow-local-files',
      '--no-stdin',
      '-o',
      resolve(outPath),
      ...extraArgs,
    ]);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};
