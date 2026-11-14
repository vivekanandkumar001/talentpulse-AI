const sharp = require(process.cwd() + '/frontend/web/node_modules/sharp');
const src = 'frontend/web/public/icon.svg';
const jobs = [
  ['frontend/web/public/favicon-32x32.png', 32],
  ['frontend/web/public/favicon-16x16.png', 16],
  ['frontend/web/public/apple-touch-icon.png', 180],
  ['frontend/web/public/favicon-48x48.png', 48],
  ['frontend/web/public/icon-192.png', 192],
  ['frontend/web/public/icon-512.png', 512],
];
(async () => {
  for (const [out, size] of jobs) {
    await sharp(src, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
    console.log('wrote', out);
  }
})().catch((e) => { console.error(e); process.exit(1); });
