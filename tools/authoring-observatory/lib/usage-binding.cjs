'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
// Bind a hook and shell tool to their shared CLI PID and creation time, never a recent project chat.
function runtimeAnchor(runtime) {
  let rows = [];
  if (process.platform === 'win32') {
    const script = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CreationDate,Name,CommandLine | ConvertTo-Json -Compress';
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 * 1024});
    if (r.status !== 0) return null;
    try {rows = JSON.parse(r.stdout);} catch {return null;}
  } else {
    const r = spawnSync('ps', ['-eo', 'pid=,ppid=,lstart=,args='], {encoding: 'utf8', timeout: 5000});
    if (r.status !== 0) return null;
    rows = r.stdout.split('\n').flatMap(line => {
      const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/);
      return m ? [{ProcessId: Number(m[1]), ParentProcessId: Number(m[2]), CreationDate: m[3], CommandLine: m[4], Name: ''}] : [];
    });
  }
  const byId = new Map(rows.map(r => [r.ProcessId, r])), visited = new Set();
  for (let pid = process.ppid; pid && !visited.has(pid);) {
    visited.add(pid); const row = byId.get(pid); if (!row) break;
    const cmd = String(row.CommandLine || ''), name = String(row.Name || '');
    const match = runtime === 'claude-code' ? /(?:^|[\\/\s])claude(?:\.exe)?(?:\s|$)|@anthropic-ai[\\/]claude-code/i.test(cmd) || /^claude(?:\.exe)?$/i.test(name)
      : /@google[\\/]gemini-cli|(?:^|[\\/])gemini(?:\.js)?(?:\s|$)/i.test(cmd);
    if (match) return crypto.createHash('sha256').update(`${runtime}:${pid}:${row.CreationDate}`).digest('hex');
    pid = row.ParentProcessId;
  }
  return null;
}
function discoverBinding(root) {
  for (const runtime of ['claude-code', 'gemini-cli']) {
    const anchor = runtimeAnchor(runtime); if (!anchor) continue;
    const file = path.join(root, anchor + '.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.anchor === anchor && data.runtime === runtime) return {runtime, file: data.file, sessionId: data.sessionId};
    }
  }
  return null;
}
function saveBinding(root, runtime, input, anchor = runtimeAnchor(runtime)) {
  if (!anchor || typeof input.session_id !== 'string' || typeof input.transcript_path !== 'string' || !path.isAbsolute(input.transcript_path)) return false;
  fs.mkdirSync(root, {recursive: true});
  const file = path.join(root, anchor + '.json'), temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify({anchor, runtime, sessionId: input.session_id, file: input.transcript_path}) + '\n'); fs.renameSync(temp, file);
  return true;
}
module.exports = {runtimeAnchor, discoverBinding, saveBinding};
