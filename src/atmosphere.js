/**
 * Local, deterministic atmosphere. Every texture and particle is generated here;
 * the downloadable game makes no network requests and needs no external assets.
 */
export function createAtmosphere(T, scene, { sun, hemisphere } = {}) {
  const root = new T.Group();
  root.name = 'Seasonal valley atmosphere';
  scene.add(root);
  const resources = [];
  const keep = (resource) => { resources.push(resource); return resource; };
  const clamp = (v, low = 0, high = 1) => Math.min(high, Math.max(low, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  let seed = 94821;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let disposed = false;
  let clock = 0;
  let daylight = 1;
  let dayFraction = 0.39;
  let timeLabel = 'Mañana';

  const palettes = {
    Primavera: { horizon: '#c6cfc0', zenith: '#8bb8c8', fog: '#bbc7b2', cloud: '#f0eede', ground: '#54634a', sun: '#ffedd1' },
    Verano: { horizon: '#c4d3cc', zenith: '#75a9c1', fog: '#b9c8b5', cloud: '#f4f0df', ground: '#59664a', sun: '#fff0d2' },
    Otoño: { horizon: '#d8c9b7', zenith: '#95b2bd', fog: '#c6bdab', cloud: '#eee2ce', ground: '#625640', sun: '#ffdeb2' },
    Invierno: { horizon: '#d4dde0', zenith: '#9ab8cb', fog: '#c1cdd0', cloud: '#e1e9e9', ground: '#596572', sun: '#eaf3f4' },
  };
  const nightHorizon = new T.Color('#51637b');
  const nightZenith = new T.Color('#20314d');
  const nightFog = new T.Color('#52637a');
  const nightGround = new T.Color('#35424e');
  const moonColor = new T.Color('#b2c8ec');
  const eveningColor = new T.Color('#e7b88d');
  const sunDirection = new T.Vector3(-0.5, 0.7, 0.4);
  const workingColor = new T.Color();

  // A broad vertical gradient replaces the solid background. The dome is inside
  // the normal camera far plane; depth writes are disabled, so land still wins.
  const skyMaterial = keep(new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHorizon: { value: new T.Color(palettes.Primavera.horizon) },
      uZenith: { value: new T.Color(palettes.Primavera.zenith) },
      uSun: { value: new T.Color('#ffe8bb') },
      uDirection: { value: sunDirection },
      uDaylight: { value: 1 },
    },
    vertexShader: `
      varying vec3 vSkyPosition;
      void main() {
        vSkyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vSkyPosition;
      uniform vec3 uHorizon;
      uniform vec3 uZenith;
      uniform vec3 uSun;
      uniform vec3 uDirection;
      uniform float uDaylight;
      void main() {
        vec3 direction = normalize(vSkyPosition);
        float height = max(0.0, direction.y);
        vec3 color = mix(uHorizon, uZenith, pow(height, 0.55));
        float sunDistance = max(dot(direction, normalize(uDirection)), 0.0);
        float aureole = pow(sunDistance, 24.0) * 0.14;
        float disc = smoothstep(0.99955, 0.9999, sunDistance) * 0.8;
        color += uSun * (aureole + disc) * uDaylight;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  const sky = new T.Mesh(keep(new T.SphereGeometry(345, 40, 20)), skyMaterial);
  sky.name = 'Valley sky gradient';
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  root.add(sky);

  // Soft distant cloud banks use one draw call, rather than one per puff.
  const cloudGeometry = keep(new T.IcosahedronGeometry(1, 2));
  const cloudMaterial = keep(new T.MeshLambertMaterial({ color: '#f0eede', transparent: true, opacity: 0.53, depthWrite: false, fog: true }));
  const cloudCount = 48;
  const clouds = new T.InstancedMesh(cloudGeometry, cloudMaterial, cloudCount);
  clouds.name = 'Distant cloud banks';
  clouds.frustumCulled = false;
  clouds.castShadow = false;
  clouds.receiveShadow = false;
  root.add(clouds);
  const cloudSpecs = [];
  for (let bank = 0; bank < 12; bank += 1) {
    const angle = bank / 12 * Math.PI * 2 + random() * 0.2;
    const distance = 115 + random() * 55;
    const bankX = Math.cos(angle) * distance;
    const bankZ = Math.sin(angle) * distance;
    const bankY = 45 + random() * 20;
    const bankScale = 0.75 + random() * 0.65;
    for (let puff = 0; puff < 4; puff += 1) {
      cloudSpecs.push({ x: bankX + (puff - 1.5) * 6 * bankScale, y: bankY + (puff % 2) * 1.9, z: bankZ + (random() - 0.5) * 8, sx: (7 + random() * 4) * bankScale, sy: (2 + random() * 1.2) * bankScale, sz: (4 + random() * 3) * bankScale, phase: random() * Math.PI * 2 });
    }
  }
  const dummy = new T.Object3D();
  function updateClouds(time) {
    cloudSpecs.forEach((spec, i) => {
      dummy.position.set(spec.x + Math.sin(time * 0.003 + spec.phase) * 8, spec.y, spec.z + Math.cos(time * 0.002 + spec.phase) * 4);
      dummy.scale.set(spec.sx, spec.sy, spec.sz);
      dummy.rotation.set(0, spec.phase * 0.13, 0);
      dummy.updateMatrix();
      clouds.setMatrixAt(i, dummy.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;
  }

  // A tiny radial sprite keeps snow and pollen round instead of square pixels.
  const spriteSize = 32;
  const spriteData = new Uint8Array(spriteSize * spriteSize * 4);
  for (let y = 0; y < spriteSize; y += 1) for (let x = 0; x < spriteSize; x += 1) {
    const distance = Math.hypot((x + 0.5) / spriteSize * 2 - 1, (y + 0.5) / spriteSize * 2 - 1);
    const index = (y * spriteSize + x) * 4;
    spriteData[index] = spriteData[index + 1] = spriteData[index + 2] = 255;
    spriteData[index + 3] = Math.round((1 - smooth(0.15, 1, distance)) * 255);
  }
  const sprite = keep(new T.DataTexture(spriteData, spriteSize, spriteSize));
  sprite.needsUpdate = true;
  const particleCount = 640;
  const particleSeeds = Array.from({ length: particleCount }, () => ({ x: (random() - 0.5) * 130, y: random() * 43, z: (random() - 0.5) * 130, speed: 0.8 + random() * 0.9, phase: random() * Math.PI * 2 }));
  const particlePositions = new Float32Array(particleCount * 3);
  const particleGeometry = keep(new T.BufferGeometry());
  particleGeometry.setAttribute('position', new T.BufferAttribute(particlePositions, 3));
  const particleMaterial = keep(new T.PointsMaterial({ color: '#f3f6f5', size: 0.17, map: sprite, transparent: true, opacity: 0.76, depthWrite: false, fog: true, sizeAttenuation: true }));
  const particles = new T.Points(particleGeometry, particleMaterial);
  particles.name = 'Seasonal weather';
  particles.frustumCulled = false;
  root.add(particles);

  const starPositions = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i += 1) {
    const azimuth = random() * Math.PI * 2;
    const elevation = 0.08 + random() * 0.88;
    const radius = 290;
    const horizontal = Math.sqrt(1 - elevation * elevation);
    starPositions[i * 3] = Math.cos(azimuth) * horizontal * radius;
    starPositions[i * 3 + 1] = elevation * radius;
    starPositions[i * 3 + 2] = Math.sin(azimuth) * horizontal * radius;
  }
  const starsGeometry = keep(new T.BufferGeometry());
  starsGeometry.setAttribute('position', new T.BufferAttribute(starPositions, 3));
  const starsMaterial = keep(new T.PointsMaterial({ color: '#e0e7f3', size: 0.47, map: sprite, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }));
  const stars = new T.Points(starsGeometry, starsMaterial);
  stars.name = 'Night stars';
  stars.renderOrder = -90;
  stars.frustumCulled = false;
  root.add(stars);

  const currentHorizon = new T.Color();
  const currentZenith = new T.Color();
  const currentFog = new T.Color();
  const currentGround = new T.Color();
  const currentSun = new T.Color();
  const skyLight = new T.Color();
  const report = { daylight: 1, dayFraction: 0.39, timeLabel: 'Mañana' };

  function update(dt, state = {}, elapsed) {
    if (disposed) return report;
    if (Number.isFinite(elapsed)) clock = Math.max(0, elapsed);
    else if (Number.isFinite(dt)) clock += Math.max(0, dt);
    dayFraction = ((clock / 360 + 0.39) % 1 + 1) % 1;
    const solarAngle = (dayFraction - 0.25) * Math.PI * 2;
    const elevation = Math.sin(solarAngle);
    daylight = smooth(-0.12, 0.42, elevation);
    const warmth = 1 - smooth(0.12, 0.75, Math.max(0, elevation));
    const palette = palettes[state.season] || palettes.Primavera;
    currentHorizon.set(palette.horizon).lerp(nightHorizon, 1 - daylight);
    currentZenith.set(palette.zenith).lerp(nightZenith, 1 - daylight);
    currentFog.set(palette.fog).lerp(nightFog, 1 - daylight);
    currentGround.set(palette.ground).lerp(nightGround, 1 - daylight);
    if (daylight > 0.05) currentHorizon.lerp(eveningColor, warmth * daylight * 0.18);
    skyMaterial.uniforms.uHorizon.value.copy(currentHorizon);
    skyMaterial.uniforms.uZenith.value.copy(currentZenith);
    skyMaterial.uniforms.uDaylight.value = daylight;
    currentSun.set(palette.sun).lerp(eveningColor, warmth * 0.38).lerp(moonColor, 1 - daylight);
    skyMaterial.uniforms.uSun.value.copy(currentSun);
    if (scene.background?.isColor) scene.background.copy(currentFog);
    if (scene.fog?.color) {
      scene.fog.color.copy(currentFog);
      if ('near' in scene.fog) {
        scene.fog.near = state.season === 'Invierno' ? 105 : 125;
        scene.fog.far = state.season === 'Invierno' ? 250 : 295;
      }
    }
    if (sun) {
      sun.color.copy(currentSun);
      sun.intensity = 0.34 + daylight * 2.2;
      sun.position.set(-48 * Math.cos(solarAngle), 34 + Math.max(0, elevation) * 42, 32 + Math.sin(solarAngle * 0.7) * 10);
      sunDirection.copy(sun.position).normalize();
    }
    if (hemisphere) {
      skyLight.set('#d8e4e4').lerp(nightHorizon, (1 - daylight) * 0.52);
      hemisphere.color.copy(skyLight);
      hemisphere.groundColor.copy(currentGround);
      hemisphere.intensity = 0.86 + daylight * 0.55;
    }
    cloudMaterial.color.set(palette.cloud).lerp(workingColor.set('#71839b'), (1 - daylight) * 0.7);
    cloudMaterial.opacity = state.season === 'Invierno' ? 0.47 : 0.39;
    updateClouds(clock);
    const isWinter = state.season === 'Invierno';
    const isSpring = state.season === 'Primavera';
    const isAutumn = state.season === 'Otoño';
    particles.visible = isWinter || isSpring || isAutumn;
    if (particles.visible) {
      const count = isWinter ? particleCount : isSpring ? 54 : 90;
      particleGeometry.setDrawRange(0, count);
      particleMaterial.color.set(isWinter ? '#edf4f5' : isSpring ? '#e7d4a4' : '#ba8348');
      particleMaterial.size = isWinter ? 0.19 : isSpring ? 0.13 : 0.18;
      particleMaterial.opacity = isWinter ? 0.82 : isSpring ? 0.30 : 0.53;
      for (let i = 0; i < count; i += 1) {
        const spec = particleSeeds[i];
        particlePositions[i * 3] = spec.x + Math.sin(clock * 0.24 + spec.phase) * (isWinter ? 2.2 : 0.8);
        particlePositions[i * 3 + 1] = isSpring ? 1 + ((spec.y + clock * 0.07 * spec.speed) % 8) : ((spec.y - clock * spec.speed * (isWinter ? 0.9 : 0.32)) % 43 + 43) % 43;
        particlePositions[i * 3 + 2] = spec.z + Math.cos(clock * 0.18 + spec.phase) * 1.2;
      }
      particleGeometry.attributes.position.needsUpdate = true;
    }
    stars.visible = daylight < 0.85;
    starsMaterial.opacity = (1 - daylight) * 0.62;
    stars.rotation.y = clock * 0.0001;
    timeLabel = dayFraction < 0.23 || dayFraction > 0.81 ? 'Noche' : dayFraction < 0.31 ? 'Amanecer' : dayFraction < 0.49 ? 'Mañana' : dayFraction < 0.68 ? 'Tarde' : 'Atardecer';
    report.daylight = daylight;
    report.dayFraction = dayFraction;
    report.timeLabel = timeLabel;
    return report;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const resource of resources) resource.dispose();
  }
  update(0, { season: 'Primavera' }, 0);
  return { update, dispose, getTimeLabel: () => timeLabel, getDaylight: () => daylight };
}
