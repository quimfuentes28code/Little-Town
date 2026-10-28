export const BUILDINGS = Object.freeze({
  house: { name: 'Vivienda', wood: 20, stone: 5, description: 'Aloja a 6 habitantes. Las familias llegan si hay alimento y bienestar.' },
  lumber: { name: 'Aserradero', wood: 25, stone: 10, description: 'Emplea a 4 habitantes y produce madera durante todo el año.' },
  farm: { name: 'Granja', wood: 15, stone: 5, description: 'Emplea a 4 habitantes. Las cosechas son abundantes en verano y otoño.' },
  market: { name: 'Mercado', wood: 40, stone: 20, description: 'Mejora el reparto de alimentos, reduce el desperdicio y aumenta el bienestar.' },
  well: { name: 'Pozo', wood: 10, stone: 20, description: 'Proporciona agua a 30 habitantes y mejora la salud del asentamiento.' },
  church: { name: 'Iglesia', wood: 60, stone: 45, description: 'Una casa de encuentro que aumenta el bienestar y favorece la llegada de familias.' },
});

const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
const SEASON_LENGTH = 45;
const HARVEST = [0.8, 1.35, 1.6, 0.18];
const INITIAL_BUILDINGS = Object.freeze({ house: 6, lumber: 1, farm: 2, market: 1, well: 1, church: 1 });
const BUILDING_TYPES = Object.keys(INITIAL_BUILDINGS);
const EVENT_LIMIT = 6;
const EVENT_KINDS = ['info', 'success', 'warning'];
const SAVE_VERSION = 1;
const hasType = type => typeof type === 'string' && Object.hasOwn(BUILDINGS, type);
const numberIn = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const integerIn = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exactKeys = (object, keys) => plainObject(object) && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
const shortText = value => typeof value === 'string' && value.length <= 500;

// A save is a simulation checkpoint, not a timestamp. Restoring it never advances
// the settlement by the time spent outside the game.
function validSave(data) {
  if (!exactKeys(data, ['version', 'state', 'clocks', 'progress', 'events', 'eventSequence']) || data.version !== SAVE_VERSION) return false;
  const s = data.state, c = data.clocks, p = data.progress;
  if (!exactKeys(s, ['population', 'wood', 'stone', 'food', 'happiness', 'speed', 'paused', 'selected', 'message', 'buildings'])) return false;
  if (!exactKeys(s.buildings, BUILDING_TYPES)) return false;
  for (const type of BUILDING_TYPES) {
    if (!integerIn(s.buildings[type], INITIAL_BUILDINGS[type], 1000)) return false;
  }
  const capacity = s.buildings.house * 6;
  if (!integerIn(s.population, 2, capacity) || ![1, 2, 4].includes(s.speed) || typeof s.paused !== 'boolean') return false;
  if (s.selected !== null && !hasType(s.selected)) return false;
  if (!shortText(s.message) || !numberIn(s.happiness, 0, 99)) return false;
  for (const resource of ['wood', 'stone', 'food']) if (!numberIn(s[resource], 0, 9999)) return false;
  if (!exactKeys(c, ['elapsed', 'migration', 'hunger'])) return false;
  if (!numberIn(c.elapsed, 0, 1e9) || !numberIn(c.migration, 0, 20) || c.migration >= 20 || !numberIn(c.hunger, 0, 18) || c.hunger >= 18) return false;
  if (!exactKeys(p, ['peakPopulation', 'winterSurvived'])) return false;
  if (!integerIn(p.peakPopulation, Math.max(24, s.population), capacity) || typeof p.winterSurvived !== 'boolean') return false;
  if (p.winterSurvived && c.elapsed < SEASON_LENGTH * 4) return false;
  if (!Array.isArray(data.events) || data.events.length < 1 || data.events.length > EVENT_LIMIT || !integerIn(data.eventSequence, 1, Number.MAX_SAFE_INTEGER)) return false;
  let lastId = 0;
  for (const event of data.events) {
    if (!exactKeys(event, ['id', 'text', 'kind']) || !integerIn(event.id, lastId + 1, data.eventSequence) || !shortText(event.text) || !EVENT_KINDS.includes(event.kind)) return false;
    lastId = event.id;
  }
  return true;
}

