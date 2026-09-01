export interface InlineSegment {
    readonly text: string;
    readonly url?: string;
}
/** Split markdown text into plain and link segments. */
export declare const parseInline: (text: string) => InlineSegment[];
/** Markdown links to HTML anchors; everything else escaped. */
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
