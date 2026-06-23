// ─── Game Engine (Client-Side) ────────────────────────────────────────────────

const GameEngine = (() => {

  let canvas, ctx;
  let state      = null;
  let myId       = null;
  let localChars = {};
  let charCache  = {}; // id → { "dir_frame": offscreenCanvas }

  let chaosActive = false;
  let chaosEvent  = null;

  const keys = {};
  let lastInputStr = '';

  const joy = {
    active: false, touchId: null,
    baseX: 0, baseY: 0,
    dx: 0, dy: 0,
    sprint: false,
  };
  let bombTouch   = false;
  let bombTouchId = null;
  let sprintTouchId = null;

  let raf = null;
  const DIRS      = ['down','up','left','right'];
  const GRID_W    = 21;
  const GRID_H    = 17;
  const TILE_SRV  = 40; // tamanho do tile no servidor (fixo)
  const STAMINA_MAX = 100;

  // ── Layout helpers ────────────────────────────────────────────────────────
  function isMobileDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  const HUD_H = 44;

  function getJoyCtrlH() {
    return isMobileDevice() ? Math.floor(window.innerHeight * 0.23) : 0;
  }

  function getTileSize() {
    const availW = window.innerWidth;
    const availH = window.innerHeight - HUD_H - getJoyCtrlH();
    return Math.max(1, Math.floor(Math.min(availW / GRID_W, availH / GRID_H)));
  }

  // Converte coordenada do servidor → pixel do canvas
  function srvToCanvas(v, ts) { return v * (ts / TILE_SRV); }

  // Offsets para centralizar o mapa na área de jogo (abaixo do HUD, acima dos controles)
  function getOffsets(W, H, ts) {
    const gameAreaH = H - HUD_H - getJoyCtrlH();
    const mapW = GRID_W * ts;
    const mapH = GRID_H * ts;
    return {
      ox: Math.floor((W - mapW) / 2),
      oy: Math.floor(HUD_H + (gameAreaH - mapH) / 2),
    };
  }

  // ── Controles mobile ──────────────────────────────────────────────────────
  function joyR()  { return canvas.width * 0.13; }
  function btnR()  { return canvas.width * 0.09; }
  function ctrlY() { return canvas.height - canvas.height * 0.02; }

  function joyDefaultPos() {
    const r = joyR();
    return { x: r + canvas.width * 0.04, y: ctrlY() - r };
  }
  function bombPos() {
    const r = btnR();
    return { x: canvas.width - r - canvas.width * 0.04, y: ctrlY() - r };
  }
  function sprintPos() {
    const r = btnR() * 0.68;
    return { x: canvas.width - btnR()*2 - canvas.width*0.10, y: ctrlY() - r - btnR()*0.5 };
  }

  // ── Cache de sprites ──────────────────────────────────────────────────────
  // Prerender em scale=1 (16px base) e escala no drawImage conforme ts
  function prerenderChar(id, opts) {
    if (charCache[id]) return;
    charCache[id] = {};
    DIRS.forEach(dir => {
      for (let f = 0; f < 5; f++) {
        const c  = document.createElement('canvas');
        CharRenderer.render(c, opts, 1, dir, f, false);
        charCache[id][`${dir}_${f}`] = c;

        const cb = document.createElement('canvas');
        CharRenderer.render(cb, opts, 1, dir, f, true);
        charCache[id][`${dir}_${f}_bomb`] = cb;
      }
    });
  }

  // ── Início ────────────────────────────────────────────────────────────────
  function start(canvasEl, playerId, characters) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    myId   = playerId;
    localChars = characters;

    charCache = {};
    Object.entries(characters).forEach(([id, opts]) => prerenderChar(id, opts));

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupKeyboard();
    setupTouch();

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    window.removeEventListener('resize', resizeCanvas);
    removeKeyboard();
    removeTouch();
    state = null;
  }

  function resizeCanvas() {
    if (!canvas) return;
    // Usa as dimensões CSS reais do canvas para evitar mismatch em mobile
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  || window.innerWidth);
    canvas.height = Math.round(rect.height || window.innerHeight);
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop(now) {
    try {
      MapRenderer.tick(now);
      render(now);
      sendInput();
    } catch (err) {
      console.error('[Engine] loop error:', err);
    }
    raf = requestAnimationFrame(loop);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(now) {
    if (!canvas) return;
    ctx.imageSmoothingEnabled = false;
    const W  = canvas.width;
    const H  = canvas.height;
    const ts = getTileSize();
    const { ox, oy } = getOffsets(W, H, ts);
    const mapW = GRID_W * ts;
    const mapH = GRID_H * ts;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, W, H);

    if (!state) {
      const fs = Math.max(8, W * 0.025);
      ctx.fillStyle = '#ff5533';
      ctx.font = `${fs}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CARREGANDO...', W/2, H/2);
      drawMobileControls(now);
      return;
    }

    ctx.save();
    if (chaosActive && chaosEvent?.id === 'screen_flip') {
      ctx.translate(W, H);
      ctx.rotate(Math.PI);
    }

    ctx.save();
    ctx.translate(ox, oy);

    ctx.strokeStyle = '#ff5533';
    ctx.lineWidth = 2;
    ctx.strokeRect(-1, -1, mapW+2, mapH+2);

    MapRenderer.renderMap(ctx, state, ts, now);

    if (state.bombs) {
      state.bombs.forEach(b => {
        const frac = b.maxTimer > 0 ? Math.max(0, b.timer / b.maxTimer) : -1;
        drawBomb(ctx, b.tx * ts, b.ty * ts, ts, frac, b.timer, now);
      });
    }

    if (state.players) {
      [...state.players]
        .sort((a, b) => a.y - b.y)
        .forEach(p => drawPlayer(ctx, p, ts, now));
    }

    ctx.restore();
    ctx.restore();

    drawHUD(ctx, W, H, ts, now);
    drawMobileControls(now);
  }

  // ── Bomba ─────────────────────────────────────────────────────────────────
  function drawBomb(ctx, x, y, ts, timerFrac, timerMs, now) {
    const cx = x + ts/2, cy = y + ts/2;
    const r  = ts * 0.30;
    const spark = Math.floor(now/280)%2===0 ? '#FFCC00' : '#FF6600';

    ctx.strokeStyle = '#885533';
    ctx.lineWidth = Math.max(1, ts*0.05);
    ctx.beginPath();
    ctx.moveTo(cx + r*0.6, cy - r);
    ctx.quadraticCurveTo(cx + r*1.2, cy - r*1.6, cx + r*0.8, cy - r*1.9);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(cx + r*0.8, cy - r*2, Math.max(2, r*0.18), 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx, cy, r*0.9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.22, 0, Math.PI*2); ctx.fill();

    if (timerFrac > 0) {
      ctx.strokeStyle = timerFrac > 0.6 ? '#22ff66' : timerFrac > 0.3 ? '#ffaa00' : '#ff2200';
      ctx.lineWidth = Math.max(2, ts*0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, r + Math.max(2, ts*0.1), -Math.PI/2, -Math.PI/2 + Math.PI*2*timerFrac);
      ctx.stroke();
    }

    if (timerMs > 0) {
      const sec = Math.ceil(timerMs / 1000);
      const fs  = Math.max(6, ts * 0.30);
      ctx.fillStyle = timerMs < 1000 ? '#ff2200' : timerMs < 2000 ? '#ffaa00' : '#ffffff';
      ctx.font = `bold ${fs}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(sec, cx, y - 2);
    }
  }

  // ── Jogador ───────────────────────────────────────────────────────────────
  function drawPlayer(ctx, p, ts, now) {
    const dir    = p.direction || 'down';
    const frame  = p.frame ?? 0;
    const key    = `${dir}_${frame}`;
    const cache  = charCache[p.id];
    const sprite = cache?.[key];

    // Coordenadas convertidas de espaço servidor → espaço canvas
    const rpx = srvToCanvas(p.x, ts);
    const rpy = srvToCanvas(p.y, ts);

    const isHotCarrier = state?.hotBomb?.carrierId === p.id;
    const ev      = state?.chaosEvent;
    const isGiant = state?.chaosActive && ev?.id === 'giant_mode';
    const isTiny  = state?.chaosActive && ev?.id === 'tiny_mode';
    const isGhost = p.ghost;
    const chaosScale = isGiant ? 1.9 : isTiny ? 0.5 : 1;

    // Escala do sprite proporcional ao tile
    const spriteScale = (ts / 16) * chaosScale; // base sprite = 16px em scale=1

    if (!p.alive) ctx.globalAlpha = 0.25;
    if (isGhost)  ctx.globalAlpha = Math.min(ctx.globalAlpha ?? 1, 0.55);

    if (sprite) {
      const sw = sprite.width  * spriteScale;
      const sh = sprite.height * spriteScale;
      ctx.drawImage(sprite, rpx - sw/2, rpy - sh*0.78, sw, sh);

      // Escudo
      if (p.shield) {
        ctx.strokeStyle = `rgba(68,136,255,${0.5 + 0.3*Math.sin(now/200)})`;
        ctx.lineWidth = Math.max(1, ts*0.07);
        ctx.beginPath();
        ctx.arc(rpx, rpy - ts*0.3, ts*0.5, 0, Math.PI*2);
        ctx.stroke();
      }

      // Bomba na cabeça do portador
      if (isHotCarrier && p.alive) {
        const headY = rpy - sh * 0.78;
        const headCY = headY + sh * 0.22;
        drawBombHead(ctx, rpx, headCY, ts, now);
      }

      ctx.globalAlpha = 1;

      // Barra de stamina (aparece quando stamina < 100)
      if (p.stamina !== undefined && p.stamina < STAMINA_MAX && p.alive) {
        const barW = Math.max(ts * 0.9, 18);
        const barH = Math.max(2, ts * 0.09);
        const barX = rpx - barW / 2;
        const barY = rpy - sh * 0.90 - barH - 2;
        const frac = Math.max(0, p.stamina / STAMINA_MAX);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = frac > 0.6 ? '#22ff66' : frac > 0.3 ? '#ffcc00' : '#ff3322';
        ctx.fillRect(barX, barY, barW * frac, barH);
        // Ícone ⚡ minúsculo à esquerda
        const sf = Math.max(5, ts * 0.19);
        ctx.font = `${sf}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffff88';
        ctx.fillText('⚡', barX - sf * 1.1, barY + barH / 2);
      }

      // Nome
      const isMe = p.id === myId;
      const fs = Math.max(5, ts * 0.20);
      ctx.fillStyle = isHotCarrier ? '#ff2200' : isMe ? '#ffcc00' : p.isBot ? '#8888bb' : '#ffffff';
      ctx.font = `bold ${fs}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameY = rpy - sh * 0.82;
      ctx.fillText((p.name || '?').slice(0, 10), rpx, nameY);

      // Indicador de bomba já usada
      if (p.bombUsed && p.alive) {
        const sf2 = Math.max(5, ts * 0.20);
        ctx.font = `${sf2}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('💣❌', rpx + ts * 0.26, nameY);
      }

      // Timer bomba quente
      if (isHotCarrier && p.alive && state?.hotBomb) {
        const timerSec = Math.max(0, Math.ceil(state.hotBomb.timer / 1000));
        const frac = state.hotBomb.timer / state.hotBomb.maxTimer;
        ctx.fillStyle = frac < 0.3 ? '#ff2200' : frac < 0.6 ? '#ffaa00' : '#ffffff';
        ctx.font = `bold ${Math.max(5, ts*0.22)}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`⏱${timerSec}s`, rpx, nameY - fs - 1);
      }
    } else {
      // Fallback retângulo colorido
      const col = ['#ff5533','#33ff88','#4488ff','#ffcc00','#ff33cc','#33ccff','#ff9922','#cc33ff'];
      ctx.fillStyle = col[Object.keys(localChars).indexOf(p.id) % col.length] || '#fff';
      ctx.fillRect(rpx - ts*0.25, rpy - ts*0.75, ts*0.5, ts*0.75);
      ctx.globalAlpha = 1;
    }
  }

  function drawBombHead(ctx, cx, cy, ts, now) {
    const r = ts * 0.26;
    const pulse = 1 + 0.08 * Math.sin(now / 150);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2 * pulse);
    grad.addColorStop(0, 'rgba(255,50,0,0.55)');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, r*2.2*pulse, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy, r*pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx, cy, r*pulse*0.88, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.22, 0, Math.PI*2); ctx.fill();

    const spark = Math.floor(now/200)%2===0 ? '#FFCC00' : '#FF4400';
    ctx.strokeStyle = '#885533';
    ctx.lineWidth = Math.max(1, ts*0.05);
    ctx.beginPath();
    ctx.moveTo(cx + r*0.55, cy - r*0.9);
    ctx.quadraticCurveTo(cx + r*1.1, cy - r*1.5, cx + r*0.75, cy - r*1.85);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath(); ctx.arc(cx + r*0.75, cy - r*1.85, Math.max(2, r*0.2), 0, Math.PI*2); ctx.fill();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  function drawHUD(ctx, W, H, ts, now) {
    if (!state?.players) return;
    const me = state.players.find(p => p.id === myId);
    if (!me) return;

    const fs = Math.max(6, Math.floor(W * 0.020));
    const bh = fs * 4.6;
    const bw = fs * 24;
    const bx = W * 0.01;
    const by = HUD_H + (H - HUD_H - getJoyCtrlH() - bh) * 0.97;

    ctx.fillStyle = 'rgba(7,7,15,0.82)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#2a2a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#ffcc00';
    ctx.font = `${fs}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💣 ${me.bombs||1} bombas  💥 ${me.range||2} alcance`, bx + fs*0.7, by + bh*0.3);
    ctx.fillText(`🏆 ${me.kills||0} eliminações`, bx + fs*0.7, by + bh*0.72);
  }

  // ── Controles mobile ──────────────────────────────────────────────────────
  function drawMobileControls(now) {
    if (!isMobileDevice()) return;
    const r  = joyR();
    const br = btnR();

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    // Joystick
    const jDef  = joyDefaultPos();
    const jx    = joy.active ? joy.baseX : jDef.x;
    const jy    = joy.active ? joy.baseY : jDef.y;
    const jAlpha = joy.active ? 0.85 : 0.40;

    ctx.globalAlpha = jAlpha;
    ctx.fillStyle = 'rgba(20,20,50,0.55)';
    ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(jx, jy, r*0.45, 0, Math.PI*2); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(r*0.36)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▲', jx, jy - r*0.7);
    ctx.fillText('▼', jx, jy + r*0.7);
    ctx.fillText('◀', jx - r*0.7, jy);
    ctx.fillText('▶', jx + r*0.7, jy);

    const hx = joy.active ? jx + joy.dx * r : jx;
    const hy = joy.active ? jy + joy.dy * r : jy;
    const hr = r * 0.40;
    const grd = ctx.createRadialGradient(hx - hr*0.3, hy - hr*0.3, 1, hx, hy, hr);
    grd.addColorStop(0, '#ff8866');
    grd.addColorStop(1, '#cc2200');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI*2); ctx.stroke();

    // Sprint
    const sp = sprintPos();
    const sr = btnR() * 0.72;
    ctx.globalAlpha = joy.sprint ? 0.95 : 0.45;
    ctx.fillStyle = joy.sprint ? '#22aaff' : 'rgba(30,30,80,0.7)';
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = joy.sprint ? '#88ddff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(sr*0.72)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚡', sp.x, sp.y);

    // Bomba
    const bp = bombPos();
    const pulse = bombTouch ? 1.08 : (1 + 0.05*Math.sin(now/280));
    ctx.globalAlpha = bombTouch ? 0.98 : 0.85;
    const bg = ctx.createRadialGradient(bp.x - br*0.3, bp.y - br*0.3, 2, bp.x, bp.y, br*pulse);
    bg.addColorStop(0, bombTouch ? '#ff5500' : '#992200');
    bg.addColorStop(1, bombTouch ? '#cc2200' : '#440800');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, br*pulse, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = bombTouch ? '#ffaa00' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, br*pulse, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(br*0.75)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💣', bp.x, bp.y);

    ctx.restore();
  }

  // ── Teclado ───────────────────────────────────────────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
  }
  function removeKeyboard() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',   onKeyUp);
  }
  function onKeyDown(e) {
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))
      e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }

  // ── Touch ─────────────────────────────────────────────────────────────────
  function setupTouch() {
    canvas.addEventListener('touchstart',  onTouchStart,  { passive: false });
    canvas.addEventListener('touchmove',   onTouchMove,   { passive: false });
    canvas.addEventListener('touchend',    onTouchEnd,    { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd,    { passive: false });
  }
  function removeTouch() {
    canvas.removeEventListener('touchstart',  onTouchStart);
    canvas.removeEventListener('touchmove',   onTouchMove);
    canvas.removeEventListener('touchend',    onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
  }

  function onTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      const tx = t.clientX, ty = t.clientY;

      const bp = bombPos();
      if (Math.hypot(tx - bp.x, ty - bp.y) < btnR() * 1.4) {
        bombTouch = true; bombTouchId = t.identifier; return;
      }
      const sp = sprintPos();
      if (Math.hypot(tx - sp.x, ty - sp.y) < btnR() * 0.72 * 1.4) {
        joy.sprint = true; sprintTouchId = t.identifier; return;
      }
      if (tx < canvas.width * 0.55 && !joy.active) {
        joy.active  = true;
        joy.touchId = t.identifier;
        const r = joyR();
        joy.baseX = Math.max(r + 8, Math.min(canvas.width * 0.52 - 8, tx));
        joy.baseY = Math.max(r + 8, Math.min(canvas.height - r - 8, ty));
        joy.dx = 0; joy.dy = 0;
      }
    });
  }

  function onTouchMove(e) {
    e.preventDefault();
    const r = joyR(); // usa a função, não joy.radius
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === joy.touchId && joy.active) {
        const dx   = t.clientX - joy.baseX;
        const dy   = t.clientY - joy.baseY;
        const dist = Math.hypot(dx, dy);
        const norm = dist > 0 ? Math.min(1, dist / r) : 0;
        joy.dx = (dx / (dist || 1)) * norm;
        joy.dy = (dy / (dist || 1)) * norm;
      }
    });
  }

  function onTouchEnd(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === joy.touchId)    { joy.active = false; joy.dx = 0; joy.dy = 0; joy.touchId = null; }
      if (t.identifier === bombTouchId)    { bombTouch = false; bombTouchId = null; }
      if (t.identifier === sprintTouchId)  { joy.sprint = false; sprintTouchId = null; }
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  function sendInput() {
    const DEAD  = 0.22;
    const jUp   = joy.active && joy.dy < -DEAD;
    const jDown = joy.active && joy.dy >  DEAD;
    const jLeft = joy.active && joy.dx < -DEAD;
    const jRight= joy.active && joy.dx >  DEAD;

    const inp = {
      up:     !!(keys['ArrowUp']    || keys['KeyW'] || jUp),
      down:   !!(keys['ArrowDown']  || keys['KeyS'] || jDown),
      left:   !!(keys['ArrowLeft']  || keys['KeyA'] || jLeft),
      right:  !!(keys['ArrowRight'] || keys['KeyD'] || jRight),
      bomb:   !!(keys['Space'] || keys['KeyZ'] || keys['Enter'] || bombTouch),
      sprint: !!(keys['ShiftLeft']  || keys['ShiftRight'] || joy.sprint),
    };

    const s = JSON.stringify(inp);
    if (s !== lastInputStr) {
      lastInputStr = s;
      GameSocket.emit('game:input', inp);
    }
  }

  // ── API ───────────────────────────────────────────────────────────────────
  function setState(serverState) {
    state = serverState;
    if (state.players) {
      state.players.forEach(p => {
        if (!charCache[p.id]) {
          prerenderChar(p.id, localChars[p.id] || CharRenderer.defaultOpts());
        }
      });
    }
  }

  function setChaos(event, active) { chaosActive = active; chaosEvent = event; }

  function setCharacters(chars) {
    localChars = chars;
    charCache  = {};
    Object.entries(chars).forEach(([id, opts]) => prerenderChar(id, opts));
  }

  return { start, stop, setState, setChaos, setCharacters };
})();
