import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function colorMix(from, to, t) {
  return [
    mix(from[0], to[0], t),
    mix(from[1], to[1], t),
    mix(from[2], to[2], t),
    255,
  ];
}

function blend(base, over) {
  const alpha = over[3] / 255;
  return [
    Math.round(over[0] * alpha + base[0] * (1 - alpha)),
    Math.round(over[1] * alpha + base[1] * (1 - alpha)),
    Math.round(over[2] * alpha + base[2] * (1 - alpha)),
    255,
  ];
}

function roundedRectMask(x, y, size, radius) {
  const left = radius;
  const right = size - radius;
  const top = radius;
  const bottom = size - radius;
  const cx = x < left ? left : x > right ? right : x;
  const cy = y < top ? top : y > bottom ? bottom : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function drawIcon(size, file) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.226;
  const skyA = [56, 189, 248];
  const skyB = [37, 99, 235];
  const mintA = [167, 243, 208, 246];
  const mintB = [224, 242, 254, 246];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      if (!roundedRectMask(x, y, size, radius)) {
        pixels[index + 3] = 0;
        continue;
      }

      const t = (x + y) / (size * 2);
      let color = colorMix(skyA, skyB, t);

      const diagonal = Math.abs((x - y) - size * 0.15);
      if (diagonal < size * 0.08 && x > size * 0.18 && y > size * 0.16) {
        color = blend(color, colorMix(mintA, mintB, y / size));
      }

      const curve = distanceToSegment(x, y, size * 0.29, size * 0.67, size * 0.68, size * 0.35);
      if (curve < size * 0.032) {
        color = blend(color, [255, 255, 255, 235]);
      }

      const start = Math.hypot(x - size * 0.31, y - size * 0.66);
      if (start < size * 0.061) {
        color = blend(color, [255, 255, 255, 248]);
      }

      const shadow = Math.hypot(x - size * 0.68, y - size * 0.35);
      if (shadow < size * 0.049) {
        color = blend(color, [15, 39, 66, 45]);
      }

      const goal = Math.hypot(x - size * 0.77, y - size * 0.755);
      if (goal < size * 0.12) {
        color = blend(color, [255, 255, 255, 255]);
      }
      if (goal < size * 0.086) {
        color = blend(color, [37, 99, 235, 255]);
      }

      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = color[3];
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  writeFileSync(file, png);
}

drawIcon(192, "public/lifeos-icon-192.png");
drawIcon(512, "public/lifeos-icon-512.png");
