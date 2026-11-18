// Solano Heat — main entry: wires city, player, cars, police, missions, HUD into the game loop.
import { buildCity, resolveCollision } from './city.js';
import { Traffic, parkedCars } from './traffic.js';
import { Peds } from './pedestrians.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions, makeConches, DIALOG } from './missions.js';
import { HUD, HUD_CSS } from './hud.js';
const styleEl = document.createElement('style'); styleEl.textContent = HUD_CSS; document.head.appendChild(styleEl);
import { Minimap } from './minimap.js';
import { Sound } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { newCarState, stepCar } from './vehicles.js';
import { LOC, clamp, streetX, streetZ } from './config.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
scene.fog = new THREE.Fog(0x9fcbe8, 90, 260);
scene.add(new THREE.HemisphereLight(0xfff2d8, 0x446644, 0.95));
const sun = new THREE.DirectionalLight(0xffe8b0, 1.1); sun.position.set(60, 90, 30); scene.add(sun);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
document.getElementById('app').appendChild(renderer.domElement);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const city = buildCity(scene);
const G = {
  scene, colliders: city.colliders, cash: 40, wanted: 0, wantedDecay: false, objective: '', prompt: '',
  conchesFound: 0, markerPos: null, policeSeePlayer: false, nearestPolice: 999, dead: false, playing: false, paused: false,
  dialogueOpen: false, courierReady: false, inGetawayCar: false, sound: new Sound(),
};
G.player = new Player(scene);
G.traffic = new Traffic(scene, 11);
G.parked = parkedCars(scene);
G.peds = new Peds(scene, 18);
G.police = new Police(scene);
G.combat = new Combat(scene, G.sound);
G.conches = makeConches(scene);
let minimap = null;
G.hud = new HUD(document.getElementById('ui'), {
  onStart: (cont) => startGame(cont),
  onPause: (v) => { G.paused = v; G.hud.el.pause.style.display = v ? 'flex' : 'none'; },
  onSave: () => { G.saveNow(); G.hud.toast('Saved'); },
  onRestart: () => { localStorage.removeItem('solano-heat-save'); location.reload(); },
  onRespawn: () => respawn(),
});
minimap = new Minimap(G.hud.el.minimap);
G.minimap = minimap;
if (loadSave()) G.hud.showContinue(true);

let unseenT = 0, crimeCooldown = 0, bustedT = 0, sidewalkT = 0, lastEnd = 'busted';
G.setWanted = (n) => { G.wanted = clamp(n, 0, 5); unseenT = 0; };
G.addWanted = (n, why) => { if (crimeCooldown > 0 && why === 'reckless') return; G.wanted = clamp(G.wanted + n, 0, 5); unseenT = 0; if (why === 'reckless') crimeCooldown = 4; };
G.addCash = (n) => { G.cash += n; };
G.showDialogue = (name, text) => { G.hud.setDialogue(name, text); G.dialogueOpen = true; };
G.closeDialogue = () => { G.hud.setDialogue(null); G.dialogueOpen = false; };
G.damagePed = (ped, dmg, fx, fz) => { const died = G.peds.hit(ped, dmg, fx, fz); G.sound.punch(); if (died) G.addWanted(1, 'assault'); };
G.onPoliceShoot = (officer, dist) => {
  const a = officer.mesh.position.clone(); a.y = 1.4;
  const b = G.player.pos.clone(); b.y = 1.2;
  G.combat.addTracer(a, b, 0xff6644);
  if (Math.random() < Math.max(0.15, 0.75 - dist * 0.012)) { G.player.health -= 5; G.sound.hurt(); if (G.player.health <= 0) endGame('wasted'); }
};
G.saveNow = () => {
  const taken = []; G.conches.forEach((c, i) => { if (c.taken) taken.push(i); });
  writeSave({ cash: G.cash, mission: G.missions ? (G.missions.complete ? 4 : G.missions.index) : 0, x: G.player.pos.x, z: G.player.pos.z, conches: taken, pistol: G.combat.hasPistol });
};
G.markCourierCar = () => {
  if (!G.courierCar) { G.courierCar = newCarState('sedan', 0xffd33d, 102, -58, 1.57); G.courierCar.parked = true; G.courierCar.wasParked = false; scene.add(G.courierCar.mesh); G.parked.push(G.courierCar); }
};
G.markGetawayCar = () => {
  if (!G.getawayCar) { G.getawayCar = newCarState('sports', 0xe23b2e, 112, 62, -1.57); G.getawayCar.parked = true; scene.add(G.getawayCar.mesh); G.parked.push(G.getawayCar); }
};
G.missions = new Missions(scene, G);

