#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { OUTPUT_FORMATS, isOutputFormat, renderFormat, resolveFormats } from './formats.js';
import { checkedBaseName, deckFileBase } from './name.js';
import { parseDeck } from './parse/deck.js';
import { dummyStringsIn } from './theme/dummy.js';
import { LAYOUT_IDS, layoutOf } from './theme/white.js';
const USAGE = `Usage: whitedeck <command> [options]

Commands:
  build <deck.md|->    Render a markdown deck ("-" reads stdin)
                       -f, --format  ${OUTPUT_FORMATS.join('|')}|all (default: html)
                       -o, --out     output directory, or a file path whose extension
                                     picks the format (default: next to input)
                       -n, --name    output base name (default: slug of the deck title)
  layouts              List the 12 Keynote White layouts (--json for JSON)
  validate <deck.md>   Parse and check a deck; prints JSON report
  init [name]          Scaffold an example deck (default: deck.md)

Layout directive inside markdown:  <!-- _class: title-bullets -->
Slide separator: a line containing only ---`;
const fail = (message, code) => {
    process.stderr.write(`${message}\n`);
    process.exit(code);
};
/** Reads the deck; `name` is the input file's base name, absent when reading stdin. */
const readInput = (path) => {
    if (path === '-')
        return { markdown: readFileSync(0, 'utf8'), dir: process.cwd() };
    const file = resolve(path);
    return { markdown: readFileSync(file, 'utf8'), name: basename(file).replace(/\.[^.]+$/, ''), dir: dirname(file) };
};
/** An -o argument ending in a format extension names one output file instead of a folder. */
const fileTarget = (out, cwd) => {
    if (out === undefined)
        return undefined;
    const extension = extname(out).slice(1).toLowerCase();
    if (!isOutputFormat(extension))
        return undefined;
    const path = resolve(cwd, out);
    return { dir: dirname(path), base: basename(path, extname(path)), format: extension };
};
const build = async (args) => {
    const { values, positionals } = parseArgs({
        args: [...args],
        options: {
            format: { type: 'string', short: 'f' },
            out: { type: 'string', short: 'o' },
            name: { type: 'string', short: 'n' },
        },
        allowPositionals: true,
    });
    const input = positionals[0] ?? fail(`build needs an input file\n\n${USAGE}`, 2);
    const { markdown, name, dir } = readInput(input);
    const previousCwd = process.cwd();
    if (input !== '-')
        process.chdir(dir);
    try {
        const deck = parseDeck(markdown);
        const target = fileTarget(values.out, previousCwd);
        const formats = resolveFormats(values.format ?? target?.format ?? 'html');
        if (target !== undefined && formats.length > 1) {
            fail(`-o ${values.out} names one file, so it works with a single format only - pass a folder instead`, 2);
        }
        const outDir = target?.dir ?? resolve(previousCwd, values.out ?? dir);
        /* The file name is the deck's own title, so a folder of builds reads like a list of
           talks instead of a row of "deck.key" clones. */
        const explicit = target?.base ?? values.name;
        const base = explicit === undefined ? deckFileBase(deck, name) : checkedBaseName(explicit);
        /* Keynote cannot save into a missing folder - it shows a modal error sheet
           and every later AppleEvent times out. Create the folder up front. */
        mkdirSync(outDir, { recursive: true });
        for (const format of formats) {
            const outPath = join(outDir, `${base}.${format}`);
            await renderFormat(format, deck, outPath);
            process.stdout.write(`${outPath}\n`);
        }
    }
    finally {
        process.chdir(previousCwd);
    }
};
const layouts = (args) => {
    const rows = LAYOUT_IDS.map((id) => ({ id, keynoteName: layoutOf(id).keynoteName }));
    if (args.includes('--json')) {
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
        return;
    }
    for (const row of rows)
        process.stdout.write(`${row.id.padEnd(22)}${row.keynoteName}\n`);
};
const validate = (args) => {
    const input = args[0] ?? fail(`validate needs an input file\n\n${USAGE}`, 2);
    const { markdown } = readInput(input);
    const deck = parseDeck(markdown);
    // A deck whose own text carries theme dummy copy is broken before any render.
    const errors = deck.slides.flatMap((slide, i) => dummyStringsIn(JSON.stringify(slide)).map((dummy) => `slide ${i + 1}: theme dummy text "${dummy}"`));
    const report = {
        ok: errors.length === 0,
        slides: deck.slides.length,
        ...(errors.length > 0 ? { errors } : {}),
        layouts: deck.slides.map((slide) => slide.layout),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (errors.length > 0)
        process.exitCode = 1;
};
const init = (args) => {
    const target = resolve(args[0] ?? 'deck.md');
    const examplesDir = new URL('../examples/', import.meta.url).pathname;
    writeFileSync(target, readFileSync(join(examplesDir, 'demo.md'), 'utf8'), { flag: 'wx' });
    for (const asset of readdirSync(examplesDir)) {
        if (asset.endsWith('.png'))
            copyFileSync(join(examplesDir, asset), join(dirname(target), asset));
    }
    process.stdout.write(`${target}\n`);
};
const main = async () => {
    const [command, ...rest] = process.argv.slice(2);
    try {
        if (command === 'build')
            await build(rest);
        else if (command === 'layouts')
            layouts(rest);
        else if (command === 'validate')
            validate(rest);
        else if (command === 'init')
            init(rest);
        else if (command === '--help' || command === '-h' || command === undefined)
            process.stdout.write(`${USAGE}\n`);
        else
            fail(`Unknown command "${command}"\n\n${USAGE}`, 2);
    }
    catch (error) {
        fail(error instanceof Error ? error.message : String(error), 1);
    }
};
await main();
