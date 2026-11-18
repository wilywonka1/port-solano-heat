// Port Solano city builder: grid streets, districts, beach, marina, props, collision boxes.
import { STEP, ROAD_W, COLS, ROWS, OX, OZ, WATER_X, streetX, streetZ } from './config.js';
let seed = 7;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function mat(c, e) { const m = new THREE.MeshLambertMaterial({ color: c }); if (e) { m.emissive = new THREE.Color(e); } return m; }
function box(w, h, d, c, x, y, z, e) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, e)); m.position.set(x, y, z); return m; }

export function buildCity(scene) {
  const colliders = []; const group = new THREE.Group(); scene.add(group);
  // ground base
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), mat(0x9db38a));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 0); group.add(ground);
  // roads vertical & horizontal
  for (let i = 0; i <= COLS; i++) {
    const x = streetX(i);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, CITY_D() ), mat(0x3a3f46));
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.01, 0); group.add(r);
    for (let z = -CITY_D() / 2 + 6; z < CITY_D() / 2 - 4; z += 10) group.add(box(0.35, 0.02, 3.4, 0xf5eeda, x, 0.03, z));
    // sidewalks
    group.add(box(2, 0.12, CITY_D(), 0xb8b0a0, x - ROAD_W / 2 - 1, 0.06, 0));
    group.add(box(2, 0.12, CITY_D(), 0xb8b0a0, x + ROAD_W / 2 + 1, 0.06, 0));
  }
  for (let j = 0; j <= ROWS; j++) {
    const z = streetZ(j);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(CITY_W2(), ROAD_W), mat(0x3a3f46));
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.012, z); group.add(r);
    for (let x = -CITY_W2() / 2 + 6; x < CITY_W2() / 2 - 4; x += 10) group.add(box(3.4, 0.02, 0.35, 0xf5eeda, x, 0.03, z));
  }
  function CITY_D() { return ROWS * STEP + STEP; }
  function CITY_W2() { return COLS * STEP + STEP; }
  // crosswalks at centre intersection
  for (let k = -2; k <= 2; k++) { group.add(box(0.7, 0.02, 5, 0xffffff, streetX(2) + k * 1.6, 0.04, streetZ(3) - 8)); group.add(box(0.7, 0.02, 5, 0xffffff, streetX(2) + k * 1.6, 0.04, streetZ(3) + 8)); }
  // blocks: buildings / houses
  const palette = [0xf2c894, 0xe88f6a, 0x9fd8d0, 0xf5e6c8, 0xd9a7c7, 0xa8c8ec, 0xf7d774];
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0xffca55 });
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const cx = OX + i * STEP + STEP / 2, cz = OZ + j * STEP + STEP / 2;
    const downtown = (i >= 1 && i <= 3 && j >= 2 && j <= 4);
    const suburb = (i === 0 || j === 0 || j === ROWS - 1);
    if (suburb && rnd() > 0.25) {
      // houses: 2 per block
      for (const [hx, hz] of [[cx - 8, cz - 7], [cx + 8, cz + 7]]) {
        const h = box(11, 5, 9, palette[Math.floor(rnd() * palette.length)], hx, 2.5, hz); group.add(h);
        const roof = box(12, 1.2, 10, 0xb5502f, hx, 5.6, hz); group.add(roof);
        colliders.push({ minX: hx - 6, maxX: hx + 6, minZ: hz - 5, maxZ: hz + 5 });
        group.add(box(2.4, 2, 0.2, 0xffe9a0, hx, 1.6, hz - 4.6, 0xaa7722));
      }
      // lawn palms / trees
      group.add(makePalm(cx + (rnd() * 10 - 5), cz + (rnd() * 10 - 5)));
    } else {
      const tall = downtown ? 22 + rnd() * 30 : 9 + rnd() * 14;
      const w = 20 + rnd() * 6, d = 20 + rnd() * 6;
      const b = box(w, tall, d, palette[Math.floor(rnd() * palette.length)], cx, tall / 2, cz); group.add(b);
      group.add(box(w + 1, 1, d + 1, 0x8a6f55, cx, tall + 0.5, cz));
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      // lit windows grid on two faces
      const rowsW = Math.floor(tall / 4), colsW = Math.floor(w / 4);
      for (let wy = 0; wy < rowsW; wy++) for (let wx = 0; wx < colsW; wx++) {
        if (rnd() < 0.45) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), winMat);
        win.position.set(cx - w / 2 + 2.5 + wx * 4, 3 + wy * 4, cz - d / 2 - 0.06); win.rotation.y = Math.PI; group.add(win);
      }
    }
    // streetlights + benches + hydrants at block corners
    const lx = cx - STEP / 2 + 4, lz = cz - STEP / 2 + 4;
    const pole = box(0.3, 5.5, 0.3, 0x444444, lx, 2.75, lz); group.add(pole);
    group.add(box(1, 0.4, 1, 0xffe9a0, lx, 5.6, lz, 0xffcc66));
    if (rnd() > 0.4) group.add(box(2.2, 0.5, 0.7, 0x7a5230, cx + 12, 0.5, cz - 15));
    if (rnd() > 0.5) group.add(box(0.6, 1, 0.6, 0xd23b2e, cx - 13, 0.5, cz + 14));
    if (rnd() > 0.3) group.add(makePalm(cx - 14, cz - 14));
  }
  // beach + water east
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(28, 340), mat(0xe8d8a8)); sand.rotation.x = -Math.PI / 2; sand.position.set(WATER_X + 8, 0.02, 0); group.add(sand);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(180, 420), new THREE.MeshLambertMaterial({ color: 0x1e90c8, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2; water.position.set(WATER_X + 110, 0.15, 0); group.add(water);
  for (let z = -120; z <= 120; z += 24) group.add(makePalm(WATER_X + 4, z + rnd() * 6));
  // marina docks + boats south-east
  for (let k = 0; k < 4; k++) {
    const dz = 28 + k * 14;
    group.add(box(36, 0.8, 3, 0x8a6f55, WATER_X + 26, 0.5, dz));
    for (const bx of [WATER_X + 16, WATER_X + 34]) {
      const boat = new THREE.Group();
      boat.add(box(7, 1.4, 2.6, k % 2 ? 0xffffff : 0xe85d4a, 0, 0.8, 0));
      boat.add(box(2.4, 1.6, 2, 0x9fd8d0, -0.5, 2, 0));
      boat.add(box(0.2, 4, 0.2, 0x666666, 1.4, 3, 0));
      boat.position.set(bx, 0.2, dz + 3.5); group.add(boat);
    }
  }
  // café awning marker building near beach, hospital & station signs
  group.add(box(14, 6, 10, 0xfff2d0, 118, 3, -104)); colliders.push({ minX: 111, maxX: 125, minZ: -109, maxZ: -99 });
  group.add(box(15, 1, 11, 0xe85d4a, 118, 6.5, -104));
  group.add(box(10, 8, 8, 0xffffff, -88, 4, 124)); colliders.push({ minX: -93, maxX: -83, minZ: 120, maxZ: 128 });
  group.add(box(10, 8, 8, 0x5a7ec8, -88, 4, -124)); colliders.push({ minX: -93, maxX: -83, minZ: -128, maxZ: -120 });
  // signs
  for (const [sx, sz, c] of [[118, -96, 0xe85d4a], [-88, 116, 0xffffff], [-88, -116, 0x5a7ec8]]) group.add(box(4, 1.2, 0.3, c, sx, 7.5, sz, 0x333333));
  return { colliders, group, water };
}
export function makePalm(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), new THREE.MeshLambertMaterial({ color: 0x9a7448 }));
  trunk.position.y = 3; g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.15, 0.9), new THREE.MeshLambertMaterial({ color: 0x3fae4a }));
    leaf.position.y = 6.2; leaf.rotation.y = (i / 5) * Math.PI * 2; leaf.rotation.z = 0.35; leaf.translateX(1.6); g.add(leaf);
  }
  g.position.set(x, 0, z); return g;
}
export function collides(colliders, x, z, r) {
  for (const c of colliders) if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return c;
  return null;
}
export function resolveCollision(colliders, pos, r) {
  const c = collides(colliders, pos.x, pos.z, r); if (!c) return;
  const dxl = pos.x - (c.minX - r), dxr = (c.maxX + r) - pos.x, dzl = pos.z - (c.minZ - r), dzr = (c.maxZ + r) - pos.z;
  const m = Math.min(dxl, dxr, dzl, dzr);
  if (m === dxl) pos.x = c.minX - r; else if (m === dxr) pos.x = c.maxX + r; else if (m === dzl) pos.z = c.minZ - r; else pos.z = c.maxZ + r;
}
