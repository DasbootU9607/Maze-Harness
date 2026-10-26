export const modelLabel = value => ({'gpt-6-astra': 'ChatGPT 6 Astra', 'deepseek-v4.1-flash-1017': 'DeepSeek V4.1 Flash 1017', 'qwen3.8-max': 'Qwen3.8 Max'}[value] || value || 'Not provided');
export const clientLabel = value => ['codex-tui', 'codex_exec', 'codex-exec'].includes(value) ? 'Codex CLI' : value || 'Not provided';
export const modelKey = build => build?.attribution === 'single-model' && build.model ? build.model : build?.attribution === 'mixed' ? '@mixed' : '@unknown';
export const buildLabel = build => modelKey(build) === '@unknown' ? 'Not provided' : modelKey(build) === '@mixed' ? 'Mixed / partial attribution' : modelLabel(build.model);
export const effortLabel = build => build?.reasoningMixed ? (build.reasoningEfforts || []).join(' / ') + ' · mixed' : build?.reasoningEffort || 'Not provided';
export const configurationLabel = build => buildLabel(build) + ' · ' + effortLabel(build);
export const attributionLabel = build => build?.modelBasis === 'user-confirmed' || build?.reasoningBasis === 'user-confirmed' ? 'Owner-confirmed attribution' : build?.reasoningBasis === 'runtime-setting' ? 'Client-recorded reasoning setting' : 'Reasoning setting not provided';
export function modelColor(build) {
  if (build?.model === 'gpt-6-astra') return build.reasoningEffort === 'ultra' ? '#8253c5' : '#5369d4';
  if (/^deepseek/.test(build?.model || '')) return '#2185a4';
  if (/^qwen/.test(build?.model || '')) return '#c17a29';
  return '#7a7a88';
}
export const buildDate = value => value ? new Date(value).toLocaleString('en-GB', {timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) + ' (UTC+8)' : 'Not provided';
export const tokenCount = value => Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString('en-US') : 'Not provided';
export function duration(value) {
  if (!Number.isFinite(value) || value < 0) return 'Not provided';
  const seconds = Math.floor(value / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
  return hours ? `${hours}h ${minutes}m ${seconds % 60}s` : minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
