export interface InlineSegment {
    readonly text: string;
    readonly url?: string;
    readonly bold?: boolean;
    readonly color?: string;
}
/** Split markdown text into plain, bold, link and coloured segments. */
export declare const parseInline: (text: string) => InlineSegment[];
/** Markdown inline runs to HTML: links, bold, coloured spans; everything else escaped. */
export declare const inlineToHtml: (text: string) => string;
/**
 * Markdown to plain text for renderers without inline formatting: links
 * become "text (url)", emphasis and code markers are removed.
 */
export declare const inlineToPlain: (text: string) => string;
/**
 * The text a renderer actually paints: link labels only (the href is never on
 * the slide) and no emphasis markers. This is what a fit calculation must
 * measure - `inlineToPlain` appends the URL and would over-estimate by far.
 */
export declare const inlineVisibleText: (text: string) => string;
export interface StyledRun {
    readonly start: number;
    readonly end: number;
    readonly bold: boolean;
    readonly color?: string;
    readonly url?: string;
}
/**
 * Character ranges (1-based, inclusive - AppleScript's `characters a thru b`)
 * of every styled run inside `inlineVisibleText(text)`. Plain runs are omitted.
 */
export declare const styledRuns: (text: string) => StyledRun[];
