// Exercise the actual route without requesting storage credentials or assets.
const assert = require('node:assert/strict');
const express = require('express');
const helmet = require('helmet');
const controllerPath = require.resolve('../src/controllers/media.controller');
require.cache[controllerPath] = {
  id: controllerPath, filename: controllerPath, loaded: true,
  exports: { redirectStoryAsset: (_req: any, res: any) => res.redirect(302, 'https://example.com/image.jpg') },
} as any;
const mediaRouter = require('../src/routes/media.routes').default;

async function checkMediaHeaders() {
  const app = express();
  app.use(helmet());
  app.use(mediaRouter);
  app.get('/private-check', (_req: any, res: any) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const image = await fetch(`${base}/media/story-assets/author/story/image.jpg`, { redirect: 'manual' });
    assert.equal(image.status, 302);
    assert.equal(image.headers.get('Cross-Origin-Resource-Policy'), 'cross-origin');
    assert.equal(image.headers.get('X-Content-Type-Options'), 'nosniff');
    const other = await fetch(`${base}/private-check`);
    assert.equal(other.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
    console.log('PASS: media redirects allow embedding; other routes retain their resource policy.');
  } finally { server.close(); }
}
void checkMediaHeaders().catch((error) => { console.error(error); process.exitCode = 1; });
