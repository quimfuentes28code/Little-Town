import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createWorld(T, scene) {
  let seed = 123456;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const root = new T.Group(); root.name = 'Little Town valley'; scene.add(root);
  const materialCache = new Map();
  const mat = (color, roughness = .88) => {
    const key = `${color}:${roughness}`;
    if (!materialCache.has(key)) materialCache.set(key, new T.MeshStandardMaterial({ color, roughness }));
    return materialCache.get(key);
  };
  const M = {
    grass: mat('#89936a'), soil: mat('#77634a'), road: mat('#b7af9a'), stone: mat('#939184'), plaster: mat('#e8dfc8'),
    wood: mat('#876144'), timber: mat('#403b32'), roof: mat('#9da09a'), redroof: mat('#c29a76'), leaf: mat('#526e48'),
    trunk: mat('#63513b'), gold: mat('#c0aa63'), dark: mat('#292f2d'), iron: mat('#4a514d', .63), linen: mat('#dfd6b5'),
    terracotta: mat('#ae7357'), flower: mat('#c48d7c'), water: new T.MeshStandardMaterial({ color: '#62918f', roughness: .22, metalness: .32, transparent: true, opacity: .88 }),
    window: new T.MeshStandardMaterial({ color: '#c7c3a2', emissive: '#d09b4d', emissiveIntensity: .24, roughness: .26 }),
    roadEdge: new T.MeshStandardMaterial({ color: '#ad9f82', roughness: .98, transparent: true, opacity: .35, depthWrite: false }),
    snow: new T.MeshStandardMaterial({ color: '#e4ece6', roughness: .95, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  };
  const textures = new Set();
  if (typeof document !== 'undefined') {
    const texture = (kind, base) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const c = canvas.getContext('2d'); c.fillStyle = base; c.fillRect(0, 0, 512, 512);
      let n = 7391; const random = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
      if (kind === 'roof') {
        for (let y = 0; y < 512; y += 32) for (let x = -32; x < 512; x += 64) {
          const xx = x + (y / 32 % 2) * 32, v = 117 + Math.floor(random() * 24);
          c.fillStyle = `rgb(${v - 2},${v + 1},${v})`; c.fillRect(xx, y, 63, 31);
          c.fillStyle = 'rgba(28,35,35,.24)'; c.fillRect(xx, y + 29, 64, 3); c.fillRect(xx + 61, y, 3, 32);
          c.fillStyle = 'rgba(244,239,212,.19)'; c.fillRect(xx + 3, y + 2, 57, 2);
          for (let j = 0; j < 4; j++) { c.strokeStyle = 'rgba(42,48,46,.07)'; c.beginPath(); c.moveTo(xx + random() * 64, y + 4); c.lineTo(xx + random() * 64, y + 28); c.stroke(); }
        }
      } else if (kind === 'stone') {
        for (let y = 0; y < 512; y += 64) for (let x = -64; x < 512; x += 128) {
          const xx = x + (y / 64 % 2) * 64, v = 142 + random() * 40;
          c.fillStyle = `rgb(${v + 6},${v + 5},${v - 1})`; c.fillRect(xx + 2, y + 2, 124, 60);
        }
      } else if (kind === 'wood') {
        for (let x = 0; x < 512; x += 32) {
          c.fillStyle = `rgba(34,29,21,${.06 + random() * .08})`; c.fillRect(x, 0, 2, 512);
          for (let j = 0; j < 7; j++) { c.strokeStyle = 'rgba(67,48,28,.13)'; c.beginPath(); c.moveTo(x + random() * 31, 0); c.bezierCurveTo(x - 3, 170, x + 32, 340, x + random() * 32, 512); c.stroke(); }
        }
      }
      for (let i = 0; i < 20000; i++) {
        const v = random() > .5 ? 255 : 0;
        c.fillStyle = `rgba(${v},${v},${v},${kind === 'grass' ? .022 : .04})`;
        c.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
      }
      if (kind === 'road') for (let i = 0; i < 320; i++) {
        c.fillStyle = random() > .45 ? 'rgba(67,62,49,.19)' : 'rgba(246,239,211,.24)'; c.beginPath(); c.ellipse(random() * 512, random() * 512, 3 + random() * 8, 2 + random() * 4, random() * Math.PI, 0, Math.PI * 2); c.fill();
      }
      const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; textures.add(t); return t;
    };
    const slate = texture('roof', '#8e9189'); M.roof.map = M.redroof.map = slate; M.roof.bumpMap = M.redroof.bumpMap = slate; M.roof.bumpScale = .045; M.redroof.bumpScale = .035;
    const plaster = texture('plaster', '#efe9db'); M.plaster.map = M.plaster.bumpMap = plaster; M.plaster.bumpScale = .025;
    const grass = texture('grass', '#b2b394'); grass.repeat.set(110, 110); M.grass.map = grass;
    const road = texture('road', '#d6c6a4'); M.road.map = M.road.bumpMap = road; M.road.bumpScale = .035;
    M.wood.map = texture('wood', '#b29a7b'); M.wood.bumpMap = M.wood.map; M.wood.bumpScale = .03;
    M.stone.map = texture('stone', '#a6a698'); M.stone.bumpMap = M.stone.map; M.stone.bumpScale = .025;
  }
  const waterTime = { value: 0 };
  M.water.onBeforeCompile = shader => {
    shader.uniforms.uRiverTime = waterTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRiverPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRiverPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRiverTime; varying vec3 vRiverPosition;').replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal.x+=sin(vRiverPosition.z*3.4+uRiverTime*1.3)*0.055; normal.y+=cos(vRiverPosition.x*2.9-uRiverTime)*0.035;normal=normalize(normal);').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=0.97+0.035*sin(vRiverPosition.x*4.0+vRiverPosition.z*2.0-uRiverTime*1.5);');
  };
  M.water.customProgramCacheKey = () => 'little-town-moving-water-v2';
  function mesh(g, m, position, parent = root) { const o = new T.Mesh(g, m); if (position) o.position.set(...position); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
  const box = (w, h, d, m, x, y, z, p = root) => mesh(new T.BoxGeometry(w, h, d), m, [x, y, z], p);
  const cyl = (rt, rb, h, n, m, x, y, z, p = root) => mesh(new T.CylinderGeometry(rt, rb, h, n), m, [x, y, z], p);
  function beam(a, b, r, m, p = root) { const av = new T.Vector3(...a), bv = new T.Vector3(...b), delta = bv.clone().sub(av); const o = cyl(r, r, delta.length(), 5, m, 0, 0, 0, p); o.position.copy(av.add(bv).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return o; }
  const riverX = z => -27 + Math.sin(z * .065) * 3;
  const terrainHeight = (x, z) => { const edge = Math.max(0, Math.min(1, (Math.hypot(x, z) - 48) / 45)); const bank = Math.max(0, Math.min(1, (Math.abs(x - riverX(z)) - 8) / 15)); return edge * bank * (1.7 + Math.sin(x * .065) * 1.2 + Math.cos(z * .071) * .8); };
  const groundGeometry = new T.PlaneGeometry(600, 600, 120, 120), positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, terrainHeight(positions.getX(i), -positions.getY(i)));
  groundGeometry.computeVertexNormals();
  const ground = mesh(groundGeometry, M.grass, [0, -.08, 0]); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  const hillMat = mat('#7f8c78');
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 145 + i % 3 * 14; const hill = mesh(new T.IcosahedronGeometry(1, 2), hillMat, [Math.cos(a) * r, -5, Math.sin(a) * r]); hill.scale.set(32 + i % 4 * 7, 14 + i % 5 * 5, 36 + i % 3 * 7); hill.castShadow = false; }
  const riverPoints = []; for (let z = -310; z <= 310; z += 3) riverPoints.push(new T.Vector3(riverX(z), 0, z));
  const riverShape = new T.Shape(); riverPoints.forEach((p, i) => i ? riverShape.lineTo(p.x - 3.8, -p.z) : riverShape.moveTo(p.x - 3.8, -p.z)); [...riverPoints].reverse().forEach(p => riverShape.lineTo(p.x + 3.8, -p.z)); riverShape.closePath();
  const river = mesh(new T.ShapeGeometry(riverShape), M.water, [0, .035, 0]); river.rotation.x = -Math.PI / 2; river.castShadow = false;
  const ripples = [];
  for (let i = 0; i < 30; i++) { const z = rand() * 150 - 75, x = riverX(z) + (rand() - .5) * 6; const r = box(.4 + rand() * 1.8, .01, .025, mat('#b3cbc0'), x, .075, z); r.castShadow = false; r.rotation.y = -.1; ripples.push({ mesh: r, z }); }
  const roads = [];
  function path(x, z, w, d) {
    function strip(width, depth, y, material) {
      const r = Math.min(width, depth) * .32, left = -width / 2, right = width / 2, bottom = -depth / 2, top = depth / 2;
      const shape = new T.Shape(); shape.moveTo(left + r, bottom); shape.lineTo(right - r, bottom); shape.quadraticCurveTo(right, bottom, right, bottom + r); shape.lineTo(right, top - r); shape.quadraticCurveTo(right, top, right - r, top); shape.lineTo(left + r, top); shape.quadraticCurveTo(left, top, left, top - r); shape.lineTo(left, bottom + r); shape.quadraticCurveTo(left, bottom, left + r, bottom); shape.closePath();
      const geometry = new T.ShapeGeometry(shape, 5), uv = geometry.attributes.uv, positions = geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, positions.getX(i) / 4, positions.getY(i) / 4);
      const o = mesh(geometry, material, [x, y, z]); o.rotation.x = -Math.PI / 2; o.castShadow = false; return o;
    }
    strip(w + .48, d + .48, .005, M.roadEdge); const o = strip(w, d, .026, M.road); roads.push({ x, z, w, d }); return o;
  }
  path(1, 0, 43, 3.2); path(0, 0, 3.2, 47); path(11, 12, 25, 2); path(12, -11, 23, 2); path(-11, 10, 2, 19); path(-10, -11, 20, 2); path(-25, 0, 13, 3.1);
  for (let i = 0; i < 23; i++) box(.45, .22, 4.1, M.wood, -32.5 + i * .48, .28, 0);
  for (const z of [-1.85, 1.85]) { for (let x = -32; x < -21; x += 2) box(.15, 1.25, .15, M.wood, x, .9, z); box(11.8, .13, .14, M.wood, -27, 1.4, z); box(11.8, .1, .12, M.wood, -27, .85, z); }
  const buildings = [], sails = [], chimneys = [], growth = [], trees = [], foliage = [];
  let initializing = true, instantPlacement = false;
  function roof(w, h, d, y, p, material = M.roof, z = 0) {
    const pitch = Math.atan2(h, w / 2), slope = Math.hypot(w / 2, h);
    for (const side of [-1, 1]) {
      const r = box(slope, .14, d, material, side * w / 4, y + h / 2, z, p); r.rotation.z = -side * pitch;
      const snow = box(slope, .025, d - .025, M.snow, side * w / 4, y + h / 2 + .09, z, p); snow.rotation.z = -side * pitch; snow.castShadow = false; snow.receiveShadow = false;
      beam([side * w / 2, y, z - d / 2 - .02], [0, y + h, z - d / 2 - .02], .065, M.wood, p);
      beam([side * w / 2, y, z + d / 2 + .02], [0, y + h, z + d / 2 + .02], .065, M.wood, p);
      box(.12, .12, d + .05, M.wood, side * w / 2, y - .04, z, p);
    }
    const shape = new T.Shape(); shape.moveTo(-w / 2 + .17, 0); shape.lineTo(0, h - .1); shape.lineTo(w / 2 - .17, 0); shape.closePath();
    const g = new T.ShapeGeometry(shape);
    const front = mesh(g, M.plaster, [0, y, z + d / 2 - .11], p);
    const back = mesh(g.clone(), M.plaster, [0, y, z - d / 2 + .11], p); back.rotation.y = Math.PI;
    box(.2, .15, d + .12, material, 0, y + h + .05, z, p);
    return front;
  }
  function windowUnit(x, y, z, p, rotation = 0, wide = .64) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rotation; p.add(g);
    box(wide + .14, .91, .11, M.timber, 0, 0, 0, g); box(wide, .74, .13, M.window, 0, .015, .02, g);
    box(.045, .76, .16, M.wood, 0, .02, .04, g); box(wide, .045, .16, M.wood, 0, .05, .04, g);
    box(wide + .24, .09, .25, M.stone, 0, -.46, .06, g);
    for (const side of [-1, 1]) { const shutter = box(wide * .38, .8, .08, M.wood, side * (wide * .68 + .03), 0, .04, g); shutter.rotation.y = side * -.2; box(wide * .35, .055, .09, M.timber, side * (wide * .68 + .03), -.24, .09, g); }
  }
  function batchPlacedBuilding(group) {
    root.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(), grouped = new Map(), originals = [], geometries = new Set();
    group.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const key = `${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
      if (!grouped.has(key)) grouped.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geometries: [] });
      const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld)); grouped.get(key).geometries.push(geometry); originals.push(o); geometries.add(o.geometry);
    });
    for (const part of grouped.values()) {
      const geometry = mergeGeometries(part.geometries, false); if (!geometry) throw new Error('Unable to batch placed building.');
      const combined = new T.Mesh(geometry, part.material); combined.castShadow = part.cast; combined.receiveShadow = part.receive; group.add(combined);
      for (const g of part.geometries) g.dispose();
    }
    for (const o of originals) o.removeFromParent(); for (const g of geometries) g.dispose();
  }
  function register(type, x, z, p, radius = 3, footprint) {
    const record = { type, x, z, mesh: p, position: p.position, radius, footprint: footprint || { w: radius * 2, d: radius * 2 }, userPlaced: !initializing };
    buildings.push(record);
    if (!initializing) batchPlacedBuilding(p);
    if (!initializing && !instantPlacement) { p.userData.targetScale = p.scale.clone(); p.scale.y = .04; growth.push({ p, age: 0 }); }
    return record;
  }
  function fence(x, z, w, d, p = root) {
    for (const dz of [-d / 2, d / 2]) { for (let xx = -w / 2; xx <= w / 2; xx += 1.8) box(.12, .85, .12, M.wood, x + xx, .42, z + dz, p); box(w, .075, .1, M.wood, x, .62, z + dz, p); box(w, .075, .1, M.wood, x, .32, z + dz, p); }
  }
  function field(cx, cz, w, d, p = root) {
    box(w, .07, d, M.soil, cx, .01, cz, p);
    for (let x = -w / 2 + .4; x < w / 2; x += .65) {
      box(.18, .13, d - .5, M.gold, cx + x, .12, cz, p);
      for (let z = -d / 2 + .5; z < d / 2; z += .75) {
        const crop = cyl(.035, .065, .65 + rand() * .22, 4, M.gold, cx + x, .34, cz + z, p); crop.castShadow = false;
        const ear = mesh(new T.SphereGeometry(.09, 4, 3), M.gold, [cx + x, .67, cz + z], p); ear.scale.set(.65, 1.7, .65); ear.castShadow = false;
      }
    }
    fence(cx, cz, w, d, p);
  }
  function building(type, x, z, rotation = 0) {
    const p = new T.Group(); p.name = `${type} at ${x},${z}`; p.position.set(x, 0, z); p.rotation.y = rotation; root.add(p);
    if (type === 'farm') { field(0, 0, 7, 7, p); return register(type, x, z, p, 5, { w: 8, d: 8 }); }
    if (type === 'well') {
      cyl(.97, 1.04, .72, 16, M.stone, 0, .36, 0, p); cyl(.69, .69, .04, 20, M.water, 0, .75, 0, p); cyl(1.07, 1.07, .13, 16, M.stone, 0, .79, 0, p);
      for (const xx of [-1, 1]) { box(.16, 2.5, .16, M.wood, xx, 1.25, 0, p); beam([xx, 1.2, 0], [xx * .4, 2.3, 0], .05, M.wood, p); }
      const axle = cyl(.075, .075, 2.35, 8, M.wood, 0, 1.85, 0, p); axle.rotation.z = Math.PI / 2;
      box(.035, .8, .035, M.linen, 0, 1.35, 0, p); cyl(.18, .14, .26, 8, M.wood, .5, .98, .25, p); roof(2.8, 1.05, 2.1, 2.3, p);
      return register(type, x, z, p, 2, { w: 3.2, d: 3 });
    }
    if (type === 'market') {
      box(4.9, .2, 4.2, M.stone, 0, .1, 0, p);
      for (const xx of [-2, 2]) for (const zz of [-1.6, 1.6]) box(.13, 2.75, .13, M.wood, xx, 1.45, zz, p);
      for (let i = 0; i < 10; i++) { const awning = box(.44, .09, 4.2, i % 2 ? M.linen : M.terracotta, -1.98 + i * .44, 2.9 + Math.cos(i / 9 * Math.PI) * .11, 0, p); awning.rotation.x = .09; }
      box(3.8, 1.03, 1, M.wood, 0, .68, 1.12, p);
      for (let i = 0; i < 5; i++) { box(.65, .17, .65, M.timber, -1.4 + i * .7, 1.26, 1.1, p); for (let j = 0; j < 5; j++) mesh(new T.SphereGeometry(.13, 5, 4), [M.gold, M.leaf, M.terracotta][i % 3], [-1.6 + i * .7 + j % 2 * .24, 1.42, .94 + Math.floor(j / 2) * .17], p); }
      cyl(.4, .35, .6, 9, M.wood, -2.2, .4, 2, p); box(.8, .75, .8, M.wood, 2.1, .48, -.7, p);
      return register(type, x, z, p, 3.3, { w: 5, d: 5 });
    }
    let w = 3.8, d = 4.6, h = 3.1;
    if (type === 'townhall') { w = 6.5; d = 6; h = 5; }
    if (type === 'church') { w = 5; d = 9; h = 5; }
    if (type === 'storehouse') { w = 6; d = 5; h = 3.7; }
    box(w + .35, .45, d + .35, M.stone, 0, .22, 0, p); box(w, h, d, M.plaster, 0, h / 2 + .4, 0, p);
    const roofHeight = Math.min(w * .59, 3); roof(w + .8, roofHeight, d + .8, h + .4, p, type === 'townhall' ? M.redroof : M.roof);
    for (const xx of [-w / 2, w / 2]) for (const zz of [-d / 2, d / 2]) box(.18, h + .05, .18, M.timber, xx, h / 2 + .42, zz, p);
    for (const zz of [-d / 2 - .035, d / 2 + .035]) {
      box(w, .17, .14, M.timber, 0, 1.03, zz, p); box(w, .18, .14, M.timber, 0, h + .27, zz, p);
      for (let xx = -w / 2 + .65; xx < w / 2; xx += 1.6) { box(.1, h, .12, M.timber, xx, h / 2 + .4, zz, p); beam([xx - .54, 1.1, zz], [xx, h + .2, zz], .045, M.timber, p); }
      for (let xx = -w / 2 + .82; xx < w / 2 - .25; xx += 1.6) { if (zz > 0 && Math.abs(xx) < .7) continue; windowUnit(xx, 2.02, zz + (zz > 0 ? .08 : -.08), p, zz > 0 ? 0 : Math.PI); }
    }
    for (const side of [-1, 1]) { box(.12, .17, d, M.timber, side * w / 2, 1.03, 0, p); box(.13, .17, d, M.timber, side * w / 2, h + .25, 0, p); for (const zz of [-d * .26, d * .26]) windowUnit(side * (w / 2 + .05), 2.02, zz, p, side * Math.PI / 2); }
    box(1.16, 1.91, .17, M.stone, 0, 1.29, d / 2 + .08, p); box(.89, 1.7, .19, M.wood, 0, 1.22, d / 2 + .18, p);
    for (const yy of [.8, 1.65]) box(.7, .07, .025, M.iron, 0, yy, d / 2 + .29, p);
    cyl(.055, .055, .04, 8, M.gold, .27, 1.2, d / 2 + .31, p).rotation.x = Math.PI / 2;
    box(1.5, .15, .8, M.stone, 0, .41, d / 2 + .4, p); box(1.7, .12, .35, M.stone, 0, .23, d / 2 + .8, p);
    if (type !== 'church') {
      box(.63, 1.65, .65, M.stone, w * .25, h + 1.2, -d * .2, p); box(.83, .18, .83, M.stone, w * .25, h + 2.03, -d * .2, p); box(.48, .03, .48, M.dark, w * .25, h + 2.14, -d * .2, p);
      chimneys.push(new T.Vector3(x + w * .25 * Math.cos(rotation) - (-d * .2) * Math.sin(rotation), h + 2.2, z + w * .25 * Math.sin(rotation) + (-d * .2) * Math.cos(rotation)));
    }
    if (type === 'house') {
      const variation = .92 + Math.abs(x * 13 + z * 7) % 11 / 65; p.scale.set(variation, .93 + Math.abs(x * 7 + z * 3) % 9 / 50, variation);
      const awning = box(1.8, .1, 1.05, M.roof, 0, 2.3, d / 2 + .42, p); awning.rotation.x = .12;
      for (const xx of [-.72, .72]) beam([xx, 1.65, d / 2 + .1], [xx, 2.21, d / 2 + .83], .045, M.wood, p);
      for (const xx of [-w / 2 + .7, w / 2 - .7]) { box(.9, .22, .36, M.wood, xx, 1.45, d / 2 + .22, p); for (let j = 0; j < 4; j++) { mesh(new T.SphereGeometry(.14, 5, 4), M.leaf, [xx - .31 + j * .21, 1.67, d / 2 + .22], p); mesh(new T.SphereGeometry(.055, 4, 3), M.flower, [xx - .31 + j * .21, 1.8, d / 2 + .27], p); } }
    }
    if (type === 'church') {
      const towerZ = d / 2 - .55; box(2.45, 8, 2.65, M.stone, 0, 4.2, towerZ, p); roof(3.15, 3.6, 3.1, 8.2, p, M.roof, towerZ);
      for (const side of [-1, 1]) { box(.3, 4.7, .7, M.stone, side * (w / 2 + .12), 2.5, 0, p); box(.3, 4.7, .7, M.stone, side * (w / 2 + .12), 2.5, -d * .35, p); }
      box(.13, 1.35, .13, M.iron, 0, 12.17, towerZ, p); box(.8, .11, .11, M.iron, 0, 12.34, towerZ, p);
      for (const side of [-1, 1]) windowUnit(side * 1.26, 6.6, towerZ, p, side * Math.PI / 2, .48);
      const clock = cyl(.49, .49, .06, 24, M.linen, 0, 7.05, towerZ + 1.36, p); clock.rotation.x = Math.PI / 2;
      box(.035, .32, .035, M.dark, 0, 7.17, towerZ + 1.41, p); const hand = box(.29, .035, .035, M.dark, .1, 7.05, towerZ + 1.41, p); hand.rotation.z = -.4;
    }
    if (type === 'townhall') { for (const xx of [-2, 2]) windowUnit(xx, 4.02, d / 2 + .1, p); box(1.8, .65, .07, M.terracotta, 0, 3.95, d / 2 + .13, p); }
    if (type === 'windmill') {
      cyl(1.3, 2, 6, 12, M.plaster, 0, 3, 0, p); roof(3.3, 2, 3.3, 6, p); const s = new T.Group(); s.position.set(0, 5.5, 2.65); p.add(s);
      for (let i = 0; i < 4; i++) { const arm = new T.Group(); arm.rotation.z = i * Math.PI / 2; s.add(arm); box(.17, 5.6, .14, M.wood, 0, 1.25, 0, arm); box(.85, 2.5, .07, M.linen, .3, 2.05, .04, arm); for (let j = 0; j < 5; j++) box(.92, .05, .1, M.wood, .3, .9 + j * .56, .1, arm); }
      cyl(.3, .3, .4, 10, M.wood, 0, 5.5, 2.7, p).rotation.x = Math.PI / 2; sails.push(s);
    }
    if (type === 'lumber') {
      for (let row = 0; row < 3; row++) for (let j = 0; j < 5 - row; j++) { const log = cyl(.23, .23, 3.7, 8, M.wood, w / 2 + .8 + row * .05, .3 + row * .42, -1.2 + j * .49, p); log.rotation.x = Math.PI / 2; const end = cyl(.2, .2, .03, 8, M.gold, w / 2 + .8 + row * .05, .3 + row * .42, .67 + j * .49, p); end.rotation.x = Math.PI / 2; }
      box(2, .15, 3.5, M.wood, -w / 2 - .8, .9, 0, p); beam([-w / 2 - 1.5, .2, -1], [-w / 2 - .4, .9, -1], .07, M.wood, p); beam([-w / 2 - .4, .2, 1], [-w / 2 - 1.5, .9, 1], .07, M.wood, p);
    }
    return register(type, x, z, p, type === 'church' ? 5.5 : type === 'lumber' ? 4.5 : 3.2, { w: w + .8 + (type === 'lumber' ? 3 : 0), d: d + 1.3 });
  }
  building('townhall', 7, -5, Math.PI); building('church', 13, -17, Math.PI); building('storehouse', -8, -6); building('market', 5, 5);
  [[-6, 5, 0], [-7, 14, 0], [6, 16, Math.PI / 2], [15, 6, Math.PI / 2], [-16, -6, 0], [5, -14, 0]].forEach(([x, z, r]) => building('house', x, z, r));
  building('windmill', 18, 26); building('lumber', -15, 17); building('well', 9, 9);
  for (const [x, z, w] of [[7, 30, 10], [-7, 30, 11]]) { const group = new T.Group(); root.add(group); group.position.set(x, 0, z); field(0, 0, w, 11, group); register('farm', x, z, group, 6.2, { w: w + .4, d: 11.4 }); }
  function occupiedTreePosition(x, z) {
    if (Math.abs(x - riverX(z)) < 6 || Math.abs(z) < 3) return true;
    if (buildings.some(b => Math.abs(x - b.x) < b.footprint.w / 2 + 2.4 && Math.abs(z - b.z) < b.footprint.d / 2 + 2.4)) return true;
    if (Math.abs(x) < 28 && z > -30 && z < 38) return true;
    return false;
  }
  function tree(x, z, scale = 1) {
    if (occupiedTreePosition(x, z)) return;
    const p = new T.Group(); p.position.set(x, terrainHeight(x, z), z); p.scale.setScalar(scale); root.add(p); cyl(.13, .23, 2.6, 6, M.trunk, 0, 1.3, 0, p);
    const col = mat(['#486246', '#56774b', '#658152', '#6d8655'][Math.floor(rand() * 4)]); if (!foliage.includes(col)) foliage.push(col);
    if (rand() < .45) for (let j = 0; j < 3; j++) cyl(0, 1.5 - j * .26, 2.5, 8, col, 0, 2.3 + j * 1.05, 0, p);
    else { mesh(new T.IcosahedronGeometry(1.65, 1), col, [0, 3.2, 0], p); mesh(new T.IcosahedronGeometry(1.15, 1), col, [.9, 2.9, .3], p); mesh(new T.IcosahedronGeometry(1.2, 1), col, [-.6, 2.8, -.55], p); }
    trees.push({ x, z, radius: scale * 2 }); return p;
  }
  for (let i = 0; i < 580; i++) { const x = rand() * 156 - 78, z = rand() * 156 - 78; tree(x, z, .65 + rand() * .7); }
  // Vegetation around the shore follows the river instead of crossing cultivated land.
  for (let i = 0; i < 65; i++) {
    const z = rand() * 140 - 70, x = riverX(z) + (rand() > .5 ? 4.5 : -4.5); if (Math.abs(z) < 3) continue;
    const o = mesh(new T.DodecahedronGeometry(.2 + rand() * .6), M.stone, [x, .1, z]); o.scale.y = .55;
    if (i % 3 === 0) for (let j = 0; j < 4; j++) { const reed = cyl(.018, .035, .7 + rand() * .5, 3, M.leaf, x + (rand() - .5) * .5, .45, z + (rand() - .5) * .5); reed.rotation.z = (rand() - .5) * .25; }
  }
  const square = cyl(4.6, 4.6, .05, 12, M.road, 0, .04, 0); square.rotation.y = Math.PI / 12;
  cyl(1.65, 1.8, .4, 16, M.stone, 0, .23, 0); cyl(1.4, 1.4, .05, 24, M.water, 0, .46, 0); cyl(.3, .45, 1.8, 12, M.stone, 0, 1, 0); cyl(.85, .3, .2, 16, M.stone, 0, 1.9, 0); cyl(.65, .65, .04, 20, M.water, 0, 2.02, 0);
  for (const [x, z] of [[-3, 4], [3, -3], [10, 2], [-10, 2]]) { box(1.8, .14, .6, M.wood, x, .65, z); for (const a of [-.65, .65]) box(.13, .6, .4, M.wood, x + a, .3, z); box(1.8, .55, .12, M.wood, x, .95, z - .25); }
  function barrel(x, z) { cyl(.34, .29, .72, 10, M.wood, x, .36, z); for (const y of [.15, .55]) cyl(.35, .35, .04, 10, M.iron, x, y, z); }
  for (const [x, z] of [[-4, 7], [-5, 8], [-8, -9.4], [-9, -9.4], [3.8, 7.7], [16.8, 4], [-17, 14]]) barrel(x, z);
  for (let i = 0; i < 30; i++) { const x = (rand() - .5) * 42, z = (rand() - .5) * 40; if (buildings.some(b => Math.hypot(x - b.x, z - b.z) < b.radius + 1) || Math.abs(x) < 3 || Math.abs(z) < 3) continue; const bush = mesh(new T.IcosahedronGeometry(.5, 1), M.leaf, [x, .32, z]); bush.scale.set(1, .7, 1); }
  const walkers = [];
  for (let i = 0; i < 24; i++) {
    const p = new T.Group(); root.add(p); const cloth = mat(['#7e6754', '#6c7880', '#9d745f', '#879078', '#a18d61'][i % 5]);
    cyl(.16, .21, .52, 7, cloth, 0, .64, 0, p); mesh(new T.SphereGeometry(.14, 7, 6), mat('#cfb295'), [0, 1.01, 0], p);
    const left = box(.11, .36, .11, M.timber, -.1, .22, 0, p), right = box(.11, .36, .11, M.timber, .1, .22, 0, p);
    const armL = box(.08, .36, .08, cloth, -.22, .62, 0, p), armR = box(.08, .36, .08, cloth, .22, .62, 0, p);
    if (i % 4 === 0) cyl(.23, .23, .045, 8, M.gold, 0, 1.12, 0, p);
    walkers.push({ p, left, right, armL, armR, phase: rand() * Math.PI * 2, speed: .4 + rand() * .35, axis: i % 2, offset: (rand() - .5) * 1.8 });
  }
  const birds = [];
  for (let i = 0; i < 7; i++) { const p = new T.Group(); root.add(p); const a = box(.65, .035, .17, M.dark, -.3, 0, 0, p), b = box(.65, .035, .17, M.dark, .3, 0, 0, p); birds.push({ p, a, b, phase: rand() * 6.28 }); }
  const smokePositions = new Float32Array(512 * 7 * 3);
  const smokeGeometry = new T.BufferGeometry(); smokeGeometry.setAttribute('position', new T.BufferAttribute(smokePositions, 3)); smokeGeometry.setDrawRange(0, chimneys.length * 7);
  const smokeMaterial = new T.PointsMaterial({ color: '#d7d8c9', size: .72, transparent: true, opacity: .24, depthWrite: false, sizeAttenuation: true });
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31); gradient.addColorStop(0, 'rgba(255,255,255,.75)'); gradient.addColorStop(.38, 'rgba(255,255,255,.42)'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    const puff = new T.CanvasTexture(canvas); textures.add(puff); smokeMaterial.map = puff;
  }
  const smokeCloud = new T.Points(smokeGeometry, smokeMaterial); smokeCloud.frustumCulled = false; root.add(smokeCloud);
  const dynamicRoots = new Set([...sails, ...ripples.map(r => r.mesh), ...walkers.map(v => v.p), ...birds.map(v => v.p)]);
  root.updateMatrixWorld(true);
  const batches = new Map(), originals = [], sourceGeometries = new Set();
  root.traverse(o => {
    if (!o.isMesh) return; for (let p = o; p && p !== root; p = p.parent) if (dynamicRoots.has(p)) return;
    if (Array.isArray(o.material)) return;
    const key = `${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, geometries: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); batches.get(key).geometries.push(g); originals.push(o); sourceGeometries.add(o.geometry);
  });
  for (const batch of batches.values()) {
    const geometry = mergeGeometries(batch.geometries, false); if (!geometry) throw new Error('Unable to batch village geometry.');
    const merged = new T.Mesh(geometry, batch.material); merged.castShadow = batch.cast; merged.receiveShadow = batch.receive; merged.name = 'Static village batch'; root.add(merged); for (const g of batch.geometries) g.dispose();
  }
  for (const o of originals) o.removeFromParent();
  // The dedicated picking ground remains available without being rendered twice.
  for (const geometry of sourceGeometries) if (geometry !== groundGeometry) geometry.dispose();
  initializing = false;
  let activeSeason = '', night = 0;
  const grassColors = { Primavera: '#899a73', Verano: '#85935f', 'Otoño': '#a49a70', Invierno: '#c3cdc0' };
  const leafColors = { Primavera: ['#486d45', '#5b7a4d', '#668654', '#7b8d58'], Verano: ['#42653e', '#537448', '#5c7c46', '#6a844b'], 'Otoño': ['#977444', '#a5894a', '#9b693c', '#a99a59'], Invierno: ['#778578', '#8b9787', '#9eaa99', '#98a18d'] };
  function setSeason(name) { if (name === activeSeason || !grassColors[name]) return; activeSeason = name; M.grass.color.set(grassColors[name]); foliage.forEach((material, i) => material.color.set(leafColors[name][i % 4])); M.gold.color.set(name === 'Invierno' ? '#aa9e79' : name === 'Primavera' ? '#b9b16a' : '#c0aa63'); M.snow.opacity = name === 'Invierno' ? .78 : 0; }
  function setNight(amount) { night = Math.max(0, Math.min(1, amount)); M.window.emissiveIntensity = .22 + night * 2.7; M.window.color.set(night > .4 ? '#dfbd75' : '#c7c3a2'); }
  function validatePlacement(type, x, z) {
    if (!['house', 'lumber', 'farm', 'market', 'well', 'church'].includes(type) || !Number.isFinite(x) || !Number.isFinite(z)) return { ok: false, reason: 'Selecciona un edificio válido.' };
    const radius = type === 'farm' ? 5 : type === 'church' ? 5.5 : type === 'well' ? 2 : type === 'lumber' ? 4.5 : 3.2;
    if (Math.abs(x) + radius > 53 || Math.abs(z) + radius > 53) return { ok: false, reason: 'Construye dentro de los límites del valle.' };
    if (Math.abs(x - riverX(z)) < 4.8 + radius) return { ok: false, reason: 'Deja libre la ribera del río.' };
    if (buildings.some(b => Math.hypot(x - b.x, z - b.z) < radius + b.radius + .35)) return { ok: false, reason: 'Deja espacio entre edificios y campos.' };
    if (roads.some(r => Math.abs(x - r.x) < r.w / 2 + radius * .65 && Math.abs(z - r.z) < r.d / 2 + radius * .65)) return { ok: false, reason: 'Los caminos deben quedar libres.' };
    if (trees.some(t => Math.hypot(x - t.x, z - t.z) < radius + t.radius * .65)) return { ok: false, reason: 'Busca un claro libre de árboles.' };
    return { ok: true, reason: '' };
  }
  function update(dt, time, state) {
    if (state?.season) setSeason(state.season); if (Number.isFinite(state?.daylight)) setNight(1 - state.daylight); waterTime.value = time;
    sails.forEach(s => { s.rotation.z -= dt * .25; });
    ripples.forEach((r, i) => { r.mesh.position.z = r.z + Math.sin(time * .08 + i) * .8; r.mesh.position.y = .075 + Math.sin(time + i) * .004; });
    walkers.forEach(v => {
      const q = Math.sin(time * v.speed * .1 + v.phase) * 19, direction = Math.cos(time * v.speed * .1 + v.phase);
      if (v.axis) { v.p.position.set(v.offset, Math.abs(Math.sin(time * 6 + v.phase)) * .025, q); v.p.rotation.y = direction > 0 ? 0 : Math.PI; }
      else { v.p.position.set(q, Math.abs(Math.sin(time * 6 + v.phase)) * .025, v.offset); v.p.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2; }
      const stride = Math.sin(time * 6 + v.phase) * .42; v.left.rotation.x = stride; v.right.rotation.x = -stride; v.armL.rotation.x = -stride * .7; v.armR.rotation.x = stride * .7;
    });
    birds.forEach((b, i) => { const t = time * .09 + b.phase; b.p.position.set(Math.cos(t) * (23 + i), 17 + i * .5, Math.sin(t) * (23 + i)); b.p.rotation.y = -t; b.a.rotation.z = Math.sin(time * 5 + i) * .25; b.b.rotation.z = -Math.sin(time * 5 + i) * .25; });
    for (let c = 0; c < Math.min(chimneys.length, 512); c++) for (let j = 0; j < 7; j++) { const age = (time * .16 + j / 7 + c * .11) % 1, base = chimneys[c], index = (c * 7 + j) * 3; smokePositions[index] = base.x + age * 1.5 + Math.sin(age * 7 + c) * .16; smokePositions[index + 1] = base.y + age * 3; smokePositions[index + 2] = base.z + age * .5; }
    smokeGeometry.setDrawRange(0, Math.min(chimneys.length, 512) * 7); smokeGeometry.attributes.position.needsUpdate = true;
    for (let i = growth.length - 1; i >= 0; i--) { const item = growth[i]; item.age += dt; const t = Math.min(1, item.age / .85), eased = 1 - Math.pow(1 - t, 3); item.p.scale.y = Math.max(.04, eased) * item.p.userData.targetScale.y; if (t >= 1) growth.splice(i, 1); }
  }
  function dispose() {
    root.removeFromParent(); const geometries = new Set([groundGeometry]), materials = new Set([M.water, M.window, M.snow, smokeMaterial, ...materialCache.values()]);
    root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material && !Array.isArray(o.material)) materials.add(o.material); });
    for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
  }
  return { update, buildings, terrainHeight, validatePlacement, setSeason, setNight, dispose,
    pickGround(raycaster) { return raycaster.intersectObject(ground)[0]?.point || null; },
    placeBuilding(type, x, z, options = {}) { instantPlacement = options.instant === true; try { return building(type, x, z); } finally { instantPlacement = false; } },
    getPlacedBuildings() { return buildings.filter(b => b.userPlaced).map(({ type, x, z }) => ({ type, x, z })); },
  };
}
