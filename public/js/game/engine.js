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
    radius: 55,
  };
  let bombTouch = false;
  let bombTouchId = null;

  let raf = null;
  const DIRS = ['down','up','left','right'];

  const GRID_W = 21;
  const GRID_H = 17;

  // ── Tile size dinâmico ────────────────────────────────────────────────────
  function getTileSize() {
    const hudH = 52;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - hudH;
    const ts   = Math.floor(Math.min(maxW / GRID_W, maxH / GRID_H));
    return Math.max(20, Math.min(ts, 48));
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

    // Barra de status do jogador
    const bx = 10, by = H - 44;
    ctx.fillStyle = 'rgba(7,7,15,0.8)';
    ctx.fillRect(bx, by, 200, 36);
    ctx.strokeStyle = '#2a2a5a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 200, 36);

    ctx.fillStyle = '#ffcc00';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💣 ${me.bombs||1} bombas  💥 ${me.range||2} alcance`, bx+8, by+12);
    ctx.fillText(`🏆 ${me.kills||0} eliminações`, bx+8, by+26);
  }

  // ── Controles Mobile ──────────────────────────────────────────────────────
  function isMobileDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function drawMobileControls(now) {
    if (!isMobileDevice()) return;
    const W = canvas.width, H = canvas.height;

    // Joystick base (esquerda)
    const jbx = 90, jby = H - 110;
    const alpha = joy.active ? 0.7 : 0.4;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Base
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(jbx, jby, joy.radius, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(jbx, jby, joy.radius, 0, Math.PI*2); ctx.stroke();

    // Setas diagonais
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('↑', jbx,         jby - joy.radius*0.6);
    ctx.fillText('↓', jbx,         jby + joy.radius*0.6);
    ctx.fillText('←', jbx - joy.radius*0.6, jby);
    ctx.fillText('→', jbx + joy.radius*0.6, jby);

    // Handle
    const hx = joy.active ? jbx + joy.dx * joy.radius : jbx;
    const hy = joy.active ? jby + joy.dy * joy.radius : jby;
    ctx.fillStyle = 'rgba(255,85,51,0.85)';
    ctx.beginPath(); ctx.arc(hx, hy, joy.radius*0.38, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, joy.radius*0.38, 0, Math.PI*2); ctx.stroke();

    // Botão de bomba (direita)
    const bbx = W - 80, bby = H - 100;
    const bombPulse = bombTouch ? 1 : (0.7 + 0.2*Math.sin(now/300));
    ctx.globalAlpha = bombPulse * 0.85;
    ctx.fillStyle = bombTouch ? '#ff2200' : '#cc4400';
    ctx.beginPath(); ctx.arc(bbx, bby, 42, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bbx, bby, 42, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💣', bbx, bby);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('BOMBA', bbx, bby + 52);

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

  function joyBase() {
    // Centro do joystick na tela
    return { x: 90, y: canvas.height - 110 };
  }
  function bombCenter() {
    return { x: canvas.width - 80, y: canvas.height - 100 };
  }

  function onTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t => {
      const tx = t.clientX, ty = t.clientY;
      const bc = bombCenter();
      const dist = Math.hypot(tx - bc.x, ty - bc.y);
      if (dist < 60) {
        // Botão de bomba
        bombTouch = true;
        bombTouchId = t.identifier;
        return;
      }
      // Joystick — qualquer toque na metade esquerda da tela
      if (tx < canvas.width / 2 && !joy.active) {
        joy.active  = true;
        joy.touchId = t.identifier;
        joy.baseX   = tx;
        joy.baseY   = ty;
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
      sprint: !!(keys['ShiftLeft'] || keys['ShiftRight']),
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
