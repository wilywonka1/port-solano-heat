// Headless smoke test for Solano Heat: full loop, zero console errors required, FPS probe.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire('/home/hatch/workspace/tools/playwright/package.json');
const { chromium } = require('playwright-core');
const repo = fileURLToPath(new URL('..', import.meta.url));
const server = spawn('node', ['serve.ts', '--port', '8902'], { cwd: repo, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const errors = [];
function assert(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) errors.push('assert: ' + label); }
try {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('PAGEERROR:', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push('console: ' + m.text()); console.log('CONSOLE ERROR:', m.text()); } });
  await page.goto('http://localhost:8902/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__solanoReady === true, null, { timeout: 30000 });
  assert(true, 'window.__solanoReady');
  await page.click('#btn-start');
  await page.waitForTimeout(400);
  let st = await page.evaluate(() => window.SOLANO.getState());
  assert(st.playing && st.mission === 0, 'started, mission 0 active: ' + JSON.stringify(st));
  // walk with WASD
  const p0 = await page.evaluate(() => { const s = window.SOLANO.getState(); return s; });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
  assert(true, 'WASD walk simulated');
  // close dialogue if open, teleport to cafe marker -> stage advance, then courier car
  await page.evaluate(() => window.SOLANO.teleport(112, -80));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.SOLANO.teleport(102, -55.5));
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
  // E may have closed dialogue instead; press again if not in car
  st = await page.evaluate(() => window.SOLANO.getState());
  if (!st.inCar) { await page.keyboard.press('KeyE'); await page.waitForTimeout(300); st = await page.evaluate(() => window.SOLANO.getState()); }
  assert(st.inCar, 'entered courier car: ' + JSON.stringify(st));
  // drive
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  st = await page.evaluate(() => window.SOLANO.getState());
  assert(st.inCar, 'still driving after W drive');
  // mission 1 fast completion via teleports (in car)
  await page.evaluate(() => window.SOLANO.teleport(122, 44)); await page.waitForTimeout(1200);
  await page.evaluate(() => window.SOLANO.teleport(-14, 14)); await page.waitForTimeout(1200);
  await page.evaluate(() => window.SOLANO.teleport(-14, 14)); await page.waitForTimeout(1500);
  st = await page.evaluate(() => window.SOLANO.getState());
  console.log('after M1 route state:', JSON.stringify(st));
  assert(st.cash >= 290 || st.mission >= 1, 'mission 1 completed or paid (cash=' + st.cash + ' mission=' + st.mission + ')');
  // exit car, wanted + police
  await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
  await page.evaluate(() => window.SOLANO.setWanted(3));
  await page.waitForTimeout(5000);
  st = await page.evaluate(() => window.SOLANO.getState());
  console.log('wanted state:', JSON.stringify(st));
  assert(st.police > 0, 'police spawned at wanted 3 (count=' + st.police + ')');
  await page.evaluate(() => window.SOLANO.setWanted(0));
  // weapon + save + reload persistence
  await page.evaluate(() => { window.SOLANO.giveWeapon(); window.SOLANO.saveNow(); });
  const cashBefore = (await page.evaluate(() => window.SOLANO.getState())).cash;
  await page.reload();
  await page.waitForFunction(() => window.__solanoReady === true, null, { timeout: 30000 });
  const contVisible = await page.evaluate(() => { const b = document.querySelector('#btn-continue'); return b && b.style.display !== 'none'; });
  assert(!!contVisible, 'Continue button exists after reload');
  await page.click('#btn-continue');
  await page.waitForTimeout(600);
  st = await page.evaluate(() => window.SOLANO.getState());
  assert(st.cash === cashBefore, 'cash persisted (' + st.cash + ' vs ' + cashBefore + ')');
  assert(st.playing, 'continued game playing');
  await browser.close();
  // FPS probe on drive scene
  const b2 = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const p2 = await b2.newPage({ viewport: { width: 1280, height: 800 } });
  p2.on('pageerror', e => errors.push('fps pageerror: ' + e.message));
  p2.on('console', m => { if (m.type() === 'error') errors.push('fps console: ' + m.text()); });
  await p2.goto('http://localhost:8902/?shot=drive&seed=1');
  await p2.waitForFunction(() => window.__solanoReady === true, null, { timeout: 30000 });
  const fps = await p2.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); function f() { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / 3); } requestAnimationFrame(f); }));
  console.log('FPS (drive scene, SwiftShader):', fps.toFixed(1));
  await b2.close();
} finally { server.kill(); }
console.log('TOTAL ERRORS:', errors.length);
for (const e of errors) console.log(' -', e);
process.exit(errors.length ? 1 : 0);