function endGame(kind) {
  if (G.dead) return; G.dead = true; lastEnd = kind;
  G.hud.el.endtitle.textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  G.hud.el.endtext.textContent = kind === 'busted' ? 'Solano PD cuffed Juno. The station takes its cut.' : 'Juno woke up at Solano General, lighter in the wallet.';
  G.hud.el.end.style.display = 'flex'; G.sound.setEngine(false, 0); G.sound.setSiren(false);
}
function respawn() {
  const fee = Math.min(200, Math.max(20, Math.floor(G.cash * 0.1))); G.cash = Math.max(0, G.cash - fee);
  G.player.health = 100; G.setWanted(0); G.police.clear(); G.dead = false; bustedT = 0;
  if (G.player.inCar) exitCar(true);
  const at = lastEnd === 'busted' ? LOC.station : LOC.hospital;
  G.player.mesh.position.set(at.x + 6, 0, at.z + (lastEnd === 'busted' ? 8 : -8));
  G.hud.el.end.style.display = 'none';
  if (G.missions.active && G.missions.index === 2) setTimeout(() => G.missions.start(2), 600);
  G.saveNow();
}
function nearestCar() {
  const p = G.player.mesh.position; let best = null, bd = 30;
  for (const c of [...G.parked, ...G.traffic.cars, ...G.police.cars]) { const d = (c.mesh.position.x - p.x) ** 2 + (c.mesh.position.z - p.z) ** 2; if (d < bd) { bd = d; best = c; } }
  return best;
}
function enterCar(car) {
  G.player.inCar = car; car.parked = false;
  if (car === G.courierCar) G.courierReady = true;
  if (car === G.getawayCar) G.inGetawayCar = true;
  if (!car.stolenCounted && !car.police) { car.stolenCounted = true; if (car.wasParked !== false) G.addWanted(1, 'theft'); }
  if (car.police) G.addWanted(1, 'theft');
  G.sound.start();
}
function exitCar(silent) {
  const car = G.player.inCar; if (!car) return;
  G.player.mesh.position.set(car.mesh.position.x + 2.2, 0, car.mesh.position.z + 0.5);
  G.player.mesh.rotation.y = car.heading; G.player.inCar = null; car.speed = 0; car.parked = true; car.wasParked = true;
  G.sound.setEngine(false, 0);
}
for (const c of G.parked) c.wasParked = true;

const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!G.playing || G.dead) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { G.paused = !G.paused; G.hud.el.pause.style.display = G.paused ? 'flex' : 'none'; }
  if (G.paused) return;
  if (e.code === 'KeyE') {
    if (G.dialogueOpen) { G.closeDialogue(); return; }
    if (G.player.inCar) exitCar(); else { const c = nearestCar(); if (c) enterCar(c); }
  }
  if (e.code === 'KeyF') G.combat.punch(G);
  if (e.code === 'Digit1') G.combat.weapon = 'fist';
  if (e.code === 'Digit2' && G.combat.hasPistol) G.combat.weapon = 'pistol';
  if (e.code === 'KeyR') G.combat.reload(G);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => {
  if (!G.playing || G.dead || G.paused) return;
  G.sound.start();
  if (G.dialogueOpen) { G.closeDialogue(); return; }
  if (document.pointerLockElement !== renderer.domElement) { try { renderer.domElement.requestPointerLock(); } catch (err) {} return; }
  if (!G.player.inCar) { if (G.combat.weapon === 'pistol') G.combat.shoot(G); else G.combat.punch(G); }
});
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  G.player.yaw -= e.movementX * 0.0028; G.player.pitch = clamp(G.player.pitch + e.movementY * 0.002, -0.15, 0.9);
});

