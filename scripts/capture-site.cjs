'use strict';
// Render thumbnails from the actual playable engine, with no invented geometry.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const engine = path.resolve(args[args.indexOf('--engine') + 1]);
const { chromium } = require(require.resolve('playwright-core', {paths:[engine]}));
const catalog = require('../site/data/catalog.json');
const {createServer, prefix} = require('./serve-site.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port + prefix;
  let browser;
  try {
    browser = await chromium.launch({channel:'chrome', headless:true, args:['--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport:{width:720,height:440}, reducedMotion:'reduce'});
    for (const entry of catalog.cases) {
      if (args.includes('--missing') && fs.existsSync(path.join(root, 'site', entry.thumbnail))) continue;
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {if(response.status() >= 400) errors.push(response.status() + ' ' + response.url());});
      await page.goto(origin + 'player.html?' + new URLSearchParams({world:entry.world,room:entry.room,case:entry.id,capture:'1'}));
      await page.waitForFunction(() => window.__HARNESS_READY__ || window.__HARNESS_ERROR__, {timeout:30000});
      assert.equal(await page.evaluate(() => window.__HARNESS_ERROR__ || null), null);
      await page.waitForFunction(() => !document.querySelector('.maze-frame').classList.contains('is-loading'));
      await page.evaluate(() => { const a=window.__MAZEBENCH_APP__; a.threeRenderer.setDebugCameraView({yaw:0.45,tilt:0.7,zoom:0.92,mode:'perspective'}); a.render(); });
      await page.waitForTimeout(750);
      assert.deepEqual(errors, [], entry.id);
      const file = path.join(root, 'site', entry.thumbnail);
      fs.mkdirSync(path.dirname(file), {recursive:true});
      await page.locator('#maze-canvas').screenshot({path:file});
      console.log('Captured ' + entry.id);
      await page.close();
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error); process.exitCode=1;});
