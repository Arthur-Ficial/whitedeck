/** Pixel size with the aspect ratio of `w:h`, longest side MAX_SIDE. */
export declare const solidPngDims: (w: number, h: number) => {
    w: number;
    h: number;
};
export declare const solidPngBytes: (hexColor: string, dims: {
    w: number;
    h: number;
}) => Buffer;
/** Path of a cached solid-colour PNG for `hexColor` at the aspect ratio of a `w` x `h` rect. */
export declare const solidPngFile: (hexColor: string, w: number, h: number) => string;
