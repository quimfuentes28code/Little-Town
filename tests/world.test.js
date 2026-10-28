import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { createSimulation } from '../src/simulation.js';

function freeSite(world, type) {
  for (let x = -48; x <= 48; x += 3) {
    for (let z = -48; z <= 48; z += 3) {
      if (world.validatePlacement(type, x, z).ok) return { type, x, z };
    }
  }
  throw new Error(`No clear site for ${type}`);
}

test('initial visible settlement matches the simulation and exports no added buildings', () => {
  const scene = new THREE.Scene();
  const world = createWorld(THREE, scene);
  try {
    const expected = createSimulation().state.buildings;
    for (const [type, count] of Object.entries(expected)) {
      assert.equal(world.buildings.filter(b => b.type === type).length, count, type);
    }
    assert.deepEqual(world.getPlacedBuildings(), []);
    assert.ok(scene.children.length > 0);
  } finally { world.dispose(); }
  assert.equal(scene.children.length, 0);
});

test('placement rejects river, existing buildings and invalid input without modifying the world', () => {
  const world = createWorld(THREE, new THREE.Scene());
  try {
    const count = world.buildings.length;
    for (const [type, x, z] of [['unknown', 0, 0], ['house', NaN, 0], ['house', -27, 0], ['house', 100, 100]]) {
      const result = world.validatePlacement(type, x, z);
      assert.equal(result.ok, false);
      assert.equal(typeof result.reason, 'string');
    }
    const house = world.buildings.find(b => b.type === 'house');
    assert.equal(world.validatePlacement('house', house.x, house.z).ok, false);
    assert.equal(world.buildings.length, count);
    assert.deepEqual(world.getPlacedBuildings(), []);
  } finally { world.dispose(); }
});

test('added building plans reproduce collision-valid layouts in a fresh world', () => {
  const scene = new THREE.Scene();
  const first = createWorld(THREE, scene);
  let restored;
  try {
    for (const type of ['house', 'farm', 'well', 'lumber', 'market', 'church']) {
      const site = freeSite(first, type);
      first.placeBuilding(type, site.x, site.z, { instant: true });
      assert.equal(first.validatePlacement(type, site.x, site.z).ok, false);
    }
    const layout = JSON.parse(JSON.stringify(first.getPlacedBuildings()));
    assert.equal(layout.length, 6);
    restored = createWorld(THREE, scene);
    for (const item of layout) {
      assert.equal(restored.validatePlacement(item.type, item.x, item.z).ok, true);
      restored.placeBuilding(item.type, item.x, item.z, { instant: true });
    }
    assert.deepEqual(restored.getPlacedBuildings(), layout);
    for (const season of ['Primavera', 'Verano', 'Otoño', 'Invierno']) {
      first.update(0.1, 50, { season, daylight: 0.2 });
      restored.update(0.1, 50, { season, daylight: 1 });
    }
  } finally { first.dispose(); restored?.dispose(); }
  assert.equal(scene.children.length, 0);
});
