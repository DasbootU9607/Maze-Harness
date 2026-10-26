import {escapeHtml as e} from './ui.js';
import {buildLabel, effortLabel, configurationLabel, modelColor, clientLabel, duration, tokenCount} from './build-data.js';
import {authoredBuilds, homeSummary, rankedGroups} from './home-build-data.js';
import {buildDataset, downloadBuilds} from './build-downloads.js';

export function mountHomeBuilds(catalog) {
  const entries = authoredBuilds(catalog.cases), all = homeSummary(entries);
  document.getElementById('home-build-totals').innerHTML = `<div class="totals-heading"><span class="eyebrow">BUILD OBSERVATORY / ALL PUBLISHED BUILDS</span><a href="#leaderboard">Compare models ↓</a></div><div class="total-metrics"><div><span>Summed build time</span><strong data-total="time" data-value="${all.time.total ?? ''}">${duration(all.time.total)}</strong><small>${all.time.measured} recorded intervals · tools and waiting included</small></div><div><span>Observed tokens</span><strong data-total="tokens" data-value="${all.tokens.total ?? ''}">${tokenCount(all.tokens.total)}</strong><small>${all.tokens.measured} recorded intervals · cached tokens included</small></div><div><span>Published builds</span><strong data-total="builds">${all.publishedBuilds}<span class="total-secondary"> / ${catalog.skills.length} skills</span></strong><small>${all.publishedBuilds - all.tokens.measured} builds without token values</small></div></div>`;
  const host = document.getElementById('leaderboard');
  const clients = [...new Set(entries.map(entry => clientLabel(entry.build?.runtime)))].sort();
  host.innerHTML = `<div class="section-heading"><div><div class="eyebrow">MEASURED RESOURCES</div><h2 id="leaderboard-title">Build leaderboard.</h2><p class="leaderboard-subtitle">Recorded time and tokens, grouped by model and reasoning setting.</p></div><span class="leaderboard-mark mono" aria-hidden="true">↗</span></div>
    <div class="home-board-controls"><div class="home-metric-tabs" aria-label="Leaderboard metric"><button type="button" data-home-metric="time" aria-pressed="true">Build time</button><button type="button" data-home-metric="tokens" aria-pressed="false">Token usage</button></div><div class="home-board-filters"><label>Skill<select id="home-skill"><option value="all">All skills</option>${catalog.skills.map(skill => `<option value="${e(skill.id)}">${e(skill.name)}</option>`).join('')}</select></label><label>Client<select id="home-client"><option value="all">All clients</option>${clients.map(client => `<option>${e(client)}</option>`).join('')}</select></label><label>Measure<select id="home-statistic"><option value="total">Total recorded</option><option value="average">Average per build</option></select></label></div></div>
    <div class="home-board-heading"><span id="home-board-caption" role="status"></span><div class="home-downloads"><button type="button" data-home-download="csv">Builds CSV ↓</button><button type="button" data-home-download="json">Summary JSON ↓</button></div></div><div id="home-board-chart"></div><div id="home-board-missing" class="home-board-missing"></div><p class="home-board-scope">Lower recorded use first; these are not model-quality scores. Build counts and skills differ. Totals sum recorded intervals, including tools and waiting; parallel runs overlap in calendar time. Tokens are observed usage, not complete billing totals. Missing values are excluded, never replaced with zero.</p><p id="home-download-status" role="status"></p>`;
  let metric = 'time';
  const selected = () => entries.filter(entry => (document.getElementById('home-skill').value === 'all' || entry.skill === document.getElementById('home-skill').value) && (document.getElementById('home-client').value === 'all' || clientLabel(entry.build?.runtime) === document.getElementById('home-client').value));
  function render() {
    const summary = homeSummary(selected()), statistic = document.getElementById('home-statistic').value, rows = rankedGroups(summary, metric, statistic);
    const maximum = Math.max(1, ...rows.map(row => row[metric][statistic]));
    const format = value => metric === 'time' ? duration(value) : statistic === 'average' ? value.toLocaleString('en-US', {maximumFractionDigits: 1}) : tokenCount(value);
    document.getElementById('home-board-caption').textContent = `${summary[metric].measured} recorded intervals / ${summary.publishedBuilds} builds · ${statistic === 'average' ? 'Average per measured build' : 'Total recorded ' + (metric === 'time' ? 'time' : 'tokens')}`;
    let rank = 0;
    document.getElementById('home-board-chart').innerHTML = rows.length ? `<ol class="home-ladder">${rows.map((row, i) => {
      const value = row[metric][statistic], coverage = row[metric], skills = new Set(row.entries.map(entry => entry.skill));
      if (!i || value !== rows[i - 1][metric][statistic]) rank = i + 1;
      return `<li class="home-ladder-row" data-model="${e(row.build?.model || 'unknown')}" data-effort="${e(effortLabel(row.build))}" data-value="${value}" style="--model-color:${modelColor(row.build)}"><span class="home-rank" aria-label="Position ${rank}">${String(rank).padStart(2, '0')}</span><div class="home-ladder-content"><div class="home-row-top"><span class="home-model">${e(buildLabel(row.build))}<span class="home-effort">${e(effortLabel(row.build))}</span></span><strong>${e(format(value))}</strong></div><div class="home-bar" role="img" aria-label="${e(configurationLabel(row.build))}: ${e(format(value))}"><span style="width:${100 * value / maximum}%"></span></div><div class="home-row-bottom"><span>${coverage.measured} measured / ${row.entries.length} builds · ${skills.size} ${skills.size === 1 ? 'skill' : 'skills'}</span></div></div></li>`;
    }).join('')}</ol>` : '<p class="home-board-empty">No recorded values for this selection.</p>';
    const unmeasured = summary.groups.filter(row => !row[metric].measured);
    document.getElementById('home-board-missing').innerHTML = unmeasured.length ? `<span>Not ranked · values not provided</span>${unmeasured.map(row => `<span class="missing-model">${e(configurationLabel(row.build))} <small>${row.entries.length} builds</small></span>`).join('')}` : '';
  }
  host.querySelectorAll('[data-home-metric]').forEach(button => button.addEventListener('click', () => {
    metric = button.dataset.homeMetric;
    host.querySelectorAll('[data-home-metric]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); render();
  }));
  host.querySelectorAll('select').forEach(select => select.addEventListener('change', render));
  host.querySelectorAll('[data-home-download]').forEach(button => button.addEventListener('click', () => {
    const rows = selected();
    if (button.dataset.homeDownload === 'csv') downloadBuilds(rows, {format: 'csv', name: 'maze-harness-builds'});
    else {
      const summary = homeSummary(rows), dataset = {...buildDataset(rows), summary: {...summary, groups: summary.groups.map(({entries, ...row}) => ({...row, caseIds: entries.map(entry => entry.id)}))}};
      const url = URL.createObjectURL(new Blob([JSON.stringify(dataset, null, 2) + '\n'], {type: 'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = 'maze-harness-summary.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    document.getElementById('home-download-status').textContent = `Downloaded data for ${rows.length} published builds.`;
  }));
  render();
}
