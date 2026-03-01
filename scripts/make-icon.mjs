import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function distance(x, y, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = x - x1;
  const wy = y - y1;
  const length = vx * vx + vy * vy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, (vx * wx + vy * wy) / length));
  const dx = x - (x1 + t * vx);
  const dy = y - (y1 + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function clock(size, ink, face, background) {
  return (x, y, canvas) => {
    const cx = (canvas - 1) / 2;
    const cy = (canvas - 1) / 2;
    const dx = x - cx;
    const dy = y - cy;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const outer = canvas * 0.42;
    if (background && radius <= outer) {
      if (radius >= outer - canvas * 0.045) return ink;
      if (radius <= canvas * 0.31) {
        const hand = Math.min(
          distance(x, y, cx, cy, cx, cy - canvas * 0.16),
          distance(x, y, cx, cy, cx + canvas * 0.12, cy + canvas * 0.05),
        );
        if (hand <= Math.max(1.4, canvas * 0.018) || radius <= canvas * 0.035) return ink;
        return face;
      }
      return background;
    }
    if (!background) {
      const ring = radius <= canvas * 0.46 && radius >= canvas * 0.34;
      const hand = Math.min(
        distance(x, y, cx, cy, cx, cy - canvas * 0.2),
        distance(x, y, cx, cy, cx + canvas * 0.16, cy + canvas * 0.06),
      );
      if (ring || hand <= Math.max(1, canvas * 0.07) || radius <= canvas * 0.06) return ink;
    }
    return [0, 0, 0, 0];
  };
}

export function writeIcons(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const copper = [196, 98, 45, 255];
  const cream = [255, 248, 242, 255];
  const black = [0, 0, 0, 255];
  fs.writeFileSync(path.join(dir, 'icon.png'), png(512, clock(512, copper, cream, copper)));
  fs.writeFileSync(path.join(dir, 'trayTemplate.png'), png(16, clock(16, black, null, null)));
  fs.writeFileSync(path.join(dir, 'trayTemplate@2x.png'), png(32, clock(32, black, null, null)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeIcons(path.resolve('assets'));
}
