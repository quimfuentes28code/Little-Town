import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, createSimulation } from '../src/simulation.js';

function advance(sim, seconds) {
  for (let i = 0; i < seconds; i++) sim.update(1);
}

test('every building charges its displayed cost and adds exactly one building', () => {
  const costs = {
    house: [20, 5], lumber: [25, 10], farm: [15, 5],
    market: [40, 20], well: [10, 20], church: [60, 45],
  };
  for (const [type, [wood, stone]] of Object.entries(costs)) {
    const sim = createSimulation();
    const before = sim.state.buildings[type];
    assert.equal(BUILDINGS[type].wood, wood);
    assert.equal(BUILDINGS[type].stone, stone);
    assert.equal(sim.build(type).ok, true);
    assert.equal(sim.state.wood, 180 - wood);
    assert.equal(sim.state.stone, 100 - stone);
    assert.equal(sim.state.buildings[type], before + 1);
    assert.equal(sim.state.selected, type);
    assert.equal(sim.state.capacity, sim.state.buildings.house * 6);
  }
});

test('insufficient resources and unknown buildings cannot debit resources or add buildings', () => {
  const sim = createSimulation();
  sim.state.wood = BUILDINGS.church.wood;
  sim.state.stone = BUILDINGS.church.stone - 1;
  const before = { wood: sim.state.wood, stone: sim.state.stone, church: sim.state.buildings.church };
  assert.equal(sim.build('church').ok, false);
  assert.equal(sim.build('castle').ok, false);
  assert.equal(sim.state.wood, before.wood);
  assert.equal(sim.state.stone, before.stone);
  assert.equal(sim.state.buildings.church, before.church);
  sim.state.wood = BUILDINGS.house.wood - 1;
  sim.state.stone = BUILDINGS.house.stone;
  assert.equal(sim.build('house').ok, false);
});

test('seasons advance every 45 seconds and the year advances after winter', () => {
  const sim = createSimulation();
  advance(sim, 44);
  assert.equal(sim.state.season, 'Primavera');
  sim.update(1);
  assert.equal(sim.state.season, 'Verano');
  advance(sim, 45);
  assert.equal(sim.state.season, 'Otoño');
  const autumnRate = sim.state.foodRate;
  advance(sim, 45);
  assert.equal(sim.state.season, 'Invierno');
  assert.ok(sim.state.foodRate < autumnRate, 'winter reduces farm production');
  assert.ok(sim.state.foodRate < 0, 'winter consumes stored food');
  advance(sim, 45);
  assert.equal(sim.state.season, 'Primavera');
  assert.equal(sim.state.year, 2);
});

test('pause stops all simulation progress and resume restores production', () => {
  const sim = createSimulation();
  sim.togglePause();
  const before = structuredClone(sim.state);
  advance(sim, 200);
  assert.deepEqual(sim.state, before);
  sim.togglePause();
  sim.update(1);
  assert.ok(sim.state.wood > before.wood);
  assert.ok(sim.state.food > before.food);
});

test('healthy settlements attract residents up to housing capacity', () => {
  const sim = createSimulation();
  advance(sim, 19);
  assert.equal(sim.state.population, 24);
  sim.update(1);
  assert.equal(sim.state.population, 25);
  advance(sim, 600);
  assert.equal(sim.state.population, sim.state.capacity);
  assert.equal(sim.build('house').ok, true);
  advance(sim, 20);
  assert.equal(sim.state.population, 37);
});

test('reset preserves the state reference while restoring resources, buildings and clocks', () => {
  const sim = createSimulation();
  const stateReference = sim.state;
  sim.build('farm');
  sim.setSpeed(4);
  advance(sim, 100);
  sim.togglePause();
  sim.reset();
  assert.equal(sim.state, stateReference);
  assert.deepEqual(sim.state, createSimulation().state);
  advance(sim, 19);
  assert.equal(sim.state.population, 24);
  sim.update(1);
  assert.equal(sim.state.population, 25);
});

test('speed multiplies simulation time and invalid elapsed times are ignored', () => {
  const sim = createSimulation();
  sim.setSpeed(4);
  advance(sim, 45);
  assert.equal(sim.state.year, 2);
  assert.equal(sim.state.season, 'Primavera');
  const before = structuredClone(sim.state);
  for (const dt of [NaN, Infinity, -1, 0]) sim.update(dt);
  assert.deepEqual(sim.state, before);
  sim.setSpeed(999);
  assert.equal(sim.state.speed, 4);
});
