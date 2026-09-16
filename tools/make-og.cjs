/* og.png 생성 — 공유 카드 (1200×630)
 * 의존성 없이 zlib만으로 PNG를 씁니다.  실행: node tools/make-og.cjs
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const PAPER = hex('#FBFAF4');
const RULE = hex('#CBDDCF');
const C = { H: hex('#2F7A52'), N: hex('#C9922B'), M: hex('#A6ADA4') };

// 예시 공유 결과 그대로 — 넷째 줄에서 전부 맞힘
const GRID = [
  'MNMMMH',
  'MNMNMM',
  'HMMNNH',
  'HHHHHH'
];

const buf = Buffer.alloc(W * H * 3);
function fill(x0, y0, w, h, c) {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      const o = (y * W + x) * 3;
      buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
    }
  }
}
// 모서리를 깎은 사각형 (원고지 칸 느낌의 아주 작은 라운드)
function tile(x0, y0, s, c, r) {
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = Math.min(x, s - 1 - x), dy = Math.min(y, s - 1 - y);
      if (dx < r && dy < r && (r - dx) * (r - dx) + (r - dy) * (r - dy) > r * r) continue;
      const o = ((y0 + y) * W + (x0 + x)) * 3;
      buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
    }
  }
}

fill(0, 0, W, H, PAPER);

const COLS = GRID[0].length, ROWS = GRID.length;
const S = 96, GAP = 16;
const gw = COLS * S + (COLS - 1) * GAP;
const gh = ROWS * S + (ROWS - 1) * GAP;
const gx = Math.round((W - gw) / 2);
const gy = Math.round((H - gh) / 2);

// 원고지 괘선 — 격자 위아래를 감싸는 얇은 선
fill(120, gy - 56, W - 240, 3, RULE);
fill(120, gy + gh + 53, W - 240, 3, RULE);

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    tile(gx + c * (S + GAP), gy + r * (S + GAP), S, C[GRID[r][c]], 6);
  }
}

// ── PNG 인코딩 ──────────────────────────────────────────────
const TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 2;   // truecolour
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  buf.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, '..', 'og.png');
fs.writeFileSync(out, png);
console.log('wrote', out, (png.length / 1024).toFixed(1) + ' KB', W + '×' + H);