export function createSimulation() {
  const state = {};
  let elapsed = 0;
  let migrationClock = 0;
  let hungerClock = 0;
  let seasonIndex = 0;
  let peakPopulation = 24;
  let winterSurvived = false;
  let eventSequence = 0;

  function emit(text, kind = 'info') {
    state.message = text;
    state.events.push({ id: ++eventSequence, text, kind });
    if (state.events.length > EVENT_LIMIT) state.events.splice(0, state.events.length - EVENT_LIMIT);
  }

  function refreshRates() {
    const b = state.buildings;
    const availableWorkers = Math.max(0, state.population * 0.68);
    const neededWorkers = b.farm * 4 + b.lumber * 4 + b.market * 2;
    const staffing = neededWorkers ? Math.min(1, availableWorkers / neededWorkers) : 0;
    const marketEfficiency = Math.min(0.24, b.market * 0.08);
    const consumption = state.population * 0.032 * (1 - marketEfficiency);
    const gathering = state.population * 0.009;
    const winterFuel = seasonIndex === 3 ? state.population * 0.006 : 0;
    state.workers = Math.floor(availableWorkers);
    state.employed = Math.min(state.workers, neededWorkers);
    state.foodRate = b.farm * 0.62 * HARVEST[seasonIndex] * staffing + gathering - consumption;
    state.woodRate = b.lumber * 0.48 * staffing - winterFuel;
    state.stoneRate = state.population * 0.004;
    state.capacity = b.house * 6;
    state.seasonProgress = (elapsed % SEASON_LENGTH) / SEASON_LENGTH;
  }

  function refreshObjectives(announce = true) {
    const oldCompleted = new Set((state.objectives || []).filter(goal => goal.complete).map(goal => goal.id));
    const goals = [
      { id: 'harvest', title: 'El sustento del valle', description: 'Construye una granja adicional para preparar las reservas.', progress: Math.min(1, state.buildings.farm - INITIAL_BUILDINGS.farm), target: 1 },
      { id: 'home', title: 'Un lugar al que volver', description: 'Construye una vivienda adicional para nuevas familias.', progress: Math.min(1, state.buildings.house - INITIAL_BUILDINGS.house), target: 1 },
      { id: 'community', title: 'Una comunidad próspera', description: 'Haz que el valle alcance los 36 habitantes.', progress: Math.min(36, peakPopulation), target: 36 },
      { id: 'winter', title: 'El invierno superado', description: 'Llega a primavera con al menos 24 habitantes y reservas de comida y leña.', progress: winterSurvived ? 1 : 0, target: 1 },
    ].map(goal => ({ ...goal, complete: goal.progress >= goal.target }));
    state.objectives = goals;
    if (announce) {
      for (const goal of goals) if (goal.complete && !oldCompleted.has(goal.id)) emit(`Objetivo completado: ${goal.title}.`, 'success');
    }
  }

  function reset() {
    elapsed = migrationClock = hungerClock = seasonIndex = eventSequence = 0;
    peakPopulation = 24;
    winterSurvived = false;
    Object.assign(state, {
      population: 24, wood: 180, stone: 100, food: 240, happiness: 86,
      year: 1, season: SEASONS[0], speed: 1, paused: false, selected: null,
      message: 'Tu historia comienza junto al río. Prepara reservas para el invierno.',
      buildings: { ...INITIAL_BUILDINGS }, events: [], objectives: [],
    });
    emit(state.message);
    refreshRates();
    refreshObjectives(false);
    return state;
  }

  function build(type) {
    const blueprint = hasType(type) ? BUILDINGS[type] : null;
    if (!blueprint) return { ok: false, message: 'Selecciona un edificio válido.' };
    if (!Number.isFinite(state.wood) || !Number.isFinite(state.stone) || state.wood + 1e-8 < blueprint.wood || state.stone + 1e-8 < blueprint.stone) {
      const message = `Recursos insuficientes: ${blueprint.name} necesita ${blueprint.wood} de madera y ${blueprint.stone} de piedra.`;
      state.message = message;
      return { ok: false, message };
    }
    if (state.buildings[type] >= 1000) return { ok: false, message: 'Este asentamiento ha alcanzado el límite de ese edificio.' };
    state.wood = Math.max(0, state.wood - blueprint.wood);
    state.stone = Math.max(0, state.stone - blueprint.stone);
    state.buildings[type] += 1;
    state.selected = type;
    const message = `${blueprint.name} construida. ${blueprint.description}`;
    emit(message, 'success');
    refreshRates();
    refreshObjectives();
    return { ok: true, message };
  }

  function step(seconds) {
    elapsed += seconds;
    const nextSeason = Math.floor(elapsed / SEASON_LENGTH) % 4;
    const previousSeason = seasonIndex;
    state.year = 1 + Math.floor(elapsed / (SEASON_LENGTH * 4));
    if (nextSeason !== seasonIndex) {
      seasonIndex = nextSeason;
      state.season = SEASONS[seasonIndex];
      emit(seasonIndex === 3
        ? 'Llega el invierno. Las granjas descansan y aumenta el consumo de leña.'
        : `Comienza ${state.season.toLowerCase()}. El valle vuelve a cambiar.`, seasonIndex === 3 ? 'warning' : 'info');
      if (previousSeason === 3 && nextSeason === 0 && state.population >= 24 && state.food > 0 && state.wood > 0) winterSurvived = true;
    }

    refreshRates();
    state.food = Math.max(0, Math.min(9999, state.food + state.foodRate * seconds));
    state.wood = Math.max(0, Math.min(9999, state.wood + state.woodRate * seconds));
    state.stone = Math.min(9999, state.stone + state.stoneRate * seconds);

    const b = state.buildings;
    const waterCoverage = Math.min(1, b.well * 30 / Math.max(1, state.population));
    const foodSecurity = Math.min(1, state.food / Math.max(1, state.population * 5));
    const warmth = seasonIndex !== 3 || state.wood > 1 ? 1 : 0;
    const targetHappiness = Math.min(99, 35 + waterCoverage * 18 + foodSecurity * 24 + warmth * 8 + Math.min(10, b.market * 4) + Math.min(12, b.church * 8));
    state.happiness += (targetHappiness - state.happiness) * (1 - Math.exp(-seconds / 12));

    if (state.population < state.capacity && state.food > state.population * 3 && state.happiness >= 62) {
      migrationClock += seconds;
      if (migrationClock >= 20) {
        migrationClock -= 20;
        state.population += 1;
        peakPopulation = Math.max(peakPopulation, state.population);
        emit('Un nuevo habitante se ha instalado en el valle.', 'success');
      }
    } else migrationClock = 0;

    if (state.food <= 0.001 && state.population > 2) {
      hungerClock += seconds;
      if (hungerClock >= 18) {
        hungerClock -= 18;
        state.population -= 1;
        emit('La escasez obliga a una persona a abandonar el valle. Construye más granjas.', 'warning');
      }
    } else hungerClock = 0;
    refreshRates();
    refreshObjectives();
  }

  function update(dt) {
    if (state.paused || !Number.isFinite(dt) || dt <= 0) return state;
    // Suspended browser tabs do not fast-forward the economy. Small slices keep
    // season transitions and migration identical at each supported speed.
    let remaining = Math.min(dt, 1) * state.speed;
    while (remaining > 1e-8) {
      const slice = Math.min(0.25, remaining);
      step(slice);
      remaining -= slice;
    }
    return state;
  }

  function exportSave() {
    const snapshot = {
      version: SAVE_VERSION,
      state: {
        population: state.population, wood: state.wood, stone: state.stone, food: state.food,
        happiness: state.happiness, speed: state.speed, paused: state.paused, selected: state.selected,
        message: state.message, buildings: { ...state.buildings },
      },
      clocks: { elapsed, migration: migrationClock, hunger: hungerClock },
      progress: { peakPopulation, winterSurvived },
      events: state.events.map(event => ({ ...event })),
      eventSequence,
    };
    if (!validSave(snapshot)) throw new Error('El estado de la partida no se puede guardar.');
    return snapshot;
  }

  function importSave(data) {
    // Validate and clone everything before committing any changes. A failed
    // import leaves both the visible state and the hidden clocks untouched.
    let snapshot;
    try {
      if (!validSave(data)) return { ok: false, message: 'La partida guardada está dañada o usa una versión incompatible.' };
      snapshot = JSON.parse(JSON.stringify(data));
      if (!validSave(snapshot)) return { ok: false, message: 'La partida guardada no es válida.' };
    } catch {
      return { ok: false, message: 'No se ha podido leer la partida guardada.' };
    }
    const saved = snapshot.state;
    elapsed = snapshot.clocks.elapsed;
    migrationClock = snapshot.clocks.migration;
    hungerClock = snapshot.clocks.hunger;
    seasonIndex = Math.floor(elapsed / SEASON_LENGTH) % 4;
    peakPopulation = snapshot.progress.peakPopulation;
    winterSurvived = snapshot.progress.winterSurvived;
    eventSequence = snapshot.eventSequence;
    Object.assign(state, saved, {
      year: 1 + Math.floor(elapsed / (SEASON_LENGTH * 4)), season: SEASONS[seasonIndex],
      events: snapshot.events, objectives: [],
    });
    refreshRates();
    refreshObjectives(false);
    return { ok: true, message: 'Partida recuperada. El valle te estaba esperando.' };
  }

  reset();
  return {
    state, update, build, exportSave, importSave,
    setSpeed(n) {
      if ([1, 2, 4].includes(Number(n))) state.speed = Number(n);
      return state.speed;
    },
    togglePause() { state.paused = !state.paused; return state.paused; },
    reset,
  };
}
