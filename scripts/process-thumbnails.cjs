'use strict';

// Derived screenshots are publication assets, separate from recorded run evidence.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {hash} = require('./site-content.cjs');

function thumbnailPath(caseId, candidate, rendererSha256) {
  assert(/^[a-z0-9-]+$/i.test(caseId) && /^[a-z0-9-]+$/i.test(candidate.id));
  assert(/^[a-f0-9]{64}$/.test(candidate.preview.levelSha256));
  assert(/^[a-f0-9]{64}$/.test(rendererSha256));
  return `assets/process-thumbnails/${caseId}/${candidate.id}-${candidate.preview.levelSha256.slice(0,16)}-${rendererSha256.slice(0,16)}.png`;
}
function inside(site, relative) {
  const base = fs.realpathSync(site), resolved = fs.realpathSync(path.resolve(base,relative));
  const rel = path.relative(base,resolved);
  assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel),'Screenshot source escapes the website');
  return resolved;
}
function rendererFingerprint(site) {
  const files = ['process-player.html', 'process-player.js', 'process-player.css'];
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(site,relative),{withFileTypes:true}).sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      assert(!entry.isSymbolicLink(),'Screenshot sources must not be symbolic links');
      const file = relative + '/' + entry.name;
      if (entry.isDirectory()) walk(file); else if (entry.isFile()) files.push(file);
    }
  };
  for (const directory of ['runtime','vendor','utils','assets/maze']) walk(directory);
  return hash([
    ['capture-profile',hash(fs.readFileSync(__filename))],
    ...files.map(file => [file, hash(fs.readFileSync(inside(site,file)))])
  ]);
}
function verifyThumbnail(site, document, candidate, rendererSha256 = rendererFingerprint(site)) {
  const relative = thumbnailPath(document.caseId,candidate,rendererSha256);
  assert.equal(candidate.preview.thumbnailPath,relative,'Candidate screenshot is not bound to this version');
  const file = inside(site,relative), png = fs.readFileSync(file);
  const receipt = JSON.parse(fs.readFileSync(inside(site,relative.replace(/\.png$/,'.json')),'utf8'));
  assert.deepEqual(png.subarray(0,8), Buffer.from([137,80,78,71,13,10,26,10]),'Candidate screenshot must be a PNG');
  assert(png.length > 5000 && png.readUInt32BE(16) >= 600 && png.readUInt32BE(20) >= 400,'Candidate screenshot is too small');
  assert.deepEqual(receipt, {
    schemaVersion:1, source:'official-runtime-canvas', frame:'initial', caseId:document.caseId,
    candidateId:candidate.id, cellsSha256:candidate.cellsSha256, levelSha256:candidate.preview.levelSha256,
    rendererSha256, imageSha256:hash(png), width:png.readUInt32BE(16),height:png.readUInt32BE(20)
  }, 'Candidate screenshot is stale or bound to another version');
  return receipt;
}
async function captureProcessThumbnails({site, context, origin, missingOnly = false}) {
  const catalog = JSON.parse(fs.readFileSync(inside(site,'data/catalog.json'),'utf8'));
  const rendererSha256 = rendererFingerprint(site), captured = [];
  for (const entry of catalog.cases.filter(entry => entry.process)) {
    const documentFile = inside(site,entry.process.data), original = fs.readFileSync(documentFile,'utf8');
    const document = JSON.parse(original);
    const recoveryIndexFile = path.join(site,'data/process-recovery/index.json');
    const recoveryIndex = fs.existsSync(recoveryIndexFile) ? JSON.parse(fs.readFileSync(recoveryIndexFile)) : null;
    const recoveryEntry = recoveryIndex?.cases.find(row=>row.caseId===entry.id);
    const recovery = recoveryEntry ? JSON.parse(fs.readFileSync(path.join(site,recoveryEntry.data))) : null;
    const recovered = recovery ? [...recovery.sessions.flatMap(s=>s.document.candidates),...recovery.items.flatMap(i=>i.candidate?[i.candidate]:[])] : [];
    for (const candidate of [...document.candidates,...recovered].filter(candidate => candidate.preview)) {
      candidate.preview.thumbnailPath = thumbnailPath(document.caseId,candidate,rendererSha256);
      if (missingOnly) {
        try { verifyThumbnail(site,document,candidate,rendererSha256); continue; }
        catch { /* Missing or stale derived images are recaptured from the engine. */ }
      }
      const page = await context.newPage(), errors = [];
      try {
        await page.setViewportSize({width:960,height:640});
        page.on('pageerror',error => errors.push(error.message));
        page.on('response',response => {if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
        await page.goto(origin + 'process-player.html?' + new URLSearchParams({case:entry.id,candidate:candidate.id,mode:'play',capture:'1'}));
        await page.waitForFunction(() => window.__HARNESS_READY__ || window.__HARNESS_ERROR__,null,{timeout:45000});
        assert.equal(await page.evaluate(() => window.__HARNESS_ERROR__ || null),null);
        await page.waitForFunction(() => !document.querySelector('.maze-frame').classList.contains('is-loading'));
        const initial = await page.evaluate(() => {
          const a = window.__MAZEBENCH_APP__;
          const actors = value => value.map(v=>[v.type,v.x,v.y,v.elevation || 0,!!v.removed]);
          return {sameActors:JSON.stringify(actors(a.state.actors)) === JSON.stringify(actors(window.__PLAY_DATA__.actors)),
            cellsSha256:window.__PLAY_DATA__.processPreview.cellsSha256,zoom:a.threeRenderer.getDebugCameraZoom()};
        });
        assert(initial.sameActors,'Screenshot is not the candidate initial state');
        assert.equal(initial.cellsSha256,candidate.cellsSha256);
        assert.equal(initial.zoom,1,'Screenshot must use the official default camera');
        // Element screenshots include overlapping HUD pixels. Hide only the HUD
        // without changing the canvas dimensions or the official camera layout.
        await page.addStyleTag({content:'.mazebench-controls{visibility:hidden!important}'});
        await page.waitForTimeout(350);
        assert.deepEqual(errors,[],`${entry.id}/${candidate.id}`);
        const png = await page.locator('#maze-canvas').screenshot();
        const file = path.join(site,candidate.preview.thumbnailPath);
        fs.mkdirSync(path.dirname(file),{recursive:true});
        fs.writeFileSync(file,png);
        fs.writeFileSync(file.replace(/\.png$/,'.json'),JSON.stringify({
          schemaVersion:1,source:'official-runtime-canvas',frame:'initial',caseId:document.caseId,
          candidateId:candidate.id,cellsSha256:candidate.cellsSha256,levelSha256:candidate.preview.levelSha256,
          rendererSha256,imageSha256:hash(png),width:png.readUInt32BE(16),height:png.readUInt32BE(20)
        },null,2)+'\n');
        verifyThumbnail(site,document,candidate,rendererSha256);
        captured.push(`${entry.id}/${candidate.id}`);
        console.log('Captured candidate ' + captured.at(-1));
      } finally { await page.close(); }
    }
    const bytes = JSON.stringify(document,null,2)+'\n';
    if (bytes !== original) fs.writeFileSync(documentFile,bytes);
    // Read at write time so other completed case publications remain intact.
    const provenanceFile = inside(site,'data/provenance.json');
    const provenance = JSON.parse(fs.readFileSync(provenanceFile,'utf8'));
    const record = provenance.cases.find(record => record.id === entry.id).authoringProcess;
    if (record.sha256 !== hash(bytes)) {
      record.sha256 = hash(bytes);
      fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
    }
    if(recovery) {
      const bytes=JSON.stringify(recovery,null,2)+'\n';
      fs.writeFileSync(path.join(site,recoveryEntry.data),bytes);
      recoveryEntry.sha256=hash(bytes);
      fs.writeFileSync(recoveryIndexFile,JSON.stringify(recoveryIndex,null,2)+'\n');
    }
  }
  return captured;
}
module.exports = {thumbnailPath,rendererFingerprint,verifyThumbnail,captureProcessThumbnails};
