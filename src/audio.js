/** Optional local Web Audio ambience; starts only after a deliberate user gesture. */
export function createAmbience() {
  let context, master, source, filter, birdClock = 0, enabled = false;
  function initialize() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; samples[i] = last * 3; }
    source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 650;
    source.connect(filter); filter.connect(master); source.start();
    return true;
  }
  async function toggle() {
    try {
      if (!context && !initialize()) return false;
      enabled = !enabled;
      if (enabled) await context.resume();
      master.gain.setTargetAtTime(enabled ? 0.09 : 0, context.currentTime, 0.5);
      return enabled;
    } catch { enabled = false; return false; }
  }
  function chirp() {
    const t = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(2200, t);
    oscillator.frequency.exponentialRampToValueAtTime(3400, t + 0.08);
    oscillator.frequency.exponentialRampToValueAtTime(2400, t + 0.2);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.026, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    oscillator.connect(gain); gain.connect(master); oscillator.start(t); oscillator.stop(t + 0.3);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function update(dt, { daylight = 1, season = 'Primavera', paused = false } = {}) {
    if (!enabled || !context || context.state !== 'running') return;
    master.gain.setTargetAtTime(paused ? 0.035 : 0.09, context.currentTime, 0.5);
    filter.frequency.setTargetAtTime(season === 'Invierno' ? 450 : 650, context.currentTime, 1);
    birdClock += dt;
    if (birdClock > 11 && daylight > 0.5 && season !== 'Invierno' && !paused) { birdClock = 0; chirp(); }
  }
  return { toggle, update, get enabled() { return enabled; }, dispose() { source?.stop(); context?.close(); } };
}
