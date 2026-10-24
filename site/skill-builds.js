import {escapeHtml as e, caseCard, playUrl} from './ui.js';
import {modelKey, buildLabel, clientLabel, duration, tokenCount} from './build-data.js';

const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const metrics = {
  total_tokens: 'Observed total tokens', input_tokens: 'Input tokens', output_tokens: 'Output tokens',
  cached_input_tokens: 'Cached input tokens', reasoning_output_tokens: 'Reasoning output tokens'
};
const processUrl = entry => './process.html?' + new URLSearchParams({case: entry.id});

export function mountSkillBuilds(skill, catalog) {
  const entries = skill.authoredCases.map(id => catalog.cases.find(entry => entry.id === id));
  const groups = new Map();
  for (const entry of entries) {
    const key = modelKey(entry.build);
    if (!groups.has(key)) groups.set(key, {label: buildLabel(entry.build), entries: []});
    groups.get(key).entries.push(entry);
  }
  const ordered = [...groups].sort(([a, x], [b, y]) => Number(a.startsWith('@')) - Number(b.startsWith('@')) || x.label.localeCompare(y.label));
  const filter = document.getElementById('build-model');
  filter.innerHTML = `<option value="all">All models (${entries.length})</option>` + ordered.map(([key, group]) => `<option value="${e(key)}">${e(group.label)} (${group.entries.length})</option>`).join('');
  const requested = new URLSearchParams(location.search).get('model');
  filter.value = groups.has(requested) ? requested : 'all';
  const renderCards = () => {
    const selected = filter.value === 'all' ? entries : groups.get(filter.value)?.entries || [];
    document.getElementById('authored-cases').innerHTML = selected.length ? selected.map(entry => caseCard(entry)).join('') : '<p class="build-empty">A verified playable example will appear here when it is published.</p>';
    document.getElementById('build-filter-count').textContent = `${selected.length} ${selected.length === 1 ? 'build' : 'builds'}`;
  };
  filter.addEventListener('change', () => {
    renderCards();
    const url = new URL(location.href);
    if (filter.value === 'all') url.searchParams.delete('model'); else url.searchParams.set('model', filter.value);
    history.replaceState(null, '', url);
  });
  renderCards();

  const host = document.getElementById('build-comparison');
  const clients = [...new Set(entries.map(entry => entry.build?.runtime).filter(Boolean))].sort();
  host.innerHTML = `<div class="build-comparison-heading"><div><h2>Build comparison</h2><p>Each bar is one published build of this skill.</p></div><label class="build-select-label">Client<select id="comparison-client"><option value="all">All clients</option>${clients.map(value => `<option value="${e(value)}">${e(clientLabel(value))}</option>`).join('')}</select></label></div>
    <div id="comparison-count" class="comparison-count" role="status"></div>
    <div class="build-charts"><section class="build-chart" aria-labelledby="time-chart-title"><div class="chart-heading"><h3 id="time-chart-title">Build wall time</h3><span>Minutes</span></div><div id="time-chart"></div></section>
    <section class="build-chart" aria-labelledby="token-chart-title"><div class="chart-heading"><h3 id="token-chart-title">Token usage</h3><label class="sr-only" for="comparison-metric">Token metric</label><select id="comparison-metric">${Object.entries(metrics).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></div><div id="token-chart"></div></section></div>
    <p class="chart-scope">Different maps and run conditions; this is a descriptive comparison, not a model ranking. Time includes tools and waiting. Tokens cover the recorded interval, not the full billed task. Cache and reasoning counts are included in their parent totals.</p>
    <details class="build-data-details"><summary>View exact build data <span id="build-data-count"></span></summary><div class="build-table-scroll"><table class="build-table"><caption class="sr-only">Recorded build metrics for this skill</caption><thead><tr><th scope="col">Build / model</th><th scope="col">Client</th><th scope="col">Wall time</th><th scope="col">Observed tokens</th><th scope="col">Usage</th><th scope="col">Explore</th></tr></thead><tbody id="build-table-body"></tbody></table></div></details>`;
  const renderChart = (target, rows, getValue, format, unit) => {
    const measured = rows.filter(entry => numeric(getValue(entry))), missing = rows.length - measured.length;
    const maximum = Math.max(0, ...measured.map(getValue));
    const scale = maximum || 1;
    target.innerHTML = measured.length ? `<div class="chart-axis"><span>0</span><span>${e(format(maximum))} ${unit}</span></div><ol class="chart-rows">${measured.map(entry => {
      const value = getValue(entry), label = `${entry.title} · ${buildLabel(entry.build)} · ${format(value)} ${unit}`;
      return `<li class="chart-row" data-case="${e(entry.id)}" data-value="${value}"><div class="chart-row-heading"><a href="${entry.process ? processUrl(entry) : playUrl(entry)}" title="${e(label)}">${e(entry.title)}</a><span>${e(format(value))}${unit === 'min' ? ' min' : ''}</span></div><div class="chart-track" role="img" aria-label="${e(label)}"><span style="width:${100 * value / scale}%"></span></div><div class="chart-row-caption">${e(buildLabel(entry.build))} <span>· ${e(clientLabel(entry.build?.runtime))}${entry.build?.usageStatus === 'partial' ? ' · Partial record' : ''}</span></div></li>`;
    }).join('')}</ol>` : '<p class="chart-empty">No recorded values for this selection.</p>';
    if (missing) target.insertAdjacentHTML('beforeend', `<p class="chart-missing">${missing} ${missing === 1 ? 'build has' : 'builds have'} no value provided; omitted from this chart.</p>`);
  };
  const renderComparison = () => {
    const client = document.getElementById('comparison-client').value;
    const rows = entries.filter(entry => client === 'all' || entry.build?.runtime === client)
      .sort((a, b) => buildLabel(a.build).localeCompare(buildLabel(b.build)) || a.title.localeCompare(b.title));
    const metric = document.getElementById('comparison-metric').value;
    const known = new Set(rows.filter(entry => entry.build?.attribution === 'single-model').map(entry => entry.build.model));
    document.getElementById('comparison-count').textContent = `${rows.length} published builds · ${known.size} identified ${known.size === 1 ? 'model' : 'models'} · Missing values stay “Not provided”`;
    renderChart(document.getElementById('time-chart'), rows, entry => entry.build?.elapsedMs, value => (value / 60000).toLocaleString('en-US', {maximumFractionDigits: 2}), 'min');
    renderChart(document.getElementById('token-chart'), rows, entry => entry.build?.tokens?.[metric], tokenCount, 'tokens');
    document.getElementById('token-chart').setAttribute('aria-label', metrics[metric]);
    document.getElementById('build-data-count').textContent = `(${rows.length})`;
    document.getElementById('build-table-body').innerHTML = rows.map(entry => `<tr><th scope="row"><span>${e(entry.title)}</span><span class="table-model">${e(buildLabel(entry.build))}</span></th><td>${e(clientLabel(entry.build?.runtime))}</td><td>${e(duration(entry.build?.elapsedMs))}</td><td>${tokenCount(entry.build?.tokens?.total_tokens)}</td><td>${e(entry.build?.usageStatus || 'unavailable')}</td><td>${entry.process ? `<a href="${processUrl(entry)}">Build process ↗</a>` : '<span class="muted">No process record</span>'}<a href="${playUrl(entry)}">Play ↗</a></td></tr>`).join('');
  };
  document.getElementById('comparison-client').addEventListener('change', renderComparison);
  document.getElementById('comparison-metric').addEventListener('change', renderComparison);
  renderComparison();
}
