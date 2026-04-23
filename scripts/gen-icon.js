/**
 * Generates icon.png (128×128) for the Content check Figma plugin.
 * Uses only Node.js built-ins — no external packages needed.
 *
 * Design: MELI yellow background · dark magnifying glass · green checkmark badge
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 128, H = 128;
const buf = Buffer.alloc(W * H * 4, 0); // RGBA, fully transparent

// ── Pixel helpers ──────────────────────────────────────────────────────────────

/** Alpha-composite r,g,b,a over whatever is in buf at (x,y). */
function px(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i  = (y * W + x) * 4;
  const fa = a / 255;
  const ba = buf[i + 3] / 255;
  const oa = fa + ba * (1 - fa);
  if (oa < 1e-6) return;
  buf[i]     = Math.round((r * fa + buf[i]     * ba * (1 - fa)) / oa);
  buf[i + 1] = Math.round((g * fa + buf[i + 1] * ba * (1 - fa)) / oa);
  buf[i + 2] = Math.round((b * fa + buf[i + 2] * ba * (1 - fa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

/** Anti-aliased filled circle. */
function circle(cx, cy, radius, r, g, b, a = 255) {
  const r2 = Math.ceil(radius + 1.5);
  for (let y = Math.floor(cy - r2); y <= cy + r2; y++) {
    for (let x = Math.floor(cx - r2); x <= cx + r2; x++) {
      const d     = Math.hypot(x - cx, y - cy);
      const alpha = Math.round(Math.min(1, Math.max(0, radius - d + 0.5)) * a);
      if (alpha > 0) px(x, y, r, g, b, alpha);
    }
  }
}

/** Filled rounded rectangle. */
function roundRect(x1, y1, x2, y2, rad, r, g, b, a = 255) {
  const corners = [
    [x1 + rad, y1 + rad],
    [x2 - rad, y1 + rad],
    [x1 + rad, y2 - rad],
    [x2 - rad, y2 - rad],
  ];
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      let inside = false, alpha = a;
      if (x >= x1 + rad && x <= x2 - rad) {
        inside = true;
      } else if (y >= y1 + rad && y <= y2 - rad) {
        inside = true;
      } else {
        for (const [cx, cy] of corners) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= rad + 0.5) {
            inside = true;
            alpha  = Math.round(Math.min(1, Math.max(0, rad - d + 0.5)) * a);
            break;
          }
        }
      }
      if (inside) px(x, y, r, g, b, alpha);
    }
  }
}

/** Anti-aliased thick line (drawn as a series of circles). */
function line(x1, y1, x2, y2, thickness, r, g, b, a = 255) {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.ceil(Math.hypot(dx, dy) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    circle(x1 + dx * t, y1 + dy * t, thickness / 2, r, g, b, a);
  }
}

// ── Icon design ────────────────────────────────────────────────────────────────

// 1. Yellow (#FFE600) background — rounded square, radius 22
roundRect(0, 0, 127, 127, 22, 255, 230, 0);

// 2. Magnifying glass — center (50, 50), radius 26, ring thickness 6
const GX = 50, GY = 50, GR = 26;
const RING = 6;
const DARK = [26, 26, 26]; // #1A1A1A

// Draw ring by stamping circles along circumference at multiple radii
for (let deg = 0; deg < 360; deg += 0.5) {
  const rad = (deg * Math.PI) / 180;
  for (let t = GR - RING + 1; t <= GR; t += 0.35) {
    circle(GX + Math.cos(rad) * t, GY + Math.sin(rad) * t, 0.7, ...DARK);
  }
}

// 3. Handle — from ~45° bottom-right of glass to corner
line(
  GX + GR * 0.66, GY + GR * 0.66,
  93, 93,
  7.5, ...DARK
);
// Round end cap
circle(93, 93, 3.75, ...DARK);

// 4. Three text lines inside the glass (content metaphor)
const LX = GX, LY = GY;
const LHW = 12; // half-width
line(LX - LHW, LY - 9,  LX + LHW, LY - 9,  2.5, ...DARK, 170);
line(LX - LHW, LY,      LX + LHW, LY,       2.5, ...DARK, 170);
line(LX - LHW, LY + 9,  LX + 5,   LY + 9,   2.5, ...DARK, 170); // shorter last line

// 5. Green (#00A650) checkmark badge — bottom-right
const BX = 90, BY = 90, BR = 18;
const GREEN = [0, 166, 80];
circle(BX, BY, BR, ...GREEN);
// White checkmark: short left leg + long right leg
line(79, 91,  86, 100, 3.8, 255, 255, 255);
line(86, 100, 101, 80, 3.8, 255, 255, 255);

// ── PNG encoding ───────────────────────────────────────────────────────────────

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.alloc(4);   lenBuf.writeUInt32BE(data.length);
  const crcBuf  = Buffer.alloc(4);   crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// IHDR (width, height, 8-bit RGBA)
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // bit depth 8, color type RGBA

// Raw scanlines: filter-byte(0) + RGBA × W per row
const raw = Buffer.alloc((1 + W * 4) * H);
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter: None
  for (let x = 0; x < W; x++) {
    const src = (y * W + x) * 4;
    const dst = y * (1 + W * 4) + 1 + x * 4;
    raw.set(buf.subarray(src, src + 4), dst);
  }
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'icon.png');
fs.writeFileSync(outPath, png);
console.log('icon.png written (' + png.length + ' bytes)');
