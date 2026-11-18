// Combat: punch and pistol hitscan with tracers, muzzle flash, hit reactions.
export class Combat {
  constructor(scene, sound) {
    this.scene = scene; this.sound = sound; this.tracers = [];
    this.flash = new THREE.PointLight(0xffcc66, 0, 18); scene.add(this.flash);
    this.ammo = 12; this.mag = 12; this.hasPistol = false; this.weapon = 'fist'; this.reloadT = 0;
  }
  addTracer(a, b, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffe97a }));
    this.scene.add(line); this.tracers.push({ line, life: 0.09 });
  }
  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) { const t = this.tracers[i]; t.life -= dt; if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); this.tracers.splice(i, 1); } }
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 30);
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.ammo = this.mag; }
  }
  punch(G) {
    this.sound.punch();
    const p = G.player.mesh.position; const dir = G.player.mesh.rotation.y;
    const fx = Math.sin(dir), fz = Math.cos(dir);
    let hitAny = false;
    for (const ped of G.peds.list) { const m = ped.mesh.position; if ((m.x - p.x) ** 2 + (m.z - p.z) ** 2 < 3.2 && (m.x - p.x) * fx + (m.z - p.z) * fz > 0) { G.damagePed(ped, 35, p.x, p.z); hitAny = true; } }
    for (const o of G.police.officers) { const m = o.mesh.position; if ((m.x - p.x) ** 2 + (m.z - p.z) ** 2 < 3.2) { o.health -= 35; hitAny = true; if (o.health <= 0) { o.mesh.rotation.x = 1.4; G.addWanted(1, 'assault'); } } }
    if (hitAny) G.addWanted(1, 'assault');
  }
  shoot(G) {
    if (!this.hasPistol || this.reloadT > 0) return;
    if (this.ammo <= 0) { this.reload(G); return; }
    this.ammo--; this.sound.shot();
    const origin = G.player.inCar ? G.player.inCar.mesh.position.clone() : G.player.mesh.position.clone(); origin.y = 1.5;
    // aim along camera forward
    const yaw = G.player.yaw, pitch = G.player.pitch;
    const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch) * 0.4 + 0.02, -Math.cos(yaw) * Math.cos(pitch)).normalize();
    // Actually camera looks toward -sin,-cos horizontally; pitch positive looks down slightly, keep flat-ish
    dir.y = -Math.sin(pitch) * 0.5;
    const end = origin.clone().add(dir.clone().multiplyScalar(60));
    this.flash.position.copy(origin).add(dir.clone().multiplyScalar(1.2)); this.flash.intensity = 3;
    this.addTracer(origin.clone().add(new THREE.Vector3(0, 0.1, 0)), end);
    G.peds.scare(origin.x, origin.z, 16);
    // find closest ped/officer along ray within cone
    let best = null, bestD = 60;
    const check = (pos, obj, kind) => { const to = pos.clone().sub(origin); const along = to.dot(dir); if (along < 0 || along > 60) return; const perp = to.clone().sub(dir.clone().multiplyScalar(along)).length(); if (perp < 1.1 && along < bestD) { bestD = along; best = { obj, kind, point: origin.clone().add(dir.clone().multiplyScalar(along)) }; } };
    for (const ped of G.peds.list) if (ped.health > 0) check(new THREE.Vector3(ped.mesh.position.x, 1.1, ped.mesh.position.z), ped, 'ped');
    for (const o of G.police.officers) if (o.health > 0) check(new THREE.Vector3(o.mesh.position.x, 1.1, o.mesh.position.z), o, 'cop');
    for (const c of [...G.traffic.cars, ...G.parked]) check(new THREE.Vector3(c.mesh.position.x, 0.9, c.mesh.position.z), c, 'car');
    if (best) {
      this.addTracer(origin, best.point, 0xffaa33);
      if (best.kind === 'ped') G.damagePed(best.obj, 55, origin.x, origin.z);
      else if (best.kind === 'cop') { best.obj.health -= 55; if (best.obj.health <= 0) best.obj.mesh.rotation.x = 1.4; G.addWanted(1, 'assault'); }
      else if (best.kind === 'car') { best.obj.health -= 20; }
      if (best.kind !== 'car') G.addWanted(1, 'assault');
    }
  }
  reload(G) { if (this.ammo < this.mag && this.reloadT <= 0) { this.reloadT = 1.1; } }
}
