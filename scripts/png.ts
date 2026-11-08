/**
 * Minimal PNG encoder for the icon script: RGBA, or RGB when the image must
 * not carry an alpha channel (the App Store refuses an iOS icon that has one).
 */
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/**
 * Encodes straight (non-premultiplied) RGBA pixels. With `alpha: false` the
 * pixels are composited onto `matte` and written as RGB.
 */
export function encodePng(
  rgba: Uint8Array,
  width: number,
  height: number,
  {
    alpha = true,
    matte = [255, 255, 255],
  }: { alpha?: boolean; matte?: readonly [number, number, number] } = {},
): Uint8Array {
  if (rgba.length !== width * height * 4) throw new RangeError('Pixel buffer does not match the size');
  const channels = alpha ? 4 : 3;
  const stride = width * channels + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = y * stride + 1 + x * channels;
      if (alpha) {
        raw.set(rgba.subarray(i, i + 4), o);
      } else {
        const a = rgba[i + 3]! / 255;
        for (let k = 0; k < 3; k++) raw[o + k] = Math.round(rgba[i + k]! * a + matte[k]! * (1 - a));
      }
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = alpha ? 6 : 2; // colour type: RGBA or RGB
  const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
