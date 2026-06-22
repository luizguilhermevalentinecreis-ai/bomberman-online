// ─── Menu Screen ──────────────────────────────────────────────────────────────

const MenuScreen = (() => {
  function init() {
    const el = document.getElementById('screen-menu');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
        <div class="menu-logo">
          <canvas id="menu-bomb-canvas" class="pixel-bomb" width="48" height="48"></canvas>
          <span class="menu-logo-title">BOMBERMAN</span>
          <span class="menu-logo-sub">★ ONLINE ★</span>
        </div>

        <div class="px-box menu-card">
          <div class="field">
            <label>SEU NOME</label>
            <input id="menu-name" class="px-input" type="text"
              placeholder="Apelido..."
              maxlength="18"
              value="${escHtml(App.state.playerName)}" />
          </div>

          <div class="menu-actions">
            <button class="btn btn-primary btn-lg btn-full" id="menu-play">▶ JOGAR ONLINE</button>
            <button class="btn btn-secondary btn-full" id="menu-char">👤 PERSONALIZAR PERSONAGEM</button>
          </div>
        </div>

        <div class="menu-footer">
          <span>v0.1 · BOMBERMAN ONLINE</span>
        </div>
      </div>
    `;

    drawMenuBomb();

    document.getElementById('menu-play').onclick = () => {
      const name = document.getElementById('menu-name').value.trim();
      if (!name) { App.toast('Digite um apelido primeiro!', 'error'); return; }
      App.state.playerName = name;
      App.saveLocal();
      GameSocket.emit('player:register', { name, character: App.state.character });
      GameSocket.on('player:registered', onRegistered);
    };

    document.getElementById('menu-char').onclick = () => {
      const name = document.getElementById('menu-name').value.trim();
      if (name) { App.state.playerName = name; App.saveLocal(); }
      App.show('char');
      CharacterScreen.refresh();
    };
  }

  function onRegistered() {
    GameSocket.off('player:registered', onRegistered);
    App.show('lobby');
    LobbyScreen.refresh();
  }

  function drawMenuBomb() {
    const canvas = document.getElementById('menu-bomb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = 3;
    ctx.imageSmoothingEnabled = false;

    // bomb body
    const K = '#1a1a2e';
    const drawPx = (x, y, c, w=1, h=1) => {
      ctx.fillStyle = c;
      ctx.fillRect(x*s, y*s, w*s, h*s);
    };

    // fuse
    drawPx(8, 0, '#885533');
    drawPx(9, 1, '#885533');
    drawPx(8, 2, '#885533');
    drawPx(9, 2, '#FFCC00');
    // bomb circle
    const body = [
      '....KKKKKK....',
      '...K######K...',
      '..K########K..',
      '.K##########K.',
      '.K##########K.',
      '.K##OOOO####K.',
      '.K##OOOO####K.',
      '.K##########K.',
      '.K##########K.',
      '..K########K..',
      '...K######K...',
      '....KKKKKK....',
    ];
    const palette = { 'K': K, '#': '#111111', 'O': '#444488', '.': null };
    body.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = palette[row[x]];
        if (c) drawPx(x, y+3, c);
      }
    });

    // spark animation
    let t = 0;
    setInterval(() => {
      drawPx(9, 2, t % 2 === 0 ? '#FFCC00' : '#FF6600');
      t++;
    }, 400);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init };
})();
