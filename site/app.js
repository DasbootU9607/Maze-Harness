import { mountSkillBuilds } from './skill-builds.js';
import { mountHomeBuilds, mountSkillDirectory } from './home-builds.js';
import { loadCatalog, shell, installCopy, atlas, caseCard, playUrl, escapeHtml, showError } from './ui.js';
const page = document.body.dataset.page;
shell(page);
installCopy();
try {
  const catalog = await loadCatalog();
  const counts = { skills: catalog.skills.length, references: catalog.rooms.filter(r => r.skill).length, remaining: catalog.rooms.filter(r => !r.skill).length };
  document.querySelectorAll('[data-count]').forEach(el => { el.textContent = String(counts[el.dataset.count]).padStart(Number(el.dataset.pad) || 1, '0'); });
  const getCase = id => catalog.cases.find(c => c.id === id);
  if (page === 'home') {
    document.getElementById('featured-cases').innerHTML = ['official-hxh', 'authored-boundary-stagger'].map(id => {
      const c = getCase(id);
      return `<a class="feature-case" href="${playUrl(c)}"><div class="feature-case-image"><img src="./${c.thumbnail}" alt="3D preview of ${c.title}" width="360" height="250" fetchpriority="high"></div><div class="case-info"><span class="case-kicker">${c.kind === 'official' ? '01 / OFFICIAL REFERENCE' : '02 / BUILT WITH THE SKILL'}</span><h3>${c.title}</h3><span class="play-link">Play this room</span></div></a>`;
    }).join('');
    mountSkillDirectory(catalog);
    mountHomeBuilds(catalog);
    document.getElementById('home-atlas').innerHTML = atlas(catalog);
  }
  if (page === 'skill') {
    const id = new URLSearchParams(location.search).get('id') || 'boundary-stagger';
    const skill = catalog.skills.find(s => s.id === id);
    if (!skill) throw new Error('That skill is not in the library. Choose a mechanism skill from the library.');
    document.title = skill.name + ' — Maze Harness';
    document.getElementById('skill-sidebar').innerHTML = `<div class="eyebrow">MECHANISM SKILLS</div>${catalog.skills.map(s => `<a href="./skill.html?id=${s.id}"${s.id === id ? ' class="active" aria-current="page"' : ''}>${s.name}</a>`).join('')}<div class="sidebar-divider"></div><a class="sidebar-extra" href="./world.html">World map <span class="muted">↗</span></a><a class="sidebar-extra" href="./player.html">Full maze <span class="muted">↗</span></a><a class="sidebar-extra" href="${skill.source}">Read SKILL.md <span class="muted">↗</span></a>`;
    const command = 'npx skills add DasbootU9607/Maze-Harness --skill mazebench-' + skill.id;
    const next = catalog.skills[(catalog.skills.indexOf(skill) + 1) % catalog.skills.length];
    document.getElementById('main').innerHTML = `<div class="breadcrumb"><a href="./index.html#skills">Skills</a><span>/</span>${skill.id}</div><section class="skill-intro"><div class="eyebrow">MAZEBENCH / MECHANISM 0${catalog.skills.indexOf(skill) + 1}</div><h1>${skill.name}</h1><p class="skill-description">${skill.description}</p><div class="skill-meta">${skill.rooms.map(r => `<a class="room-chip" href="./player.html?world=maze&room=${r}">${r} ↗</a>`).join('')}<a class="text-link" href="${skill.source}/SKILL.md">Read the skill ↗</a></div></section><div class="mechanism-steps">${skill.steps.map((s,i) => `<div class="mechanism-step"><span class="mono">0${i + 1}</span><span>${s}</span></div>`).join('')}</div><section id="build-comparison" class="build-comparison" aria-label="Compare model builds"></section><div class="comparison-grid"><section class="case-section"><div class="section-line"><h2>Official reference${skill.officialCases.length > 1 ? 's' : ''}</h2><span>THE SOURCE</span></div><p class="reference-caption">Original MazeBench rooms<span>Source geometry used by this skill</span></p><div class="stacked-cases">${skill.officialCases.map(id => caseCard(getCase(id))).join('')}</div></section><section class="case-section"><div class="section-line"><h2>Built with the skill</h2><span id="build-filter-count" role="status"></span></div><div class="build-filter"><label for="build-model">Built with which model</label><select id="build-model" aria-controls="authored-cases"><option value="all">All models</option></select></div><div id="authored-cases" class="stacked-cases"></div><p class="comparison-note">Agent-authored geometry, built by invoking this skill and replayed with the MazeBench engine.</p></section></div><p class="evidence-note">Saved routes are playable examples, not claims of shortest solutions or human difficulty. Official rooms retain their original geometry.</p><section class="skill-install"><h2>Build your own room.</h2><p>Install the complete skill package, then ask your agent to design a puzzle using this mechanism.</p><div class="command"><span class="muted" aria-hidden="true">$</span><code>${command}</code><button class="icon-button" data-copy="${command}" aria-label="Copy ${skill.name} install command">⧉</button></div><p class="evidence-note">Authoring uses a separate MazeBenchEngine checkout. <a class="text-link" href="${catalog.repository}#install">Setup instructions ↗</a></p></section><div class="skill-next"><a class="text-link" href="./skill.html?id=${next.id}">Next: ${next.name} →</a></div>`;
  }
  if (page === 'skill') mountSkillBuilds(catalog.skills.find(s => s.id === (new URLSearchParams(location.search).get('id') || 'boundary-stagger')), catalog);
  if (page === 'world') {
    document.getElementById('world-atlas').innerHTML = atlas(catalog);
    document.getElementById('reference-list').innerHTML = catalog.skills.flatMap(s => s.rooms.map(room => `<a class="reference-link" href="./skill.html?id=${s.id}"><span class="room-chip">${room}</span><span>${s.name}</span><span class="arrow">↗</span></a>`)).join('');
    document.querySelectorAll('[data-atlas-filter]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-atlas-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
      document.querySelector('#world-atlas .atlas-grid').classList.toggle('filter-used', button.dataset.atlasFilter === 'used');
    }));
    document.getElementById('atlas-zoom').addEventListener('click', event => {
      const zoomed = document.getElementById('world-atlas').classList.toggle('zoomed');
      event.currentTarget.textContent = zoomed ? 'Zoom −' : 'Zoom +';
      event.currentTarget.setAttribute('aria-pressed', String(zoomed));
    });
    for (const tile of document.querySelectorAll('#world-atlas [data-room]')) {
      for (const event of ['mouseenter','focus']) tile.addEventListener(event, () => { document.getElementById('atlas-hover').textContent = tile.dataset.room; });
    }
  }
} catch (error) { showError(error); }
