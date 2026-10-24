import {escapeHtml as e, caseCard, playUrl} from './ui.js';
import {modelKey, buildLabel, configurationLabel, effortLabel, attributionLabel, modelColor, clientLabel, duration, tokenCount} from './build-data.js';
import {downloadBuilds} from './build-downloads.js';

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
  host.innerHTML = `<div class="build-comparison-heading"><div><h2>Build ladder</h2><p>Model + reasoning setting · one row per build</p></div><label class="build-select-label">Client<select id="comparison-client"><option value="all">All clients</option>${clients.map(value => `<option value="${e(value)}">${e(clientLabel(value))}</option>`).join('')}</select></label></div>
    <div class="ladder-toolbar"><div class="ladder-tabs" aria-label="Comparison metric"><button type="button" data-ladder-view="time" aria-pressed="true">Build time</button><button type="button" data-ladder-view="tokens" aria-pressed="false">Token usage</button></div><div class="build-downloads"><button type="button" data-build-download="csv">CSV ↓</button><button type="button" data-build-download="json">JSON ↓</button></div></div>
    <div id="comparison-count" class="comparison-count" role="status"></div>
    <div class="build-charts"><section class="build-chart" data-ladder-panel="time" aria-labelledby="time-chart-title"><div class="chart-heading"><h3 id="time-chart-title">Build wall time</h3><span>Lowest recorded time first · minutes</span></div><div id="time-chart"></div></section>
    <section class="build-chart" data-ladder-panel="tokens" hidden aria-labelledby="token-chart-title"><div class="chart-heading"><h3 id="token-chart-title">Token usage</h3><label class="sr-only" for="comparison-metric">Token metric</label><select id="comparison-metric">${Object.entries(metrics).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></div><div id="token-chart"></div></section></div>
    <p class="chart-scope">Ranked by recorded resource use, lowest first. Different maps and run conditions; these positions do not measure model ability or puzzle quality. Time includes tools and waiting. Tokens cover the recorded interval, not the full billed task. Cache and reasoning counts are included in their parent totals.</p><p id="build-download-status" role="status"></p>
    <details class="build-data-details"><summary>View exact build data <span id="build-data-count"></span></summary><div class="build-table-scroll"><table class="build-table"><caption class="sr-only">Recorded build metrics for this skill</caption><thead><tr><th scope="col">Build / model</th><th scope="col">Client</th><th scope="col">Wall time</th><th scope="col">Observed tokens</th><th scope="col">Usage</th><th scope="col">Explore</th></tr></thead><tbody id="build-table-body"></tbody></table></div></details>`;
  const renderChart = (target, rows, getValue, format, unit) => {
    const measured = rows.filter(entry => numeric(getValue(entry))).sort((a,b) => getValue(a)-getValue(b) || configurationLabel(a.build).localeCompare(configurationLabel(b.build)) || a.title.localeCompare(b.title)), missing = rows.length - measured.length;
    const maximum = Math.max(0, ...measured.map(getValue));
    const scale = maximum || 1;
    let rank=0;
    target.innerHTML = measured.length ? `<ol class="chart-rows ladder-rows">${measured.map((entry,index) => {
      const value = getValue(entry), label = `${entry.title} · ${configurationLabel(entry.build)} · ${format(value)} ${unit}`;
      if(index===0 || value!==getValue(measured[index-1])) rank=index+1;
      return `<li class="chart-row ladder-row" data-case="${e(entry.id)}" data-value="${value}" style="--model-color:${modelColor(entry.build)}"><span class="ladder-rank" aria-label="Position ${rank}">${String(rank).padStart(2,'0')}</span><div class="ladder-content"><div class="chart-row-heading"><a href="${entry.process ? processUrl(entry) : playUrl(entry)}" title="${e(label)}">${e(buildLabel(entry.build))} <span class="effort-badge">${e(effortLabel(entry.build))}</span></a><span>${e(format(value))}${unit === 'min' ? ' min' : ''}</span></div><div class="chart-row-caption">${e(entry.title)} <span>· ${e(clientLabel(entry.build?.runtime))}${entry.build?.usageStatus === 'partial' ? ' · Partial record' : ''}</span></div><div class="chart-track" role="img" aria-label="${e(label)}"><span style="width:${100 * value / scale}%"></span></div><div class="ladder-attribution">${e(attributionLabel(entry.build))}</div></div></li>`;
    }).join('')}</ol>` : '<p class="chart-empty">No recorded values for this selection.</p>';
    if (missing) target.insertAdjacentHTML('beforeend', `<p class="chart-missing">${missing} ${missing === 1 ? 'build has' : 'builds have'} no value provided; omitted from this chart.</p>`);
  };
  const renderComparison = () => {
    const client = document.getElementById('comparison-client').value;
    const rows = entries.filter(entry => client === 'all' || entry.build?.runtime === client)
      .sort((a, b) => buildLabel(a.build).localeCompare(buildLabel(b.build)) || a.title.localeCompare(b.title));
    const metric = document.getElementById('comparison-metric').value;
    const known = new Set(rows.filter(entry => entry.build?.attribution === 'single-model').map(entry => entry.build.model));
    document.getElementById('comparison-count').textContent = `${rows.length} published builds · ${known.size} ${known.size === 1 ? 'model' : 'models'} · Missing measurements are not ranked`;
    renderChart(document.getElementById('time-chart'), rows, entry => entry.build?.elapsedMs, value => (value / 60000).toLocaleString('en-US', {maximumFractionDigits: 2}), 'min');
    renderChart(document.getElementById('token-chart'), rows, entry => entry.build?.tokens?.[metric], tokenCount, 'tokens');
    document.getElementById('token-chart').setAttribute('aria-label', metrics[metric]);
    document.getElementById('build-data-count').textContent = `(${rows.length})`;
    document.getElementById('build-table-body').innerHTML = rows.map(entry => `<tr><th scope="row"><span>${e(entry.title)}</span><span class="table-model">${e(configurationLabel(entry.build))}</span><span class="table-model">${e(attributionLabel(entry.build))}</span></th><td>${e(clientLabel(entry.build?.runtime))}</td><td>${e(duration(entry.build?.elapsedMs))}</td><td>${tokenCount(entry.build?.tokens?.total_tokens)}</td><td>${e(entry.build?.usageStatus || 'unavailable')}</td><td>${entry.process ? `<a href="${processUrl(entry)}">Build process ↗</a>` : '<span class="muted">No process record</span>'}<a href="${playUrl(entry)}">Play ↗</a></td></tr>`).join('');
  };
  document.getElementById('comparison-client').addEventListener('change', renderComparison);
  document.getElementById('comparison-metric').addEventListener('change', renderComparison);
  host.querySelectorAll('[data-ladder-view]').forEach(button=>button.addEventListener('click',()=>{
    host.querySelectorAll('[data-ladder-view]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    host.querySelectorAll('[data-ladder-panel]').forEach(panel=>panel.hidden=panel.dataset.ladderPanel!==button.dataset.ladderView);
  }));
  host.querySelectorAll('[data-build-download]').forEach(button=>button.addEventListener('click',async()=>{
    const status=document.getElementById('build-download-status'),client=document.getElementById('comparison-client').value;
    const rows=entries.filter(entry=>client==='all'||entry.build?.runtime===client);
    status.textContent='Preparing data…';
    try {
      const processes=new Map(await Promise.all(rows.filter(entry=>entry.process).map(async entry=>{
        const response=await fetch('./'+entry.process.data);if(!response.ok)throw new Error('Process data unavailable');return [entry.id,await response.json()];
      })));
      downloadBuilds(rows,{format:button.dataset.buildDownload,name:skill.id+'-builds',processes});status.textContent='';
    } catch {status.textContent='Unable to load the public records. Please try again.';}
  }));
  renderComparison();
}
