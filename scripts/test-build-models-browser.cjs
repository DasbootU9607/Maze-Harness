'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const args = process.argv.slice(2), arg = key => args.includes(key) ? args[args.indexOf(key) + 1] : null;
const root = path.resolve(__dirname, '..'), engine = path.resolve(arg('--engine'));
const {chromium} = require(require.resolve('playwright-core', {paths:[engine]}));
const {createServer, prefix} = require('./serve-site.cjs');
const catalog = require('../site/data/catalog.json');
const output = path.join(root, 'outputs/build-models-browser'); fs.mkdirSync(output,{recursive:true});
const report = {errors:[], responses:[], filters:[], screenshots:[]};
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = arg('--base-url') || `http://127.0.0.1:${server.address().port}${prefix}`;
  let browser;
  try {
    browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
    const context = await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
    const page = await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)report.responses.push(`${response.status()} ${response.url()}`);});
    const shot = async name => {await page.evaluate(()=>document.fonts.ready); const file=path.join(output,name+'.png'); await page.screenshot({path:file,fullPage:true}); report.screenshots.push(file);};
    const noOverflow = async () => assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1), 'Page has horizontal overflow');
    for (const skill of catalog.skills) {
      const entries=skill.authoredCases.map(id=>catalog.cases.find(entry=>entry.id===id));
      await page.goto(origin+'skill.html?id='+skill.id); await page.locator('#build-table-body tr').first().waitFor({state:'attached'});
      assert.equal(await page.locator('#authored-cases .case-card').count(),entries.length);
      const options=await page.locator('#build-model option').evaluateAll(rows=>rows.map(row=>row.value));
      for (const key of options) {
        await page.selectOption('#build-model',key);
        const expected=entries.filter(entry=>key==='all'||key===(entry.build.attribution==='single-model'?entry.build.model:entry.build.attribution==='mixed'?'@mixed':'@unknown'));
        assert.deepEqual((await page.locator('#authored-cases .case-card').evaluateAll(rows=>rows.map(row=>row.dataset.case))).sort(),expected.map(entry=>entry.id).sort());
      }
      report.filters.push({skill:skill.id,groups:options.length-1}); await noOverflow();
    }
    const measured=catalog.cases.filter(entry=>entry.build?.attribution==='single-model'&&entry.process);
    assert(measured.length>=2,'Need real model evidence to exercise comparison');
    const entry=measured.find(entry=>entry.build.model.startsWith('deepseek'))||measured[0];
    await page.goto(origin+'skill.html?'+new URLSearchParams({id:entry.skill,model:entry.build.model}));
    await page.locator('#comparison-client').waitFor();
    assert.equal(await page.locator('#build-model').inputValue(),entry.build.model);
    await page.reload(); await page.locator('#build-model').waitFor(); assert.equal(await page.locator('#build-model').inputValue(),entry.build.model);
    const time=page.locator(`#time-chart [data-case="${entry.id}"]`);
    assert.equal(Number(await time.getAttribute('data-value')),entry.build.elapsedMs);
    for (const field of ['total_tokens','input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens']) {
      await page.selectOption('#comparison-metric',field);
      assert.equal(Number(await page.locator(`#token-chart [data-case="${entry.id}"]`).getAttribute('data-value')),entry.build.tokens[field]);
    }
    await page.selectOption('#comparison-metric','total_tokens');
    await page.selectOption('#comparison-client',entry.build.runtime);
    const allowed=catalog.cases.filter(row=>row.skill===entry.skill&&row.build?.runtime===entry.build.runtime).map(row=>row.id);
    const shown=await page.locator('#time-chart .chart-row').evaluateAll(rows=>rows.map(row=>row.dataset.case));
    assert(shown.every(id=>allowed.includes(id)));
    await page.selectOption('#comparison-client','all'); await shot('skill-desktop');
    await page.setViewportSize({width:390,height:844}); await noOverflow(); await shot('skill-mobile');
    await page.setViewportSize({width:1440,height:1050});
    await page.goto(origin+'process.html?case='+entry.id); await page.locator('.usage-metrics').waitFor();
    assert((await page.locator('.usage-metrics').textContent()).includes(entry.build.tokens.total_tokens.toLocaleString('en-US')));
    const styles=await page.locator('.usage-metric dd').evaluateAll(rows=>rows.map(row=>({font:getComputedStyle(row).fontSize,weight:getComputedStyle(row).fontWeight})));
    assert.equal(new Set(styles.map(style=>JSON.stringify(style))).size,1,'Overview values need a consistent type scale');
    await page.locator('.usage-details summary').click(); await shot('process-desktop');
    await page.setViewportSize({width:390,height:844}); await noOverflow(); await shot('process-mobile');
    await page.setViewportSize({width:1440,height:1050});
    const play=async row=>{await page.goto(origin+'player.html?'+new URLSearchParams({world:row.world,room:row.room,case:row.id})); await page.waitForFunction(()=>window.__HARNESS_READY__||window.__HARNESS_ERROR__,null,{timeout:45000}); assert.equal(await page.evaluate(()=>window.__HARNESS_ERROR__||null),null);};
    await play(entry); assert(await page.locator('#build-process-link').isVisible()); assert.equal(await page.locator('#build-process-link').getAttribute('aria-disabled'),'false'); await shot('player-process-link');
    await page.locator('#build-process-link').click(); await page.locator('.usage-metrics').waitFor(); assert.equal(new URL(page.url()).searchParams.get('case'),entry.id);
    const historical=catalog.cases.find(row=>row.kind==='authored'&&!row.process); await play(historical);
    assert.equal(await page.locator('#build-process-link').getAttribute('aria-disabled'),'true'); assert.equal(await page.locator('#build-process-link').getAttribute('href'),null);
    assert.deepEqual(report.errors,[]); assert.deepEqual(report.responses,[]);
    console.log(JSON.stringify({passed:true,filters:report.filters,output},null,2));
  } finally {fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n'); if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
