import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
/* Keynote's AppleScript dictionary exposes no fill or stroke colour on shapes,
   so coloured bars and image borders reach a .key as small solid-colour PNGs
   scaled to the target rectangle. Keynote keeps an image's aspect ratio when
   it is resized, so the PNG is generated AT the target aspect ratio (longest
   side 64px). Built here, no dependency. */
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1)
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const byte of buf)
        crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
};
const MAX_SIDE = 64;
/** Pixel size with the aspect ratio of `w:h`, longest side MAX_SIDE. */
export const solidPngDims = (w, h) => {
    const scale = MAX_SIDE / Math.max(w, h, 1);
    return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
};
export const solidPngBytes = (hexColor, dims) => {
    const rgb = /^#?([0-9a-fA-F]{6})$/.exec(hexColor)?.[1];
    if (rgb === undefined)
        throw new Error(`solid PNG needs #rrggbb, got "${hexColor}"`);
    const pixel = Buffer.from(rgb, 'hex');
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(dims.w, 0);
    ihdr.writeUInt32BE(dims.h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    const row = Buffer.concat([Buffer.from([0]), ...Array.from({ length: dims.w }, () => pixel)]);
    const raw = Buffer.concat(Array.from({ length: dims.h }, () => row));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
};
/** Path of a cached solid-colour PNG for `hexColor` at the aspect ratio of a `w` x `h` rect. */
export const solidPngFile = (hexColor, w, h) => {
    const dir = join(tmpdir(), 'whitedeck-solid');
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    const dims = solidPngDims(w, h);
    const key = `${hexColor.toLowerCase()}-${dims.w}x${dims.h}`;
    const file = join(dir, `${createHash('sha1').update(key).digest('hex').slice(0, 12)}.png`);
    if (!existsSync(file))
        writeFileSync(file, solidPngBytes(hexColor, dims));
    return file;
};
