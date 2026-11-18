// Four-mission story for Solano Heat plus golden conch collectibles.
import { LOC } from './config.js';
export const MISSIONS = [
  { name: 'M1 — First Run for Rosa', reward: 250 },
  { name: 'M2 — Hot Slice', reward: 400 },
  { name: 'M3 — Lose the Heat', reward: 600 },
  { name: 'M4 — The Marina Score', reward: 1200 },
];
export const DIALOG = {
  rosa1: ['Rosa Delgado', "Juno Vale, right? Tito said you drive like the tide — fast and hard to stop. Take my courier car, grab Sorin's package at the marina, drop it at Solano Tower. Earn your keep."],
  rosa2: ['Rosa Delgado', "Good hands. Now a hot slice run — three drops, clock's ticking. Tito left you a little gift in the glovebox: a pistol. Port Solano provides."],
  tito: ['Tito Marlin', "Name's Tito. I keep the wheels turning in this town. Rosa's heat is your heat now — shake those stars, kid."],
  sorin: ['Cpt. Ilya Sorin', "Harbormaster Sorin. My marina, my rules. Five bags, one car, and every badge in Solano watching. Bring me my score, Vale."],
  done: ['Rosa Delgado', "You did it, Juno. The coast remembers. Port Solano is home now."],
};
export class Missions {
  constructor(scene, G) {
    this.G = G; this.index = 0; this.stage = 0; this.timer = 0; this.bags = 0; this.active = false; this.complete = false;
    // beacon
    const geo = new THREE.CylinderGeometry(2.2, 2.2, 26, 14, 1, true);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xffe600, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
    this.beacon = new THREE.Mesh(geo, this.beaconMat); this.beacon.position.y = 13; this.beacon.visible = false; scene.add(this.beacon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffe600 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; this.ring = ring; this.beacon.add ? null : null; scene.add(ring); this.ring.visible = false;
    // bag pickups for M4
    this.bagMeshes = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), new THREE.MeshLambertMaterial({ color: 0x2fae4a, emissive: 0x116622 }));
      b.visible = false; scene.add(b); this.bagMeshes.push(b);
    }
    this.bagSpots = [{ x: 128, z: 30 }, { x: 142, z: 44 }, { x: 128, z: 58 }, { x: 144, z: 72 }, { x: 118, z: 50 }];
  }
  setMarker(x, z) { this.beacon.visible = true; this.ring.visible = true; this.beacon.position.x = x; this.beacon.position.z = z; this.ring.position.x = x; this.ring.position.z = z; this.G.markerPos = { x, z }; }
  hideMarker() { this.beacon.visible = false; this.ring.visible = false; this.G.markerPos = null; }
  start(i) {
    const G = this.G; this.index = i; this.stage = 0; this.active = true; this.bags = 0;
    if (i === 0) { G.showDialogue(...DIALOG.rosa1); this.setMarker(LOC.cafe.x - 6, LOC.cafe.z + 8); G.objective = 'Go to Rosa at her beachfront café'; }
    if (i === 1) { G.showDialogue(...DIALOG.rosa2); this.timer = 150; this.setMarker(-44, -44); G.objective = 'Hot Slice drop 1/3 — downtown west'; }
    if (i === 2) { G.showDialogue(...DIALOG.tito); G.setWanted(3); this.setMarker(LOC.safehouse.x, LOC.safehouse.z); G.objective = 'Lose the heat: get wanted to 0 stars'; }
    if (i === 3) { G.showDialogue(...DIALOG.sorin); for (let k = 0; k < 5; k++) { const b = this.bagMeshes[k]; b.visible = true; b.position.set(this.bagSpots[k].x, 0.8, this.bagSpots[k].z); } this.setMarker(112, 62); G.objective = 'Steal the marked getaway car near the marina'; G.markGetawayCar(); }
    G.sound.sting();
  }
  completeMission() {
    const G = this.G, m = MISSIONS[this.index];
    G.addCash(m.reward); G.sound.cash(); G.hud.toast('Mission complete: ' + m.name + '  +$' + m.reward);
    if (this.index === 1) { G.combat.hasPistol = true; G.hud.toast('Pistol unlocked! Press 2'); }
    this.hideMarker(); for (const b of this.bagMeshes) b.visible = false;
    this.active = false; const next = this.index + 1;
    G.saveNow();
    if (next >= MISSIONS.length) { this.complete = true; G.showDialogue(...DIALOG.done); G.hud.el.complete.style.display = 'flex'; }
    else { this.index = next; setTimeout(() => { if (!this.active && !G.dead) this.start(next); }, 2500); }
  }
  fail(msg) { const G = this.G; G.hud.toast(msg + ' — mission restarting'); this.hideMarker(); for (const b of this.bagMeshes) b.visible = false; this.active = false; setTimeout(() => this.start(this.index), 1800); }
  update(dt) {
    const G = this.G; if (!this.active) { G.objective = this.complete ? 'Free roam — Port Solano is yours' : G.objective; return; }
    this.beaconMat.opacity = 0.3 + Math.sin(performance.now() / 300) * 0.15;
    const p = G.player.pos; const near = (x, z, r) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r;
    if (this.index === 0) {
      if (this.stage === 0 && near(LOC.cafe.x - 6, LOC.cafe.z + 8, 4)) { this.stage = 1; this.setMarker(102, -58); G.objective = 'Get in the marked courier car'; G.markCourierCar(); }
      else if (this.stage === 1 && G.courierReady) { this.stage = 2; this.setMarker(LOC.marina.x, LOC.marina.z); G.objective = 'Pick up the package at the marina'; }
      else if (this.stage === 2 && near(LOC.marina.x, LOC.marina.z, 5)) { this.stage = 3; this.setMarker(LOC.tower.x - 14, LOC.tower.z + 14); G.objective = 'Deliver the package to Solano Tower'; G.hud.toast('Package picked up'); }
      else if (this.stage === 3 && near(LOC.tower.x - 14, LOC.tower.z + 14, 5)) this.completeMission();
    } else if (this.index === 1) {
      this.timer -= dt; const drops = [[-44, -44], [44, 88], [104, 20]];
      G.objective = `Hot Slice drop ${this.stage + 1}/3 — ${Math.max(0, Math.ceil(this.timer))}s left`;
      if (this.timer <= 0) { this.fail('Out of time'); return; }
      if (near(drops[this.stage][0], drops[this.stage][1], 6)) { this.stage++; G.sound.cash(); if (this.stage >= 3) this.completeMission(); else this.setMarker(drops[this.stage][0], drops[this.stage][1]); }
    } else if (this.index === 2) {
      G.objective = 'Lose the heat: wanted is ' + G.wanted + '★ — break police line of sight';
      if (G.wanted === 0) this.completeMission();
    } else if (this.index === 3) {
      if (this.stage === 0 && G.inGetawayCar) { this.stage = 1; this.hideMarker(); G.objective = 'Collect cash bags around the marina (0/5)'; if (G.wanted < 2) G.setWanted(2); }
      else if (this.stage === 1) {
        for (let k = 0; k < 5; k++) { const b = this.bagMeshes[k]; if (b.visible && near(b.position.x, b.position.z, 4.5)) { b.visible = false; this.bags++; G.sound.cash(); G.objective = `Collect cash bags around the marina (${this.bags}/5)`; } }
        if (this.bags >= 5) { this.stage = 2; this.setMarker(LOC.garage.x, LOC.garage.z); G.objective = 'Reach the getaway marker!'; }
        if (G.wanted < 2) G.setWanted(2);
      }
      else if (this.stage === 2 && near(LOC.garage.x, LOC.garage.z, 6)) this.completeMission();
    }
  }
}
export function makeConches(scene) {
  const spots = [[-100, -120], [-20, 120], [60, -120], [118, -20], [118, 100], [-100, 40], [20, 40], [-60, -20], [80, 120], [130, -60]];
  const list = [];
  for (const [x, z] of spots) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0xaa8800 }));
    m.position.set(x, 1, z); m.scale.z = 0.7; scene.add(m); list.push({ mesh: m, taken: false });
  }
  return list;
}
