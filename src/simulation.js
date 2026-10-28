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
const harvest = [0.8, 1.35, 1.6, 0.18];

export function createSimulation() {
  const state = {};
  let elapsed = 0;
  let migrationClock = 0;
  let hungerClock = 0;
  let seasonIndex = 0;

  function reset() {
    elapsed = 0;
    migrationClock = 0;
    hungerClock = 0;
    seasonIndex = 0;
    Object.assign(state, {
      population: 24,
      wood: 180,
      stone: 100,
      food: 240,
      happiness: 86,
      year: 1,
      season: SEASONS[0],
      speed: 1,
      paused: false,
      selected: null,
      message: 'Tu historia comienza junto al río. Prepara reservas para el invierno.',
      buildings: { house: 6, lumber: 1, farm: 2, market: 1, well: 1, church: 1 },
      capacity: 36,
      foodRate: 0,
      woodRate: 0,
    });
    return state;
  }

  function build(type) {
    const blueprint = BUILDINGS[type];
    if (!blueprint) return { ok: false, message: 'Selecciona un edificio válido.' };
    if (state.wood + 1e-8 < blueprint.wood || state.stone + 1e-8 < blueprint.stone) {
      const message = `Recursos insuficientes: ${blueprint.name} necesita ${blueprint.wood} de madera y ${blueprint.stone} de piedra.`;
      state.message = message;
      return { ok: false, message };
    }
    state.wood = Math.max(0, state.wood - blueprint.wood);
    state.stone = Math.max(0, state.stone - blueprint.stone);
    state.buildings[type] += 1;
    state.capacity = state.buildings.house * 6;
    state.selected = type;
    const message = `${blueprint.name} construida. ${blueprint.description}`;
    state.message = message;
    return { ok: true, message };
  }

  function step(seconds) {
    elapsed += seconds;
    const nextSeason = Math.floor(elapsed / SEASON_LENGTH) % 4;
    state.year = 1 + Math.floor(elapsed / (SEASON_LENGTH * 4));
    if (nextSeason !== seasonIndex) {
      seasonIndex = nextSeason;
      state.season = SEASONS[seasonIndex];
      state.message = seasonIndex === 3
        ? 'Llega el invierno. Las granjas descansan y aumenta el consumo de leña.'
        : `Comienza ${state.season.toLowerCase()}. El valle vuelve a cambiar.`;
    }

    const b = state.buildings;
    const availableWorkers = Math.max(0, state.population * 0.68);
    const neededWorkers = b.farm * 4 + b.lumber * 4 + b.market * 2;
    const staffing = neededWorkers ? Math.min(1, availableWorkers / neededWorkers) : 0;
    const marketEfficiency = Math.min(0.24, b.market * 0.08);
    const consumption = state.population * 0.032 * (1 - marketEfficiency);
    const gathering = state.population * 0.009;
    const foodProduced = b.farm * 0.62 * harvest[seasonIndex] * staffing + gathering;
    const winterFuel = seasonIndex === 3 ? state.population * 0.006 : 0;
    state.foodRate = foodProduced - consumption;
    state.woodRate = b.lumber * 0.48 * staffing - winterFuel;
    state.food = Math.max(0, Math.min(9999, state.food + state.foodRate * seconds));
    state.wood = Math.max(0, Math.min(9999, state.wood + state.woodRate * seconds));
    // Small communal quarry income means the player can recover after spending stone.
    state.stone = Math.min(9999, state.stone + state.population * 0.004 * seconds);

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
        state.message = 'Un nuevo habitante se ha instalado en el valle.';
      }
    } else migrationClock = 0;

    if (state.food <= 0.001 && state.population > 2) {
      hungerClock += seconds;
      if (hungerClock >= 18) {
        hungerClock -= 18;
        state.population -= 1;
        state.message = 'La escasez obliga a una persona a abandonar el valle. Construye más granjas.';
      }
    } else hungerClock = 0;
  }

  function update(dt) {
    if (state.paused || !Number.isFinite(dt) || dt <= 0) return state;
    // Ignore time spent in a suspended browser tab; consume short steps so seasonal
    // changes and migration are identical at every supported simulation speed.
    let remaining = Math.min(dt, 1) * state.speed;
    while (remaining > 1e-8) {
      const slice = Math.min(0.25, remaining);
      step(slice);
      remaining -= slice;
    }
    return state;
  }

  reset();
  return {
    state,
    update,
    build,
    setSpeed(n) {
      if ([1, 2, 4].includes(Number(n))) state.speed = Number(n);
      return state.speed;
    },
    togglePause() { state.paused = !state.paused; return state.paused; },
    reset,
  };
}
