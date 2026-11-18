// Screenshot capture for Solano Heat: serves game/, opens each ?shot scene live, saves 4 JPEGs.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const require = createRequire('/home/hatch/workspace/tools/playwright/package.json');
const { chromium } = require('playwright-core');
const repo = fileURLToPath(new URL('..', import.meta.url));
const server = spawn('node', ['serve.ts', '--port', '8901'], { cwd: repo, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));
const only = process.argv[2]; // optional scene filter, e.g. `node tools/shots.mjs cover` re-shoots only the cover
const scenes = [['cover', '01-cover.jpg'], ['drive', '02-drive.jpg'], ['chase', '03-chase.jpg'], ['mission', '04-mission.jpg']].filter(([shot]) => !only || shot === only);
try {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
  for (const [shot, file] of scenes) {
    await page.goto(`http://localhost:8901/?shot=${shot}&seed=1`);
    await page.waitForFunction(() => window.__solanoReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(repo, 'screenshots', file), type: 'jpeg', quality: 70, timeout: 90000 });
    console.log('shot', file, await page.evaluate(() => JSON.stringify(window.SOLANO.getState())));
  }
  await browser.close();
} finally { server.kill(); }
