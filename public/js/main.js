// ─── Gerenciador de Telas ─────────────────────────────────────────────────────

const App = (() => {
  const screens = {
    menu:  document.getElementById('screen-menu'),
    char:  document.getElementById('screen-char'),
    lobby: document.getElementById('screen-lobby'),
    room:  document.getElementById('screen-room'),
    game:  document.getElementById('screen-game'),
  };

  const state = {
    playerName:  '',
    character:   null,
    currentRoom: null,
  };

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => {
      if (el) el.classList.toggle('hidden', k !== name);
    });
  }

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function saveLocal() {
    localStorage.setItem('bm_player', JSON.stringify({
      name:      state.playerName,
      character: state.character,
    }));
  }

  function init() {
    GameSocket.connect();

    // Erros do servidor
    GameSocket.on('error', msg => toast(msg, 'error'));

    // Expulso da sala
    GameSocket.on('room:kicked', () => {
      toast('Você foi expulso da sala.', 'error');
      state.currentRoom = null;
      show('lobby');
      LobbyScreen.refresh();
    });

    // Contagem regressiva
    GameSocket.on('room:starting', ({ countdown }) => {
      RoomScreen.showCountdown(countdown);
    });

    // Jogo iniciado — vai para tela de jogo
    GameSocket.on('game:start', (room) => {
      state.currentRoom = room;
      GameScreen.startGame(room);
    });

    // Carrega dados salvos
    try {
      const saved = JSON.parse(localStorage.getItem('bm_player') || '{}');
      if (saved.name)      state.playerName = saved.name;
      if (saved.character) state.character  = { ...CharRenderer.defaultOpts(), ...saved.character };
      else                 state.character  = CharRenderer.defaultOpts();
    } catch {
      state.character = CharRenderer.defaultOpts();
    }

    MenuScreen.init();
    CharacterScreen.init();
    LobbyScreen.init();
    RoomScreen.init();
    GameScreen.init();

    show('menu');
  }

  // ── Fullscreen ────────────────────────────────────────────────────────────
  function requestFullscreen() {
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (fn) fn.call(el).catch(() => {});
  }

  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
  }

  // Tenta fullscreen no primeiro toque/clique do usuário
  function tryFullscreenOnInteraction() {
    if (isFullscreen()) return;
    requestFullscreen();
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();

    // Primeiro gesto do usuário → entra em fullscreen
    const once = { once: true };
    document.addEventListener('click',      tryFullscreenOnInteraction, once);
    document.addEventListener('touchstart', tryFullscreenOnInteraction, once);
    document.addEventListener('keydown',    tryFullscreenOnInteraction, once);

    // Se saiu do fullscreen manualmente, tenta de novo no próximo clique
    document.addEventListener('fullscreenchange',       onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
  });

  function onFsChange() {
    if (!isFullscreen()) {
      // saiu do fullscreen — recoloca no próximo clique
      document.addEventListener('click',      tryFullscreenOnInteraction, { once: true });
      document.addEventListener('touchstart', tryFullscreenOnInteraction, { once: true });
    }
  }

  return { show, toast, state, saveLocal, requestFullscreen };
})();
