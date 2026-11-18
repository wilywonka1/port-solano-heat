// Low-poly pedestrian humanoids: wander sidewalks, flee danger, fall when hit.
import { streetX, streetZ, COLS, ROWS } from './config.js';
const SHIRTS = [0xe85d4a, 0x2ec4b6, 0xf2c41c, 0x7a9fe8, 0xf2f2f2, 0x9b59c9, 0x39b56a, 0xe2792e];
export function makeHumanoid(shirt, pants) {
  const g = new THREE.Group();
  const sm = new THREE.MeshLambertMaterial({ color: shirt });
  const pm = new THREE.MeshLambertMaterial({ color: pants || 0x33415c });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), sm); torso.position.y = 1.12; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin); head.position.y = 1.78; g.add(head);
  const mk = (mat, w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const armL = mk(sm, 0.18, 0.68, 0.18); armL.geometry.translate(0, -0.3, 0); armL.position.set(-0.42, 1.42, 0); g.add(armL);
  const armR = mk(sm, 0.18, 0.68, 0.18); armR.geometry.translate(0, -0.3, 0); armR.position.set(0.42, 1.42, 0); g.add(armR);
  const legL = mk(pm, 0.22, 0.78, 0.22); legL.geometry.translate(0, -0.36, 0); legL.position.set(-0.16, 0.76, 0); g.add(legL);
  const legR = mk(pm, 0.22, 0.78, 0.22); legR.geometry.translate(0, -0.36, 0); legR.position.set(0.16, 0.76, 0); g.add(legR);
  g.userData.limbs = { armL, armR, legL, legR };
  return g;
}
export function animateHumanoid(g, t, speed) {
  const s = Math.sin(t * (4 + speed * 2)) * Math.min(0.7, 0.25 + speed * 0.12);
  const L = g.userData.limbs; if (!L) return;
  L.legL.rotation.x = s; L.legR.rotation.x = -s; L.armL.rotation.x = -s * 0.8; L.armR.rotation.x = s * 0.8;
}
export class Peds {
  constructor(scene, count) {
    this.list = [];
    for (let i = 0; i < count; i++) {
      const mesh = makeHumanoid(SHIRTS[i % SHIRTS.length]);
      const vertical = Math.random() < 0.5;
      const si = Math.floor(Math.random() * (COLS + 1)), sj = Math.floor(Math.random() * (ROWS + 1));
      const x = vertical ? streetX(si) + (Math.random() < 0.5 ? -8.5 : 8.5) : -100 + Math.random() * 200;
      const z = vertical ? -120 + Math.random() * 240 : streetZ(sj) + (Math.random() < 0.5 ? -8.5 : 8.5);
      mesh.position.set(x, 0, z); scene.add(mesh);
      this.list.push({ mesh, health: 100, state: 'walk', timer: 0, dir: Math.random() * Math.PI * 2, speed: 1.2 + Math.random(), phase: Math.random() * 9, down: 0, vertical, line: vertical ? x : z, axis: vertical ? 'z' : 'x', sense: Math.random() < 0.5 ? 1 : -1 });
    }
  }
  scare(x, z, radius) { for (const p of this.list) { const d = (p.mesh.position.x - x) ** 2 + (p.mesh.position.z - z) ** 2; if (d < radius * radius && p.state === 'walk') { p.state = 'flee'; p.timer = 2.5; p.dir = Math.atan2(p.mesh.position.x - x, p.mesh.position.z - z); } } }
  hit(p, dmg, fromX, fromZ) {
    p.health -= dmg; p.state = 'down'; p.down = p.health <= 0 ? 6 : 2.2; p.mesh.rotation.x = Math.PI / 2 * 0.9; p.mesh.position.y = 0.25;
    return p.health <= 0;
  }
  update(dt, t, playerPos, danger) {
    for (const p of this.list) {
      const m = p.mesh;
      if (p.state === 'down') { p.down -= dt; if (p.down <= 0 && p.health > 0) { p.state = 'walk'; m.rotation.x = 0; m.position.y = 0; } continue; }
      let sp = p.speed;
      if (p.state === 'flee') { p.timer -= dt; sp = 4.2; if (p.timer <= 0) p.state = 'walk'; }
      else {
        // walk along sidewalk line
        if (p.axis === 'z') { m.position.z += p.sense * sp * dt; if (m.position.z > 135 || m.position.z < -135) p.sense *= -1; m.rotation.y = p.sense > 0 ? 0 : Math.PI; animateHumanoid(m, t + p.phase, sp); continue; }
        else { m.position.x += p.sense * sp * dt; if (m.position.x > 125 || m.position.x < -125) p.sense *= -1; m.rotation.y = p.sense > 0 ? Math.PI / 2 : -Math.PI / 2; animateHumanoid(m, t + p.phase, sp); continue; }
      }
      m.position.x += Math.sin(p.dir) * sp * dt; m.position.z += Math.cos(p.dir) * sp * dt;
      m.position.x = Math.max(-126, Math.min(126, m.position.x)); m.position.z = Math.max(-138, Math.min(138, m.position.z));
      m.rotation.y = p.dir; animateHumanoid(m, t + p.phase, sp);
      if (danger) { const d = (m.position.x - playerPos.x) ** 2 + (m.position.z - playerPos.z) ** 2; if (d < 36 && p.state === 'walk') this.scare(playerPos.x, playerPos.z, 7); }
    }
  }
}
