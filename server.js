const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');
const { GameRoom } = require('./server/game/gameRoom');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ─── Armazenamento ────────────────────────────────────────────────────────────
const rooms      = new Map(); // roomId → room
const players    = new Map(); // socketId → { name, character, roomId }
const gameRooms  = new Map(); // roomId → GameRoom instance

const MIN_PLAYERS       = 4;
const MAX_PLAYERS_LIMIT = 15;

// ─── Utilitários ──────────────────────────────────────────────────────────────

function createBot(index) {
  const NAMES = ['Bomba-bot','Kaboom-AI','PixelBot','BotBlast','ExplosivAI','TikBot','BomberZero','N0-Life'];
  return {
    id: `bot_${uuidv4()}`,
    name: NAMES[index % NAMES.length],
    character: {
      skin: Math.floor(Math.random()*6), hat: Math.floor(Math.random()*7),
      hatColor: Math.floor(Math.random()*7), body: Math.floor(Math.random()*6),
      pants: Math.floor(Math.random()*4), eyeStyle: Math.floor(Math.random()*5),
      accessory: Math.floor(Math.random()*5),
    },
    ready: true, isBot: true,
  };
}

function getBotsNeeded(room) {
  const humans = room.players.filter(p => !p.isBot).length;
  return Math.max(0, room.maxPlayers - humans);
}

function syncBots(room) {
  room.players = room.players.filter(p => !p.isBot);
  const n = getBotsNeeded(room);
  for (let i=0;i<n;i++) room.players.push(createBot(i));
}

function roomData(room) {
  return {
    id: room.id, name: room.name, hostId: room.hostId,
    hasPassword: !!room.password,
    maxPlayers: room.maxPlayers, botsEnabled: room.botsEnabled,
    playerCount: room.players.filter(p=>!p.isBot).length,
    botCount:    room.players.filter(p=>p.isBot).length,
    players: room.players.map(p => ({
      id: p.id, name: p.name, character: p.character, ready: p.ready, isBot: p.isBot,
    })),
    status: room.status,
  };
}

function broadcastList() {
  const list = [...rooms.values()]
    .filter(r => r.status === 'waiting' && !r.password)
    .map(r => ({
      id: r.id, name: r.name, maxPlayers: r.maxPlayers,
      playerCount: r.players.filter(p=>!p.isBot).length,
      botCount:    r.players.filter(p=>p.isBot).length,
      status: r.status,
    }));
  io.emit('room:list', list);
}

