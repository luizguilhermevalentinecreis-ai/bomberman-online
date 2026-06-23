// ─── Game Engine (Client-Side) ────────────────────────────────────────────────

const GameEngine = (() => {

  let canvas, ctx;
  let state      = null;
  let myId       = null;
  let localChars = {};
  let charCache  = {}; // "id_dir_frame" → offscreen canvas

  let chaosActive = false;
  let chaosEvent  = null;

  // Input teclado
  const keys = {};
  let lastInputStr = '';

  // Joystick touch
  const joy = {
    active: false, touchId: null,
    baseX: 0, baseY: 0,
    dx: 0, dy: 0,
    sprint: false,
  };
  let bombTouch = false;
  let bombTouchId = null;

  let raf = null;
  const DIRS = ['down','up','left','right'];

  const GRID_W = 21;
  const GRID_H = 17;

  // ── Tile size dinâmico ────────────────────────────────────────────────────
  function getJoyCtrlH() {
    if (!isMobileDevice()) return 0;
    return Math.floor(window.innerHeight * 0.23); // 23% da altura — sem min/max fixo
  }

  function getTileSize() {
    const hudH = 44;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - hudH - getJoyCtrlH();
    // sem clamp fixo — adapta a qualquer tamanho de tela
    return Math.max(1, Math.floor(Math.min(maxW / GRID_W, maxH / GRID_H)));
  }

  // ── Cache de sprites ──────────────────────────────────────────────────────
  function prerenderChar(id, opts) {
    if (charCache[id]) return;
    charCache[id] = {};
    const s = 3; // scale fixa para os sprites no jogo
    DIRS.forEach(dir => {
      for (let f = 0; f < 5; f++) {
        const c = document.createElement('canvas');
        CharRenderer.render(c, opts, s, dir, f, false);
        charCache[id][`${dir}_${f}`] = c;

        const cb = document.createElement('canvas');
        CharRenderer.render(cb, opts, s, dir, f, true);
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
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop(now) {
    MapRenderer.tick(now);
    render(now);
    sendInput();
    raf = requestAnimationFrame(loop);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(now) {
    if (!canvas) return;
    const W  = canvas.width;
    const H  = canvas.height;
    const ts = getTileSize();
    const mapW = GRID_W * ts;
    const mapH = GRID_H * ts;
    const ox   = Math.floor((W - mapW) / 2);
    const oy   = Math.floor((H - mapH) / 2);

    ctx.clearRect(0, 0, W, H);

    // Fundo escuro
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, W, H);

    if (!state) {
      // Loading
      ctx.fillStyle = '#ff5533';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CARREGANDO...', W/2, H/2);
      drawMobileControls(now);
      return;
    }

    // Caos: tela invertida
    ctx.save();
    if (chaosActive && chaosEvent?.id === 'screen_flip') {
      ctx.translate(W, H);
      ctx.rotate(Math.PI);
    }

    // Mapa
    ctx.save();
    ctx.translate(ox, oy);

    // Borda do mapa
    ctx.strokeStyle = '#ff5533';
    ctx.lineWidth = 3;
    ctx.strokeRect(-2, -2, mapW+4, mapH+4);

    MapRenderer.renderMap(ctx, state, ts, now);

    // Bombas
    if (state.bombs) {
      state.bombs.forEach(b => {
        const frac = b.maxTimer > 0 ? Math.max(0, b.timer / b.maxTimer) : -1;
        drawBomb(ctx, b.tx * ts, b.ty * ts, ts, frac, b.timer, now);
      });
    }

    // Jogadores (ordenados por Y)
    if (state.players) {
      [...state.players]
        .sort((a, b) => a.y - b.y)
        .forEach(p => drawPlayer(ctx, p, ts, now));
    }

    ctx.restore();

    ctx.restore(); // desfaz flip do caos

    // HUD
    drawHUD(ctx, W, H, ts, now);

    // Controles mobile
    drawMobileControls(now);
  }

  // ── Desenhar bomba ────────────────────────────────────────────────────────
  function drawBomb(ctx, x, y, ts, timerFrac, timerMs, now) {
    const cx = x + ts/2, cy = y + ts/2;
    const r  = ts * 0.30;

    // Pavio
    const spark = Math.floor(now/280)%2===0 ? '#FFCC00' : '#FF6600';
    ctx.strokeStyle = '#885533';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + r*0.6, cy - r);
    ctx.quadraticCurveTo(cx + r*1.2, cy - r*1.6, cx + r*0.8, cy - r*1.9);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(cx + r*0.8, cy - r*2, 3, 0, Math.PI*2);
    ctx.fill();

    // Corpo
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx, cy, r*0.9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.22, 0, Math.PI*2); ctx.fill();

    // Arco de timer
    if (timerFrac > 0) {
      ctx.strokeStyle = timerFrac > 0.6 ? '#22ff66' : timerFrac > 0.3 ? '#ffaa00' : '#ff2200';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, -Math.PI/2, -Math.PI/2 + Math.PI*2*timerFrac);
      ctx.stroke();
    }

    // Número do timer ACIMA da bomba
    if (timerMs > 0) {
      const sec = Math.ceil(timerMs / 1000);
      ctx.fillStyle = timerMs < 1000 ? '#ff2200' : timerMs < 2000 ? '#ffaa00' : '#ffffff';
      ctx.font = `bold ${Math.max(10, ts*0.32)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(sec, cx, y - 4);
    }
  }

  // ── Desenhar jogador ──────────────────────────────────────────────────────
  function drawPlayer(ctx, p, ts, now) {
    const dir   = p.direction || 'down';
    const frame = p.frame ?? 0;
    const key   = `${dir}_${frame}`;
    const cache = charCache[p.id];
    const sprite = cache?.[key];

    const px = p.x, py = p.y;
    const isHotCarrier = state?.hotBomb?.carrierId === p.id;
    const ev = state?.chaosEvent;
    const isGiant = state?.chaosActive && ev?.id === 'giant_mode';
    const isTiny  = state?.chaosActive && ev?.id === 'tiny_mode';
    const isGhost = p.ghost;
    const scale   = isGiant ? 1.9 : isTiny ? 0.5 : 1;

    if (!p.alive) ctx.globalAlpha = 0.25;
    if (isGhost)  ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.55);

    if (sprite) {
      const sw = sprite.width * scale, sh = sprite.height * scale;
      ctx.drawImage(sprite, px - sw/2, py - sh*0.78, sw, sh);
    } else {
      const col = ['#ff5533','#33ff88','#4488ff','#ffcc00','#ff33cc','#33ccff','#ff9922','#cc33ff'];
      ctx.fillStyle = col[Object.keys(localChars).indexOf(p.id) % col.length] || '#fff';
      ctx.fillRect(px - 10, py - 28, 20, 32);
    }

    // Escudo
    if (p.shield) {
      ctx.strokeStyle = `rgba(68,136,255,${0.5 + 0.3*Math.sin(now/200)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py - ts*0.3, ts*0.45, 0, Math.PI*2);
      ctx.stroke();
    }

    // Cabeça vira bomba para portador da bomba quente
    if (isHotCarrier && p.alive) {
      const sh = sprite ? sprite.height : 32;
      const headY = py - sh * 0.78; // topo do sprite
      const headCY = headY + sh * 0.22; // centro da cabeça (aprox. 22% do topo)
      drawBombHead(ctx, px, headCY, ts, now);
    }

    if (!p.alive || isGhost) ctx.globalAlpha = 1;

    // Nome acima
    const isMe = p.id === myId;
    ctx.fillStyle = isHotCarrier ? '#ff2200' : (isMe ? '#ffcc00' : (p.isBot ? '#8888bb' : '#ffffff'));
    ctx.font = `bold ${Math.max(6, ts*0.18)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const sprite2 = charCache[p.id]?.[key];
    const nameY = sprite2 ? (py - sprite2.height*0.82) : (py - 30);
    ctx.fillText(p.name?.slice(0,10) || '?', px, nameY);

    // Timer da bomba quente acima do nome
    if (isHotCarrier && p.alive && state?.hotBomb) {
      const timerSec = Math.max(0, Math.ceil(state.hotBomb.timer / 1000));
      const frac = state.hotBomb.timer / state.hotBomb.maxTimer;
      ctx.fillStyle = frac < 0.3 ? '#ff2200' : frac < 0.6 ? '#ffaa00' : '#ffffff';
      ctx.font = `bold ${Math.max(7, ts*0.20)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`⏱${timerSec}s`, px, nameY - Math.max(6, ts*0.18) - 2);
    }
  }

  // Bomba desenhada sobre a cabeça do portador
  function drawBombHead(ctx, cx, cy, ts, now) {
    const r = ts * 0.26;
    const pulse = 1 + 0.08 * Math.sin(now / 150);

    // Glow vermelho pulsante
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2 * pulse);
    grad.addColorStop(0, 'rgba(255,50,0,0.55)');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2 * pulse, 0, Math.PI*2);
    ctx.fill();

    // Corpo da bomba
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx, cy, r * pulse * 0.88, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.22, 0, Math.PI*2); ctx.fill();

    // Pavio
    const spark = Math.floor(now/200)%2===0 ? '#FFCC00' : '#FF4400';
    ctx.strokeStyle = '#885533';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + r*0.55, cy - r*0.9);
    ctx.quadraticCurveTo(cx + r*1.1, cy - r*1.5, cx + r*0.75, cy - r*1.85);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(cx + r*0.75, cy - r*1.85, 3.5, 0, Math.PI*2);
    ctx.fill();
  }

  // ── HUD mini ──────────────────────────────────────────────────────────────
  function drawHUD(ctx, W, H, ts, now) {
    if (!state?.players) return;
    const me = state.players.find(p => p.id === myId);
    if (!me) return;

    const fs  = Math.max(6, Math.floor(W * 0.018)); // fonte proporcional
    const bh  = fs * 4.4;
    const bw  = fs * 22;
    const bx  = W * 0.01;
    const by  = H - getJoyCtrlH() - bh - H * 0.01;

    ctx.fillStyle = 'rgba(7,7,15,0.82)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#2a2a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#ffcc00';
    ctx.font = `${fs}px "Press Start 2P", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💣 ${me.bombs||1} bombas  💥 ${me.range||2} alcance`, bx + fs*0.8, by + bh*0.3);
    ctx.fillText(`🏆 ${me.kills||0} eliminações`, bx + fs*0.8, by + bh*0.72);
  }

  // ── Controles Mobile ──────────────────────────────────────────────────────
  function isMobileDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // tamanhos 100% proporcionais ao canvas — sem min/max fixo
  function joyR()  { return canvas.width * 0.13; }
  function btnR()  { return canvas.width * 0.09; }

  function ctrlBaseY() { return canvas.height - canvas.height * 0.02; }

  function joyDefault() {
    const r = joyR();
    return { x: r + canvas.width * 0.04, y: ctrlBaseY() - r };
  }
  function bombPos() {
    const r = btnR();
    return { x: canvas.width - r - canvas.width * 0.04, y: ctrlBaseY() - r };
  }
  function sprintPos() {
    const r = btnR() * 0.68;
    return { x: canvas.width - btnR()*2 - canvas.width*0.1, y: ctrlBaseY() - r - btnR()*0.5 };
  }

  function drawMobileControls(now) {
    if (!isMobileDevice()) return;
    const W = canvas.width, H = canvas.height;
    const r  = joyR();
    const br = btnR();

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    // ── Joystick ──
    const jx = joy.active ? joy.baseX : joyDefault().x;
    const jy = joy.active ? joy.baseY : joyDefault().y;
    const jAlpha = joy.active ? 0.82 : 0.38;

    // Base ring
    ctx.globalAlpha = jAlpha;
    ctx.fillStyle = 'rgba(20,20,50,0.55)';
    ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI*2); ctx.stroke();

    // Inner ring
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(jx, jy, r * 0.45, 0, Math.PI*2); ctx.stroke();

    // Arrow hints
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.round(r*0.38)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▲', jx,       jy - r*0.72);
    ctx.fillText('▼', jx,       jy + r*0.72);
    ctx.fillText('◀', jx - r*0.72, jy);
    ctx.fillText('▶', jx + r*0.72, jy);

    // Handle
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

    // ── Botão SPRINT (meio-direita, menor) ──
    const sp = sprintPos();
    const sr = btnR() * 0.72;
    ctx.globalAlpha = joy.sprint ? 0.95 : 0.45;
    ctx.fillStyle = joy.sprint ? '#22aaff' : 'rgba(30,30,80,0.7)';
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = joy.sprint ? '#88ddff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, sr, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(sr*0.7)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚡', sp.x, sp.y);

    // ── Botão BOMBA ──
    const bp = bombPos();
    const pulse = bombTouch ? 1.08 : (1 + 0.05*Math.sin(now/280));
    ctx.globalAlpha = bombTouch ? 0.98 : 0.82;
    const bg = ctx.createRadialGradient(bp.x - br*0.3, bp.y - br*0.3, 2, bp.x, bp.y, br*pulse);
    bg.addColorStop(0, bombTouch ? '#ff5500' : '#992200');
    bg.addColorStop(1, bombTouch ? '#cc2200' : '#440800');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, br*pulse, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = bombTouch ? '#ffaa00' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, br*pulse, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(br*0.72)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💣', bp.x, bp.y);

    ctx.restore();
  }

  // ── Input teclado ─────────────────────────────────────────────────────────
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

  // ── Touch / Joystick ──────────────────────────────────────────────────────
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

  let sprintTouchId = null;

  function onTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      const tx = t.clientX, ty = t.clientY;

      // Bomba
      const bp = bombPos();
      if (Math.hypot(tx - bp.x, ty - bp.y) < btnR() + 16) {
        bombTouch = true; bombTouchId = t.identifier; return;
      }
      // Sprint
      const sp = sprintPos();
      if (Math.hypot(tx - sp.x, ty - sp.y) < btnR() * 0.72 + 14) {
        joy.sprint = true; sprintTouchId = t.identifier; return;
      }
      // Joystick — metade esquerda da tela
      if (tx < canvas.width * 0.55 && !joy.active) {
        joy.active  = true;
        joy.touchId = t.identifier;
        // Joystick flutuante: ancora no ponto de toque
        const r = joyR();
        joy.baseX = Math.max(r + 10, Math.min(canvas.width * 0.5 - 10, tx));
        joy.baseY = Math.max(r + 10, Math.min(canvas.height - r - 10, ty));
        joy.dx = 0; joy.dy = 0;
      }
    });
  }

  function onTouchMove(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === joy.touchId && joy.active) {
        const dx = t.clientX - joy.baseX;
        const dy = t.clientY - joy.baseY;
        const dist = Math.hypot(dx, dy);
        const norm = dist > 0 ? Math.min(1, dist / joy.radius) : 0;
        joy.dx = (dx / (dist || 1)) * norm;
        joy.dy = (dy / (dist || 1)) * norm;
      }
    });
  }

  function onTouchEnd(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === joy.touchId) {
        joy.active = false; joy.dx = 0; joy.dy = 0; joy.touchId = null;
      }
      if (t.identifier === bombTouchId) {
        bombTouch = false; bombTouchId = null;
      }
      if (t.identifier === sprintTouchId) {
        joy.sprint = false; sprintTouchId = null;
      }
    });
  }

  // ── Enviar input ──────────────────────────────────────────────────────────
  function sendInput() {
    // Deadzone
    const DEAD = 0.25;
    const jUp    = joy.active && joy.dy < -DEAD;
    const jDown  = joy.active && joy.dy >  DEAD;
    const jLeft  = joy.active && joy.dx < -DEAD;
    const jRight = joy.active && joy.dx >  DEAD;

    const inp = {
      up:     !!(keys['ArrowUp']   || keys['KeyW'] || jUp),
      down:   !!(keys['ArrowDown'] || keys['KeyS'] || jDown),
      left:   !!(keys['ArrowLeft'] || keys['KeyA'] || jLeft),
      right:  !!(keys['ArrowRight']|| keys['KeyD'] || jRight),
      bomb:   !!(keys['Space'] || keys['KeyZ'] || keys['Enter'] || bombTouch),
      sprint: !!(keys['ShiftLeft'] || keys['ShiftRight'] || joy.sprint),
    };

    const s = JSON.stringify(inp);
    if (s !== lastInputStr) {
      lastInputStr = s;
      GameSocket.emit('game:input', inp);
    }
  }

  // ── Receber estado ────────────────────────────────────────────────────────
  function setState(serverState) {
    state = serverState;
    // Garante sprites de novos jogadores
    if (state.players) {
      state.players.forEach(p => {
        if (!charCache[p.id]) {
          const opts = localChars[p.id] || CharRenderer.defaultOpts();
          prerenderChar(p.id, opts);
        }
      });
    }
  }

  function setChaos(event, active) {
    chaosActive = active;
    chaosEvent  = event;
  }

  function setCharacters(chars) {
    localChars = chars;
    charCache  = {};
    Object.entries(chars).forEach(([id, opts]) => prerenderChar(id, opts));
  }

  return { start, stop, setState, setChaos, setCharacters };
})();
