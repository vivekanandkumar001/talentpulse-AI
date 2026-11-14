const sharp = require(process.cwd() + '/frontend/web/node_modules/sharp');

(async () => {
  const meta = await sharp('frontend/web/public/interview-demo.jpg').metadata();
  console.log('interview-demo.jpg:', meta.width, 'x', meta.height);

  const W = meta.width, H = meta.height;
  // Subject's face sits roughly centered around xâ‰ˆ0.45, yâ‰ˆ0.42 (landscape interview photo).
  // Crop a square region from the upper area that contains the head + shoulders.
  const size = Math.floor(Math.min(W * 0.55, H * 0.85));
  const left = Math.floor(W * 0.13);
  const top = Math.floor(H * 0.0);
  const region = { left, top, width: size, height: size };

  await sharp('frontend/web/public/interview-demo.jpg')
    .extract(region)
    .resize(512, 512)
    .jpeg({ quality: 88 })
    .toFile('frontend/web/public/avatars/candidate_male.jpg');

  const out = await sharp('frontend/web/public/avatars/candidate_male.jpg').metadata();
  console.log('candidate_male.jpg:', out.width, 'x', out.height);
})().catch((e) => { console.error(e); process.exit(1); });
