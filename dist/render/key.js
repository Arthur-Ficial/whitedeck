import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';
import { dummyStringsIn } from '../theme/dummy.js';
import { renderPptx } from './pptx.js';
const execFileAsync = promisify(execFile);
/*
 * ONE renderer. The .key is the verified pptx, opened by Keynote and saved.
 *
 * Until 2026-09-24 whitedeck also had a native path that re-built every slide
 * through Keynote's AppleScript dictionary. It diverged from the pptx, and it
 * could not be fixed (measured on a Mac with Keynote 15.3.1, KEY-PATH-EVIDENCE.md):
 * - quote slides sat on the White "Quote" master, whose dummy copy ("Type a
 *   quote here.", "-Johnny Appleseed") lives on the MASTER, so deleting the
 *   slide's own text items removed nothing and it painted through;
 * - the dictionary has no hyperlink property at all (`sdef | grep -i hyperlink`
 *   is empty), so every link became " (url)" appended as visible text.
 * The import path produced clickable links and no dummy copy. Its cost: slides
 * arrive as free-form text items on one DEFAULT master, theme "Custom Theme",
 * 1920x1080 kept, every text box editable.
 */
const str = (value) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
/* osascript gives every Apple event 60 seconds by default; importing a pptx
   with a dozen full-size screenshots takes Keynote longer than that when it
   is busy with other documents (seen 2026-09-11: "AppleEvent timed out
   (-1712)"). The import is wrapped in an explicit, generous timeout. */
const IMPORT_TIMEOUT_SECONDS = 600;
/* Keynote's `open` does NOT reliably return a document for an imported pptx: on
   Keynote 15.3.1 it hands back an `unmerge id` placeholder from the iCloud
   document-merge machinery, and `save` on that dies with
   `unmerge id "..." doesn't understand the "save" message`, or with
   `Can't make missing value into type specifier (-1700)` when the placeholder is
   empty, or with `AppleEvent timed out (-1712)` when the import is still running.
   Never use the return value: count the documents first, open, poll until the
   count rises, then take `front document`. Targeting the bundle id rather than the
   name also matters - the .app may be renamed on disk, and the error text then
   names the renamed file, which looks like a different application entirely. */
const IMPORT_POLL_TRIES = 240;
const IMPORT_POLL_DELAY_SECONDS = 5;
const openFrontDocument = (path) => [
    '    set priorCount to count of documents',
    `    open (POSIX file ${str(path)})`,
    `    repeat ${IMPORT_POLL_TRIES} times`,
    `      delay ${IMPORT_POLL_DELAY_SECONDS}`,
    '      if (count of documents) > priorCount then exit repeat',
    '    end repeat',
    `    if (count of documents) is priorCount then error "Keynote did not open " & ${str(path)}`,
    '    set d to front document',
];
/** The AppleScript that turns the pptx into the .key. The only script that builds a deck. */
export const importScript = (pptxPath, outPath) => [
    `with timeout of ${IMPORT_TIMEOUT_SECONDS} seconds`,
    '  tell application id "com.apple.Keynote"',
    ...openFrontDocument(pptxPath),
    `    save d in POSIX file ${str(resolve(outPath))}`,
    '    close d saving no',
    '  end tell',
    'end timeout',
].join('\n');
/** Separators for the text dump: ASCII record separator between slides, unit separator between items. */
const SLIDE_SEP = '\u001e';
/** Reopens a saved .key and returns every visible text of every slide, slides separated by SLIDE_SEP. */
export const readBackScript = (keyPath) => [
    `with timeout of ${IMPORT_TIMEOUT_SECONDS} seconds`,
    '  tell application id "com.apple.Keynote"',
    ...openFrontDocument(resolve(keyPath)),
    '    set out to {}',
    '    repeat with s in slides of d',
    '      set t to ""',
    '      try',
    '        if title showing of s then set t to t & (object text of default title item of s) & linefeed',
    '      end try',
    '      try',
    '        if body showing of s then set t to t & (object text of default body item of s) & linefeed',
    '      end try',
    '      try',
    '        repeat with ti in text items of s',
    '          set t to t & (object text of ti) & linefeed',
    '        end repeat',
    '      end try',
    '      try',
    '        repeat with sh in shapes of s',
    '          try',
    '            set t to t & (object text of sh) & linefeed',
    '          end try',
    '        end repeat',
    '      end try',
    '      set end of out to t',
    '    end repeat',
    '    close d saving no',
    '  end tell',
    'end timeout',
    `set AppleScript's text item delimiters to (ASCII character 30)`,
    'return out as text',
].join('\n');
/** Exports a saved .key to PDF, so the link annotations Keynote really wrote can be counted. */
export const exportPdfScript = (keyPath, pdfPath) => [
    `with timeout of ${IMPORT_TIMEOUT_SECONDS} seconds`,
    '  tell application id "com.apple.Keynote"',
    ...openFrontDocument(resolve(keyPath)),
    `    export d to POSIX file ${str(resolve(pdfPath))} as PDF with properties {export style:IndividualSlides, all stages:false}`,
    '    close d saving no',
    '  end tell',
    'end timeout',
].join('\n');
/** Every link target of the deck's markdown, `[label](url)`. */
export const deckLinkTargets = (deck) => {
    const raw = JSON.stringify(deck.slides);
    const targets = [...raw.matchAll(/\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/g)].map((m) => m[1] ?? '');
    return [...new Set(targets)];
};
/** The URI of every link annotation in a PDF. */
export const linkUrisInPdf = async (bytes) => {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const uris = [];
    for (const page of pdf.getPages()) {
        const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
        for (let i = 0; i < (annots?.size() ?? 0); i += 1) {
            const annot = annots?.lookupMaybe(i, PDFDict);
            const action = annot?.lookupMaybe(PDFName.of('A'), PDFDict);
            const uri = action?.lookupMaybe(PDFName.of('URI'), PDFString, PDFHexString);
            if (uri !== undefined)
                uris.push(uri.decodeText());
        }
    }
    return uris;
};
const URL_RE = /https?:\/\/[^\s)\]>"']+/g;
/** URLs the deck's markdown shows as visible text (not link targets), e.g. a quoted question naming a site. */
const visibleSourceUrls = (deck) => {
    const raw = JSON.stringify(deck.slides).replace(/\]\((?:[^()\s]|\([^()\s]*\))*\)/g, ']');
    return raw.match(URL_RE) ?? [];
};
/**
 * Defects on a finished .key, one message per problem. Two classes, both fatal:
 * the theme's dummy copy on a slide, and a URL printed as text that the
 * markdown did not print itself - i.e. a link target that leaked into view.
 */
