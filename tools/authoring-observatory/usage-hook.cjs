'use strict';
// Save identity only. Ignore prompts, tool arguments and response content.
const fs = require('node:fs');
const path = require('node:path');
try {
  const runtime = process.argv[2], input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (['claude-code', 'gemini-cli'].includes(runtime)) require('./lib/usage-binding.cjs').saveBinding(path.join(__dirname, 'bindings'), runtime, input);
} catch { /* Optional accounting must not prevent normal client operation. */ }
