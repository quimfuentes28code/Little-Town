import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld } from './world.js';
import { createAtmosphere } from './atmosphere.js';
import { createAmbience } from './audio.js';
import { setupUI } from './ui.js';
import { createSimulation, BUILDINGS } from './simulation.js';
import './style.css';

const STORAGE_KEY = 'little-town.save.v2';
const INITIAL_BUILDINGS = { house: 6, lumber: 1, farm: 2, market: 1, well: 1, church: 1 };
const canvas = document.querySelector('#world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  document.body.innerHTML = '<main style="font:18px/1.7 system-ui;color:#eee8d3;background:#24382c;min-height:100vh;display:grid;place-content:center;padding:40px"><h1>El valle necesita WebGL 2</h1><p>Abre Little Town en una versión actual de Chrome o Edge con la aceleración gráfica activada.</p></main>';
  throw new Error('WebGL 2 no está disponible.');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c3cfbd');
scene.fog = new THREE.Fog('#c3cfbd', 100, 235);
const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 500);
camera.position.set(65, 64, 76);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 25;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.46;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
const hemisphere = new THREE.HemisphereLight('#e5efdf', '#526342', 1.5);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight('#fff0cc', 2.8);
sun.position.set(-35, 65, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 190 });
sun.shadow.normalBias = 0.055;
sun.shadow.bias = -0.0001;
scene.add(sun);
const ambience = createAmbience();
const atmosphere = createAtmosphere(THREE, scene, { sun, hemisphere });
let world = createWorld(THREE, scene);
let sim = createSimulation();
let selected = null;
let elapsed = 0;
let ui;
let autoSaveClock = 0;
let hasPointer = false;
let point = new THREE.Vector3();
let valid = false;
let placementReason = '';
const lastPointer = { clientX: innerWidth / 2, clientY: innerHeight / 2 };

