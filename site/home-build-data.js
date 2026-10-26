import {modelKey, effortLabel} from './build-data.js';

export const hasValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function authoredBuilds(entries) {
  return [...new Map(entries.filter(entry => entry.kind === 'authored').map(entry => [entry.id, entry])).values()];
}
export function metricSummary(entries, valueFor) {
  const seen = new Set(), values = [];
  for (const entry of authoredBuilds(entries)) {
    const value = valueFor(entry.build);
    if (!hasValue(value)) continue;
    // A republished case or a second map from the same measured interval must
    // not count the same token/time evidence twice. Repeated independent runs do.
    const identity = entry.build?.evidenceSha256 || entry.id;
    if (seen.has(identity)) continue;
    seen.add(identity); values.push(value);
  }
  const sum = values.length ? values.reduce((total, value) => total + value, 0) : null;
  return {total: sum, average: sum === null ? null : sum / values.length, measured: values.length};
}
export function homeSummary(entries) {
  const builds = authoredBuilds(entries), groups = new Map();
  for (const entry of builds) {
    const key = JSON.stringify([modelKey(entry.build), effortLabel(entry.build)]);
    if (!groups.has(key)) groups.set(key, {key, build: entry.build, entries: []});
    groups.get(key).entries.push(entry);
  }
  const time = rows => metricSummary(rows, build => build?.elapsedMs);
  const tokens = rows => metricSummary(rows, build => build?.tokens?.total_tokens);
  return {publishedBuilds: builds.length, time: time(builds), tokens: tokens(builds),
    groups: [...groups.values()].map(group => ({...group, time: time(group.entries), tokens: tokens(group.entries)}))};
}
export function rankedGroups(summary, metric = 'time', statistic = 'total') {
  return summary.groups.filter(group => hasValue(group[metric][statistic]))
    .sort((a, b) => a[metric][statistic] - b[metric][statistic] || a.key.localeCompare(b.key));
}
