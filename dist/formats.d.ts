import type { Deck } from './parse/deck.js';
export type OutputFormat = 'html' | 'pdf' | 'pptx' | 'key';
export declare const OUTPUT_FORMATS: readonly OutputFormat[];
export declare const isOutputFormat: (value: string) => value is OutputFormat;
/** Resolve a -f argument ("html,pdf" or "all") into concrete formats; "all" includes key only on macOS. */
export declare const resolveFormats: (spec: string) => OutputFormat[];
export declare const renderFormat: (format: OutputFormat, deck: Deck, outPath: string) => Promise<void>;
