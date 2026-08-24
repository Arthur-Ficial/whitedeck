#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { OUTPUT_FORMATS, renderFormat, resolveFormats } from './formats.js';
import { parseDeck } from './parse/deck.js';
import { LAYOUT_IDS, layoutOf } from './theme/white.js';

const USAGE = `Usage: whitedeck <command> [options]

Commands:
  build <deck.md|->    Render a markdown deck ("-" reads stdin)
                       -f, --format  ${OUTPUT_FORMATS.join('|')}|all (default: html)
                       -o, --out     output directory (default: next to input)
  layouts              List the 12 Keynote White layouts (--json for JSON)
  validate <deck.md>   Parse and check a deck; prints JSON report
  init [name]          Scaffold an example deck (default: deck.md)

Layout directive inside markdown:  <!-- _class: title-bullets -->
Slide separator: a line containing only ---`;

const fail = (message: string, code: number): never => {
  process.stderr.write(`${message}\n`);
  process.exit(code);
};

const readInput = (path: string): { markdown: string; name: string; dir: string } => {
  if (path === '-') return { markdown: readFileSync(0, 'utf8'), name: 'deck', dir: process.cwd() };
  const file = resolve(path);
  return { markdown: readFileSync(file, 'utf8'), name: basename(file).replace(/\.[^.]+$/, ''), dir: dirname(file) };
};

const build = async (args: readonly string[]): Promise<void> => {
  const { values, positionals } = parseArgs({
    args: [...args],
    options: { format: { type: 'string', short: 'f', default: 'html' }, out: { type: 'string', short: 'o' } },
    allowPositionals: true,
  });
  const input = positionals[0] ?? fail(`build needs an input file\n\n${USAGE}`, 2);
  const { markdown, name, dir } = readInput(input);
  const previousCwd = process.cwd();
  if (input !== '-') process.chdir(dir);
  try {
    const deck = parseDeck(markdown);
    const outDir = resolve(previousCwd, values.out ?? dir);
    for (const format of resolveFormats(values.format ?? 'html')) {
      const outPath = join(outDir, `${name}.${format}`);
      await renderFormat(format, deck, outPath);
      process.stdout.write(`${outPath}\n`);
    }
  } finally {
    process.chdir(previousCwd);
  }
};

const layouts = (args: readonly string[]): void => {
  const rows = LAYOUT_IDS.map((id) => ({ id, keynoteName: layoutOf(id).keynoteName }));
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }
  for (const row of rows) process.stdout.write(`${row.id.padEnd(22)}${row.keynoteName}\n`);
};

const validate = (args: readonly string[]): void => {
  const input = args[0] ?? fail(`validate needs an input file\n\n${USAGE}`, 2);
  const { markdown } = readInput(input);
  const deck = parseDeck(markdown);
  const report = {
    ok: true,
    slides: deck.slides.length,
    layouts: deck.slides.map((slide) => slide.layout),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

const init = (args: readonly string[]): void => {
  const target = resolve(args[0] ?? 'deck.md');
  const example = new URL('../examples/demo.md', import.meta.url).pathname;
  writeFileSync(target, readFileSync(example, 'utf8'), { flag: 'wx' });
  process.stdout.write(`${target}\n`);
};

const main = async (): Promise<void> => {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (command === 'build') await build(rest);
    else if (command === 'layouts') layouts(rest);
    else if (command === 'validate') validate(rest);
    else if (command === 'init') init(rest);
    else if (command === '--help' || command === '-h' || command === undefined) process.stdout.write(`${USAGE}\n`);
    else fail(`Unknown command "${command}"\n\n${USAGE}`, 2);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), 1);
  }
};

await main();
