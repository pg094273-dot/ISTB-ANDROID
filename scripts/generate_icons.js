import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawPixel) {
  // RGBA buffer with 1 extra byte per scanline for filter (0)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Helper to make chunk
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // calculate CRC32 of type + data
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  // Header
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const idat = makeChunk('IDAT', compressedData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Drawing function for iSTB Android app icon
function drawSTBIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background: Rich dark slate blue gradient
  const bgR = Math.round(15 + ny * 15);
  const bgG = Math.round(23 + ny * 20);
  const bgB = Math.round(42 + ny * 35);

  // Rounded rectangle for the TV screen (or center area)
  const pad = isMaskable ? 0.18 : 0.12;
  const tvLeft = pad;
  const tvRight = 1 - pad;
  const tvTop = pad;
  const tvBottom = 1 - pad;

  // Center coordinates
  const cx = 0.5;
  const cy = 0.5;
  const distCenter = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2);

  // Play triangle in center
  // Coordinates roughly: (0.42, 0.36) to (0.42, 0.64) to (0.64, 0.5)
  const inTriangle = (
    nx >= 0.40 &&
    nx <= 0.64 &&
    ny >= 0.35 + (nx - 0.40) * 0.625 &&
    ny <= 0.65 - (nx - 0.40) * 0.625
  );

  // TV box outer boundary
  const inTV = nx >= tvLeft && nx <= tvRight && ny >= tvTop && ny <= tvBottom;
  const isBorder = inTV && (
    nx <= tvLeft + 0.02 || nx >= tvRight - 0.02 ||
    ny <= tvTop + 0.02 || ny >= tvBottom - 0.02
  );

  if (inTriangle) {
    // Glowing cyan / electric blue play symbol
    return [59, 130, 246, 255]; // Blue 500
  }

  if (isBorder) {
    // Border accent
    return [96, 165, 250, 220]; // Blue 400
  }

  if (inTV) {
    // Inner screen background
    const screenR = Math.round(20 + ny * 25);
    const screenG = Math.round(30 + ny * 35);
    const screenB = Math.round(60 + ny * 60);
    return [screenR, screenG, screenB, 255];
  }

  // Outside TV: background
  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.resolve('./public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon-192.png
fs.writeFileSync('./public/icons/icon-192.png', createPNG(192, 192, (x, y, w, h) => drawSTBIcon(x, y, w, h, false)));
// Generate icon-512.png
fs.writeFileSync('./public/icons/icon-512.png', createPNG(512, 512, (x, y, w, h) => drawSTBIcon(x, y, w, h, false)));
// Generate icon-maskable-512.png
fs.writeFileSync('./public/icons/icon-maskable-512.png', createPNG(512, 512, (x, y, w, h) => drawSTBIcon(x, y, w, h, true)));
// Generate apple-touch-icon.png
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, (x, y, w, h) => drawSTBIcon(x, y, w, h, false)));

// SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="screen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="play" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect x="64" y="80" width="384" height="270" rx="36" fill="url(#screen)" stroke="#38bdf8" stroke-width="8" />
  <path d="M 210 160 L 340 215 L 210 270 Z" fill="#ffffff" />
  <rect x="236" y="360" width="40" height="48" rx="8" fill="#64748b" />
  <rect x="180" y="408" width="152" height="20" rx="10" fill="#475569" />
  <circle cx="430" cy="95" r="14" fill="#22c55e" />
</svg>`;
fs.writeFileSync('./public/icon.svg', svg);

console.log('Icons generated successfully!');
