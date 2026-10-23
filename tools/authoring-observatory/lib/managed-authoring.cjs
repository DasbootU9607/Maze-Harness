'use strict';
// The legacy command now records the caller; it never starts a model process.
const fs = require('node:fs');
function run({skillRoot, spec, requestFile, cwd, config, createSession}) {
  const request = requestFile ? JSON.parse(fs.readFileSync(requestFile, 'utf8')) : {};
  const current = createSession({skillRoot, spec, cwd, config, fresh: true, title: request.title, task: request.task});
  console.log(JSON.stringify({...current, managed: false, continueInCurrentSession: true, usageReport: 'token-usage.json'}, null, 2));
  return {handled: true, exitCode: 0, ...current};
}
module.exports = {run};
