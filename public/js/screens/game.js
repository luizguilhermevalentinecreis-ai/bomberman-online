// ─── Tela de Jogo ─────────────────────────────────────────────────────────────

const GameScreen = (() => {

  let chaosTimeout = null;

  function init() {
    const el = document.getElementById('screen-game');
    el.innerHTML = `
      <div id="game-hud" style="
        position:absolute;top:0;left:0;right:0;z-index:100;pointer-events:none;
        display:flex;justify-content:space-between;align-items:center;
        padding:4px 10px;background:rgba(7,7,15,0.92);border-bottom:2px solid #2a2a5a;
        height:44px;box-sizing:border-box;
      ">
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="font-size:9px;color:#ffcc00;">💣</span>
          <span id="hud-round" style="font-size:8px;color:#ff5533;"></span>
          <span id="hud-map"   style="font-size:7px;color:#8888bb;"></span>
        </div>
        <div id="hud-timer" style="font-size:14px;color:#ffcc00;letter-spacing:2px;"></div>
        <div style="display:flex;gap:8px;align-items:center;pointer-events:all;">
          <span id="hud-players" style="font-size:7px;color:#e8e8ff;"></span>
          <button class="btn btn-danger btn-sm" id="game-leave-btn" style="font-size:7px;padding:4px 8px;">✗ SAIR</button>
        </div>
      </div>

      <canvas id="game-canvas" style="position:absolute;inset:0;display:block;touch-action:none;width:100%;height:100%;"></canvas>

      <!-- Placar lateral -->
      <div id="game-scoreboard" style="
        position:absolute;right:8px;top:56px;
        background:rgba(7,7,15,0.85);border:2px solid #2a2a5a;
        padding:10px;min-width:140px;z-index:100;pointer-events:none;
      "></div>

      <!-- Countdown pré-rodada -->
      <div id="pre-countdown" style="
        position:absolute;inset:0;display:none;
        background:rgba(0,0,0,0.82);z-index:500;
        flex-direction:column;align-items:center;justify-content:center;gap:12px;
      ">
        <div id="pre-round-label" style="font-size:13px;color:#ffcc00;text-shadow:4px 4px 0 #664400;letter-spacing:2px;"></div>
        <div id="pre-map-label"   style="font-size:9px;color:#8888bb;"></div>
        <div id="pre-count-num"   style="font-size:72px;color:#ff5533;text-shadow:6px 6px 0 #8b2200,0 0 40px rgba(255,85,51,0.8);"></div>
        <div style="font-size:8px;color:#555577;">PREPARAR...</div>
      </div>

      <!-- Banner de caos -->
      <div id="chaos-banner-wrap" style="
        position:absolute;top:58px;left:0;right:0;display:none;
        justify-content:center;z-index:200;pointer-events:none;
      ">
        <div id="chaos-banner" style="
          font-size:11px;color:#ff5533;letter-spacing:2px;
          text-shadow:3px 3px 0 #8b2200,0 0 20px rgba(255,85,51,0.8);
          background:rgba(0,0,0,0.75);padding:10px 22px;border:2px solid #ff5533;
        "></div>
      </div>

      <!-- Hot bomb pass notification -->
      <div id="hot-notif" style="
        position:absolute;top:120px;left:50%;transform:translateX(-50%);
        display:none;z-index:300;pointer-events:none;
        font-size:9px;color:#ffcc00;background:rgba(0,0,0,0.75);
        padding:8px 16px;border:2px solid #ffcc00;white-space:nowrap;
      "></div>

      <!-- Resultado da rodada -->
      <div id="round-result" style="
        position:absolute;inset:0;display:none;
        background:rgba(0,0,0,0.88);z-index:300;
        flex-direction:column;align-items:center;justify-content:center;gap:16px;
      ">
        <canvas id="rr-particles" style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%;"></canvas>
        <div id="rr-title" style="font-size:16px;color:#ffcc00;text-shadow:4px 4px 0 #664400;animation:rrSlideIn 0.4s ease-out;"></div>
        <div id="rr-body"  style="font-size:8px;color:#e8e8ff;line-height:2.6;text-align:center;animation:rrFadeIn 0.6s ease-out 0.2s both;"></div>
        <div id="rr-next"  style="font-size:7px;color:#555577;margin-top:4px;animation:rrFadeIn 0.6s ease-out 0.5s both;"></div>
      </div>

      <!-- Fim do torneio -->
      <div id="tournament-end" style="
        position:absolute;inset:0;display:none;
        background:rgba(0,0,0,0.94);z-index:400;
        flex-direction:column;align-items:center;justify-content:center;gap:20px;
      ">
        <canvas id="te-particles" style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%;"></canvas>
        <div style="font-size:18px;color:#ffcc00;text-shadow:4px 4px 0 #664400;letter-spacing:4px;animation:rrSlideIn 0.5s ease-out;">🏆 RESULTADO FINAL</div>
        <div id="tournament-ranking" style="font-size:9px;line-height:2.8;text-align:center;animation:rrFadeIn 0.8s ease-out 0.3s both;"></div>
        <button class="btn btn-gold" id="tournament-back-btn" style="margin-top:8px;animation:rrFadeIn 0.8s ease-out 0.8s both;">↩ VOLTAR AO LOBBY</button>
      </div>
    `;

    // Canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('game-leave-btn').onclick = leaveGame;
    document.getElementById('tournament-back-btn').onclick = () => { stopParticles(); GameEngine.stop(); App.show('lobby'); LobbyScreen.refresh(); };

    setupSocketListeners();
  }

  function resizeCanvas() {
    const c = document.getElementById('game-canvas');
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  }

  function leaveGame() {
    GameEngine.stop();
    GameSocket.emit('game:leave');
    App.state.currentRoom = null;
    App.show('lobby');
    LobbyScreen.refresh();
  }

  // ── Reset completo ao iniciar nova partida ────────────────────────────────

  function resetUI() {
    stopParticles();
    hideEl('pre-countdown');
    hideEl('round-result');
    hideEl('tournament-end');
    hideEl('chaos-banner-wrap');
    hideEl('hot-notif');
    setTxt('hud-round','');
    setTxt('hud-map','');
    setTxt('hud-timer','');
    setTxt('hud-players','');
    setTxt('game-scoreboard','');
    setTxt('tournament-ranking','');
  }

  // ── Socket listeners ──────────────────────────────────────────────────────

  function setupSocketListeners() {

    GameSocket.on('game:state', (data) => {
      GameEngine.setState(data);
      updateScoreboard(data.players, data.hotBomb);
      updateTimer(data.matchTimer);
      if (data.chaosActive && data.chaosEvent) GameEngine.setChaos(data.chaosEvent, true);
      else if (!data.chaosActive)              GameEngine.setChaos(null, false);
    });

    GameSocket.on('game:countdown', (data) => {
      showPreCountdown(data);
    });

    GameSocket.on('game:roundStart', (data) => {
      hideEl('pre-countdown');
      hideEl('round-result');
      setTxt('hud-round', `RODADA ${data.round}`);
      setTxt('hud-map',   data.map?.name || '');
      setTxt('hud-players', `👤 ${data.players}`);
    });

    GameSocket.on('game:roundEnd', showRoundResult);
    GameSocket.on('game:tournamentEnd', showTournamentEnd);

    GameSocket.on('game:chaosStart', ({ event }) => {
      GameEngine.setChaos(event, true);
      showChaos(event);
    });
    GameSocket.on('game:chaosEnd', () => {
      GameEngine.setChaos(null, false);
      hideChaos();
    });

    GameSocket.on('game:arenaShrank', ({ ring }) => {
      App.toast(`⚠ Arena contraindo! (anel ${ring})`, 'error');
    });

    GameSocket.on('game:playerDied', ({ name, reason }) => {
      const why = reason === 'bomb' ? '💣 explodiu!' : reason === 'time' ? '⏰ tempo esgotado!' : '💀 eliminado!';
      App.toast(`${name} ${why}`, 'info');
    });

    GameSocket.on('game:hotBombPass', ({ from, to }) => {
      showHotNotif(`💣 BOMBA PASSOU PARA ${getPlayerName(to)}!`);
    });

    GameSocket.on('game:powerup', ({ playerId, type }) => {
      const names = { extra_bomb:'Bomba Extra', bigger_range:'Explosão Maior', speed:'Turbo', shield:'Escudo' };
      App.toast(`⚡ ${getPlayerName(playerId)}: ${names[type]||type}`, 'success');
    });
  }

  // ── startGame ─────────────────────────────────────────────────────────────

  function startGame(roomData) {
    resetUI();
    App.show('game');

    const chars = {};
    roomData.players.forEach(p => { chars[p.id] = p.character || CharRenderer.defaultOpts(); });

    const canvas = document.getElementById('game-canvas');
    // Sincroniza resolução interna com dimensões CSS reais (o canvas agora está visível)
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;

    GameEngine.setCharacters(chars);
    GameEngine.start(canvas, GameSocket.id(), chars);
  }

  // ── Countdown pré-rodada ──────────────────────────────────────────────────

  function showPreCountdown(data) {
    const el = document.getElementById('pre-countdown');
    el.style.display = 'flex';

    if (data.round !== undefined) {
      setTxt('pre-round-label', `⚡ RODADA ${data.round}`);
      setTxt('pre-map-label',   `🗺 ${data.map?.name || ''}  —  ${data.players || '?'} jogadores`);
    }

    const numEl = document.getElementById('pre-count-num');
    if (numEl && data.count !== undefined) {
      numEl.textContent = data.count;
      numEl.style.animation='none';
      numEl.offsetHeight;
      numEl.style.animation='countPulse 1s ease-out forwards';
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  function updateTimer(ms) {
    const el = document.getElementById('hud-timer');
    if (!el || ms === undefined) return;
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    el.textContent = `${m}:${String(sec).padStart(2,'0')}`;
    el.style.color = s <= 10 ? '#ff2200' : s <= 20 ? '#ffaa00' : '#ffcc00';
  }

  // ── Placar ────────────────────────────────────────────────────────────────

  let lastPlayers = [];
  function updateScoreboard(players, hotBomb) {
    if (!players) return;
    lastPlayers = players;
    const el = document.getElementById('game-scoreboard');
    if (!el) return;
    const sorted = [...players].sort((a,b) => (b.kills||0)-(a.kills||0));
    el.innerHTML = `
      <div style="font-size:7px;color:#ffcc00;border-bottom:1px solid #2a2a5a;padding-bottom:4px;margin-bottom:6px;letter-spacing:1px;">PLACAR</div>
      ${sorted.map(p=>`
        <div style="font-size:6px;margin-bottom:5px;display:flex;gap:6px;align-items:center;
          color:${p.alive?'#e8e8ff':'#444466'};">
          ${hotBomb?.carrierId===p.id ? '💣' : (p.alive ? '🟢' : '💀')}
          <span style="${p.id===GameSocket.id()?'color:#ffcc00;':''}">${esc(p.name.slice(0,10))}</span>
          <span style="color:#ff5533;margin-left:auto;">${p.kills||0}★</span>
        </div>
      `).join('')}
    `;
  }

  function getPlayerName(id) {
    const p = lastPlayers.find(p => p.id === id);
    return p?.name || 'Alguém';
  }

  // ── Partículas ────────────────────────────────────────────────────────────

  let particleRAF = null;
  function startParticles(canvasId, colors, type) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * -0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: 1 + Math.random() * 3,
      size: 4 + Math.floor(Math.random() * 6),
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      life: 0,
    }));

    if (particleRAF) cancelAnimationFrame(particleRAF);
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.rot += p.rotV;
        p.life++;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; p.life = 0; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, (H - p.y) / (H * 0.3));
        if (type === 'star') {
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        } else {
          ctx.fillRect(-p.size/2, -p.size*0.3, p.size, p.size*0.6);
        }
        ctx.restore();
      }
      particleRAF = requestAnimationFrame(draw);
    }
    draw();
  }

  function stopParticles() {
    if (particleRAF) { cancelAnimationFrame(particleRAF); particleRAF = null; }
  }

  // ── Resultado da rodada ───────────────────────────────────────────────────

  function showRoundResult(data) {
    const el = document.getElementById('round-result');
    el.style.display = 'flex';

    const rrTitle = document.getElementById('rr-title');
    rrTitle.style.animation = 'none'; rrTitle.offsetHeight;
    rrTitle.style.animation = 'rrSlideIn 0.4s ease-out';
    rrTitle.textContent = '⚡ FIM DA RODADA';

    const surv = (data.survivors||[]).map(p=>`<span style="color:#33ff88;">✅ ${esc(p.name)} — ${p.kills} ★</span>`).join('<br>');
    const elim = (data.eliminated||[]).map(p=>`<span style="color:#ff5544;">💀 ${esc(p.name)}</span>`).join('<br>');

    const body = document.getElementById('rr-body');
    body.style.animation = 'none'; body.offsetHeight;
    body.style.animation = 'rrFadeIn 0.6s ease-out 0.2s both';
    body.innerHTML = surv + (elim ? `<br><br>${elim}` : '');

    setTxt('rr-next', data.survivors?.length > 1 ? 'Próxima rodada em instantes...' : 'Apurando vencedor...');

    const hasWinner = data.survivors?.length === 1;
    startParticles('rr-particles',
      hasWinner ? ['#ffcc00','#ff9900','#ffffff','#ff5533'] : ['#33ff88','#ffcc00','#8888ff'],
      hasWinner ? 'star' : 'confetti'
    );
  }

  // ── Fim do torneio ────────────────────────────────────────────────────────

  function showTournamentEnd(data) {
    GameEngine.stop();
    stopParticles();
    const el = document.getElementById('tournament-end');
    el.style.display = 'flex';
    const medals = ['🥇','🥈','🥉'];
    document.getElementById('tournament-ranking').innerHTML = data.ranking.map((p,i)=>`
      <div style="
        color:${i===0?'#ffcc00':i===1?'#cccccc':i===2?'#cc8844':'#666688'};
        animation: rrFadeIn 0.5s ease-out ${i*0.15}s both;
        font-size:${i===0?'11px':'9px'};
        margin-bottom:4px;
      ">
        ${medals[i]||`#${i+1}`} ${esc(p.name)} ${p.isBot?'🤖':''} — ${p.kills||0} ★
      </div>
    `).join('');

    startParticles('te-particles',
      ['#ffcc00','#ff9900','#ffffff','#ffee88','#ff5533','#33ff88'],
      'star'
    );
  }

  // ── Caos ──────────────────────────────────────────────────────────────────

  function showChaos(event) {
    const w = document.getElementById('chaos-banner-wrap');
    const b = document.getElementById('chaos-banner');
    if (!w || !b) return;
    b.textContent = event.name;
    w.style.display = 'flex';
    clearTimeout(chaosTimeout);
    chaosTimeout = setTimeout(() => { w.style.display='none'; }, 3200);

    const canvas = document.getElementById('game-canvas');
    if (event.id === 'fog' && canvas) canvas.style.filter = 'brightness(0.25)';
  }

  function hideChaos() {
    hideEl('chaos-banner-wrap');
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.style.filter = '';
  }

  // ── Hot bomb notif ────────────────────────────────────────────────────────

  function showHotNotif(text) {
    const el = document.getElementById('hot-notif');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display='none'; }, 2500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function hideEl(id)     { const e=document.getElementById(id); if(e) e.style.display='none'; }
  function setTxt(id,txt) { const e=document.getElementById(id); if(e) e.textContent=txt; }
  function esc(s)         { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { init, startGame };
})();
