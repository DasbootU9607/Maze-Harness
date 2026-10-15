'use strict';

// Optional local recorder bridge. No machine-specific path is shipped in this package.
const fs = require('node:fs');
const path = require('node:path');

function ancestors(directory) {
  const found = [];
  for (let current = path.resolve(directory);;) {
    found.push(current);
    const parent = path.dirname(current);
    if (parent === current) return found;
    current = parent;
  }
}

function resolveRuntime(skillRoot, cwd = process.cwd()) {
  const explicitConfig = process.env.MAZEBENCH_OBSERVER_CONFIG;
  const directories = [...new Set([...ancestors(skillRoot), ...ancestors(cwd)])];
  const configPaths = explicitConfig ? [path.resolve(cwd, explicitConfig)] : [
    path.join(skillRoot, 'scripts', 'authoring-observer.local.json'),
    path.join(skillRoot, 'authoring-observer.local.json'),
    ...directories.map(directory => path.join(directory, '.mazebench-observatory.json')),
  ];
  const configFile = configPaths.find(file => fs.existsSync(file));
  if (explicitConfig && !configFile) throw new Error('Configured observer settings file is unavailable.');
  const config = configFile ? JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/^\uFEFF/, '')) : {};
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Observer settings must be a JSON object.');
  const configured = process.env.MAZEBENCH_OBSERVER_RUNTIME || config.runtime;
  let runtime;
  if (configured) {
    runtime = path.resolve(process.env.MAZEBENCH_OBSERVER_RUNTIME ? cwd : path.dirname(configFile), configured);
    if (fs.existsSync(runtime) && fs.statSync(runtime).isDirectory()) runtime = path.join(runtime, 'skill-runtime.cjs');
    if (!fs.existsSync(runtime)) throw new Error('Configured observer runtime is unavailable: ' + runtime);
  } else {
    runtime = directories.flatMap(directory => [
      path.join(directory, 'tools', 'authoring-observatory', 'skill-runtime.cjs'),
      path.join(directory, 'authoring-observatory', 'skill-runtime.cjs'),
    ]).find(file => fs.existsSync(file));
  }
  return runtime ? { runtime, config: { ...config, configFile: configFile || null } } : null;
}

function status(result) {
  if (!result || typeof result.then === 'function' || result.handled !== true || !Number.isInteger(result.exitCode)) {
    throw new Error('Observer runtime must return a synchronous handled result and integer exitCode.');
  }
  process.exitCode = result.exitCode;
  return true;
}

function runAutomatic({ script, kind, argv = process.argv.slice(2), cwd = process.cwd(), skillRoot = path.resolve(__dirname, '..') }) {
  if (process.env.MAZEBENCH_OBSERVER_CHILD === '1') return false;
  try {
    const resolved = resolveRuntime(skillRoot, cwd);
    if (!resolved) {
      console.error('[authoring-observer] Recording is not enabled: optional runtime not found. This command will run without an authoring record.');
      return false;
    }
    const runtime = require(resolved.runtime);
    if (typeof runtime.runAutomatic !== 'function') throw new Error('Observer runtime has no runAutomatic entrypoint.');
    return status(runtime.runAutomatic({ skillRoot, script, argv, cwd, kind, config: resolved.config }));
  } catch (error) {
    console.error('[authoring-observer] Automatic recording failed: ' + error.message);
    process.exitCode = 1;
    return true;
  }
}

function main(argv = process.argv.slice(2)) {
  const skillRoot = path.resolve(__dirname, '..'), cwd = process.cwd();
  try {
    const resolved = resolveRuntime(skillRoot, cwd);
    if (!resolved) throw new Error('Recording is not enabled: optional local runtime not found. No session or read record was created.');
    const runtime = require(resolved.runtime);
    if (typeof runtime.main !== 'function') throw new Error('Observer runtime has no main entrypoint.');
    return status(runtime.main({ skillRoot, argv, cwd, config: resolved.config }));
  } catch (error) {
    console.error('[authoring-observer] ' + error.message);
    process.exitCode = 1;
    return true;
  }
}

if (require.main === module) main();
module.exports = { runAutomatic, main, resolveRuntime };
