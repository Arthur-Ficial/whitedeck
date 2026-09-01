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
