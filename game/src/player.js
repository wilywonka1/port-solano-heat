// Player character Juno Vale: on-foot movement, camera, limb animation.
import { makeHumanoid, animateHumanoid } from './pedestrians.js';
import { resolveCollision, collides } from './city.js';
import { clamp } from './config.js';
export class Player {
  constructor(scene) {
    this.mesh = makeHumanoid(0x14406e, 0x222222);
    this.mesh.position.set(104, 0, -80); scene.add(this.mesh);
    this.health = 100; this.yaw = 2.6; this.pitch = 0.32; this.speed = 0; this.walkT = 0;
    this.inCar = null;
  }
  get pos() { return this.inCar ? this.inCar.mesh.position : this.mesh.position; }
  update(dt, keys, colliders) {
    if (this.inCar) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    let mx = 0, mz = 0;
    if (keys['KeyW']) mz += 1; if (keys['KeyS']) mz -= 1; if (keys['KeyA']) mx -= 1; if (keys['KeyD']) mx += 1;
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    const sp = sprint ? 9 : 5.2;
    const moving = (mx !== 0 || mz !== 0);
    this.speed = moving ? sp : 0;
    if (moving) {
      const len = Math.hypot(mx, mz); mx /= len; mz /= len;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      // camera forward on ground = (-sin yaw? ) camera looks along -forward; define forward from yaw
      const wx = (mx * cos - mz * sin);
      const wz = (-mx * sin - mz * cos);
      // Simpler robust: forward vector F = (-sin, -cos)?? verified in main camera placement.
      this.mesh.position.x += wx * sp * dt;
      this.mesh.position.z += wz * sp * dt;
      this.mesh.rotation.y = Math.atan2(wx, wz);
      this.walkT += dt * (sprint ? 1.6 : 1);
      animateHumanoid(this.mesh, this.walkT * 3, sp);
    }
    this.mesh.position.x = clamp(this.mesh.position.x, -126, 134);
    this.mesh.position.z = clamp(this.mesh.position.z, -140, 140);
    resolveCollision(colliders, this.mesh.position, 0.7);
  }
}