function notify(message) { ui?.notify(message); }
function clearSelection() {
  selected = null;
  sim.state.selected = null;
  hasPointer = false;
  ui?.selectBuilding(null);
  ui?.inspectBuilding?.(null);
}
function selectBuilding(type) {
  selected = selected === type ? null : type;
  sim.state.selected = selected;
  ui.selectBuilding(selected);
  hasPointer = false;
  if (selected) notify(`${BUILDINGS[type].name}: busca terreno libre. Esc para cancelar.`);
}
function getSaveData() {
  return {
    version: 2,
    simulation: sim.exportSave(),
    layout: world.getPlacedBuildings(),
    camera: { position: camera.position.toArray(), target: controls.target.toArray() },
    elapsed,
    savedAt: new Date().toISOString(),
  };
}
function downloadSave(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Little-Town-partida-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function saveGame({ download = false, silent = false } = {}) {
  let data;
  try { data = getSaveData(); } catch {
    const message = 'No se ha podido guardar la partida. Conserva la sesión abierta y vuelve a intentarlo.';
    if (!silent) notify(message);
    return { ok: false, message };
  }
  let stored = false;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); stored = true; } catch { /* File mode may restrict local storage. */ }
  if (download) downloadSave(data);
  const ok = stored || download;
  const message = download ? 'Partida descargada. Puedes recuperarla con Cargar.'
    : stored ? 'Partida guardada en este navegador.'
      : 'Este navegador no permite guardado local. Usa Guardar para descargar una copia.';
  if (!silent) notify(message);
  return { ok, message };
}
function loadGame(data) {
  let candidateWorld;
  try {
    if (data === undefined) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ok: false, message: 'No hay una partida guardada en este navegador.' };
      data = JSON.parse(stored);
    }
    if (!data || data.version !== 2 || !Array.isArray(data.layout) || data.layout.length > 500
      || !Number.isFinite(data.elapsed) || data.elapsed < 0 || data.elapsed > 1e10) throw new Error('Formato de partida no válido.');
    const candidateSim = createSimulation();
    const restored = candidateSim.importSave(data.simulation);
    if (!restored.ok) throw new Error(restored.message);
    const counts = { ...INITIAL_BUILDINGS };
    for (const item of data.layout) {
      if (!item || !Object.hasOwn(BUILDINGS, item.type) || !Number.isFinite(item.x) || !Number.isFinite(item.z)
        || Math.abs(item.x) > 55 || Math.abs(item.z) > 55 || !Number.isInteger(item.x / 3) || !Number.isInteger(item.z / 3)) {
        throw new Error('El plano de la partida contiene una construcción no válida.');
      }
      counts[item.type]++;
    }
    if (Object.keys(counts).some(type => counts[type] !== candidateSim.state.buildings[type])) {
      throw new Error('El plano y los edificios de la partida no coinciden.');
    }
    if (data.camera !== undefined) {
      for (const key of ['position', 'target']) {
        const value = data.camera?.[key];
        if (!Array.isArray(value) || value.length !== 3 || value.some(n => !Number.isFinite(n) || Math.abs(n) > 1000)) {
          throw new Error('La cámara de la partida no es válida.');
        }
      }
      const position = new THREE.Vector3().fromArray(data.camera.position);
      const target = new THREE.Vector3().fromArray(data.camera.target);
      if (position.distanceTo(target) < 10 || position.y < 2) throw new Error('La cámara está fuera del valle.');
    }
    candidateWorld = createWorld(THREE, scene);
    for (const item of data.layout) {
      const validation = candidateWorld.validatePlacement(item.type, item.x, item.z);
      if (!validation.ok) throw new Error('La partida contiene edificios que se solapan o invaden terreno protegido.');
      candidateWorld.placeBuilding(item.type, item.x, item.z, { instant: true });
    }
    world.dispose();
    world = candidateWorld;
    candidateWorld = null;
    sim = candidateSim;
    elapsed = data.elapsed;
    if (data.camera) {
      camera.position.fromArray(data.camera.position);
      controls.target.fromArray(data.camera.target);
      controls.update();
    }
    clearSelection();
    autoSaveClock = 0;
    ui?.update(sim.state);
    return { ok: true, message: 'Partida recuperada. El valle te esperaba.' };
  } catch (error) {
    candidateWorld?.dispose();
    return { ok: false, message: `No se pudo cargar la partida: ${error.message}` };
  }
}
function newGame() {
  const freshWorld = createWorld(THREE, scene);
  world.dispose();
  world = freshWorld;
  sim = createSimulation();
  elapsed = 0;
  autoSaveClock = 0;
  camera.position.set(65, 64, 76);
  controls.target.set(0, 1, 0);
  controls.update();
  clearSelection();
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Export remains available. */ }
  notify('Un nuevo comienzo en el Valle del Alba.');
  ui?.update(sim.state);
  return { ok: true };
}
const importer = document.createElement('input');
importer.type = 'file'; importer.accept = '.json,application/json'; importer.hidden = true;
document.body.append(importer);
importer.addEventListener('change', async () => {
  const file = importer.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { notify('El archivo de partida es demasiado grande.'); importer.value = ''; return; }
  try {
    const result = loadGame(JSON.parse(await file.text()));
    notify(result.message);
    if (result.ok) saveGame({ silent: true });
  } catch { notify('El archivo no contiene una partida JSON válida.'); }
  importer.value = '';
});
ui = setupUI({
  onBuild: selectBuilding,
  async onSound() { sim.state.soundsEnabled = await ambience.toggle(); ui.update(sim.state); notify(sim.state.soundsEnabled ? 'Sonido ambiental activado.' : 'Sonido ambiental desactivado o no disponible.'); },
  onSpeed(n) { sim.setSpeed(n); ui.update(sim.state); },
  onPause() { sim.togglePause(); ui.update(sim.state); },
  onSave() { saveGame({ download: true }); },
  onLoad() { importer.click(); },
  onNewGame: newGame,
  onReset: newGame,
  onRotate() {
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    camera.position.copy(controls.target).add(offset);
  },
});

