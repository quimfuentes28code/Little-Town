import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appURL = process.env.APP_URL || 'http://127.0.0.1:5173';
const storageKey = 'little-town.save.v2';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    offline: process.env.OFFLINE === '1',
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  if (process.env.HTML_PATH) {
    await page.setContent(await readFile(process.env.HTML_PATH, 'utf8'), { waitUntil: 'load' });
  } else {
    await page.goto(appURL);
  }
  await page.waitForFunction(() => window.__littleTown?.getSaveData && window.__littleTown.renderer.info.render.calls > 0);
  await page.evaluate(() => {
    const app = window.__littleTown;
    for (const name of ['saveGame', 'loadGame', 'newGame', 'getSaveData', 'isPlacementValid']) {
      if (typeof app[name] !== 'function') throw new Error(`Missing app API: ${name}`);
    }
  });

  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__littleTown.sim.state.paused), true, 'Pause UI must stop the simulation.');
  await page.getByRole('button', { name: 'Ayuda y controles', exact: true }).click();
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  await page.keyboard.press('Digit2');
  assert.equal(await page.evaluate(() => window.__littleTown.sim.state.selected), null, 'Build shortcuts must not trigger behind a modal.');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')), true, 'Help keeps keyboard focus within the modal.');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  results.push('pause button, help modal, focus containment and shortcut blocking');
  await page.getByRole('button', { name: 'Velocidad 1×', exact: true }).click();
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => window.__littleTown.sim.state.paused), false, 'Space resumes even after a toolbar button retains focus.');
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => window.__littleTown.sim.state.paused), true, 'Space pauses again without activating the focused toolbar button.');
  const churchScreen = await page.evaluate(() => {
    const app=window.__littleTown;
    const church=app.world.buildings.find(b=>b.type==='church');
    const v=app.camera.position.clone().set(church.x,8,church.z).project(app.camera);
    return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};
  });
  await page.mouse.click(churchScreen.x,churchScreen.y);
  await page.waitForFunction(()=>document.querySelector('#inspector h2')?.textContent==='Iglesia');
  await page.keyboard.press('Escape');
  results.push('global Space after toolbar focus and tall-roof building inspection');

  if (await page.evaluate(() => Boolean(window.AudioContext || window.webkitAudioContext))) {
    await page.getByRole('button', { name: 'Activar sonido ambiental', exact: true }).click();
    await page.waitForFunction(() => window.__littleTown.sim.state.soundsEnabled === true);
    await page.getByRole('button', { name: 'Desactivar sonido ambiental', exact: true }).click();
    await page.waitForFunction(() => window.__littleTown.sim.state.soundsEnabled === false);
    results.push('ambient sound toggles on and off through actual UI');
  } else {
    results.push('ambient sound unrun: browser does not expose Web Audio');
  }

  const snapshot = () => page.evaluate(() => {
    const { sim, world } = window.__littleTown;
    const { population, wood, stone, food, happiness, year, season, paused, speed, buildings } = sim.state;
    return { population, wood, stone, food, happiness, year, season, paused, speed, buildings: { ...buildings }, layout: world.getPlacedBuildings() };
  });
  const beforePause = await snapshot();
  await page.waitForTimeout(400);
  assert.deepEqual(await snapshot(), beforePause, 'Pause must preserve all economy and layout state.');
  results.push('pause freezes economy');

  async function buildHouse() {
    const before = await snapshot();
    await page.getByRole('button', { name: 'Construir Vivienda', exact: true }).click();
    const location = await page.evaluate(() => {
      const app = window.__littleTown;
      const candidates = [];
      for (let x = -42; x <= 42; x += 3) {
        for (let z = -42; z <= 42; z += 3) {
          if (!app.isPlacementValid('house', x, z)) continue;
          const vector = app.camera.position.clone().set(x, 0, z).project(app.camera);
          const px = (vector.x + 1) * innerWidth / 2;
          const py = (1 - vector.y) * innerHeight / 2;
          if (vector.z < -1 || vector.z > 1 || px < 280 || px > innerWidth - 280 || py < 270 || py > innerHeight - 240) continue;
          if (document.elementFromPoint(px, py)?.tagName !== 'CANVAS') continue;
          candidates.push({ x, z, px, py, distance: Math.hypot(px - innerWidth / 2, py - innerHeight / 2) });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      return candidates[0] || null;
    });
    assert.ok(location, 'A valid visible house placement must exist in the initial camera view.');
    await page.mouse.click(location.px, location.py);
    await page.waitForFunction(expected => window.__littleTown.world.getPlacedBuildings().length === expected, before.layout.length + 1);
    const after = await snapshot();
    assert.equal(after.wood, before.wood - 20, 'Actual UI construction must debit exactly 20 wood.');
    assert.equal(after.stone, before.stone - 5, 'Actual UI construction must debit exactly 5 stone.');
    assert.equal(after.buildings.house, before.buildings.house + 1, 'UI construction must update housing simulation.');
    assert.equal(after.layout.length, before.layout.length + 1, 'UI construction must add exactly one world record.');
    await page.keyboard.press('Escape');
    return after;
  }

  const firstBuild = await buildHouse();
  results.push('actual UI building and exact costs');
  const saveResult = await page.evaluate(() => window.__littleTown.saveGame());
  if (!process.env.HTML_PATH) assert.equal(saveResult.ok, true, saveResult.message);
  else assert.equal(typeof saveResult.ok, 'boolean', 'Opaque-origin saves must return a handled result.');
  const saved = await page.evaluate(() => window.__littleTown.getSaveData());
  assert.equal(saved.version, 2);
  assert.equal(saved.layout.length, firstBuild.layout.length);
  assert.ok(saved.simulation && saved.camera && Number.isFinite(saved.elapsed));
  assert.ok(saved.elapsed >= 0, `Saved visual clock must never be negative: ${saved.elapsed}`);
  results.push('versioned save includes simulation, layout, camera and visual time');

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Guardar y descargar partida', exact: true }).click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /^Little-Town-partida-.*\.json$/);
  const downloadedSave = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(downloadedSave.version, 2);
  assert.deepEqual(downloadedSave.layout, saved.layout);
  assert.deepEqual(downloadedSave.simulation, saved.simulation);
  results.push('Save UI downloads a complete JSON backup');

  await buildHouse();
  await page.evaluate(() => {
    const state = window.__littleTown.sim.state;
    state.wood = 1;
    state.stone = 2;
    state.food = 3;
  });
  assert.notDeepEqual(await snapshot(), firstBuild);
  const loadResult = await page.evaluate(data => window.__littleTown.loadGame(data), saved);
  assert.equal(loadResult.ok, true, loadResult.message);
  assert.deepEqual(await snapshot(), firstBuild, 'Loading must restore both economy and exact added-building layout.');
  results.push('explicit save/load restores economy and placement together');

  await buildHouse();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Cargar partida desde archivo', exact: true }).click();
  const chooser = await chooserEvent;
  await chooser.setFiles({ name: 'Little-Town-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await page.waitForFunction(expected => window.__littleTown.world.getPlacedBuildings().length === expected, firstBuild.layout.length);
  assert.deepEqual(await snapshot(), firstBuild, 'Importing through the actual file chooser must restore the backup.');
  results.push('Load UI imports a saved JSON file');

  for (const kind of ['missing-simulation', 'invalid-layout', 'invalid-version']) {
    const before = await snapshot();
    const result = await page.evaluate(({ data, kind }) => {
      if (kind === 'missing-simulation') data.simulation = null;
      if (kind === 'invalid-layout') data.layout.push({ type: 'house', x: Number.MAX_VALUE, z: 0 });
      if (kind === 'invalid-version') data.version = 999;
      return window.__littleTown.loadGame(data);
    }, { data: structuredClone(saved), kind });
    assert.equal(result.ok, false, `${kind} must fail.`);
    assert.deepEqual(await snapshot(), before, `${kind} must not partially mutate world or economy.`);
  }
  results.push('malformed simulation, layout and version rejected transactionally');

  // In-memory offline documents have an opaque origin, which intentionally prevents
  // localStorage; full persistence coverage runs against the actual app origin.
  if (!process.env.HTML_PATH) {
    await page.evaluate(() => window.__littleTown.saveGame());
    const stored = await page.evaluate(key => localStorage.getItem(key), storageKey);
    assert.ok(stored, 'Successful save must persist a storage record.');
    const beforeCorrupt = await snapshot();
    const corruptResult = await page.evaluate(key => {
      localStorage.setItem(key, '{broken-json');
      return window.__littleTown.loadGame();
    }, storageKey);
    assert.equal(corruptResult.ok, false, 'Malformed stored JSON must return an error without throwing.');
    assert.deepEqual(await snapshot(), beforeCorrupt, 'Malformed stored JSON must not corrupt the running game.');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: stored });
    await page.reload();
    await page.waitForFunction(() => window.__littleTown?.getSaveData && window.__littleTown.renderer.info.render.calls > 0);
    assert.deepEqual(await snapshot(), firstBuild, 'Reload must restore the saved economy and added buildings.');
    results.push('localStorage corruption handling and reload restoration');
  }

  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__littleTown.setVisualTime?.(0));
  await page.waitForFunction(() => window.__littleTown.sim.state.timeLabel === 'Mañana');
  await page.waitForFunction(() => document.querySelector('[data-value=season]')?.textContent === window.__littleTown.sim.state.season);
  await page.screenshot({ path: '/tmp/little-town-v2-day.png' });
  const performance = await page.evaluate(() => ({
    drawCalls: window.__littleTown.renderer.info.render.calls,
    triangles: window.__littleTown.renderer.info.render.triangles,
    geometries: window.__littleTown.renderer.info.memory.geometries,
    textures: window.__littleTown.renderer.info.memory.textures,
  }));

  const season = await page.evaluate(() => {
    const sim = window.__littleTown.sim;
    sim.state.paused = false;
    sim.setSpeed(1);
    for (let i = 0; i < 180 * 10 && sim.state.season !== 'Invierno'; i++) sim.update(0.1);
    sim.state.paused = true;
    return sim.state.season;
  });
  assert.equal(season, 'Invierno', 'Season rendering capture must follow a real simulation transition.');
  await page.waitForFunction(() => document.querySelector('[data-value=season]')?.textContent === 'Invierno');
  await page.screenshot({ path: '/tmp/little-town-v2-winter.png' });
  results.push('real winter transition and visual capture');
  await page.evaluate(() => window.__littleTown.setVisualTime(200));
  await page.waitForFunction(() => window.__littleTown.sim.state.timeLabel === 'Noche');
  await page.screenshot({ path: '/tmp/little-town-v2-night.png' });
  results.push('night atmosphere visual capture');
  await page.evaluate(() => window.__littleTown.setVisualTime(0));
  await page.waitForFunction(() => window.__littleTown.sim.state.timeLabel === 'Mañana');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas')?.clientWidth === innerWidth);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile layout must not overflow horizontally.');
  await page.getByRole('button', { name: 'Ayuda y controles', exact: true }).click();
  assert.equal(await page.getByRole('dialog').isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Help modal must fit the mobile viewport.');
  await page.screenshot({ path: '/tmp/little-town-v2-mobile-help.png' });
  await page.keyboard.press('Escape');
  const buildButtons = page.locator('[data-build]');
  assert.equal(await buildButtons.count(), 6);
  for (const button of await buildButtons.all()) assert.equal(await button.isVisible(), true, 'All six construction buttons must remain visible on mobile.');
  await page.screenshot({ path: '/tmp/little-town-v2-mobile.png' });
  results.push('390px mobile layout and all construction controls');

  assert.deepEqual(errors, [], 'Browser must have no page or console errors.');
  console.log(JSON.stringify({ passed: results, browserErrors: errors, performance, screenshots: ['/tmp/little-town-v2-day.png', '/tmp/little-town-v2-winter.png', '/tmp/little-town-v2-mobile.png', '/tmp/little-town-v2-mobile-help.png', '/tmp/little-town-v2-night.png'] }, null, 2));
} finally {
  await browser.close();
}