export const keyDefects = (slideTexts, deck) => {
    const allowed = visibleSourceUrls(deck);
    const defects = [];
    slideTexts.forEach((text, i) => {
        for (const dummy of dummyStringsIn(text))
            defects.push(`slide ${i + 1}: theme dummy text "${dummy}"`);
        for (const url of text.match(URL_RE) ?? []) {
            const ok = allowed.some((a) => a.startsWith(url) || url.startsWith(a));
            if (!ok)
                defects.push(`slide ${i + 1}: raw URL visible as text: ${url}`);
        }
    });
    return defects;
};
export const runAppleScript = async (script, args = []) => {
    const { stdout } = await execFileAsync('osascript', ['-e', script, ...args], { maxBuffer: 64 * 1024 * 1024 });
    return stdout.trim();
};
const keynoteIsRunning = async () => {
    try {
        await execFileAsync('pgrep', ['-x', 'Keynote']);
        return true;
    }
    catch {
        return false;
    }
};
/** Quit Keynote again if whitedeck launched it and no documents are left open. */
const quitKeynoteIfIdle = async () => {
    await runAppleScript('tell application id "com.apple.Keynote"\n  if (count of documents) is 0 then quit\nend tell');
};
/** Reopen the saved .key and throw on any defect - dummy copy, a URL as text, a link that is not clickable. No fallback, no warn-and-continue. */
export const verifyKey = async (deck, keyPath) => {
    const dump = await runAppleScript(readBackScript(keyPath));
    const slideTexts = dump.split(SLIDE_SEP);
    if (slideTexts.length !== deck.slides.length) {
        throw new Error(`${keyPath}: ${slideTexts.length} slides in the .key, ${deck.slides.length} in the deck`);
    }
    const defects = keyDefects(slideTexts, deck);
    /* Links: count what Keynote really wrote. Export the .key back to PDF and
       require every markdown link target as a clickable annotation. */
    const pdfPath = join(mkdtempSync(join(tmpdir(), 'whitedeck-keycheck-')), 'check.pdf');
    await runAppleScript(exportPdfScript(keyPath, pdfPath));
    const uris = new Set(await linkUrisInPdf(readFileSync(pdfPath)));
    for (const target of deckLinkTargets(deck)) {
        if (!uris.has(target))
            defects.push(`link not clickable in the .key: ${target}`);
    }
    if (defects.length > 0) {
        throw new Error(`${keyPath} is broken, ${defects.length} defect(s):\n${defects.join('\n')}`);
    }
};
export const renderKey = async (deck, outPath) => {
    if (process.platform !== 'darwin') {
        throw new Error('Native .key output requires macOS with Keynote.app installed');
    }
    const wasRunning = await keynoteIsRunning();
    try {
        /* Keynote names the imported document after the file it came from, and that name
           shows in its window and in error sheets - so the bridge file carries the deck's
           own name, not a generic "deck.pptx". */
        const stem = basename(outPath, extname(outPath));
        const pptxPath = join(mkdtempSync(join(tmpdir(), 'whitedeck-key-')), `${stem}.pptx`);
        await renderPptx(deck, pptxPath);
        await runAppleScript(importScript(pptxPath, outPath));
        await verifyKey(deck, outPath);
    }
    finally {
        if (!wasRunning)
            await quitKeynoteIfIdle();
    }
};
