import { type Placed } from './scope-layout.js';
/** One raw-HTML block for the whole paint list; `marpSrc` resolves image paths for Marp. */
export declare const placedToHtml: (placed: readonly Placed[], marpSrc: (path: string) => string) => string;
/** Theme CSS the custom layouts rely on (fonts, list reset, bullet glyph). */
export declare const customLayoutCss: () => string;
