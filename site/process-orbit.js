const kinds = { resource: 'Read', candidate: 'Version', note: 'Design note', operation: 'Operation', test: 'Test', replay: 'Replay', delivery: 'Delivery', record: 'Record' };
const statuses = { passed: 'Passed', failed: 'Failed', error: 'Error', unknown: 'Unknown' };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}
function button(id, className, label) {
  const node = element('button', className, label); node.id = id; node.type = 'button'; return node;
}
function svgNode(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

/** A view of recorded order; no causal edges or invented intermediate events. */
export function createOrbitTimeline({ container, getData, onSelect, onDetails }) {
  const timeline = element('section', 'orbit-timeline'); timeline.id = 'process-orbit'; timeline.setAttribute('aria-labelledby', 'orbit-title');
  const header = element('header', 'orbit-header'), heading = element('div', 'orbit-heading');
  const title = element('h2', '', 'Build timeline'); title.id = 'orbit-title'; heading.append(title);
  const headerActions = element('div', 'orbit-header-actions'), modeLabel = element('label', 'orbit-mode-label', 'Show');
  const mode = element('select'); mode.id = 'orbit-mode'; mode.setAttribute('aria-label', 'Events to show');
  const keysOption = element('option', '', 'Key events'), allOption = element('option', '', 'All records'); keysOption.value = 'keys'; allOption.value = 'all'; mode.append(keysOption, allOption); modeLabel.append(mode);
  headerActions.append(modeLabel); header.append(heading, headerActions);

  const stage = element('div', 'orbit-stage'); stage.tabIndex = 0; stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'Recorded events on a curved timeline. Scroll, drag, or use the arrow keys to select an event.');
  const track = svgNode('svg', { class: 'orbit-track', 'aria-hidden': 'true', focusable: 'false' });
  const circle = svgNode('circle', { class: 'orbit-track-circle' }); track.append(circle);
  const eventLayer = element('div', 'orbit-events');
  const empty = element('p', 'orbit-empty', 'No events were published for this record.'); empty.hidden = true;
  const topFade = element('div', 'orbit-fade orbit-fade-top'), bottomFade = element('div', 'orbit-fade orbit-fade-bottom'); topFade.setAttribute('aria-hidden', 'true'); bottomFade.setAttribute('aria-hidden', 'true');
  stage.append(track, eventLayer, empty, topFade, bottomFade);

  const footer = element('footer', 'orbit-footer'), navigation = element('div', 'orbit-navigation');
  const previous = button('orbit-prev', 'orbit-step', '\u2191'), next = button('orbit-next', 'orbit-step', '\u2193'); previous.setAttribute('aria-label', 'Previous event'); next.setAttribute('aria-label', 'Next event');
  const positionCopy = element('span', 'orbit-count'); positionCopy.id = 'orbit-count';
  const scrubber = element('div', 'orbit-scrubber'), range = element('input'); range.id = 'orbit-position'; range.type = 'range'; range.min = '0'; range.step = '1';
  const progressLabel = element('label', 'orbit-progress-label', 'Timeline progress'); progressLabel.htmlFor = range.id;
  const markers = element('div', 'orbit-markers'); markers.id = 'orbit-markers'; markers.setAttribute('role', 'group'); markers.setAttribute('aria-label', 'Jump to a key event');
  const markerTooltip = element('div', 'orbit-marker-tooltip'); markerTooltip.id = 'orbit-marker-tooltip'; markerTooltip.setAttribute('role', 'tooltip'); markerTooltip.hidden = true;
  const hint = element('p', 'orbit-hint', 'Scroll or drag to browse \u00b7 Arrow keys to step');
  scrubber.append(progressLabel, markers, range); navigation.append(previous, next, positionCopy);
  const details = button('orbit-view-details', 'orbit-details', 'View event details');
  const detailsArrow = element('span', '', '\u2197'); detailsArrow.setAttribute('aria-hidden', 'true'); details.append(detailsArrow);
  details.hidden = typeof onDetails !== 'function';
  const footerTop = element('div', 'orbit-footer-top'); footerTop.append(navigation, hint, details); footer.append(footerTop, scrubber);
  const live = element('span', 'orbit-sr-only'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  timeline.append(header, stage, footer, live); container.replaceChildren(timeline);
  document.body.append(markerTooltip);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { all: [], events: [], selectedId: null, selectedIndex: 0, position: 0, target: 0, frame: 0, lastTime: 0, snapTimer: null, dragging: null, suppressClickUntil: 0, items: new Map(), markers: [], tooltipTarget: null };
  let geometry = { width: 1, height: 1, radius: 600, centerX: -360, centerY: 1, step: .2, row: 132, leader: 64, cardWidth: 500, cardHeight: 116, visibleAngle: .5 };

  function hideMarkerTooltip() { markerTooltip.hidden = true; state.tooltipTarget = null; }
  function showMarkerTooltip(marker) {
    if (!marker?.isConnected) return hideMarkerTooltip();
    state.tooltipTarget = marker; markerTooltip.textContent = marker.dataset.label; markerTooltip.hidden = false;
    // Fixed offsets use local CSS units, whereas client rectangles include any
    // inherited CSS zoom. Preserve the enlarged text and convert the position.
    const initialBox = markerTooltip.getBoundingClientRect(), cssWidth = Number.parseFloat(getComputedStyle(markerTooltip).width);
    const scale = cssWidth > 0 ? initialBox.width / cssWidth : 1;
    const margin = 8;
    markerTooltip.style.maxWidth = `${Math.min(360, (innerWidth - 2 * margin) / scale)}px`;
    const rect = marker.getBoundingClientRect(), box = markerTooltip.getBoundingClientRect();
    const left = clamp(rect.left + rect.width / 2 - box.width / 2, margin, Math.max(margin, innerWidth - box.width - margin));
    const top = rect.top - box.height - 10 >= margin ? rect.top - box.height - 10 : Math.min(innerHeight - box.height - margin, rect.bottom + 10);
    markerTooltip.style.left = `${left / scale}px`; markerTooltip.style.top = `${Math.max(margin, top) / scale}px`;
  }
  function layoutMarkers() {
    const width = range.clientWidth, thumb = 18, lanes = [];
    for (const marker of state.markers) {
      const position = state.events.length > 1 ? Number(marker.dataset.index) / (state.events.length - 1) : 0;
      const x = thumb / 2 + position * Math.max(0, width - thumb);
      // Keep each 24px hit target independent, including adjacent initial reads.
      let lane = lanes.findIndex(lastX => x - lastX >= 26);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = x; marker.dataset.position = String(position); marker.dataset.lane = String(lane);
      marker.style.left = `${x}px`; marker.style.top = `${lane * 24}px`;
    }
    markers.style.height = `${lanes.length * 24}px`; markers.hidden = !state.markers.length;
    for (const marker of state.markers) marker.style.setProperty('--orbit-marker-stem', `${(lanes.length - Number(marker.dataset.lane) - 1) * 24 + 12}px`);
    if (state.tooltipTarget) showMarkerTooltip(state.tooltipTarget);
  }
  function makeMarkers() {
    hideMarkerTooltip(); markers.replaceChildren(); state.markers = [];
    state.events.forEach((event, index) => {
      if (!event.isKey) return;
      const marker = element('button', 'orbit-key-marker'); marker.type = 'button';
      const sourceName = event.kind === 'resource' ? String(event.summary || '').split(' \u00b7 ')[0] : '';
      const label = sourceName && /^(Read reference material|Save source snapshot)$/.test(event.label) ? `${event.label} \u00b7 ${sourceName}` : event.label || 'Recorded event';
      marker.dataset.eventId = event.id; marker.dataset.index = String(index); marker.dataset.label = label; marker.dataset.kind = kinds[event.kind] ? event.kind : 'record';
      marker.setAttribute('aria-label', `Jump to event ${event.ordinal ?? index + 1}: ${label}`); marker.setAttribute('aria-describedby', markerTooltip.id);
      const dot = element('span', 'orbit-key-marker-dot'); dot.setAttribute('aria-hidden', 'true'); marker.append(dot);
      marker.addEventListener('pointerenter', () => showMarkerTooltip(marker)); marker.addEventListener('pointerleave', () => { if (document.activeElement !== marker) hideMarkerTooltip(); });
      marker.addEventListener('focus', () => showMarkerTooltip(marker)); marker.addEventListener('blur', hideMarkerTooltip);
      marker.addEventListener('click', () => go(index));
      state.markers.push(marker); markers.append(marker);
    });
    layoutMarkers();
  }

  function current() { return state.events[state.selectedIndex]; }
  function updateSelection(index, notify = true) {
    index = clamp(Math.round(index), 0, Math.max(0, state.events.length - 1));
    const selected = state.events[index], changed = state.selectedId !== selected?.id;
    state.selectedIndex = index; state.selectedId = selected?.id || null;
    timeline.dataset.selectedId = state.selectedId || ''; timeline.dataset.currentIndex = String(index); timeline.dataset.eventCount = String(state.events.length);
    range.max = String(Math.max(0, state.events.length - 1)); range.value = String(index); range.disabled = !selected;
    range.style.setProperty('--orbit-progress', `${state.events.length > 1 ? index / (state.events.length - 1) * 100 : 0}%`);
    range.setAttribute('aria-valuetext', selected ? `${index + 1} of ${state.events.length}: ${selected.label}` : 'No events');
    positionCopy.textContent = `${selected ? String(index + 1).padStart(2, '0') : '0'} / ${state.events.length}`;
    previous.disabled = !selected || index === 0; next.disabled = !selected || index === state.events.length - 1; details.disabled = !selected;
    for (const marker of state.markers) { const active = marker.dataset.eventId === state.selectedId; marker.setAttribute('aria-pressed', String(active)); if (active) marker.setAttribute('aria-current', 'step'); else marker.removeAttribute('aria-current'); }
    if (changed && selected) {
      live.textContent = `Event ${selected.ordinal ?? index + 1}: ${selected.label}`;
      if (notify) onSelect?.(selected.id);
    }
  }
  function makeEvent(event) {
    const wrapper = element('div', 'orbit-event'); wrapper.dataset.eventId = event.id; wrapper.dataset.kind = kinds[event.kind] ? event.kind : 'record';
    const point = element('button', 'orbit-event-point', String(event.ordinal ?? state.all.indexOf(event) + 1).padStart(2, '0')); point.type = 'button'; point.setAttribute('aria-label', `Select event ${event.ordinal ?? ''}: ${event.label}`);
    const connector = element('span', 'orbit-event-connector'); connector.setAttribute('aria-hidden', 'true');
    const card = element('button', 'orbit-event-card'); card.type = 'button';
    const meta = element('span', 'orbit-event-meta'), category = element('span', 'orbit-event-kind', event.category || kinds[event.kind] || 'Record');
    meta.append(category);
    const status = event.statusLabel ?? statuses[event.status];
    if (status) meta.append(element('span', 'orbit-event-status', status));
    const label = element('span', 'orbit-event-label', event.label || 'Recorded event');
    const summary = element('span', 'orbit-event-summary', event.summary || ''); summary.hidden = !event.summary;
    card.append(meta, label, summary); wrapper.append(point, connector, card);
    const select = activation => {
      if (activation.detail !== 0 && performance.now() < state.suppressClickUntil) return;
      const index = state.events.findIndex(item => item.id === event.id); if (index !== -1) go(index);
    };
    point.addEventListener('click', select); card.addEventListener('click', select);
    state.items.set(event.id, wrapper); eventLayer.append(wrapper); return wrapper;
  }
  function render() {
    if (!timeline.isConnected) return;
    const { width, height, radius, centerX, centerY, step, leader, cardWidth, cardHeight, visibleAngle } = geometry;
    track.setAttribute('viewBox', `0 0 ${width} ${height}`); circle.setAttribute('cx', String(centerX)); circle.setAttribute('cy', String(centerY)); circle.setAttribute('r', String(radius));
    const visible = new Set(), center = Math.round(state.position);
    // Keep the DOM bounded, including for long raw-record histories.
    const windowSize = Math.ceil(visibleAngle / step) + 1;
    for (let index = Math.max(0, center - windowSize); index <= Math.min(state.events.length - 1, center + windowSize); index++) {
      const event = state.events[index], angle = (index - state.position) * step;
      const x = centerX + radius * Math.cos(angle), y = centerY + radius * Math.sin(angle);
      if (y < -cardHeight / 2 || y > height + cardHeight / 2 || Math.abs(angle) >= Math.PI / 2) continue;
      visible.add(event.id); const item = state.items.get(event.id) || makeEvent(event);
      item.style.transform = `translate(${x.toFixed(3)}px, ${y.toFixed(3)}px)`;
      item.style.setProperty('--orbit-leader', `${leader}px`); item.style.setProperty('--orbit-card-width', `${cardWidth}px`);
      item.dataset.index = String(index); item.dataset.angle = angle.toFixed(6);
      const selected = index === state.selectedIndex; item.classList.toggle('is-selected', selected);
      if (selected) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      const point = item.querySelector('.orbit-event-point'), card = item.querySelector('.orbit-event-card');
      point.setAttribute('aria-pressed', String(selected)); card.setAttribute('aria-pressed', String(selected));
      point.tabIndex = card.tabIndex = y >= cardHeight / 2 + 4 && y <= height - cardHeight / 2 - 4 ? 0 : -1;
    }
    for (const [id, item] of state.items) if (!visible.has(id)) {
      if (item.contains(document.activeElement)) stage.focus({ preventScroll: true });
      item.remove(); state.items.delete(id);
    }
    const focused = document.activeElement;
    const ordered = [...state.items.values()].sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
    ordered.forEach((item, index) => { if (eventLayer.children[index] !== item) eventLayer.insertBefore(item, eventLayer.children[index] || null); });
    if (focused?.isConnected && eventLayer.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
    empty.hidden = Boolean(state.events.length);
  }
  function measure() {
    if (!timeline.isConnected) return;
    const width = stage.clientWidth, height = stage.clientHeight, mobile = width <= 640;
    const radius = Math.max(mobile ? 900 : 520, height * (mobile ? 1.7 : 1.05));
    const arcX = mobile ? 52 : clamp(width * .19, 115, 165), leader = mobile ? 28 : 42;
    // Measure layout pixels, so browser/CSS zoom does not scale the spacing twice.
    const sample = state.items.values().next().value?.querySelector('.orbit-event-card');
    const cardHeight = sample?.offsetHeight || Number.parseFloat(getComputedStyle(timeline).getPropertyValue('--orbit-card-height')) || 116;
    const gap = 14, visibleAngle = Math.asin(clamp((height / 2 + cardHeight / 2) / radius, 0, .95));
    // The smallest projected gap is at the visible arc edges. This bound also
    // holds between fractional animation positions and partially clipped cards.
    const step = 2 * Math.asin(clamp((cardHeight + gap) / (2 * radius * Math.cos(visibleAngle)), 0, .95));
    geometry = { width, height, radius, centerX: arcX - radius, centerY: height / 2, step, row: radius * Math.sin(step), leader, cardWidth: Math.max(140, width - arcX - leader - (mobile ? 16 : 24)), cardHeight, visibleAngle };
    layoutMarkers();
    render();
  }
  function animate(time) {
    state.frame = 0; if (!timeline.isConnected) return;
    const elapsed = state.lastTime ? Math.min(64, time - state.lastTime) : 16; state.lastTime = time;
    const difference = state.target - state.position;
    state.position = reducedMotion.matches || Math.abs(difference) < .001 ? state.target : state.position + difference * (1 - Math.exp(-elapsed / 76));
    render();
    const moving = Math.abs(state.target - state.position) >= .001 || state.snapTimer !== null || Boolean(state.dragging?.moved);
    stage.dataset.animating = String(moving);
    if (moving) state.frame = requestAnimationFrame(animate); else state.lastTime = 0;
  }
  function requestRender() { stage.dataset.animating = 'true'; if (!state.frame) state.frame = requestAnimationFrame(animate); }
  function cancelSnap() { if (state.snapTimer !== null) clearTimeout(state.snapTimer); state.snapTimer = null; }
  function go(position, { continuous = false } = {}) {
    cancelSnap(); state.target = clamp(position, 0, Math.max(0, state.events.length - 1)); updateSelection(state.target);
    if (continuous) state.snapTimer = setTimeout(() => { state.snapTimer = null; state.target = Math.round(state.target); updateSelection(state.target); requestRender(); }, 140);
    requestRender();
  }
  function chooseMode(value, selectedId = state.selectedId, notify = true) {
    const keyEvents = state.all.filter(event => event.isKey);
    mode.value = value === 'keys' && keyEvents.length ? 'keys' : 'all';
    state.events = mode.value === 'keys' ? keyEvents : state.all;
    let index = state.events.findIndex(event => event.id === selectedId);
    if (index < 0) {
      const order = new Map(state.all.map((event, i) => [event.id, i])), original = order.get(selectedId) ?? 0;
      let distance = Infinity; index = 0;
      state.events.forEach((event, i) => { const delta = Math.abs(order.get(event.id) - original); if (delta < distance) { index = i; distance = delta; } });
    }
    cancelSnap(); makeMarkers(); updateSelection(Math.max(0, index), notify); state.position = state.target = state.selectedIndex;
    for (const item of state.items.values()) item.remove(); state.items.clear();
    stage.dataset.animating = 'false'; measure();
  }
  function select(id, { focus = false } = {}) {
    const event = state.all.find(item => item.id === id); if (!event) return;
    if (state.selectedId !== id) {
      cancelSnap(); if (state.frame) cancelAnimationFrame(state.frame); state.frame = 0; state.lastTime = 0;
      const drag = state.dragging; state.dragging = null; if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
      stage.classList.remove('is-dragging');
      if (mode.value === 'keys' && !event.isKey) chooseMode('all', id, false);
      else { const index = state.events.findIndex(item => item.id === id); updateSelection(index, false); state.position = state.target = index; render(); }
      stage.dataset.animating = 'false';
    }
    if (focus) (state.items.get(id)?.querySelector('.orbit-event-card') || stage).focus({ preventScroll: true });
  }

  details.addEventListener('click', () => { const event = current(); if (event) onDetails?.(event.id); });
  mode.addEventListener('change', () => chooseMode(mode.value));
  previous.addEventListener('click', () => go(state.selectedIndex - 1)); next.addEventListener('click', () => go(state.selectedIndex + 1));
  range.addEventListener('input', () => go(Number(range.value)));
  timeline.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !markerTooltip.hidden) { hideMarkerTooltip(); event.preventDefault(); return; }
    if (event.target.matches('input,select') || event.ctrlKey || event.metaKey || event.altKey) return;
    const index = { ArrowDown: state.selectedIndex + 1, ArrowRight: state.selectedIndex + 1, ArrowUp: state.selectedIndex - 1, ArrowLeft: state.selectedIndex - 1, PageDown: state.selectedIndex + 5, PageUp: state.selectedIndex - 5, Home: 0, End: state.events.length - 1 }[event.key];
    if (index === undefined) return; event.preventDefault(); go(index);
  });
  stage.addEventListener('wheel', event => {
    if (event.ctrlKey) return; event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? geometry.height : 1;
    go(state.target + (event.deltaY || event.deltaX) * unit / geometry.row, { continuous: true });
  }, { passive: false });
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    state.suppressClickUntil = 0;
    cancelSnap(); state.dragging = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, position: state.target, eventId: event.target.closest?.('.orbit-event')?.dataset.eventId, moved: false, distance: 0 };
  });
  stage.addEventListener('pointermove', event => {
    const drag = state.dragging; if (!drag || drag.id !== event.pointerId) return;
    const delta = drag.y - event.clientY;
    drag.distance = Math.max(drag.distance, Math.hypot(event.clientX - drag.x, delta));
    if (!drag.moved && Math.abs(delta) < 5) return;
    if (!drag.moved) { drag.moved = true; stage.setPointerCapture(event.pointerId); stage.classList.add('is-dragging'); }
    event.preventDefault(); go(drag.position + delta / geometry.row);
  });
  const endDrag = event => {
    const drag = state.dragging; if (!drag || drag.id !== event.pointerId) return;
    state.dragging = null; stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (drag.moved) { state.suppressClickUntil = performance.now() + 200; go(Math.round(state.target)); }
    // A captured touch sequence may not produce a compatibility click. Complete
    // a stationary tap directly, suppressing any duplicate click from that tap.
    else if (event.type === 'pointerup' && ['touch', 'pen'].includes(drag.type)) {
      const distance = Math.max(drag.distance, Math.hypot(event.clientX - drag.x, event.clientY - drag.y));
      const eventId = event.target.closest?.('.orbit-event')?.dataset.eventId;
      if (distance <= 8 && drag.eventId && eventId === drag.eventId) {
        state.suppressClickUntil = performance.now() + 200;
        const index = state.events.findIndex(item => item.id === eventId); if (index !== -1) go(index);
      }
    }
  };
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', event => { if (event.target === stage) endDrag(event); });
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', () => { if (state.dragging) endDrag({ pointerId: state.dragging.id }); });
  window.addEventListener('scroll', () => {
    const marker = state.tooltipTarget, rect = marker?.getBoundingClientRect();
    if (marker && rect.bottom > 0 && rect.top < innerHeight && (marker.matches(':hover') || document.activeElement === marker)) showMarkerTooltip(marker);
    else hideMarkerTooltip();
  }, { capture: true, passive: true });
  new ResizeObserver(measure).observe(stage);
  reducedMotion.addEventListener('change', () => { if (timeline.isConnected) requestRender(); });
  const data = getData?.() || {}, seen = new Set();
  state.all = (Array.isArray(data.events) ? data.events : []).filter(event => event && typeof event.id === 'string' && !seen.has(event.id) && seen.add(event.id));
  const keyCount = state.all.filter(event => event.isKey).length;
  keysOption.textContent = `Key events (${keyCount})`; keysOption.disabled = !keyCount; allOption.textContent = `All records (${state.all.length})`;
  const initial = state.all.find(event => event.id === data.selectedId);
  measure(); chooseMode(initial && !initial.isKey ? 'all' : 'keys', data.selectedId, false);
  return { select };
}
