const paths = {
  house: 'M3 11 12 3l9 8M5 10v11h14V10M10 21v-7h4v7M8 8V4H5v7',
  lumber: 'm12 2-7 10h4l-5 6h6v4h4v-4h6l-5-6h4L12 2Z',
  farm: 'M4 21V9m0 6 5-4M4 11l5-4M4 7l5-4M14 21V9m0 6 5-4m-5 0 5-4m-5 0 5-4',
  market: 'M3 9h18l-2-6H5L3 9Zm1 0v11h16V9M8 20v-7h8v7M3 9v2a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 2-2V9',
  well: 'M3 9 12 3l9 6M6 9v10m12-10v10M4 19h16v3H4v-3Zm8-10v6m-3-3h6v5H9v-5Z',
  church: 'M9 21V9l3-4 3 4v12M5 21V12h4m6 0h4v9M3 21h18M12 5V1m-2 2h4m-3 18v-5h2v5',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7.87a4 4 0 0 1 0 7.75',
  wood: 'm4 17 11-11a4 4 0 0 1 6 6L10 23M3 17a4 4 0 1 0 6 6 4 4 0 0 0-6-6Zm3 2 1 2',
  stone: 'm3 17 3-9 9-4 6 7-2 9H6l-3-3Zm3-9 6 5 9-2m-9 2-2 7m2-7 3-9',
  food: 'M12 22V6m0 9c-6 0-9-4-9-9 6 0 9 4 9 9Zm0-5c6 0 9-4 9-9-6 0-9 4-9 9Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  compass: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm0 7-3 6 6-3-3-3Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  pause: 'M8 5v14M16 5v14',
  play: 'm8 4 12 8-12 8V4Z',
  rotate: 'M20 8a8 8 0 1 0 0 8m0-14v6h-6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  close: 'm6 6 12 12M6 18 18 6',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8',
  load: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1M3 9h18l-3 11H3V9Zm9 2v6m-3-3 3 3 3-3',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  new: 'M12 3v18M3 12h18',
  check: 'm5 12 4 4L19 6',
  flag: 'M5 22V3m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  leaf: 'M20 4C8 2 2 8 5 15s15 4 15-11ZM4 21 15 10',
  sound: 'm11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'm11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m-5 0 5-6',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.house}"/></svg>`;
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const catalog = [
  { id: 'house', name: 'Vivienda', tag: 'HOGAR Y COMUNIDAD', description: 'Un refugio cálido para nuevas familias. Aloja a seis personas; si hay comida y bienestar, llegarán nuevos habitantes.', wood: 20, stone: 5, detail: '+6 plazas para habitantes', key: '1' },
  { id: 'lumber', name: 'Aserradero', tag: 'PRODUCCIÓN', description: 'Los habitantes trabajan la madera del valle. Su producción mantiene el crecimiento del pueblo y las reservas de leña para el invierno.', wood: 25, stone: 10, detail: 'Produce madera · 4 trabajadores', key: '2' },
  { id: 'farm', name: 'Granja', tag: 'ALIMENTACIÓN', description: 'La cosecha alimenta al pueblo. Produce más en verano y otoño; durante el invierno necesitarás las reservas del almacén.', wood: 15, stone: 5, detail: 'Producción estacional · 4 trabajadores', key: '3' },
  { id: 'market', name: 'Mercado', tag: 'COMERCIO', description: 'Un lugar de encuentro entre vecinos. Mejora el reparto de alimentos, reduce el desperdicio y aumenta el bienestar.', wood: 40, stone: 20, detail: 'Reduce el consumo de alimentos', key: '4' },
  { id: 'well', name: 'Pozo', tag: 'SERVICIOS', description: 'Agua limpia en el corazón del pueblo. Cada pozo cubre las necesidades de treinta habitantes y mejora la salud del asentamiento.', wood: 10, stone: 20, detail: 'Agua para 30 habitantes', key: '5' },
  { id: 'church', name: 'Iglesia', tag: 'COMUNIDAD', description: 'Un campanario sobre los tejados. La comunidad encuentra aquí un lugar de reunión que aumenta el bienestar y favorece la llegada de familias.', wood: 60, stone: 45, detail: 'Mejora el bienestar de la comunidad', key: '6' },
];
const landmarks = {
  townhall: { name: 'Casa del concejo', tag: 'EL CORAZÓN DEL VALLE', description: 'El lugar donde los vecinos se reúnen para decidir el futuro de Valle del Alba.', detail: 'Edificio del asentamiento', id: 'house' },
  storehouse: { name: 'Almacén comunal', tag: 'RESERVAS DEL PUEBLO', description: 'Las cosechas y los materiales esperan aquí al próximo invierno. Conserva una reserva de alimento y leña para los meses fríos.', detail: 'Cuida las reservas del pueblo', id: 'market' },
  warehouse: { name: 'Almacén comunal', tag: 'RESERVAS DEL PUEBLO', description: 'El pueblo reúne aquí sus provisiones para los meses fríos.', detail: 'Cuida las reservas del pueblo', id: 'market' },
  windmill: { name: 'Molino del valle', tag: 'PATRIMONIO DEL VALLE', description: 'Sus aspas acompañan la vida de los campos desde el comienzo del asentamiento.', detail: 'Hito del paisaje', id: 'farm' },
};

export function setupUI({ onBuild = () => {}, onSpeed = () => {}, onPause = () => {}, onReset = () => {}, onRotate = () => {}, onSave = () => {}, onLoad = () => {}, onNewGame, onHelp = () => {}, onSound = () => {} } = {}) {
  const root = document.createElement('div');
  root.id = 'town-ui';
  const utilityButtons = [['save', 'save', 'Guardar y descargar partida', 'Guardar'], ['load', 'load', 'Cargar partida desde archivo', 'Cargar'], ['rotate', 'rotate', 'Girar vista', 'Girar'], ['sound', 'muted', 'Activar sonido ambiental', 'Sonido'], ['help', 'help', 'Ayuda y controles', 'Ayuda'], ['new', 'new', 'Nueva partida', 'Nueva']];
  root.innerHTML = `
    <header class="topbar">
      <div class="brand"><span class="brand-emblem">${icon('lumber')}</span><div><div class="brand-name">LITTLE TOWN<span class="brand-dot">.</span></div><div class="brand-sub">UN NUEVO HOGAR EN EL VALLE</div></div></div>
      <div class="resources" aria-label="Recursos del pueblo">${[['people', 'population', 'Habitantes'], ['wood', 'wood', 'Madera'], ['stone', 'stone', 'Piedra'], ['food', 'food', 'Alimento']].map(([i, id, label]) => `<div class="resource" data-resource="${id}" title="${label}">${icon(i)}<div><div class="resource-number"><span class="resource-value" data-value="${id}">—</span>${id === 'population' ? '<span class="resource-capacity" data-value="capacity"></span>' : `<span class="resource-rate" data-rate="${id}"></span>`}</div><span class="resource-name">${label}</span></div></div>`).join('')}</div>
      <nav class="utility-controls" aria-label="Opciones del juego">${utilityButtons.map(([action, image, label, short]) => `<button class="utility-button" data-action="${action}" title="${label}" aria-label="${label}">${icon(image)}<span>${short}</span></button>`).join('')}</nav>
    </header>
    <section class="settlement-card panel" aria-label="Estado del asentamiento">
      <div class="eyebrow"><span class="live-dot"></span> TU ASENTAMIENTO</div>
      <h1>Valle del Alba</h1><p class="settlement-sub">Una aldea. Mil posibilidades.</p>
      <div class="settlement-divider"></div>
      <div class="wellbeing">${icon('heart')}<span>Bienestar</span><strong data-value="happiness">—</strong></div><div class="progress-track"><i id="happiness-fill"></i></div>
      <div class="employment" title="Los habitantes disponibles se reparten entre los puestos de trabajo"><span>${icon('people')} Trabajadores</span><strong data-value="employment">—</strong></div>
      <div class="goals-block"><div class="section-caption"><span>EL FUTURO DEL VALLE</span><span id="goal-count">0 / 4</span></div><div id="objectives"><div class="objective"><span class="objective-number">${icon('flag')}</span><div><strong>Echa raíces</strong><p>Construye hogares y prepara las reservas del pueblo.</p></div></div></div></div>
      <div class="chronicle" id="chronicle" hidden><div class="section-caption">VIDA EN EL PUEBLO</div><ol id="event-list"></ol></div>
    </section>
    <aside class="inspector panel" id="inspector" hidden aria-label="Información del edificio"></aside>
    <aside class="welcome-tip panel" id="welcome-tip" hidden><button class="welcome-close" title="Ocultar consejo" aria-label="Ocultar consejo de bienvenida">${icon('close')}</button><span class="eyebrow">EL COMIENZO DE TU HISTORIA</span><p>Cuida de los que llegan.<br>Construye pensando en el invierno.</p><button class="text-button" data-action="welcome-help">Conocer el valle ${icon('arrow')}</button></aside>
    <section class="build-dock" aria-label="Construcción"><div class="dock-heading"><span class="eyebrow">CONSTRUYE TU HISTORIA</span><span class="dock-help">Selecciona un edificio · <kbd>1</kbd>–<kbd>6</kbd></span></div><div class="build-row">${catalog.map(b => `<button class="build-tile" data-build="${b.id}" aria-label="Construir ${b.name}" title="${b.name}: ${b.wood} madera y ${b.stone} piedra"><span class="tile-key">${b.key}</span><span class="tile-icon">${icon(b.id)}</span><span class="tile-name">${b.name}</span><span class="tile-cost">${icon('wood')} ${b.wood} <span>·</span> ${icon('stone')} ${b.stone}</span></button>`).join('')}</div></section>
    <footer class="bottom-bar"><div class="date-control">${icon('sun')}<span data-value="season">Primavera</span><span class="date-dot">·</span><span>Año <b data-value="year">1</b></span><span class="season-progress" title="Avance de la estación"><i id="season-fill"></i></span></div><div class="controls-legend"><span><kbd>↔</kbd> Arrastrar: mover</span><span><kbd>DER</kbd> Girar</span><span><kbd>⌕</kbd> Zoom</span><span><kbd>ESPACIO</kbd> Pausa</span></div><div class="time-controls"><button class="pause-button" title="Pausar · Espacio" aria-label="Pausar">${icon('pause')}</button>${[1, 2, 4].map(n => `<button class="speed-button ${n === 1 ? 'active' : ''}" data-speed="${n}" title="Velocidad ${n}×" aria-label="Velocidad ${n}×">${n}×</button>`).join('')}</div></footer>
    <div class="toast" role="status" aria-live="polite" id="town-toast"></div>
    <div class="placement-hint" id="placement-hint" hidden><span class="live-dot"></span><span>Haz clic en terreno libre para construir</span><kbd>ESC</kbd><span>Cancelar</span></div>
    <div class="modal-backdrop" id="modal-backdrop" hidden></div>`;
  document.body.append(root);

  const inspector = root.querySelector('#inspector');
  const hint = root.querySelector('#placement-hint');
  const modal = root.querySelector('#modal-backdrop');
  const welcome = root.querySelector('#welcome-tip');
  let selected = null, inspected = null, toastTimer, lastPause = null, lastObjectives = '', lastEvents = '', focusBeforeModal = null;
  let welcomeDismissed = false;
  try { welcomeDismissed = localStorage.getItem('little-town-welcome-dismissed') === '1'; } catch { /* The game also works where storage is unavailable. */ }
  welcome.hidden = welcomeDismissed;
  function dismissWelcome() {
    welcomeDismissed = true;
    welcome.hidden = true;
    try { localStorage.setItem('little-town-welcome-dismissed', '1'); } catch { /* Optional preference. */ }
  }
  function renderInspector() {
    const building = catalog.find(b => b.id === selected);
    const info = inspected && (catalog.find(b => b.id === inspected.type) || landmarks[inspected.type]);
    const b = building || info;
    inspector.hidden = !b;
    hint.hidden = !building;
    welcome.hidden = welcomeDismissed || Boolean(b);
    if (!b) return;
    const placed = !building;
    inspector.innerHTML = `<div class="inspector-top"><span class="eyebrow">${placed ? 'EN TU ASENTAMIENTO' : b.tag}</span><button class="close-inspector" title="Cerrar información" aria-label="${placed ? 'Cerrar información del edificio' : 'Cancelar construcción'}">${icon('close')}</button></div><div class="inspector-art">${icon(b.id)}<span></span></div><h2>${escape(b.name)}</h2><p>${escape(b.description)}</p><div class="building-effect">${icon(placed ? 'check' : 'arrow')} ${escape(b.detail)}</div>${placed ? `<div class="inspector-price"><span>${escape(b.tag)}</span><p class="placed-caption">Forma parte de la vida del valle.</p></div>` : `<div class="inspector-price"><span>COSTE DE CONSTRUCCIÓN</span><div>${icon('wood')}<strong>${b.wood}</strong>${icon('stone')}<strong>${b.stone}</strong></div></div>`}<div class="inspector-footer">${placed ? 'Cada edificio tiene su historia' : 'Elige un lugar en el valle'} ${icon(placed ? 'leaf' : 'arrow')}</div>`;
    inspector.querySelector('.close-inspector').onclick = () => {
      inspected = null;
      if (selected) onBuild(null);
      else renderInspector();
    };
  }
  function selectBuilding(type) {
    selected = catalog.some(b => b.id === type) ? type : null;
    inspected = null;
    root.querySelectorAll('[data-build]').forEach(el => {
      const active = el.dataset.build === selected;
      el.classList.toggle('selected', active);
      el.setAttribute('aria-pressed', String(active));
    });
    renderInspector();
  }
  function inspectBuilding(info) {
    inspected = info && typeof info === 'object' ? info : null;
    if (selected) selectBuilding(null);
    inspected = info;
    renderInspector();
  }
  function closeModal() {
    modal.hidden = true;
    modal.innerHTML = '';
    focusBeforeModal?.focus?.();
  }
  function openModal(content) {
    focusBeforeModal = document.activeElement;
    modal.innerHTML = `<section class="game-dialog panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${content}</section>`;
    modal.hidden = false;
    modal.querySelector('[data-close]')?.addEventListener('click', closeModal);
    modal.querySelector('button')?.focus();
  }
  function openHelp() {
    dismissWelcome();
    onHelp();
    openModal(`<div class="dialog-top"><span class="eyebrow">BIENVENIDO A VALLE DEL ALBA</span><button class="dialog-close" data-close aria-label="Cerrar ayuda">${icon('close')}</button></div><h2 id="dialog-title">Un lugar al que llamar hogar.</h2><p class="dialog-intro">Construye con calma, cuida tus reservas y deja que el valle encuentre su ritmo.</p><div class="help-steps"><div><span>01</span><h3>Alimenta al pueblo</h3><p>Las granjas dan mejores cosechas en verano y otoño. Acumula comida antes del invierno.</p></div><div><span>02</span><h3>Da espacio a la vida</h3><p>Las viviendas ofrecen seis plazas. Si hay alimento y bienestar, llegarán nuevas familias.</p></div><div><span>03</span><h3>Piensa en mañana</h3><p>El aserradero repone madera. Pozos, mercados e iglesias cuidan el bienestar de todos.</p></div></div><div class="help-controls"><h3>Muévete por el valle</h3><dl><div><dt>Desplazar la cámara</dt><dd>Arrastrar con botón izquierdo</dd></div><div><dt>Girar la cámara</dt><dd>Arrastrar con botón derecho</dd></div><div><dt>Acercar y alejar</dt><dd>Rueda del ratón</dd></div><div><dt>Elegir edificio</dt><dd>Teclas <kbd>1</kbd> a <kbd>6</kbd></dd></div><div><dt>Cancelar construcción</dt><dd><kbd>Esc</kbd></dd></div><div><dt>Pausar el tiempo</dt><dd><kbd>Espacio</kbd></dd></div><div><dt>Guardar partida</dt><dd><kbd>Ctrl</kbd> + <kbd>S</kbd> o botón Guardar</dd></div></dl></div><div class="dialog-note">Al construir, la huella verde indica terreno disponible. Selecciona un edificio del pueblo para conocerlo.<br><br>La partida se guarda automáticamente en este navegador. <strong>Guardar</strong> descarga una copia del progreso; <strong>Cargar</strong> restaura una copia desde un archivo.</div><div class="help-footer"><button class="text-button" data-help-new>Nueva partida</button><button class="primary-button" data-start>Volver a mi pueblo ${icon('arrow')}</button></div>`);
    modal.querySelector('[data-start]').onclick = closeModal;
    modal.querySelector('[data-help-new]').onclick = confirmNewGame;
  }
  function confirmNewGame() {
    openModal(`<div class="dialog-top"><span class="eyebrow">UN NUEVO COMIENZO</span><button class="dialog-close" data-close aria-label="Cancelar nueva partida">${icon('close')}</button></div><div class="new-game-icon">${icon('leaf')}</div><h2 id="dialog-title">Otra historia en el valle.</h2><p class="dialog-intro">Empezarás con el poblado inicial. La partida guardada en este navegador se sustituirá por una nueva. Las copias que hayas descargado se conservarán.</p><div class="dialog-buttons"><button class="secondary-button" data-cancel>Seguir con mi pueblo</button><button class="primary-button" data-confirm>Empezar de nuevo</button></div>`);
    modal.querySelector('[data-cancel]').onclick = closeModal;
    modal.querySelector('[data-confirm]').onclick = () => { closeModal(); (onNewGame || onReset)(); };
  }
  root.querySelectorAll('[data-build]').forEach(el => el.onclick = () => onBuild(selected === el.dataset.build ? null : el.dataset.build));
  root.querySelectorAll('[data-speed]').forEach(el => el.onclick = () => onSpeed(Number(el.dataset.speed)));
  root.querySelector('.pause-button').onclick = () => onPause();
  root.querySelector('[data-action="save"]').onclick = () => onSave();
  root.querySelector('[data-action="load"]').onclick = () => onLoad();
  root.querySelector('[data-action="rotate"]').onclick = () => onRotate();
  root.querySelector('[data-action="sound"]').onclick = () => onSound();
  root.querySelector('[data-action="help"]').onclick = openHelp;
  root.querySelector('[data-action="welcome-help"]').onclick = openHelp;
  root.querySelector('[data-action="new"]').onclick = confirmNewGame;
  root.querySelector('.welcome-close').onclick = dismissWelcome;
  modal.addEventListener('pointerdown', event => { if (event.target === modal) closeModal(); });
  window.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeModal(); }
    if (event.code === 'Tab') {
      const focusable = [...modal.querySelectorAll('button, [href], input, [tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  function updateObjectives(objectives) {
    if (!Array.isArray(objectives)) return;
    const signature = JSON.stringify(objectives);
    if (signature === lastObjectives) return;
    lastObjectives = signature;
    const complete = objectives.filter(goal => goal.complete).length;
    root.querySelector('#goal-count').textContent = `${complete} / ${objectives.length}`;
    const current = objectives.find(goal => !goal.complete);
    if (!current) {
      root.querySelector('#objectives').innerHTML = `<div class="objective completed"><span class="objective-number">${icon('check')}</span><div><strong>El valle florece</strong><p>Has cumplido todos los objetivos. Sigue escribiendo la historia de tu pueblo.</p></div></div>`;
      return;
    }
    const index = objectives.indexOf(current);
    const target = Math.max(1, Number(current.target) || 1);
    const progress = Math.max(0, Math.min(target, Number(current.progress) || 0));
    root.querySelector('#objectives').innerHTML = `<div class="objective"><span class="objective-number">${String(index + 1).padStart(2, '0')}</span><div><strong>${escape(current.title)}</strong><p>${escape(current.description)}</p></div></div><div class="objective-progress"><span>${Math.floor(progress)} / ${target}</span><div><i style="width:${Math.min(100, progress / target * 100)}%"></i></div></div><div class="goal-markers" aria-label="${complete} de ${objectives.length} objetivos completados">${objectives.map(goal => `<span class="${goal.complete ? 'complete' : ''}" title="${escape(goal.title)}">${goal.complete ? icon('check') : ''}</span>`).join('')}</div>`;
  }
  function updateEvents(events) {
    if (!Array.isArray(events)) return;
    const recent = events.slice(-2).reverse();
    const signature = JSON.stringify(recent);
    if (signature === lastEvents) return;
    lastEvents = signature;
    root.querySelector('#chronicle').hidden = !recent.length;
    root.querySelector('#event-list').innerHTML = recent.map(event => `<li class="event-${escape(event.kind || 'info')}"><i></i><span>${escape(event.text)}</span></li>`).join('');
  }
  function update(state) {
    for (const key of ['population', 'wood', 'stone', 'food', 'year']) {
      const el = root.querySelector(`[data-value="${key}"]`);
      if (el && Number.isFinite(state[key])) el.textContent = Math.floor(state[key]).toLocaleString('es-ES');
    }
    root.querySelector('[data-value="capacity"]').textContent = Number.isFinite(state.capacity) ? ` / ${state.capacity}` : '';
    for (const [resource, rate] of [['wood', state.woodRate], ['stone', state.stoneRate], ['food', state.foodRate]]) {
      const el = root.querySelector(`[data-rate="${resource}"]`);
      if (!Number.isFinite(rate)) continue;
      const perMinute = Math.round(rate * 60);
      el.textContent = `${perMinute > 0 ? '+' : ''}${perMinute}`;
      el.classList.toggle('negative', perMinute < 0);
      root.querySelector(`[data-resource="${resource}"]`).title = `${resource === 'wood' ? 'Madera' : resource === 'stone' ? 'Piedra' : 'Alimento'}: ${perMinute > 0 ? '+' : ''}${perMinute} por minuto de simulación`;
    }
    const soundButton = root.querySelector('[data-action="sound"]');
    const soundEnabled = Boolean(state.soundsEnabled);
    if (soundButton.dataset.enabled !== String(soundEnabled)) {
      soundButton.dataset.enabled = String(soundEnabled);
      soundButton.setAttribute('aria-label', soundEnabled ? 'Desactivar sonido ambiental' : 'Activar sonido ambiental');
      soundButton.title = soundEnabled ? 'Desactivar sonido ambiental' : 'Activar sonido ambiental';
      soundButton.innerHTML = `${icon(soundEnabled ? 'sound' : 'muted')}<span>Sonido</span>`;
      soundButton.classList.toggle('active', soundEnabled);
    }
    if (state.season) root.querySelector('[data-value="season"]').textContent = state.season;
    if (Number.isFinite(state.seasonProgress)) root.querySelector('#season-fill').style.width = `${Math.max(0, Math.min(1, state.seasonProgress)) * 100}%`;
    if (Number.isFinite(state.happiness)) {
      root.querySelector('[data-value="happiness"]').textContent = `${Math.round(state.happiness)}%`;
      root.querySelector('#happiness-fill').style.width = `${Math.max(0, Math.min(100, state.happiness))}%`;
    }
    if (Number.isFinite(state.workers) && Number.isFinite(state.employed)) root.querySelector('[data-value="employment"]').textContent = `${Math.floor(state.employed)} / ${Math.floor(state.workers)}`;
    root.querySelectorAll('[data-speed]').forEach(el => {
      const active = Number(el.dataset.speed) === state.speed && !state.paused;
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
    });
    root.querySelectorAll('[data-build]').forEach(el => {
      const b = catalog.find(building => building.id === el.dataset.build);
      el.classList.toggle('unaffordable', state.wood < b.wood || state.stone < b.stone);
    });
    if (lastPause !== state.paused) {
      const button = root.querySelector('.pause-button');
      button.innerHTML = icon(state.paused ? 'play' : 'pause');
      button.classList.toggle('active', Boolean(state.paused));
      button.setAttribute('aria-label', state.paused ? 'Continuar' : 'Pausar');
      button.title = `${state.paused ? 'Continuar' : 'Pausar'} · Espacio`;
      lastPause = state.paused;
    }
    if ('selected' in state && state.selected !== selected) selectBuilding(state.selected);
    updateObjectives(state.objectives);
    updateEvents(state.events);
  }
  function notify(message) {
    const toast = root.querySelector('#town-toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4400);
  }
  return { update, notify, selectBuilding, inspectBuilding, openHelp, closeModal, isModalOpen: () => !modal.hidden };
}
