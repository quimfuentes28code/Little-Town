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

test('save round trips preserve clocks, resources, events and future migration exactly', () => {
  const original = createSimulation();
  original.build('farm');
  original.build('house');
  advance(original, 58);
  original.update(0.375);
  original.setSpeed(2);
  const checkpoint = JSON.parse(JSON.stringify(original.exportSave()));
  const restored = createSimulation();
  const reference = restored.state;
  assert.equal(restored.importSave(checkpoint).ok, true);
  assert.equal(restored.state, reference, 'UI keeps the same state object');
  assert.deepEqual(restored.state, original.state);
  assert.deepEqual(restored.exportSave(), checkpoint);
  advance(original, 83);
  advance(restored, 83);
  assert.deepEqual(restored.state, original.state, 'migration and seasons resume at the same sub-second');
  assert.deepEqual(restored.exportSave(), original.exportSave());
  checkpoint.state.buildings.house += 10;
  assert.notEqual(restored.state.buildings.house, checkpoint.state.buildings.house, 'caller cannot mutate restored state');
});

test('save preserves partial hunger clocks and paused games without offline catchup', () => {
  const original = createSimulation();
  advance(original, 135);
  // Reset food during winter, whose production cannot meet consumption.
  original.state.food = 0;
  advance(original, 9);
  const checkpoint = original.exportSave();
  assert.ok(checkpoint.clocks.hunger > 0);
  original.togglePause();
  const pausedCheckpoint = original.exportSave();
  const restored = createSimulation();
  assert.equal(restored.importSave(pausedCheckpoint).ok, true);
  advance(restored, 10000);
  assert.deepEqual(restored.exportSave(), pausedCheckpoint);
  restored.togglePause();
  original.togglePause();
  advance(original, 11);
  advance(restored, 11);
  assert.deepEqual(restored.exportSave(), original.exportSave());
});

test('malformed saves are rejected transactionally, including hidden clocks and unknown fields', () => {
  const sim = createSimulation();
  sim.build('farm');
  advance(sim, 43);
  const before = sim.exportSave();
  const stateBefore = structuredClone(sim.state);
  const mutations = [
    save => { save.version = 999; },
    save => { delete save.state; },
    save => { save.extra = true; },
    save => { save.state.food = -1; },
    save => { save.state.wood = NaN; },
    save => { save.state.stone = Infinity; },
    save => { save.state.happiness = 100; },
    save => { save.state.population = 1000; },
    save => { save.state.speed = 3; },
    save => { save.state.paused = 'false'; },
    save => { save.state.selected = 'toString'; },
    save => { save.state.buildings.house = 6.2; },
    save => { save.state.buildings.house = 5; },
    save => { save.state.buildings.castle = 1; },
    save => { delete save.state.buildings.farm; },
    save => { save.clocks.elapsed = -1; },
    save => { save.clocks.elapsed = Infinity; },
    save => { save.clocks.migration = 20; },
    save => { save.clocks.hunger = 18; },
    save => { save.progress.peakPopulation = 0; },
    save => { save.progress.winterSurvived = true; },
    save => { save.events[0].text = null; },
    save => { save.events[0].kind = 'script'; },
    save => { save.events[0].id = save.eventSequence + 1; },
    save => { save.events.push(...Array(10).fill(save.events[0])); },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(before);
    mutate(bad);
    assert.equal(sim.importSave(bad).ok, false);
    assert.deepEqual(sim.state, stateBefore);
    assert.deepEqual(sim.exportSave(), before);
  }
  for (const bad of [null, undefined, [], true, '{}', new Date()]) {
    assert.equal(sim.importSave(bad).ok, false);
    assert.deepEqual(sim.exportSave(), before);
  }
});

test('objectives follow real building, population and winter progress without repeated rewards', () => {
  const sim = createSimulation();
  const objective = id => sim.state.objectives.find(goal => goal.id === id);
  assert.equal(sim.state.objectives.length, 4);
  assert.ok(sim.state.objectives.every(goal => !goal.complete));
  assert.equal(objective('community').progress, 24);
  assert.equal(sim.build('farm').ok, true);
  assert.equal(objective('harvest').complete, true);
  assert.equal(objective('home').complete, false);
  assert.equal(sim.build('house').ok, true);
  assert.equal(objective('home').complete, true);
  advance(sim, 179);
  assert.equal(objective('winter').complete, false);
  sim.update(1);
  assert.equal(objective('winter').complete, true);
  advance(sim, 60);
  assert.equal(objective('community').complete, true);
  const before = sim.exportSave();
  const resources = [sim.state.wood, sim.state.stone, sim.state.food];
  for (let i = 0; i < 5; i++) assert.equal(sim.importSave(before).ok, true);
  assert.deepEqual([sim.state.wood, sim.state.stone, sim.state.food], resources);
  assert.deepEqual(sim.exportSave(), before, 'loading completed goals does not add events or rewards');
  assert.ok(sim.state.events.length <= 6);
  assert.ok(sim.state.events.every(event => ['info', 'success', 'warning'].includes(event.kind)));
});

test('inherited building names cannot corrupt resources or the saved game', () => {
  const sim = createSimulation();
  for (const type of ['constructor', 'toString', '__proto__', null, undefined]) {
    const before = sim.exportSave();
    assert.equal(sim.build(type).ok, false);
    assert.deepEqual(sim.exportSave(), before);
  }
});