function startGame(cont) {
  G.sound.start();
  G.hud.el.start.style.display = 'none'; G.hud.el.hud.style.display = 'block'; G.playing = true;
  const sv = cont ? loadSave() : null;
  if (sv) {
    G.cash = sv.cash || 40; G.player.mesh.position.set(sv.x || 104, 0, sv.z || -80);
    for (const i of (sv.conches || [])) if (G.conches[i]) { G.conches[i].taken = true; G.conches[i].mesh.visible = false; G.conchesFound++; }
    if (sv.pistol) G.combat.hasPistol = true;
    if (sv.mission >= 4) { G.missions.complete = true; G.missions.index = 4; G.objective = 'Free roam — Port Solano is yours'; }
    else G.missions.start(sv.mission || 0);
  } else G.missions.start(0);
}
function applyShot(name) {
  G.hud.el.start.style.display = 'none'; G.hud.el.hud.style.display = 'block'; G.playing = true;
  if (name === 'cover') {
    // Cover: player on the SE sidewalk of the downtown centre intersection
    // (streetX(2) x streetZ(3), the crosswalk intersection), camera angled
    // diagonally across it (yaw 0.75 -> looking NW, not straight down a road).
    // Shot-only arrangement: traffic cars are frozen in their lanes
    // (targetSpeed/speed 0) and the placed peds are frozen on their sidewalks
    // (speed 0), so the frame is deterministic at capture time instead of
    // depending on how far cars/peds happened to drift after page load.
    G.player.mesh.position.set(streetX(2) + 7.5, 0, streetZ(3) + 9); G.player.yaw = 0.75; G.player.pitch = 0.32;
    G.player.mesh.rotation.y = Math.atan2(-Math.sin(G.player.yaw), -Math.cos(G.player.yaw));
    G.missions.start(0); G.closeDialogue();
    const freezeCar = (car, x, z, heading, vertical, dir) => {
      car.mesh.position.set(x, 0, z); car.heading = heading; car.mesh.rotation.y = heading; car.speed = 0;
      if (car.traffic) { car.traffic.vertical = vertical; car.traffic.dir = dir; car.traffic.targetSpeed = 0; }
    };
    // Near lane: northbound car on the vertical road, just north of the player.
    freezeCar(G.traffic.cars[0], streetX(2) + 3.2, streetZ(3) - 8, 0, true, -1);
    // Crossing at the intersection: eastbound car approaching from the west on the far side.
    freezeCar(G.traffic.cars[1], streetX(2) - 18, streetZ(3) + 3.2, -Math.PI / 2, false, 1);
    // Crossing out of the intersection: westbound car just east of it, close to camera.
    freezeCar(G.traffic.cars[2], streetX(2) + 10, streetZ(3) - 3.2, Math.PI / 2, false, -1);
    // Parked at the north curb west of the intersection (parked cars never move).
    const parked = G.parked[0]; parked.mesh.position.set(streetX(2) - 22, 0, streetZ(3) - 8.8); parked.heading = Math.PI / 2; parked.mesh.rotation.y = Math.PI / 2;
    const freezePed = (ped, x, z, axis, sense) => {
      ped.mesh.position.set(x, 0, z); ped.state = 'walk'; ped.speed = 0; ped.axis = axis; ped.line = axis === 'z' ? x : z; ped.sense = sense;
      ped.mesh.rotation.y = axis === 'z' ? (sense > 0 ? 0 : Math.PI) : (sense > 0 ? Math.PI / 2 : -Math.PI / 2);
    };
    freezePed(G.peds.list[0], streetX(2) + 2, streetZ(3) + 8.5, 'x', 1); // S sidewalk, W of player
    freezePed(G.peds.list[1], streetX(2) + 7.5, streetZ(3) - 14, 'z', -1); // E sidewalk, N of intersection
    freezePed(G.peds.list[2], streetX(2) - 8.5, streetZ(3) + 10, 'z', 1); // W sidewalk, S of intersection
    freezePed(G.peds.list[3], streetX(2) - 8.5, streetZ(3) - 12, 'z', -1); // W sidewalk, N of intersection
  } else if (name === 'drive') {
    G.missions.start(0); G.closeDialogue();
    const car = G.parked.find(c => c.type === 'sports') || G.parked[0];
    car.mesh.position.set(streetX(3), 0, 30); car.heading = 0; car.speed = 17;
    G.player.inCar = car; car.parked = false; G.player.yaw = 0;
    const ahead = G.traffic.cars[2]; ahead.mesh.position.set(streetX(3) + 3.2, 0, -2); ahead.heading = 0; ahead.speed = 8; if (ahead.traffic) ahead.traffic.vertical = true;
    const oncoming = G.traffic.cars[3]; oncoming.mesh.position.set(streetX(3) - 3.2, 0, -34); oncoming.heading = Math.PI; oncoming.speed = 8; if (oncoming.traffic) oncoming.traffic.vertical = true;
  } else if (name === 'chase') {
    G.missions.start(0); G.closeDialogue(); G.objective = 'M3 — Lose the Heat: outrun Solano PD!';
    const car = G.parked[0]; car.mesh.position.set(streetX(2), 0, 10); car.heading = 0; car.speed = 12;
    G.player.inCar = car; car.parked = false; G.player.yaw = 0; G.setWanted(3);
    G.police.spawnCar(car.mesh.position); G.police.spawnCar(car.mesh.position);
    G.police.cars.forEach((c, i) => { c.mesh.position.set(streetX(2) + (i ? 3.4 : -3.4), 0, 26 + i * 6); c.heading = 0; c.speed = 10; });
    G.camLock = true; G.player.yaw = Math.PI; // shot camera in front, framing player car with police closing behind it
  } else if (name === 'mission') {
    G.player.mesh.position.set(105, 0, -73); G.player.yaw = -2.2; G.missions.start(0);
  }
}
if (shot) applyShot(shot);

