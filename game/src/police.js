// Police pursuit: cars spawn at city edges, chase and box in; officers on foot at 3+ stars.
import { newCarState } from './vehicles.js';
import { makeHumanoid, animateHumanoid } from './pedestrians.js';
import { resolveCollision } from './city.js';
import { clamp } from './config.js';
export class Police {
  constructor(scene) { this.scene = scene; this.cars = []; this.officers = []; this.spawnT = 0; }
  count() { return this.cars.length; }
  desired(wanted) { return wanted <= 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : 5; }
  spawnCar(playerPos) {
    const side = Math.floor(Math.random() * 4);
    let x = playerPos.x, z = playerPos.z;
    if (side === 0) { x += 55; } else if (side === 1) { x -= 55; } else if (side === 2) { z += 55; } else { z -= 55; }
    x = clamp(x, -115, 120); z = clamp(z, -135, 135);
    const car = newCarState('police', 0x1a2a4a, x, z, 0); car.police = true; car.speed = 0;
    this.scene.add(car.mesh); this.cars.push(car);
    if (this.cars.length >= 2 || Math.random() < 0.5) this.spawnOfficer(car);
  }
  spawnOfficer(car) {
    const mesh = makeHumanoid(0x1a2a6e, 0x111133);
    mesh.position.copy(car.mesh.position); mesh.position.x += 2.5; this.scene.add(mesh);
    this.officers.push({ mesh, health: 60, shootT: Math.random() * 2, walkT: Math.random() * 5 });
  }
  clear() { for (const c of this.cars) this.scene.remove(c.mesh); for (const o of this.officers) this.scene.remove(o.mesh); this.cars = []; this.officers = []; }
  update(dt, t, G) {
    const wanted = G.wanted, target = G.player.pos;
    this.spawnT -= dt;
    if (wanted > 0 && this.cars.length < this.desired(wanted) && this.spawnT <= 0) { this.spawnCar(target); this.spawnT = 2.5; }
    if (wanted === 0 && this.cars.length) { /* police give up: drive away and despawn when far */ }
    let anySee = false;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i], m = car.mesh;
      if (car === G.player.inCar) continue;
      const dx = target.x - m.position.x, dz = target.z - m.position.z, dist = Math.hypot(dx, dz);
      if (dist < 70) anySee = true;
      if (wanted === 0) { if (dist > 80) { this.scene.remove(m); this.cars.splice(i, 1); } continue; }
      if (car.mesh.userData.lightBar) { car.mesh.userData.lightBar.material.emissive.setHex(Math.sin(t * 10) > 0 ? 0xff2222 : 0x2244ff); car.mesh.userData.lightBar.material.color.setHex(Math.sin(t * 10) > 0 ? 0xff2222 : 0x2244ff); }
      const desiredHeading = Math.atan2(-dx, -dz);
      let diff = desiredHeading - car.heading; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = clamp(diff, -1, 1);
      const wantSpeed = dist > 7 ? car.spec.max : dist > 3.5 ? 7 : 0;
      car.speed += clamp(wantSpeed - car.speed, -20 * dt, 12 * dt);
      if (Math.abs(diff) > 2.2) car.speed = Math.max(0, car.speed - 10 * dt);
      car.heading += steer * dt * (car.speed > 1 ? 1.4 : 2.2) * Math.sign(car.speed || 1);
      m.position.x += -Math.sin(car.heading) * car.speed * dt;
      m.position.z += -Math.cos(car.heading) * car.speed * dt;
      m.position.x = clamp(m.position.x, -124, 132); m.position.z = clamp(m.position.z, -138, 138);
      resolveCollision(G.colliders, m.position, 1.6);
      m.rotation.y = car.heading;
      for (const w of m.userData.wheels) w.rotation.x += car.speed * dt * 2;
    }
    // officers
    for (let i = this.officers.length - 1; i >= 0; i--) {
      const o = this.officers[i], m = o.mesh;
      if (o.health <= 0) continue;
      const dx = target.x - m.position.x, dz = target.z - m.position.z, dist = Math.hypot(dx, dz);
      if (wanted >= 3 && dist < 55) anySee = true;
      if (wanted === 0) { if (dist > 85) { this.scene.remove(m); this.officers.splice(i, 1); } continue; }
      if (wanted >= 3) {
        if (dist > 9) { const sp = 5.4; m.position.x += dx / dist * sp * dt; m.position.z += dz / dist * sp * dt; m.rotation.y = Math.atan2(dx, dz); o.walkT += dt; animateHumanoid(m, o.walkT * 3, sp); }
        else if (dist < 42) {
          o.shootT -= dt;
          if (o.shootT <= 0) { o.shootT = 1.1 + Math.random(); G.onPoliceShoot(o, dist); }
        }
      } else if (dist > 14) { const sp = 3.6; m.position.x += dx / (dist || 1) * sp * dt; m.position.z += dz / (dist || 1) * sp * dt; m.rotation.y = Math.atan2(dx, dz); o.walkT += dt; animateHumanoid(m, o.walkT * 3, sp); }
      resolveCollision(G.colliders, m.position, 0.6);
    }
    G.policeSeePlayer = anySee;
    // nearest officer distance for busted logic
    let nearest = 999;
    for (const o of this.officers) { if (o.health > 0) nearest = Math.min(nearest, Math.hypot(target.x - o.mesh.position.x, target.z - o.mesh.position.z)); }
    for (const c of this.cars) nearest = Math.min(nearest, Math.hypot(target.x - c.mesh.position.x, target.z - c.mesh.position.z) - 1);
    G.nearestPolice = nearest;
  }
}
