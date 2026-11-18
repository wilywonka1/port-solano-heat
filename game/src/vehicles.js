// Vehicle meshes and arcade car physics data for Solano Heat.
const TYPES = {
  sedan: { w: 2, l: 4.4, h: 0.9, cab: 1.1, max: 30, accel: 16 },
  hatch: { w: 1.9, l: 3.7, h: 0.95, cab: 1.05, max: 26, accel: 15 },
  pickup: { w: 2.1, l: 5, h: 1.1, cab: 1.2, max: 27, accel: 14 },
  sports: { w: 2, l: 4.3, h: 0.7, cab: 0.8, max: 40, accel: 24 },
  police: { w: 2, l: 4.6, h: 0.9, cab: 1.1, max: 34, accel: 20 },
};
const PAINTS = [0xe23b2e, 0x2e7de2, 0xf2c41c, 0x39b56a, 0xf2f2f2, 0x222831, 0xe2792e, 0x9b59c9, 0x2ec4b6];
export function paint(i) { return PAINTS[i % PAINTS.length]; }
export function makeCar(type, color) {
  const t = TYPES[type] || TYPES.sedan;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.l), bodyMat); body.position.y = 0.75; g.add(body);
  const glass = new THREE.MeshLambertMaterial({ color: 0x223344 });
  if (type === 'pickup') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.92, t.cab, 1.6), glass); cab.position.set(0, 1.65, -0.9); g.add(cab);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.94, 0.5, 2.2), bodyMat); bed.position.set(0, 1.35, 1.2); g.add(bed);
  } else {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.86, t.cab, t.l * 0.48), glass); cab.position.set(0, 1.55, -0.1); g.add(cab);
  }
  const wheelG = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10); const wheelM = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const wheels = [];
  for (const [wx, wz] of [[-t.w / 2, t.l / 2 - 0.8], [t.w / 2, t.l / 2 - 0.8], [-t.w / 2, -t.l / 2 + 0.8], [t.w / 2, -t.l / 2 + 0.8]]) {
    const w = new THREE.Mesh(wheelG, wheelM); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w); wheels.push(w);
  }
  const hl = new THREE.MeshLambertMaterial({ color: 0xfff6b0, emissive: 0xffe97a });
  const tl = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 });
  for (const s of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.1), hl); h.position.set(s, 0.85, -t.l / 2 - 0.03); g.add(h);
    const ta = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.1), tl); ta.position.set(s, 0.85, t.l / 2 + 0.03); g.add(ta);
  }
  if (type === 'police') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.06, t.h * 0.7, t.l * 0.5), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    g.children[g.children.length - 1].position.y = 0.78;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff }));
    bar.position.set(0, 2.25, -0.1); g.add(bar); g.userData.lightBar = bar;
  }
  g.userData.spec = t; g.userData.wheels = wheels;
  return g;
}
export function newCarState(type, color, x, z, heading) {
  const mesh = makeCar(type, color);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  return { mesh, type, speed: 0, heading, health: 100, driver: null, parked: false, spec: mesh.userData.spec };
}
export function stepCar(car, throttle, steer, brake, dt) {
  const s = car.spec;
  if (throttle > 0) car.speed += s.accel * throttle * dt;
  else if (throttle < 0) car.speed += (car.speed > 0.5 ? -22 : -10) * dt * -throttle;
  if (brake) car.speed -= Math.sign(car.speed) * 30 * dt;
  const drag = car.speed * 0.55 * dt; car.speed -= drag;
  if (Math.abs(car.speed) < 0.08 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-11, Math.min(s.max, car.speed));
  if (Math.abs(car.speed) > 0.2) car.heading += steer * dt * (car.speed > 0 ? 1 : -1) * Math.min(1.5, 10 / (Math.abs(car.speed) + 6));
  car.mesh.position.x += -Math.sin(car.heading) * car.speed * dt;
  car.mesh.position.z += -Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  return car;
}
export { TYPES };
