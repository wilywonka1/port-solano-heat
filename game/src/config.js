// Solano Heat shared tuning and city layout constants.
export const STEP = 44; // distance between street centrelines
export const ROAD_W = 13;
export const COLS = 5; // blocks across (x)
export const ROWS = 6; // blocks deep (z)
export const CITY_W = COLS * STEP; // 220
export const CITY_D = ROWS * STEP; // 264
export const OX = -CITY_W / 2; // west edge of road grid
export const OZ = -CITY_D / 2;
export const WATER_X = 128; // beach + sea east of here
export const SAVE_KEY = 'solano-heat-save';
export const COLORS = {
  sand: 0xe8d8a8, road: 0x3a3f46, sidewalk: 0xb8b0a0, grass: 0x7ec850,
  water: 0x1e90c8, sky: 0x87ceeb,
};
export function streetX(i) { return OX + i * STEP; } // i 0..COLS
export function streetZ(j) { return OZ + j * STEP; } // j 0..ROWS
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
export function rand(seedObj) { // mulberry-ish deterministic via Math.random fallback
  return Math.random();
}
export const LOC = {
  cafe: { x: 118, z: -88, name: "Rosa's Café" },
  marina: { x: 122, z: 44, name: 'Port Solano Marina' },
  tower: { x: 0, z: 0, name: 'Solano Tower' },
  hospital: { x: -88, z: 110, name: 'Solano General' },
  station: { x: -88, z: -110, name: 'Solano PD' },
  safehouse: { x: -100, z: 22, name: 'Safehouse Garage' },
  garage: { x: 110, z: 66, name: 'Marina Getaway' },
};