// ─── Socket ───────────────────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  socket.on('player:register', ({ name, character }) => {
    players.set(socket.id, { name, character, roomId: null });
    socket.emit('player:registered', { id: socket.id });
  });

  socket.on('player:updateCharacter', ({ character }) => {
    const player = players.get(socket.id);
    if (!player) return;
    player.character = character;
    const room = player.roomId ? rooms.get(player.roomId) : null;
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p) p.character = character;
      io.to(room.id).emit('room:update', roomData(room));
    }
  });

  socket.on('room:list', () => {
    const list = [...rooms.values()]
      .filter(r=>r.status==='waiting'&&!r.password)
      .map(r=>({
        id:r.id,name:r.name,maxPlayers:r.maxPlayers,
        playerCount:r.players.filter(p=>!p.isBot).length,
        botCount:r.players.filter(p=>p.isBot).length,
        status:r.status,
      }));
    socket.emit('room:list', list);
  });

  socket.on('room:create', ({ name, maxPlayers, password, botsEnabled }) => {
    const player = players.get(socket.id);
    if (!player) return socket.emit('error', 'Não registrado');
    const max = Math.min(MAX_PLAYERS_LIMIT, Math.max(MIN_PLAYERS, maxPlayers||8));
    const room = {
      id: uuidv4(), name: name || `Sala de ${player.name}`,
      hostId: socket.id, password: password||null,
      maxPlayers: max, botsEnabled: true,
      players: [{ id:socket.id, name:player.name, character:player.character, ready:false, isBot:false }],
      status: 'waiting',
    };
    syncBots(room);
    rooms.set(room.id, room);
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('room:joined', roomData(room));
    broadcastList();
  });

  socket.on('room:join', ({ roomId, password }) => {
    const player = players.get(socket.id);
    if (!player) return socket.emit('error','Não registrado');
    const room = rooms.get(roomId);
    if (!room)                          return socket.emit('error','Sala não encontrada');
    if (room.status !== 'waiting')      return socket.emit('error','Partida já iniciada');
    if (room.password && room.password !== password) return socket.emit('error','Senha incorreta');
    const humans = room.players.filter(p=>!p.isBot).length;
    if (humans >= room.maxPlayers)      return socket.emit('error','Sala cheia');

    room.players.push({ id:socket.id, name:player.name, character:player.character, ready:false, isBot:false });
    syncBots(room);
    player.roomId = room.id;
    socket.join(room.id);
    socket.emit('room:joined', roomData(room));
    io.to(room.id).emit('room:update', roomData(room));
    broadcastList();
  });

  socket.on('room:leave', () => handleLeave(socket));

  socket.on('room:ready', ({ ready }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    const p = room.players.find(p=>p.id===socket.id);
    if (p) p.ready = ready;
    io.to(room.id).emit('room:update', roomData(room));
  });

  socket.on('room:settings', ({ maxPlayers }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    if (maxPlayers !== undefined) room.maxPlayers = Math.min(MAX_PLAYERS_LIMIT,Math.max(MIN_PLAYERS,maxPlayers));
    room.botsEnabled = true;
    syncBots(room);
    io.to(room.id).emit('room:update', roomData(room));
    broadcastList();
  });

  socket.on('room:kick', ({ targetId }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id || targetId === socket.id) return;
    const target = players.get(targetId);
    if (target) target.roomId = null;
    room.players = room.players.filter(p=>p.id!==targetId);
    syncBots(room);
    io.to(targetId).emit('room:kicked');
    io.sockets.sockets.get(targetId)?.leave(room.id);
    io.to(room.id).emit('room:update', roomData(room));
    broadcastList();
  });

  socket.on('room:start', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room || room.hostId !== socket.id) return;
    const humans = room.players.filter(p=>!p.isBot);
    if (!humans.every(p=>p.ready||p.id===socket.id)) return socket.emit('error','Nem todos estão prontos');

    room.status = 'playing';
    broadcastList();

    // Avisa todos na sala para ir à tela de jogo
    io.to(room.id).emit('game:start', roomData(room));

    // Pequeno delay para o cliente carregar a tela antes do primeiro tick
    setTimeout(() => {
      const gr = new GameRoom(room, io);
      gameRooms.set(room.id, gr);
      gr.startTournament();
    }, 800);
  });

  // ── Jogo ──────────────────────────────────────────────────────────────────

  socket.on('game:input', (input) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const gr = gameRooms.get(player.roomId);
    if (gr) gr.setInput(socket.id, input);
  });

  socket.on('game:leave', () => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const gr = gameRooms.get(player.roomId);
    if (gr) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.status = 'waiting';
        gr.stop();
        gameRooms.delete(player.roomId);
        broadcastList();
      }
    }
    handleLeave(socket);
  });

  socket.on('room:chat', ({ message }) => {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    io.to(player.roomId).emit('room:chat', {
      playerId: socket.id, name: player.name,
      message: String(message).slice(0,120),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    handleLeave(socket);
    players.delete(socket.id);
  });

  function handleLeave(socket) {
    const player = players.get(socket.id);
    if (!player?.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;
    room.players = room.players.filter(p=>p.id!==socket.id);
    socket.leave(room.id);
    player.roomId = null;
    if (room.players.filter(p=>!p.isBot).length === 0) {
      rooms.delete(room.id);
      const gr = gameRooms.get(room.id);
      if (gr) { gr.stop(); gameRooms.delete(room.id); }
    } else {
      if (room.hostId === socket.id) {
        const next = room.players.find(p=>!p.isBot);
        if (next) room.hostId = next.id;
      }
      syncBots(room);
      io.to(room.id).emit('room:update', roomData(room));
    }
    broadcastList();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 Bomberman Online → http://localhost:${PORT}`));
