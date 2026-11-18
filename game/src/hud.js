// DOM HUD and screens for Solano Heat.
export class HUD {
  constructor(root, callbacks) {
    this.cb = callbacks;
    root.innerHTML = `
    <div id="hud" style="display:none">
      <div id="topbar"><div id="healthwrap"><div id="health"></div></div><div id="cash">$0</div><div id="stars"></div><div id="conch">🐚 0/10</div></div>
      <div id="objective"></div>
      <div id="weapon"></div><div id="speedo"></div>
      <canvas id="minimap" width="180" height="180"></canvas>
      <div id="prompt"></div><div id="toast"></div>
      <div id="dialogue" style="display:none"><div id="speaker"></div><div id="dialogtext"></div><div id="dialoghint">E / click — continue</div></div>
      <div id="crosshair">+</div>
    </div>
    <div id="startscreen" class="screen">
      <h1>SOLANO HEAT</h1>
      <p class="intro">Juno Vale washes up in Port Solano with forty dollars and a borrowed phone. Fixer Rosa Delgado has work, mechanic Tito Marlin has wheels, and harbormaster Ilya Sorin has a score — if Juno can stay ahead of Solano PD.</p>
      <div class="controls">WASD move / drive &nbsp;•&nbsp; Mouse look (click scene) &nbsp;•&nbsp; Shift sprint &nbsp;•&nbsp; E interact / enter car &nbsp;•&nbsp; Click or F punch &nbsp;•&nbsp; 2 pistol, click shoot, R reload &nbsp;•&nbsp; Space handbrake &nbsp;•&nbsp; Esc/P pause</div>
      <button id="btn-start">▶ Start New Story</button>
      <button id="btn-continue" style="display:none">↻ Continue</button>
    </div>
    <div id="pausescreen" class="screen" style="display:none"><h2>Paused</h2><button id="btn-resume">Resume</button><button id="btn-save">Save Now</button><button id="btn-restart">Restart Story</button></div>
    <div id="endscreen" class="screen" style="display:none"><h2 id="endtitle">BUSTED</h2><p id="endtext"></p><button id="btn-respawn">Respawn</button></div>
    <div id="completescreen" class="screen" style="display:none"><h2>STORY COMPLETE</h2><p>Juno pulled off the Marina Score. Port Solano is yours to roam — find the golden conches, outrun the heat, live the coast.</p><button id="btn-roam">Keep Roaming</button></div>`;
    const $ = (id) => root.querySelector('#' + id);
    this.el = { hud: $('hud'), health: $('health'), cash: $('cash'), stars: $('stars'), conch: $('conch'), objective: $('objective'), weapon: $('weapon'), speedo: $('speedo'), prompt: $('prompt'), toast: $('toast'), dialogue: $('dialogue'), speaker: $('speaker'), dialogtext: $('dialogtext'), start: $('startscreen'), pause: $('pausescreen'), end: $('endscreen'), endtitle: $('endtitle'), endtext: $('endtext'), complete: $('completescreen'), minimap: $('minimap'), cont: $('btn-continue') };
    $('btn-start').onclick = () => callbacks.onStart(false);
    this.el.cont.onclick = () => callbacks.onStart(true);
    $('btn-resume').onclick = () => callbacks.onPause(false);
    $('btn-save').onclick = () => callbacks.onSave();
    $('btn-restart').onclick = () => callbacks.onRestart();
    $('btn-respawn').onclick = () => callbacks.onRespawn();
    $('btn-roam').onclick = () => { this.el.complete.style.display = 'none'; callbacks.onPause(false); };
    this.toastT = 0;
  }
  showContinue(v) { this.el.cont.style.display = v ? 'block' : 'none'; }
  setDialogue(name, text) { if (!text) { this.el.dialogue.style.display = 'none'; return; } this.el.dialogue.style.display = 'block'; this.el.speaker.textContent = name; this.el.dialogtext.textContent = text; }
  toast(msg) { this.el.toast.textContent = msg; this.el.toast.style.opacity = '1'; this.toastT = 3.2; }
  update(dt, G) {
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.el.toast.style.opacity = '0'; }
    this.el.health.style.width = Math.max(0, G.player.health) + '%';
    this.el.health.style.background = G.player.health > 30 ? '#39d353' : '#e23b2e';
    this.el.cash.textContent = '$' + G.cash;
    let s = ''; for (let i = 0; i < 5; i++) s += i < G.wanted ? '★' : '☆';
    this.el.stars.textContent = s; this.el.stars.style.opacity = (G.wantedDecay && Math.sin(performance.now() / 150) > 0) ? '0.35' : '1';
    this.el.conch.textContent = '🐚 ' + G.conchesFound + '/10';
    this.el.objective.textContent = G.objective || '';
    this.el.objective.style.display = G.objective ? 'block' : 'none';
    const c = G.combat;
    this.el.weapon.textContent = c.weapon === 'pistol' ? ('🔫 Pistol  ' + c.ammo + ' / ∞' + (c.reloadT > 0 ? '  reloading…' : '')) : '👊 Fists';
    this.el.speedo.textContent = G.player.inCar ? Math.round(Math.abs(G.player.inCar.speed) * 3.6) + ' km/h' : '';
    this.el.prompt.textContent = G.prompt || ''; this.el.prompt.style.display = G.prompt ? 'block' : 'none';
  }
}
export const HUD_CSS = `
#hud{position:fixed;inset:0;pointer-events:none;font-family:Arial,sans-serif;color:#fff;z-index:5}
#topbar{position:absolute;top:12px;left:12px;display:flex;gap:14px;align-items:center;background:rgba(0,0,0,.45);padding:8px 14px;border-radius:10px}
#healthwrap{width:170px;height:14px;background:#333;border-radius:7px;overflow:hidden}#health{height:100%;background:#39d353;transition:width .2s}
#cash{font-size:22px;font-weight:bold;color:#7ee787}#stars{font-size:22px;color:#ffd33d;letter-spacing:2px}#conch{font-size:16px}
#objective{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(20,30,60,.75);padding:9px 18px;border-radius:10px;font-size:16px;max-width:60%;text-align:center}
#weapon{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.45);padding:8px 12px;border-radius:8px;font-size:16px}
#speedo{position:absolute;right:12px;bottom:56px;font-size:26px;font-weight:bold;text-shadow:0 2px 4px #000}
#minimap{position:absolute;left:12px;bottom:12px;border:2px solid rgba(255,255,255,.6);border-radius:8px;background:#203040}
#prompt{position:absolute;bottom:110px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);padding:8px 16px;border-radius:8px;font-size:17px}
#toast{position:absolute;top:70px;left:50%;transform:translateX(-50%);background:rgba(180,120,10,.9);padding:10px 22px;border-radius:10px;font-size:19px;transition:opacity .4s}
#dialogue{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);width:min(640px,86%);background:rgba(8,12,24,.88);border:2px solid #e8b23a;border-radius:12px;padding:14px 18px;pointer-events:none}
#speaker{color:#ffd33d;font-weight:bold;font-size:17px}#dialogtext{font-size:17px;margin-top:4px;line-height:1.35}#dialoghint{font-size:12px;opacity:.7;margin-top:6px}
#crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:20px;opacity:.8}
.screen{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(rgba(10,20,40,.55),rgba(10,20,40,.78));color:#fff;font-family:Arial,sans-serif;z-index:10;text-align:center;padding:20px}
.screen h1{font-size:64px;letter-spacing:4px;color:#ffd33d;text-shadow:0 4px 0 #c25e10,0 8px 24px #000;margin:0}
.screen h2{font-size:40px;color:#ffd33d}.screen .intro{max-width:620px;font-size:18px;line-height:1.5}.screen .controls{max-width:640px;font-size:14px;opacity:.9;margin:14px;line-height:1.6}
.screen button{pointer-events:auto;font-size:19px;padding:12px 30px;margin:7px;border:none;border-radius:10px;background:#e8b23a;color:#201600;font-weight:bold;cursor:pointer}.screen button:hover{background:#ffd33d}
`;
