export interface InlineSegment {
    readonly text: string;
    readonly url?: string;
}
/** Split markdown text into plain and link segments. */
export declare const parseInline: (text: string) => InlineSegment[];
/** Markdown links to HTML anchors; everything else escaped. */
export declare const inlineToHtml: (text: string) => string;
/** Markdown links to plain "text (url)" for renderers without hyperlink support. */
export declare const inlineToPlain: (text: string) => string;
