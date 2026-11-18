// North-up canvas minimap: streets, water, player, traffic, police, markers, conches.
import { STEP, COLS, ROWS, OX, OZ, WATER_X } from './config.js';
export class Minimap {
  constructor(canvas) { this.ctx = canvas.getContext('2d'); this.canvas = canvas; }
  draw(G, t) {
    const c = this.ctx, S = 180, world = 300;
    const toX = (x) => (x + 150) / world * S, toY = (z) => (z + 150) / world * S;
    c.fillStyle = '#8aa86a'; c.fillRect(0, 0, S, S);
    c.fillStyle = '#1e90c8'; c.fillRect(toX(WATER_X), 0, S - toX(WATER_X), S);
    c.fillStyle = '#e8d8a8'; c.fillRect(toX(WATER_X - 4), 0, 5, S);
    c.strokeStyle = '#3a3f46'; c.lineWidth = 4;
    for (let i = 0; i <= COLS; i++) { c.beginPath(); c.moveTo(toX(OX + i * STEP), toY(OZ - 10)); c.lineTo(toX(OX + i * STEP), toY(-OZ + 10)); c.stroke(); }
    for (let j = 0; j <= ROWS; j++) { c.beginPath(); c.moveTo(toX(OX - 10), toY(OZ + j * STEP)); c.lineTo(toX(-OX + 10), toY(OZ + j * STEP)); c.stroke(); }
    const dot = (x, z, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(toX(x), toY(z), r || 2.4, 0, 7); c.fill(); };
    for (const conch of G.conches) if (!conch.taken) dot(conch.mesh.position.x, conch.mesh.position.z, '#ffd700', 2);
    for (const car of G.traffic.cars) dot(car.mesh.position.x, car.mesh.position.z, '#ffffff', 2);
    for (const car of G.parked) dot(car.mesh.position.x, car.mesh.position.z, '#cccccc', 1.6);
    const flash = Math.sin(t * 8) > 0;
    for (const car of G.police.cars) dot(car.mesh.position.x, car.mesh.position.z, flash ? '#ff3333' : '#3366ff', 3);
    for (const o of G.police.officers) if (o.health > 0) dot(o.mesh.position.x, o.mesh.position.z, '#3366ff', 2);
    if (G.markerPos) dot(G.markerPos.x, G.markerPos.z, '#ffe600', 4.5);
    // player arrow
    const p = G.player.pos, px = toX(p.x), py = toY(p.z), a = G.player.inCar ? G.player.inCar.heading : G.player.mesh.rotation.y;
    c.save(); c.translate(px, py); c.rotate(Math.atan2(-Math.sin(a), -Math.cos(a)) + Math.PI); // arrow up = facing
    c.fillStyle = '#ff5533'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill(); c.restore();
  }
}
