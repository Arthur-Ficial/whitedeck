import { type Theme } from './types.js';
export declare const KEYNOTE_LAYOUT_IDS: Readonly<Record<string, string>>;
export declare const extractTheme: (pptxPath: string) => Promise<Theme>;
