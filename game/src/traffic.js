// Traffic AI: cars loop the road grid in lanes, slowing for the player and corners.
import { streetX, streetZ, COLS, ROWS, clamp } from './config.js';
import { newCarState, paint } from './vehicles.js';
const TYPES = ['sedan', 'hatch', 'pickup', 'sports'];
export class Traffic {
  constructor(scene, count) {
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const vertical = i % 2 === 0;
      const laneIdx = Math.floor(Math.random() * (vertical ? COLS + 1 : ROWS + 1));
      const dir = Math.random() < 0.5 ? 1 : -1;
      const laneOff = dir > 0 ? 3.2 : -3.2;
      let x, z, heading;
      if (vertical) { x = streetX(laneIdx) + (dir > 0 ? -laneOff : -laneOff); z = -130 + Math.random() * 260; heading = dir > 0 ? Math.PI : 0; }
      else { z = streetZ(laneIdx) + laneOff; x = -105 + Math.random() * 210; heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      // heading convention: forward = (-sin h, -cos h); moving +z needs h=PI, +x needs h=-PI/2
      if (!vertical) heading = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const car = newCarState(TYPES[i % TYPES.length], paint(i * 2 + 1), x, z, heading);
      car.traffic = { vertical, dir, targetSpeed: 9 + Math.random() * 5, laneIdx };
      scene.add(car.mesh); this.cars.push(car);
    }
  }
  update(dt, playerPos, colliders, playerCar) {
    for (const car of this.cars) {
      if (car === playerCar) continue;
      const tr = car.traffic; const m = car.mesh;
      let desired = tr.targetSpeed;
      // slow near player
      const dx = playerPos.x - m.position.x, dz = playerPos.z - m.position.z;
      const fx = -Math.sin(car.heading), fz = -Math.cos(car.heading);
      const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 11 && side < 3.5) desired = 0;
      else if (ahead > 0 && ahead < 20 && side < 4) desired = Math.min(desired, 4);
      car.speed += clamp(desired - car.speed, -18 * dt * 3, 7 * dt * 3) ;
      // corner slowdown near intersections: mild
      m.position.x += fx * car.speed * dt; m.position.z += fz * car.speed * dt;
      // wrap / turn at edges
      if (tr.vertical) {
        if (m.position.z > 140) { m.position.z = -140; }
        if (m.position.z < -140) { m.position.z = 140; }
        // occasional turn at intersections
        for (let j = 0; j <= ROWS; j++) { const iz = streetZ(j); if (Math.abs(m.position.z - iz) < 0.6 && Math.random() < 0.003) { tr.vertical = false; car.heading = Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2; tr.dir = car.heading === -Math.PI / 2 ? 1 : -1; m.position.z = iz + (tr.dir > 0 ? 3.2 : -3.2) * (car.heading === -Math.PI/2 ? 1 : 1); break; } }
      } else {
        if (m.position.x > 118) m.position.x = -118;
        if (m.position.x < -118) m.position.x = 118;
        for (let i = 0; i <= COLS; i++) { const ix = streetX(i); if (Math.abs(m.position.x - ix) < 0.6 && Math.random() < 0.003) { tr.vertical = true; car.heading = Math.random() < 0.5 ? 0 : Math.PI; m.position.x = ix; break; } }
      }
      m.rotation.y = car.heading;
      for (const w of m.userData.wheels) w.rotation.x += car.speed * dt * 2;
    }
  }
}
export function parkedCars(scene) {
  const spots = [];
  const defs = [
    ['sedan', 0, -102, -40, 0.4], ['hatch', 2, -56, 18, 1.57], ['pickup', 3, 58, -62, -1.57], ['sports', 4, 102, 20, 0.2],
    ['sedan', 5, 14, 102, 1.57], ['hatch', 6, -102, 62, 0], ['sports', 1, 118, -70, 3.1], ['sedan', 7, 46, 58, -1.57],
    ['pickup', 8, -14, -102, 1.57], ['hatch', 0, 102, -118, 0], ['sedan', 3, -58, -58, 1.57], ['sports', 6, 60, 104, 0],
  ];
  const cars = [];
  for (const [type, ci, x, z, h] of defs) { const c = newCarState(type, paint(ci), x, z, h); c.parked = true; scene.add(c.mesh); cars.push(c); }
  return cars;
}
