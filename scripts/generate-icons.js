import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rawRows = [];

  const center = size / 2;
  const radius = isMaskable ? size * 0.40 : size * 0.44;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background
      let r = 9, g = 9, b = 11, a = 255; // #09090b

      // Inner rounded badge / icon design
      const innerSize = radius * 1.5;
      const inBoxX = Math.abs(dx) <= innerSize / 2;
      const inBoxY = Math.abs(dy) <= innerSize / 2;

      // Draw stylized lime chart / shield emblem
      // Upward trend arrow and bars:
      // Bar 1 (left)
      const inBar1 = dx >= -innerSize * 0.35 && dx <= -innerSize * 0.15 && dy >= 0 && dy <= innerSize * 0.35;
      // Bar 2 (center)
      const inBar2 = dx >= -innerSize * 0.10 && dx <= innerSize * 0.10 && dy >= -innerSize * 0.18 && dy <= innerSize * 0.35;
      // Bar 3 (right)
      const inBar3 = dx >= innerSize * 0.15 && dx <= innerSize * 0.35 && dy >= -innerSize * 0.38 && dy <= innerSize * 0.35;

      // Circle badge behind bars
      if (dist < radius * 0.85) {
        // Subtle dark card surface #18181b
        r = 24; g = 24; b = 27;
      }

      // Border glow ring around emblem
      if (Math.abs(dist - radius * 0.85) < (size * 0.015)) {
        r = 163; g = 230; b = 53; // #a3e635 lime-400
      }

      if (inBar1 || inBar2 || inBar3) {
        r = 163; g = 230; b = 53; // #a3e635
      }

      // Diagonal arrow accent
      const arrowLine = (dx - dy < size * 0.05) && (dx - dy > -size * 0.05) && dy <= 0 && dx >= 0;
      if (arrowLine && dist < radius * 0.7) {
        r = 190; g = 242; b = 100; // #bef264 lime-300
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk('IHDR', ihdrData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/pwa-192x192.png', createPNG(192));
fs.writeFileSync('public/pwa-512x512.png', createPNG(512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPNG(512, true));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180));
console.log('PNG icons created successfully!');
