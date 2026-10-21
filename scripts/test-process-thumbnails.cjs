'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {verifyThumbnail,rendererFingerprint} = require('./process-thumbnails.cjs');
const root = path.resolve(__dirname,'..'), site = path.join(root,'site');
const catalog = require('../site/data/catalog.json');
const sourceHash = rendererFingerprint(site);
let count = 0, sample;
for (const entry of catalog.cases.filter(entry=>entry.process)) {
  const document = JSON.parse(fs.readFileSync(path.join(site,entry.process.data),'utf8'));
  for (const candidate of document.candidates.filter(candidate=>candidate.preview)) {
    verifyThumbnail(site,document,candidate,sourceHash);
    count++;
    sample ||= {document,candidate};
  }
}
assert(count > 0);
const {document,candidate} = sample;
const temporary = fs.mkdtempSync(path.join(root,'outputs/process-thumbnail-integrity-'));
try {
  const file = path.join(temporary,candidate.preview.thumbnailPath), receiptFile = file.replace(/\.png$/,'.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const bytes = fs.readFileSync(path.join(site,candidate.preview.thumbnailPath));
  const receiptBytes = fs.readFileSync(path.join(site,candidate.preview.thumbnailPath.replace(/\.png$/,'.json')));
  fs.writeFileSync(file,bytes); fs.writeFileSync(receiptFile,receiptBytes);
  verifyThumbnail(temporary,document,candidate,sourceHash);
  const borrowed = structuredClone(candidate); borrowed.preview.thumbnailPath = 'assets/process-thumbnails/other/v001.png';
  assert.throws(()=>verifyThumbnail(temporary,document,borrowed,sourceHash),/not bound/);
  const stale = JSON.parse(receiptBytes); stale.cellsSha256 = '0'.repeat(64);
  fs.writeFileSync(receiptFile,JSON.stringify(stale));
  assert.throws(()=>verifyThumbnail(temporary,document,candidate,sourceHash),/stale|another version/);
  fs.writeFileSync(receiptFile,receiptBytes);
  assert.throws(()=>verifyThumbnail(temporary,document,candidate,'0'.repeat(64)),/not bound|stale/);
  fs.writeFileSync(file,Buffer.concat([bytes,Buffer.from('changed')]));
  assert.throws(()=>verifyThumbnail(temporary,document,candidate,sourceHash),/stale/);
  console.log(JSON.stringify({passed:true,screenshots:count,borrowedCandidateRejected:true,staleRendererRejected:true,alteredImageRejected:true}));
} finally {
  assert.equal(path.dirname(fs.realpathSync(temporary)).toLowerCase(),fs.realpathSync(path.join(root,'outputs')).toLowerCase());
  fs.rmSync(temporary,{recursive:true,force:true});
}
