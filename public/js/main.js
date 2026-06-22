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

  document.addEventListener('DOMContentLoaded', init);

  return { show, toast, state, saveLocal };
})();
