// ─── Lobby Screen ─────────────────────────────────────────────────────────────

const LobbyScreen = (() => {
  let publicRooms = [];
  let refreshTimer = null;

  function init() {
    const el = document.getElementById('screen-lobby');
    el.innerHTML = `
      <div class="lobby-header">
        <div>
          <h1>💣 LOBBIES</h1>
          <div style="font-size:7px;color:var(--text-dim);margin-top:4px;">
            Jogando como <span id="lobby-playername" style="color:var(--accent2);"></span>
          </div>
          <div id="lan-ip-banner" style="display:none;font-size:6px;color:var(--accent3);margin-top:6px;line-height:1.8;"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="lobby-char">👤 PERSONAGEM</button>
          <button class="btn btn-secondary btn-sm" id="lobby-back">← VOLTAR</button>
          <button class="btn btn-secondary btn-sm" id="lobby-refresh">↻ ATUALIZAR</button>
        </div>
      </div>

      <div class="lobby-layout">
        <!-- Room list -->
        <div class="lobby-main">
          <div class="px-box" style="padding:16px;">
            <div class="section-title">SALAS PÚBLICAS</div>
            <div class="room-list" id="room-list">
              <div class="lobby-empty">Carregando...</div>
            </div>
          </div>
        </div>

        <!-- Side panel -->
        <div class="lobby-side">

          <!-- Create Room -->
          <div class="px-box px-box-accent" style="padding:16px;">
            <div class="section-title">CRIAR SALA</div>
            <div class="create-room-form">
              <div class="field">
                <label>NOME DA SALA</label>
                <input class="px-input" id="create-name" maxlength="28"
                  placeholder="Minha Sala..." />
              </div>
              <div class="field">
                <label>MÁX. JOGADORES: <span id="create-maxval">8</span></label>
                <div class="slider-wrap">
                  <input type="range" id="create-max" min="4" max="15" value="8" step="1" />
                  <span class="slider-val" id="create-maxval2">8</span>
                </div>
              </div>
              <div class="field">
                <label>SENHA (opcional)</label>
                <input class="px-input" id="create-pass" type="password"
                  maxlength="20" placeholder="Deixe em branco para pública" />
              </div>
              <div class="field">
                <div class="toggle-wrap">
                  <div class="toggle on" id="create-bots-toggle"></div>
                  <span class="toggle-label">PREENCHER COM BOTS</span>
                </div>
              </div>
              <button class="btn btn-primary btn-full" id="create-btn">+ CRIAR</button>
            </div>
          </div>

          <!-- Join Private Room -->
          <div class="px-box" style="padding:16px;">
            <div class="section-title">ENTRAR POR ID</div>
            <div class="join-private-form">
              <input class="px-input" id="join-id"   placeholder="ID da Sala..." maxlength="40" />
              <input class="px-input" id="join-pass" type="password" placeholder="Senha..." maxlength="20" />
              <button class="btn btn-secondary btn-full" id="join-private-btn">ENTRAR</button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Update player name label
    document.getElementById('lobby-playername').textContent = App.state.playerName;

    // Slider sync
    const slider = document.getElementById('create-max');
    const valEl1 = document.getElementById('create-maxval');
    const valEl2 = document.getElementById('create-maxval2');
    slider.oninput = () => {
      valEl1.textContent = slider.value;
      valEl2.textContent = slider.value;
    };

    // Toggle bots
    let botsEnabled = true;
    const botsToggle = document.getElementById('create-bots-toggle');
    botsToggle.onclick = () => {
      botsEnabled = !botsEnabled;
      botsToggle.classList.toggle('on', botsEnabled);
    };

    // Create room
    document.getElementById('create-btn').onclick = () => {
      const name = document.getElementById('create-name').value.trim()
        || `${App.state.playerName}'s Room`;
      const maxPlayers = parseInt(slider.value, 10);
      const password   = document.getElementById('create-pass').value || null;
      GameSocket.emit('room:create', { name, maxPlayers, password, botsEnabled });
    };

    // Join private
    document.getElementById('join-private-btn').onclick = () => {
      const roomId  = document.getElementById('join-id').value.trim();
      const password = document.getElementById('join-pass').value || null;
      if (!roomId) { App.toast('Digite o ID da sala', 'error'); return; }
      GameSocket.emit('room:join', { roomId, password });
    };

    // Nav
    document.getElementById('lobby-refresh').onclick = () => GameSocket.emit('room:list');
    document.getElementById('lobby-back').onclick    = () => App.show('menu');
    document.getElementById('lobby-char').onclick    = () => { App.show('char'); CharacterScreen.refresh(); };

    // Socket listeners
    GameSocket.on('room:list',   onRoomList);
    GameSocket.on('room:joined', onRoomJoined);

    // Auto-refresh every 5s
    refreshTimer = setInterval(() => GameSocket.emit('room:list'), 5000);
    GameSocket.emit('room:list');

    // Mostra IP local (útil no modo LAN/hotspot)
    fetchLanIP();
  }

  function fetchLanIP() {
    // window.__LOCAL_IPS__ é injetado pelo Electron; fallback: busca via API
    const banner = document.getElementById('lan-ip-banner');
    if (!banner) return;

    const showBanner = (ips, port) => {
      if (!ips || ips.length === 0) return;
      banner.innerHTML =
        `📡 <b>Rede local:</b> ` +
        ips.map(ip => `<span style="color:#ffcc00;">http://${ip}:${port}</span>`).join('  ·  ') +
        `<br><span style="color:var(--text-dim);">Outros jogadores entrem neste endereço no navegador</span>`;
      banner.style.display = 'block';
    };

    if (window.__LOCAL_IPS__ && window.__LOCAL_IPS__.length > 0) {
      showBanner(window.__LOCAL_IPS__, window.__PORT__ || 3000);
    } else {
      fetch('/api/localip')
        .then(r => r.json())
        .then(({ ips, port }) => showBanner(ips, port))
        .catch(() => {});
    }
  }

  function onRoomList(rooms) {
    publicRooms = rooms;
    renderList();
  }

  function onRoomJoined(room) {
    App.state.currentRoom = room;
    App.show('room');
    RoomScreen.setRoom(room);
    clearInterval(refreshTimer);
  }

  function renderList() {
    const container = document.getElementById('room-list');
    if (!container) return;

    if (publicRooms.length === 0) {
      container.innerHTML = `<div class="lobby-empty">Nenhuma sala pública encontrada.<br>Seja o primeiro a criar uma!</div>`;
      return;
    }

    container.innerHTML = publicRooms.map(r => `
      <div class="room-item" data-id="${r.id}">
        <div class="room-item-info">
          <div class="room-item-name">${escHtml(r.name)}</div>
          <div class="room-item-meta">
            <span>👤 ${r.playerCount}/${r.maxPlayers}</span>
            ${r.botCount > 0 ? `<span>🤖 ${r.botCount} bots</span>` : ''}
            <span class="badge ${r.status === 'waiting' ? 'badge-green' : 'badge-red'}">${r.status === 'waiting' ? 'AGUARDANDO' : 'EM JOGO'}</span>
          </div>
        </div>
        <div class="room-item-lock">${r.hasPassword ? '🔒' : ''}</div>
        <button class="btn btn-secondary btn-sm">ENTRAR</button>
      </div>
    `).join('');

    container.querySelectorAll('.room-item').forEach(el => {
      el.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        const roomId = el.dataset.id;
        const room = publicRooms.find(r => r.id === roomId);
        if (!room) return;
        GameSocket.emit('room:join', { roomId, password: null });
      };
    });
  }

  function refresh() {
    document.getElementById('lobby-playername').textContent = App.state.playerName;
    GameSocket.emit('room:list');
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => GameSocket.emit('room:list'), 5000);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, refresh };
})();