const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ghost = new THREE.Group();
const footprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#cfe2a3', transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide }));
footprint.rotation.x = -Math.PI / 2;
const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.15, 1)), new THREE.LineBasicMaterial({ color: '#cfe2a3', transparent: true, opacity: 0.85 }));
ghost.add(footprint, border); ghost.visible = false; scene.add(ghost);
const grid = new THREE.GridHelper(108, 36, '#d3d4a0', '#aaa98a');
grid.position.y = 0.08; grid.material.transparent = true; grid.material.opacity = 0.17; grid.material.depthWrite = false;
grid.visible = false; scene.add(grid);
const sizes = { house: 6, lumber: 7, farm: 11, market: 6, well: 4, church: 11 };
function isPlacementValid(type, x, z) { return world.validatePlacement(type, x, z).ok; }
function locate(event) {
  lastPointer.clientX = event.clientX; lastPointer.clientY = event.clientY;
  mouse.set(event.clientX / innerWidth * 2 - 1, -event.clientY / innerHeight * 2 + 1);
  ray.setFromCamera(mouse, camera);
  if (!ray.ray.intersectPlane(groundPlane, point)) { hasPointer = false; return; }
  hasPointer = true;
  point.x = Math.round(point.x / 3) * 3;
  point.z = Math.round(point.z / 3) * 3;
  if (!selected) return;
  const result = world.validatePlacement(selected, point.x, point.z);
  valid = result.ok;
  placementReason = result.reason || 'Busca terreno libre, lejos de caminos, cultivos y árboles.';
  const blueprint = BUILDINGS[selected];
  const affordable = sim.state.wood >= blueprint.wood && sim.state.stone >= blueprint.stone;
  const color = valid && affordable ? '#d6eda1' : '#ee957e';
  footprint.material.color.set(color); border.material.color.set(color);
  ghost.position.set(point.x, 0.15, point.z);
  const size = sizes[selected] || 6;
  ghost.scale.set(size, 1, size);
}
function pickBuilding() {
  let closest = null, distance = Infinity;
  const hit = new THREE.Vector3();
  const box = new THREE.Box3();
  const heights = { house: 6.5, lumber: 6.5, farm: 1, market: 3.5, well: 3.5, church: 14, townhall: 10, storehouse: 8, windmill: 12 };
  for (const item of world.buildings) {
    const radius = item.radius || 3.2;
    const width = item.footprint?.w || radius * 2;
    const depth = item.footprint?.d || radius * 2;
    box.min.set(item.x - width / 2, 0, item.z - depth / 2);
    box.max.set(item.x + width / 2, heights[item.type] || 7, item.z + depth / 2);
    if (ray.ray.intersectBox(box, hit)) {
      const candidateDistance = ray.ray.origin.distanceToSquared(hit);
      if (candidateDistance < distance) { distance = candidateDistance; closest = item; }
    }
  }
  return closest;
}
canvas.addEventListener('pointermove', event => { if (selected) locate(event); });
let down;
canvas.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointerup', event => {
  if (event.button !== 0 || !down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5 || ui.isModalOpen?.()) return;
  locate(event);
  if (!hasPointer) return;
  if (selected) {
    if (!valid) { notify(placementReason); return; }
    const result = sim.build(selected);
    if (result.ok) {
      world.placeBuilding(selected, point.x, point.z);
      saveGame({ silent: true });
      locate(event);
    }
    notify(result.message);
  } else {
    const building = pickBuilding();
    if (building) {
      const blueprint = BUILDINGS[building.type];
      const landmarks = { townhall: 'Casa del concejo', storehouse: 'Almacén comunal', windmill: 'Molino del valle' };
      ui.inspectBuilding?.({ ...building, name: blueprint?.name || landmarks[building.type] || 'Edificio del valle', description: blueprint?.description || 'Un lugar que forma parte de la historia del poblado.' });
    } else ui.inspectBuilding?.(null);
  }
  ui.update(sim.state);
});
window.addEventListener('keydown', event => {
  if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') { event.preventDefault(); saveGame({ download: true }); return; }
  if (ui.isModalOpen?.()) { if (event.code === 'Escape') ui.closeModal?.(); return; }
  if (event.code === 'Escape') clearSelection();
  if (event.code === 'Space') { event.preventDefault(); sim.togglePause(); ui.update(sim.state); }
  if (/^Digit[1-6]$/.test(event.code)) selectBuilding(Object.keys(BUILDINGS)[Number(event.code.slice(-1)) - 1]);
  if (event.code === 'KeyH') ui.openHelp?.();
});
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.addEventListener('beforeunload', () => saveGame({ silent: true }));
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); sim.state.paused = true; notify('Se ha perdido el contexto gráfico. Guarda tu partida y vuelve a abrir el juego.'); });

const restored = loadGame();
if (restored.ok) notify(restored.message);
let last = performance.now();
let uiClock = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.1));
  last = now;
  const simulationDt = sim.state.paused ? 0 : dt * sim.state.speed;
  elapsed += simulationDt;
  sim.update(dt);
  const report = atmosphere.update(simulationDt, sim.state, elapsed);
  sim.state.soundsEnabled = ambience.enabled;
  ambience.update(dt, { daylight: report?.daylight ?? 1, season: sim.state.season, paused: sim.state.paused });
  sim.state.timeLabel = report?.timeLabel || atmosphere.getTimeLabel?.();
  world.update(simulationDt, elapsed, { ...sim.state, daylight: report?.daylight ?? 1 });
  controls.update();
  const clamped = controls.target.clone(); clamped.x = THREE.MathUtils.clamp(clamped.x, -55, 55); clamped.z = THREE.MathUtils.clamp(clamped.z, -55, 55);
  camera.position.add(clamped.clone().sub(controls.target)); controls.target.copy(clamped);
  ghost.visible = Boolean(selected) && hasPointer;
  grid.visible = Boolean(selected);
  if (selected && hasPointer) locate(lastPointer);
  uiClock += dt; autoSaveClock += dt;
  if (uiClock > 0.25) { ui.update(sim.state); uiClock = 0; }
  if (autoSaveClock > 15) { saveGame({ silent: true }); autoSaveClock = 0; }
  renderer.render(scene, camera);
}
ui.update(sim.state);
requestAnimationFrame(frame);
window.__littleTown = {
  get sim() { return sim; }, get world() { return world; }, renderer, scene, camera,
  saveGame, loadGame, newGame, getSaveData, isPlacementValid,
  setVisualTime(seconds) { if (Number.isFinite(seconds) && seconds >= 0) elapsed = seconds; },
};