window.SOLANO = {
  getState: () => ({ cash: G.cash, wanted: G.wanted, mission: G.missions.complete ? 4 : G.missions.index, health: G.player.health, inCar: !!G.player.inCar, police: G.police.count(), playing: G.playing, conches: G.conchesFound, objective: G.objective }),
  setWanted: (n) => G.setWanted(n),
  teleport: (x, z) => { const t = G.player.inCar ? G.player.inCar.mesh.position : G.player.mesh.position; t.x = x; t.z = z; },
  startMission: (i) => G.missions.start(i),
  giveWeapon: () => { G.combat.hasPistol = true; G.combat.weapon = 'pistol'; },
  saveNow: () => G.saveNow(),
};
G.teleport = window.SOLANO.teleport;

let last = performance.now(), firstFrame = true, mmT = 0;
const camTarget = new THREE.Vector3();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (G.playing && !G.paused && !G.dead) {
    crimeCooldown = Math.max(0, crimeCooldown - dt);
    // player / driving
    if (G.player.inCar) {
      const car = G.player.inCar;
      let th = 0, st = 0;
      if (keys['KeyW']) th = 1; if (keys['KeyS']) th = -1;
      if (keys['KeyA']) st = -1; if (keys['KeyD']) st = 1;
      stepCar(car, th, st, keys['Space'], dt);
      resolveCollision(G.colliders, car.mesh.position, 1.7);
      car.mesh.position.x = clamp(car.mesh.position.x, -124, 134); car.mesh.position.z = clamp(car.mesh.position.z, -138, 138);
      // crude car-car collisions + reckless
      for (const other of [...G.traffic.cars, ...G.parked, ...G.police.cars]) {
        if (other === car) continue; const d2 = (other.mesh.position.x - car.mesh.position.x) ** 2 + (other.mesh.position.z - car.mesh.position.z) ** 2;
        if (d2 < 9) { if (Math.abs(car.speed) > 7) { G.addWanted(1, 'reckless'); other.health -= 10; } car.speed *= 0.45; const dx = car.mesh.position.x - other.mesh.position.x, dz = car.mesh.position.z - other.mesh.position.z, d = Math.hypot(dx, dz) || 1; car.mesh.position.x += dx / d * 0.4; car.mesh.position.z += dz / d * 0.4; }
      }
      for (const ped of G.peds.list) { if (ped.state !== 'down' && Math.abs(car.speed) > 3) { const d2 = (ped.mesh.position.x - car.mesh.position.x) ** 2 + (ped.mesh.position.z - car.mesh.position.z) ** 2; if (d2 < 4.2) { G.damagePed(ped, 60, car.mesh.position.x, car.mesh.position.z); G.addWanted(1, 'reckless'); } } }
      // sidewalk driving
      let minRoad = 999; for (let i = 0; i <= 5; i++) minRoad = Math.min(minRoad, Math.abs(car.mesh.position.x - streetX(i))); for (let j = 0; j <= 6; j++) minRoad = Math.min(minRoad, Math.abs(car.mesh.position.z - streetZ(j)));
      if (Math.abs(car.speed) > 8 && minRoad > 9.5 && car.mesh.position.x < 122) { sidewalkT += dt; if (sidewalkT > 2.5) { G.addWanted(1, 'reckless'); sidewalkT = 0; } } else sidewalkT = Math.max(0, sidewalkT - dt);
      G.sound.setEngine(true, car.speed / car.spec.max);
      if (!G.camLock) { const targetYaw = car.heading; let dy = targetYaw - G.player.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; G.player.yaw += dy * Math.min(1, dt * 3); }
    } else {
      G.player.update(dt, keys, G.colliders);
      G.sound.setEngine(false, 0);
    }
    // prompt
    if (!G.player.inCar && !G.dialogueOpen) { const c = nearestCar(); G.prompt = c ? 'E — Enter ' + c.type + (c === G.courierCar ? ' (courier)' : c === G.getawayCar ? ' (getaway)' : '') : ''; }
    else if (G.player.inCar) G.prompt = 'E — Exit car • Space — handbrake';
    else G.prompt = '';
    G.traffic.update(dt, G.player.pos, G.colliders, G.player.inCar);
    G.peds.update(dt, t, G.player.pos, G.player.inCar && Math.abs(G.player.inCar.speed) > 10);
    G.police.update(dt, t, G);
    G.sound.setSiren(G.wanted > 0 && G.police.count() > 0);
    // wanted decay
    if (G.wanted > 0) { if (!G.policeSeePlayer) { unseenT += dt; G.wantedDecay = unseenT > 3; if (unseenT > 10) { G.setWanted(G.wanted - 1); unseenT = G.wanted > 0 ? 4 : 0; } } else { unseenT = 0; G.wantedDecay = false; } }
    // busted
    const pSpeed = G.player.inCar ? Math.abs(G.player.inCar.speed) : G.player.speed;
    if (G.wanted > 0 && G.nearestPolice < (G.player.inCar ? 3.6 : 2.4) && pSpeed < 1.2) { bustedT += dt; if (bustedT > 2) endGame('busted'); } else bustedT = Math.max(0, bustedT - dt * 2);
    if (G.player.health <= 0) endGame('wasted');
    G.combat.update(dt);
    G.missions.update(dt);
    // conches
    for (const c of G.conches) { if (c.taken) continue; c.mesh.rotation.y += dt * 2; c.mesh.position.y = 1 + Math.sin(t * 2 + c.mesh.position.x) * 0.2; const d2 = (c.mesh.position.x - G.player.pos.x) ** 2 + (c.mesh.position.z - G.player.pos.z) ** 2; if (d2 < 4) { c.taken = true; c.mesh.visible = false; G.conchesFound++; G.addCash(50); G.sound.cash(); G.hud.toast('Golden conch! +$50 (' + G.conchesFound + '/10)'); G.saveNow(); } }
    G.hud.update(dt, G);
    mmT -= dt; if (mmT <= 0) { minimap.draw(G, t); mmT = 0.1; }
  }
  // camera
  const target = G.player.inCar ? G.player.inCar.mesh.position : G.player.mesh.position;
  const dist = G.player.inCar ? 10.5 : 7.5, height = G.player.inCar ? 3.4 : 2.2;
  const cx = target.x + Math.sin(G.player.yaw) * Math.cos(G.player.pitch) * dist;
  const cz = target.z + Math.cos(G.player.yaw) * Math.cos(G.player.pitch) * dist;
  const cy = target.y + height + Math.sin(G.player.pitch) * dist;
  camTarget.set(cx, Math.max(1.2, cy), cz);
  if (firstFrame) camera.position.copy(camTarget); else camera.position.lerp(camTarget, 1 - Math.pow(0.0001, dt));
  camera.lookAt(target.x, target.y + 1.6, target.z);
  city.water.position.y = 0.12 + Math.sin(t * 0.8) * 0.05;
  renderer.render(scene, camera);
  if (firstFrame) { firstFrame = false; window.__solanoReady = true; }
}
requestAnimationFrame(loop);
console.log('Solano Heat — Port Solano is open.');
