// ─── Tela da Sala ─────────────────────────────────────────────────────────────

const RoomScreen = (() => {
  let currentRoom = null;
  let countdownInterval = null;

  function init() {
    const el = document.getElementById('screen-room');
    el.innerHTML = `
      <div class="room-header">
        <div>
          <div class="room-title" id="room-title">Sala</div>
          <div class="room-id-display">
            ID: <span id="room-id-val" style="color:var(--accent2);cursor:pointer;" title="Clique para copiar">—</span>
            <span id="room-password-badge"></span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span id="room-player-count" style="font-size:8px;color:var(--text-dim);"></span>
          <button class="btn btn-secondary btn-sm" id="room-ready-btn">✓ PRONTO</button>
          <button class="btn btn-gold btn-sm" id="room-start-btn" style="display:none;">▶ INICIAR JOGO</button>
          <button class="btn btn-danger btn-sm" id="room-leave-btn">✗ SAIR</button>
        </div>
      </div>

      <div class="room-layout">
        <div class="room-players-col">
          <div class="px-box" style="padding:16px;margin-bottom:16px;">
            <div class="section-title">JOGADORES</div>
            <div class="players-grid" id="players-grid"></div>
          </div>
        </div>

        <div class="room-right-col">

          <div class="px-box" id="room-settings-box" style="padding:16px;display:none;">
            <div class="section-title">⚙ CONFIGURAÇÕES (HOST)</div>
            <div class="room-settings">
              <div class="settings-row">
                <label class="label">MÁX. JOGADORES: <span id="set-maxval">8</span></label>
                <div class="slider-wrap">
                  <input type="range" id="set-max" min="4" max="15" value="8" />
                  <span class="slider-val" id="set-maxval2">8</span>
                </div>
              </div>
              <div class="settings-row">
                <div class="toggle-wrap">
                  <div class="toggle" id="set-bots-toggle"></div>
                  <span class="toggle-label">PREENCHER COM BOTS</span>
                </div>
              </div>
            </div>
          </div>

          <div class="px-box room-chat" style="padding:16px;">
            <div class="section-title">💬 CHAT</div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-row">
              <input class="px-input" id="chat-input" placeholder="Mensagem..." maxlength="100" />
              <button class="btn btn-secondary btn-sm" id="chat-send">→</button>
            </div>
          </div>

        </div>
      </div>
    `;

    document.getElementById('room-leave-btn').onclick = () => {
      GameSocket.emit('room:leave');
      currentRoom = null;
      App.state.currentRoom = null;
      App.show('lobby');
      LobbyScreen.refresh();
    };

    let isReady = false;
    document.getElementById('room-ready-btn').onclick = () => {
      isReady = !isReady;
      const btn = document.getElementById('room-ready-btn');
      btn.textContent = isReady ? '✗ NÃO PRONTO' : '✓ PRONTO';
      btn.className   = isReady ? 'btn btn-success btn-sm' : 'btn btn-secondary btn-sm';
      GameSocket.emit('room:ready', { ready: isReady });
    };

    document.getElementById('room-start-btn').onclick = () => GameSocket.emit('room:start');

    document.getElementById('room-id-val').onclick = () => {
      if (currentRoom?.id) {
        navigator.clipboard?.writeText(currentRoom.id);
        App.toast('ID da sala copiado!', 'info');
      }
    };

    // Configurações do host
    const slider    = document.getElementById('set-max');
    const val1      = document.getElementById('set-maxval');
    const val2      = document.getElementById('set-maxval2');
    let settingsTimer;

    slider.oninput = () => {
      val1.textContent = slider.value;
      val2.textContent = slider.value;
      clearTimeout(settingsTimer);
      settingsTimer = setTimeout(emitSettings, 400);
    };

    let botsOn = true;
    const botsToggle = document.getElementById('set-bots-toggle');
    botsToggle.onclick = () => {
      botsOn = !botsOn;
      botsToggle.classList.toggle('on', botsOn);
      emitSettings();
    };

    function emitSettings() {
      GameSocket.emit('room:settings', {
        maxPlayers: parseInt(slider.value, 10),
        botsEnabled: true,
      });
    }

    // Chat
    document.getElementById('chat-send').onclick    = sendChat;
    document.getElementById('chat-input').onkeydown = e => { if (e.key==='Enter') sendChat(); };

    function sendChat() {
      const input = document.getElementById('chat-input');
      const msg   = input.value.trim();
      if (!msg) return;
      GameSocket.emit('room:chat', { message: msg });
      input.value = '';
    }

    GameSocket.on('room:update', onRoomUpdate);
    GameSocket.on('room:chat',   onChatMsg);
  }

  function setRoom(room) {
    currentRoom = room;
    renderRoom();
    addSystemMsg(`Você entrou em "${room.name}"`);

    const botsToggle = document.getElementById('set-bots-toggle');
    if (botsToggle) {
      botsToggle.classList.toggle('on', room.botsEnabled);
      // keep local botsOn in sync so slider changes don't reset it
      const settingsBox = document.getElementById('room-settings-box');
      if (settingsBox) settingsBox.dataset.botsOn = room.botsEnabled ? '1' : '0';
    }
    const slider = document.getElementById('set-max');
    if (slider) {
      slider.value = room.maxPlayers;
      document.getElementById('set-maxval').textContent  = room.maxPlayers;
      document.getElementById('set-maxval2').textContent = room.maxPlayers;
    }
  }

  function onRoomUpdate(room) {
    currentRoom = room;
    App.state.currentRoom = room;
    renderRoom();
  }

  function renderRoom() {
    if (!currentRoom) return;
    const r    = currentRoom;
    const myId = GameSocket.id();
    const isHost = r.hostId === myId;

    document.getElementById('room-title').textContent = r.name;
    document.getElementById('room-id-val').textContent = r.id.slice(0,8)+'…';

    const pwBadge = document.getElementById('room-password-badge');
    pwBadge.innerHTML = r.hasPassword
      ? '<span class="badge badge-gold" style="margin-left:6px;">🔒 PRIVADA</span>' : '';

    const humans = r.players.filter(p=>!p.isBot).length;
    const bots   = r.players.filter(p=>p.isBot).length;
    document.getElementById('room-player-count').textContent =
      `👤 ${humans}/${r.maxPlayers}${bots ? ` · 🤖 ${bots}` : ''}`;

    document.getElementById('room-settings-box').style.display = isHost ? 'block' : 'none';
    document.getElementById('room-start-btn').style.display    = isHost ? 'inline-block' : 'none';
    document.getElementById('room-ready-btn').style.display    = isHost ? 'none' : 'inline-block';

    renderPlayers(r, myId, isHost);
  }

  function renderPlayers(r, myId, isHost) {
    const grid = document.getElementById('players-grid');
    if (!grid) return;

    const slots = [...r.players];
    for (let i = slots.length; i < r.maxPlayers; i++) slots.push(null);
    grid.innerHTML = '';

    slots.forEach(p => {
      const slot = document.createElement('div');
      if (!p) {
        slot.className = 'player-slot empty';
        slot.innerHTML = `<span class="slot-empty-label">VAZIO</span>`;
      } else {
        const isMe   = p.id === myId;
        const pHost  = p.id === r.hostId;
        slot.className = ['player-slot', pHost?'host-slot':'', p.isBot?'bot-slot':''].filter(Boolean).join(' ');

        const canvas = document.createElement('canvas');
        // Idle animation no slot
        CharRenderer.render(canvas, p.character || CharRenderer.defaultOpts(), 3, 'down', 0, false);

        const badges = [
          pHost  ? '<span class="badge badge-gold">HOST</span>' : '',
          isMe   ? '<span class="badge badge-blue">VOCÊ</span>' : '',
          p.isBot? '<span class="badge" style="color:#888;border-color:#444;">BOT</span>' : '',
          p.ready && !p.isBot ? '<span class="badge badge-green">PRONTO</span>' : '',
        ].filter(Boolean).join('');

        slot.appendChild(canvas);
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
          <div class="player-slot-name">${escHtml(p.name)}</div>
          <div class="player-slot-badges">${badges}</div>
          ${isHost && !isMe && !p.isBot ? `<button class="kick-btn" data-id="${p.id}">EXPULSAR</button>` : ''}
        `;
        slot.appendChild(infoDiv);
      }
      grid.appendChild(slot);
    });

    if (isHost) {
      grid.querySelectorAll('.kick-btn').forEach(btn => {
        btn.onclick = e => {
          e.stopPropagation();
          GameSocket.emit('room:kick', { targetId: btn.dataset.id });
        };
      });
    }

    // Idle animation nos slots
    startSlotIdle(r.players);
  }

  let slotIdleInterval = null;
  let slotFrame = 0;
  function startSlotIdle(players) {
    if (slotIdleInterval) clearInterval(slotIdleInterval);
    slotIdleInterval = setInterval(() => {
      slotFrame++;
      const blinkFrame = (slotFrame % 25 === 0) ? 1 : 0;
      const grid = document.getElementById('players-grid');
      if (!grid) { clearInterval(slotIdleInterval); return; }
      const canvases = grid.querySelectorAll('.player-slot:not(.empty) canvas');
      canvases.forEach((c, i) => {
        const p = players[i];
        if (p) CharRenderer.render(c, p.character || CharRenderer.defaultOpts(), 3, 'down', blinkFrame, false);
      });
    }, 120);
  }

  function onChatMsg({ playerId, name, message }) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    const isMe = playerId === GameSocket.id();
    const div  = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="author" style="${isMe?'color:var(--accent3)':''}">${escHtml(name)}:</span> <span class="text">${escHtml(message)}</span>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addSystemMsg(text) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = `★ ${text}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showCountdown(seconds) {
    let existing = document.getElementById('countdown-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'countdown-overlay';
    overlay.className = 'countdown-overlay';
    overlay.innerHTML = `
      <div class="countdown-text">JOGO COMEÇANDO EM</div>
      <div class="countdown-number" id="countdown-num">${seconds}</div>
    `;
    document.body.appendChild(overlay);

    let count = seconds;
    countdownInterval = setInterval(() => {
      count--;
      const el = document.getElementById('countdown-num');
      if (el) {
        el.textContent = count;
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'countPulse 1s ease-out';
      }
      if (count <= 0) {
        clearInterval(countdownInterval);
        setTimeout(() => overlay.remove(), 600);
      }
    }, 1000);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, setRoom, showCountdown };
})();
