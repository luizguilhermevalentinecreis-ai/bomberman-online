// ─── Sala de Jogo (Server-Side) ───────────────────────────────────────────────
const { MAPS, SPAWN_POINTS, TILE, GRID_W, GRID_H, freshMap } = require('./mapData');

const TILE_SIZE    = 40;
const TICK_MS      = 50;
const PLAYER_SPEED = 170;
const BOT_SPEED    = 140;
const HOT_DURATION = 13000;
const MATCH_TIME   = 90;
const COUNTDOWN    = 3;

const POWERUP_TYPES = ['extra_bomb','bigger_range','speed','shield','teleport','ghost','mega_range'];

const CHAOS_EVENTS = [
  { id:'screen_flip',    name:'🙃 TELA INVERTIDA!',          duration:12000 },
  { id:'controls_invert',name:'🔄 CONTROLES INVERTIDOS!',    duration:10000 },
  { id:'mega_bombs',     name:'💥 MEGA BOMBAS!',              duration:15000 },
  { id:'speed_chaos',    name:'⚡ MODO TURBO!',               duration:10000 },
  { id:'fog',            name:'🌫 NÉVOA DE GUERRA!',          duration:18000 },
  { id:'swap_all',       name:'🔀 TODOS TROCAM DE LUGAR!',    duration:600   },
  { id:'bomb_rain',      name:'☄ CHUVA DE BOMBAS!',           duration:15000 },
  { id:'ghost_mode',     name:'👻 MODO FANTASMA!',            duration:12000 },
  { id:'freeze',         name:'🧊 CONGELAMENTO TOTAL!',       duration:8000  },
  { id:'magnet',         name:'🧲 CAMPO MAGNÉTICO!',          duration:12000 },
  { id:'double_bombs',   name:'💣 ARSENAL DUPLICADO!',        duration:15000 },
  { id:'random_tp',      name:'🌀 TELETRANSPORTE CAÓTICO!',   duration:12000 },
  { id:'giant_mode',     name:'🦕 MODO GIGANTE!',             duration:12000 },
  { id:'tiny_mode',      name:'🐭 MODO FORMIGA!',             duration:12000 },
  { id:'slow_bombs',     name:'⏳ BOMBAS LENTAS!',             duration:15000 },
  { id:'mirror',         name:'🪞 MUNDO ESPELHADO!',          duration:12000 },
];

class GameRoom {
  constructor(roomData, io) {
    this.io     = io;
    this.roomId = roomData.id;
    this.allPlayers = roomData.players.map((p, i) => ({
      id: p.id, name: p.name, character: p.character, isBot: p.isBot, spawnIdx: i,
      x:0, y:0, vx:0, vy:0,
      direction:'down', moving:false, frame:0, animTimer:0,
      input:{up:false,down:false,left:false,right:false,bomb:false,sprint:false},
      bombPressed:false,
      bombs:1, range:2, speed:PLAYER_SPEED,
      alive:true, shield:false, kills:0, powerups:[],
      ghostTimer:0,
    }));
    this.state    = null;
    this.interval = null;
    this.usedMaps = new Set();
    this.tournament = null;
  }

  // ── Torneio ───────────────────────────────────────────────────────────────

  startTournament() {
    this.tournament = { round:1, alive:this.allPlayers.map(p=>p.id), ranking:[] };
    this.startRound();
  }

  startRound() {
    const map = this.pickMap();
    this.currentMap = freshMap(map.id);
    this.prepareState();

    let count = COUNTDOWN;
    this.io.to(this.roomId).emit('game:countdown', {
      count,
      round: this.tournament.round,
      map: { id:this.currentMap.id, name:this.currentMap.name, theme:this.currentMap.theme },
      players: this.tournament.alive.length,
      toEliminate: this.eliminateCount(),
    });

    const cdInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.io.to(this.roomId).emit('game:countdown', { count });
      } else {
        clearInterval(cdInterval);
        this.io.to(this.roomId).emit('game:roundStart', {
          round: this.tournament.round,
          map: { id:this.currentMap.id, name:this.currentMap.name, theme:this.currentMap.theme },
          players: this.tournament.alive.length,
          toEliminate: this.eliminateCount(),
          chaos: this.state.hasChaos,
        });
        this.interval = setInterval(() => this.tick(), TICK_MS);
      }
    }, 1000);
  }

  pickMap() {
    const available = MAPS.filter(m => !this.usedMaps.has(m.id));
    const pool = available.length > 0 ? available : MAPS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.usedMaps.add(chosen.id);
    if (this.usedMaps.size >= MAPS.length) this.usedMaps.clear();
    return chosen;
  }

  eliminateCount() {
    const n = this.tournament.alive.length;
    return n <= 2 ? n - 1 : Math.ceil(n / 2);
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  prepareState() {
    const aliveSet = new Set(this.tournament.alive);
    const rp = this.allPlayers.filter(p => aliveSet.has(p.id));

    rp.forEach((p, i) => {
      const sp = SPAWN_POINTS[i % SPAWN_POINTS.length];
      p.x = sp.x * TILE_SIZE + TILE_SIZE/2;
      p.y = sp.y * TILE_SIZE + TILE_SIZE/2;
      p.alive=true; p.moving=false; p.direction='down'; p.frame=0;
      p.bombs=1; p.range=2;
      p.speed = p.isBot ? BOT_SPEED : PLAYER_SPEED;
      p.shield=false; p.powerups=[]; p.ghostTimer=0;
      p.input={up:false,down:false,left:false,right:false,bomb:false,sprint:false};
      p.bombPressed=false;
    });

    if (this.currentMap.bigBombs) rp.forEach(p => p.range++);

    const hotIdx = Math.floor(Math.random() * rp.length);
    const hasChaos = Math.random() < 0.85;
    const numEvents = hasChaos ? (Math.random() < 0.35 ? 2 : 1) : 0;
    const shuffled = [...CHAOS_EVENTS].sort(() => Math.random()-0.5);
    const chosenEvents = shuffled.slice(0, numEvents);

    this.state = {
      map: this.currentMap,
      tiles: this.currentMap.tiles.map(r => [...r]),
      players: rp,
      bombs: [], explosions: [], powerups: [],
      tick: 0,
      matchTimer: MATCH_TIME * 1000,
      phase: 'playing',
      hotBomb: { carrierId:rp[hotIdx].id, timer:HOT_DURATION, maxTimer:HOT_DURATION, holdTimer:4000 },
      hasChaos,
      chaosQueue: chosenEvents,
      chaosEvent:  null,
      chaosActive: false,
      chaosStart:  hasChaos ? (6000 + Math.random()*12000) : Infinity,
      bombRainTimer: 0,
      randomTpTimer: 0,
      shrinkTimer:0, shrinkRing:0, shrinkInterval:28000,
      eliminated:0, toEliminate:this.eliminateCount(),
    };
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick() {
    if (!this.state || this.state.phase !== 'playing') return;
    this.state.tick++;
    const ms = this.state.tick * TICK_MS;

    this.state.matchTimer -= TICK_MS;
    if (this.state.matchTimer <= 0) {
      const carrier = this.state.players.find(p => p.id===this.state.hotBomb.carrierId && p.alive);
      if (carrier) {
        carrier.alive = false;
        this.io.to(this.roomId).emit('game:playerDied', { id:carrier.id, name:carrier.name, reason:'time' });
      }
    }

    this.processBots();
    this.movePlayers();
    this.updateHotBomb();
    this.updateBombs();
    this.updateExplosions();
    this.updateChaos(ms);
    this.updateChaosEffects();
    this.updateShrink();
    this.checkDeaths();
    this.checkRoundEnd();
    this.broadcast();
  }

  // ── Bomba Quente ──────────────────────────────────────────────────────────

  updateHotBomb() {
    const { hotBomb, players } = this.state;
    if (!hotBomb) return;
    hotBomb.timer -= TICK_MS;

    const carrier = players.find(p => p.id===hotBomb.carrierId && p.alive);
    if (!carrier) {
      const alive = players.filter(p => p.alive);
      if (alive.length > 0) hotBomb.carrierId = alive[Math.floor(Math.random()*alive.length)].id;
      hotBomb.timer = HOT_DURATION;
      hotBomb.holdTimer = 0;
      return;
    }

    hotBomb.holdTimer += TICK_MS;

    for (const p of players) {
      if (p.id===hotBomb.carrierId || !p.alive) continue;
      if (hotBomb.holdTimer < 4000) break;
      if (Math.hypot(p.x-carrier.x, p.y-carrier.y) < TILE_SIZE*0.8) {
        const oldId = hotBomb.carrierId;
        hotBomb.carrierId = p.id;
        hotBomb.holdTimer = 0;
        this.io.to(this.roomId).emit('game:hotBombPass', { from:oldId, to:p.id });
        break;
      }
    }

    if (hotBomb.timer <= 0) {
      if (carrier.shield) { carrier.shield = false; }
      else {
        carrier.alive = false;
        this.io.to(this.roomId).emit('game:playerDied', { id:carrier.id, name:carrier.name, reason:'bomb' });
      }
      const alive = players.filter(p => p.alive);
      if (alive.length > 0) {
        hotBomb.carrierId = alive[Math.floor(Math.random()*alive.length)].id;
        hotBomb.timer = HOT_DURATION;
        hotBomb.holdTimer = 0;
      }
    }
  }

  // ── Movimento ─────────────────────────────────────────────────────────────

  movePlayers() {
    const ev = this.state.chaosEvent;
    const isGhost   = this.state.chaosActive && ev?.id==='ghost_mode';
    const isFreeze  = this.state.chaosActive && ev?.id==='freeze';
    const isMagnet  = this.state.chaosActive && ev?.id==='magnet';
    const isMirror  = this.state.chaosActive && ev?.id==='mirror';
    const centerX   = (GRID_W/2) * TILE_SIZE;
    const centerY   = (GRID_H/2) * TILE_SIZE;

    this.state.players.forEach(p => {
      if (!p.alive) return;
      let inp = { ...p.input };

      // Controles invertidos ou espelhados
      if (this.state.chaosActive && ev?.id==='controls_invert')
        inp = { up:p.input.down, down:p.input.up, left:p.input.right, right:p.input.left, bomb:p.input.bomb, sprint:p.input.sprint };
      if (isMirror)
        inp = { ...inp, left:p.input.right, right:p.input.left };

      let dx=0, dy=0;
      if (inp.left)  dx=-1;
      if (inp.right) dx= 1;
      if (inp.up)    dy=-1;
      if (inp.down)  dy= 1;
      if (dx!==0&&dy!==0) dy=0;

      let spd = p.speed;
      spd *= inp.sprint ? 1.7 : 1;
      spd *= (this.state.chaosActive && ev?.id==='speed_chaos') ? 2 : 1;
      spd *= isFreeze ? 0.28 : 1;
      spd *= (TICK_MS/1000);

      // Ghost power-up (individual)
      if (p.ghostTimer > 0) p.ghostTimer -= TICK_MS;
      const ghostNow = isGhost || p.ghostTimer > 0;

      if (dx!==0||dy!==0) {
        if (dx<0)  p.direction='left';
        else if (dx>0) p.direction='right';
        else if (dy<0) p.direction='up';
        else p.direction='down';

        const nx=p.x+dx*spd, ny=p.y+dy*spd;
        const canMove = (cx,cy) => {
          const corners=[{x:cx-11,y:cy-11},{x:cx+11,y:cy-11},{x:cx-11,y:cy+11},{x:cx+11,y:cy+11}];
          return corners.every(c=>{
            const tx=Math.floor(c.x/TILE_SIZE), ty=Math.floor(c.y/TILE_SIZE);
            if(tx<0||ty<0||tx>=GRID_W||ty>=GRID_H) return false;
            const t=this.state.tiles[ty][tx];
            if (ghostNow) return t!==TILE.WALL;
            return t===TILE.FLOOR||t===TILE.POWERUP_SPAWN||t===TILE.SPECIAL;
          });
        };

        if (canMove(nx,ny))       { p.x=nx; p.y=ny; }
        else if (canMove(nx,p.y)) { p.x=nx; }
        else if (canMove(p.x,ny)) { p.y=ny; }

        if (this.currentMap.slippery) {
          const tx=Math.floor(p.x/TILE_SIZE), ty=Math.floor(p.y/TILE_SIZE);
          if (this.state.tiles[ty]?.[tx]===TILE.SPECIAL) {
            const sx=p.x+dx*spd*0.5, sy=p.y+dy*spd*0.5;
            if (canMove(sx,sy)) { p.x=sx; p.y=sy; }
          }
        }
        p.moving=true;
      } else { p.moving=false; }

      // Campo magnético — força em direção ao centro
      if (isMagnet && p.alive) {
        const mx=(centerX-p.x)*0.003*spd, my=(centerY-p.y)*0.003*spd;
        const tx2=p.x+mx, ty2=p.y+my;
        const tx=Math.floor(tx2/TILE_SIZE), ty=Math.floor(ty2/TILE_SIZE);
        if(tx>=0&&ty>=0&&tx<GRID_W&&ty<GRID_H&&this.state.tiles[ty][tx]!==TILE.WALL)
          { p.x=tx2; p.y=ty2; }
      }

      // Clamp nas bordas — mantém centro do player dentro do tile 1 (fora das paredes da borda)
      const MARGIN = 14;
      p.x = Math.max(TILE_SIZE + MARGIN, Math.min(p.x, (GRID_W - 2) * TILE_SIZE + TILE_SIZE - MARGIN));
      p.y = Math.max(TILE_SIZE + MARGIN, Math.min(p.y, (GRID_H - 2) * TILE_SIZE + TILE_SIZE - MARGIN));

      // Coleta power-up
      const tx=Math.floor(p.x/TILE_SIZE), ty=Math.floor(p.y/TILE_SIZE);
      const pi=this.state.powerups.findIndex(pu=>pu.tx===tx&&pu.ty===ty);
      if (pi>=0) { this.applyPowerup(p, this.state.powerups[pi].type); this.state.powerups.splice(pi,1); }

      // Animação
      p.animTimer+=TICK_MS;
      if (p.moving && p.animTimer>=100) { p.animTimer=0; p.frame=(p.frame+1)%4; }
      else if (!p.moving) { p.animTimer=0; p.frame=0; }
    });
  }

  // ── Efeitos de caos contínuos ─────────────────────────────────────────────

  updateChaosEffects() {
    if (!this.state.chaosActive) return;
    const ev = this.state.chaosEvent;
    if (!ev) return;

    // Chuva de bombas
    if (ev.id==='bomb_rain') {
      this.state.bombRainTimer += TICK_MS;
      if (this.state.bombRainTimer >= 2500) {
        this.state.bombRainTimer = 0;
        this.dropRandomBomb();
      }
    }

    // Teletransporte aleatório
    if (ev.id==='random_tp') {
      this.state.randomTpTimer += TICK_MS;
      if (this.state.randomTpTimer >= 4000) {
        this.state.randomTpTimer = 0;
        this.doRandomTeleport();
      }
    }
  }

  dropRandomBomb() {
    for (let tries=0; tries<20; tries++) {
      const tx = 1+Math.floor(Math.random()*(GRID_W-2));
      const ty = 1+Math.floor(Math.random()*(GRID_H-2));
      if (this.state.tiles[ty][tx]!==TILE.FLOOR) continue;
      if (this.state.bombs.some(b=>b.tx===tx&&b.ty===ty)) continue;
      this.state.bombs.push({
        id:`rain_${Date.now()}_${Math.random()}`,
        ownerId:'rain', tx, ty,
        x:tx*TILE_SIZE+TILE_SIZE/2, y:ty*TILE_SIZE+TILE_SIZE/2,
        range:3, timer:3000, maxTimer:3000,
      });
      break;
    }
  }

  doSwapAll() {
    const alive = this.state.players.filter(p=>p.alive);
    if (alive.length < 2) return;
    const positions = alive.map(p=>({x:p.x,y:p.y}));
    for (let i=positions.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [positions[i],positions[j]]=[positions[j],positions[i]];
    }
    alive.forEach((p,i)=>{p.x=positions[i].x;p.y=positions[i].y;});
  }

  doRandomTeleport() {
    this.state.players.filter(p=>p.alive).forEach(p=>{
      for(let tries=0;tries<30;tries++){
        const tx=1+Math.floor(Math.random()*(GRID_W-2));
        const ty=1+Math.floor(Math.random()*(GRID_H-2));
        if(this.state.tiles[ty][tx]===TILE.FLOOR){
          p.x=tx*TILE_SIZE+TILE_SIZE/2;
          p.y=ty*TILE_SIZE+TILE_SIZE/2;
          break;
        }
      }
    });
  }

  // ── Bombas estáticas ──────────────────────────────────────────────────────

  plantBomb(player) {
    const tx=Math.floor(player.x/TILE_SIZE), ty=Math.floor(player.y/TILE_SIZE);
    if (this.state.bombs.some(b=>b.tx===tx&&b.ty===ty)) return;
    const active=this.state.bombs.filter(b=>b.ownerId===player.id).length;
    if (active>=player.bombs) return;
    const ev = this.state.chaosEvent;
    const isDouble = this.state.chaosActive && ev?.id==='double_bombs';
    const isSlow   = this.state.chaosActive && ev?.id==='slow_bombs';
    const range=player.range+(this.state.chaosActive&&ev?.id==='mega_bombs'?4:0)+(isDouble?2:0);
    const timer = isSlow ? 7500 : 3000;
    this.state.bombs.push({
      id:`b_${Date.now()}_${Math.random()}`, ownerId:player.id,
      tx, ty, x:tx*TILE_SIZE+TILE_SIZE/2, y:ty*TILE_SIZE+TILE_SIZE/2,
      range, timer, maxTimer:timer,
    });
  }

  updateBombs() {
    const toExplode=[];
    this.state.bombs.forEach(b=>{b.timer-=TICK_MS;if(b.timer<=0)toExplode.push(b);});
    toExplode.forEach(b=>this.explodeBomb(b));
    this.state.bombs=this.state.bombs.filter(b=>b.timer>0);
  }

  explodeBomb(bomb) {
    this.state.bombs=this.state.bombs.filter(b=>b!==bomb);
    const cells=[{tx:bomb.tx,ty:bomb.ty}];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      for(let i=1;i<=bomb.range;i++){
        const tx=bomb.tx+dx*i, ty=bomb.ty+dy*i;
        if(tx<0||ty<0||tx>=GRID_W||ty>=GRID_H) break;
        const t=this.state.tiles[ty][tx];
        if(t===TILE.WALL) break;
        cells.push({tx,ty,ownerId:bomb.ownerId});
        if(t===TILE.SOFT){
          this.state.tiles[ty][tx]=TILE.FLOOR;
          if(Math.random()<0.4) this.state.powerups.push({tx,ty,type:POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)]});
          break;
        }
        const chain=this.state.bombs.find(b=>b.tx===tx&&b.ty===ty);
        if(chain){chain.timer=1;break;}
      }
    });
    const now=Date.now();
    cells.forEach(c=>this.state.explosions.push({...c,expiresAt:now+700}));
  }

  updateExplosions() {
    const now=Date.now();
    this.state.explosions=this.state.explosions.filter(e=>e.expiresAt>now);
  }

  checkDeaths() {
    if (this.state.explosions.length === 0) return;
    const HIT = TILE_SIZE * 0.42; // raio de hitbox do jogador em pixels
    this.state.players.forEach(p => {
      if (!p.alive) return;
      if (p.ghostTimer > 0) return;
      const hit = this.state.explosions.some(e => {
        const ex = e.tx * TILE_SIZE + TILE_SIZE / 2;
        const ey = e.ty * TILE_SIZE + TILE_SIZE / 2;
        return Math.abs(p.x - ex) < HIT && Math.abs(p.y - ey) < HIT;
      });
      if (hit) {
        if (p.shield) { p.shield = false; }
        else { p.alive = false; this.io.to(this.roomId).emit('game:playerDied', { id:p.id, name:p.name, reason:'explosão' }); }
      }
    });
  }

  applyPowerup(p,type){
    switch(type){
      case 'extra_bomb':   p.bombs =Math.min(p.bombs+1,8); break;
      case 'bigger_range': p.range =Math.min(p.range+1,8); break;
      case 'speed':        p.speed =Math.min(p.speed*1.25,320); break;
      case 'shield':       p.shield=true; break;
      case 'teleport': {
        for(let t=0;t<20;t++){
          const tx=1+Math.floor(Math.random()*(GRID_W-2));
          const ty=1+Math.floor(Math.random()*(GRID_H-2));
          if(this.state.tiles[ty][tx]===TILE.FLOOR){p.x=tx*TILE_SIZE+TILE_SIZE/2;p.y=ty*TILE_SIZE+TILE_SIZE/2;break;}
        }
        break;
      }
      case 'ghost':      p.ghostTimer=5000; break;
      case 'mega_range': p.range=Math.min(p.range+3,10); break;
    }
    this.io.to(this.roomId).emit('game:powerup',{playerId:p.id,type});
  }

  // ── Arena Shrink ──────────────────────────────────────────────────────────

  updateShrink(){
    this.state.shrinkTimer+=TICK_MS;
    if(this.state.shrinkTimer<this.state.shrinkInterval) return;
    this.state.shrinkTimer=0;
    this.state.shrinkRing++;
    const ring=this.state.shrinkRing;
    if(ring>=6) return;
    for(let x=ring;x<GRID_W-ring;x++){this.makeWall(x,ring);this.makeWall(x,GRID_H-1-ring);}
    for(let y=ring+1;y<GRID_H-1-ring;y++){this.makeWall(ring,y);this.makeWall(GRID_W-1-ring,y);}
    this.io.to(this.roomId).emit('game:arenaShrank',{ring});
  }

  makeWall(x,y){
    this.state.tiles[y][x]=TILE.WALL;
    const wallCX = x * TILE_SIZE + TILE_SIZE / 2;
    const wallCY = y * TILE_SIZE + TILE_SIZE / 2;
    this.state.players.forEach(p=>{
      if(!p.alive) return;
      // mata apenas se o centro do jogador está dentro do tile que virou parede
      if(Math.abs(p.x - wallCX) < TILE_SIZE * 0.5 && Math.abs(p.y - wallCY) < TILE_SIZE * 0.5){
        p.alive=false;
        this.io.to(this.roomId).emit('game:playerDied',{id:p.id,name:p.name,reason:'arena'});
      }
    });
  }

  // ── Caos ─────────────────────────────────────────────────────────────────

  updateChaos(ms){
    if (!this.state.hasChaos || this.state.chaosActive) return;
    if (ms < this.state.chaosStart) return;

    const ev = this.state.chaosQueue.shift();
    if (!ev) return;

    this.state.chaosEvent  = ev;
    this.state.chaosActive = true;
    this.state.bombRainTimer = 0;
    this.state.randomTpTimer = 0;

    this.io.to(this.roomId).emit('game:chaosStart', { event:ev });

    // Efeitos one-shot na ativação
    if (ev.id==='swap_all')      this.doSwapAll();
    if (ev.id==='double_bombs')  this.state.players.forEach(p=>{p.bombs=Math.min(p.bombs+3,8);p.range=Math.min(p.range+2,10);});

    setTimeout(() => {
      if (!this.state || this.state.phase!=='playing') return;
      this.state.chaosActive = false;
      this.state.chaosEvent  = null;
      this.io.to(this.roomId).emit('game:chaosEnd');
      // Agenda próximo evento se houver
      if (this.state.chaosQueue.length > 0) {
        this.state.chaosStart = ms + ev.duration + 8000 + Math.random()*8000;
      }
    }, ev.duration);
  }

  // ── IA Bots ───────────────────────────────────────────────────────────────

  processBots(){
    this.state.players.filter(p=>p.isBot&&p.alive).forEach(bot=>this.botThink(bot));
  }

  botThink(bot){
    const tx=Math.floor(bot.x/TILE_SIZE), ty=Math.floor(bot.y/TILE_SIZE);
    const isCarrier=this.state.hotBomb.carrierId===bot.id;

    if(isCarrier){
      let bestTarget=null,bestDist=999;
      this.state.players.forEach(p=>{
        if(p.id===bot.id||!p.alive) return;
        const d=this.dist(tx,ty,Math.floor(p.x/TILE_SIZE),Math.floor(p.y/TILE_SIZE));
        if(d<bestDist){bestDist=d;bestTarget=p;}
      });
      if(bestTarget){
        const ptx=Math.floor(bestTarget.x/TILE_SIZE),pty=Math.floor(bestTarget.y/TILE_SIZE);
        const path=this.bfsTo(tx,ty,ptx,pty);
        if(path&&path.length>0) this.moveToward(bot,path[0].tx,path[0].ty);
        else this.randomMove(bot,tx,ty);
      }
      bot.input.bomb=false;
      return;
    }

    const carrier=this.state.players.find(p=>p.id===this.state.hotBomb.carrierId&&p.alive);
    if(carrier){
      const ctx2=Math.floor(carrier.x/TILE_SIZE),cty=Math.floor(carrier.y/TILE_SIZE);
      if(this.dist(tx,ty,ctx2,cty)<5){
        const safePath=this.bfsAwayFrom(tx,ty,ctx2,cty);
        if(safePath){this.moveToward(bot,safePath.tx,safePath.ty);bot.input.bomb=false;return;}
      }
    }

    bot.input.bomb=false;
    this.randomMove(bot,tx,ty);
  }

  moveToward(bot,tx,ty){
    const bx=Math.floor(bot.x/TILE_SIZE),by=Math.floor(bot.y/TILE_SIZE);
    bot.input.left=tx<bx;bot.input.right=tx>bx;bot.input.up=ty<by;bot.input.down=ty>by;
  }

  randomMove(bot,tx,ty){
    const valid=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>{
      const nx=tx+dx,ny=ty+dy;
      if(nx<0||ny<0||nx>=GRID_W||ny>=GRID_H) return false;
      const t=this.state.tiles[ny][nx];
      return t===TILE.FLOOR||t===TILE.POWERUP_SPAWN||t===TILE.SPECIAL;
    });
    bot.input.up=bot.input.down=bot.input.left=bot.input.right=false;
    if(!valid.length) return;
    if(bot._dir&&Math.random()<0.78&&valid.some(([dx,dy])=>dx===bot._dir[0]&&dy===bot._dir[1])){
      const[dx,dy]=bot._dir;
      bot.input.up=dy<0;bot.input.down=dy>0;bot.input.left=dx<0;bot.input.right=dx>0;
      return;
    }
    const[dx,dy]=valid[Math.floor(Math.random()*valid.length)];
    bot._dir=[dx,dy];
    bot.input.up=dy<0;bot.input.down=dy>0;bot.input.left=dx<0;bot.input.right=dx>0;
  }

  bfsTo(sx,sy,ex,ey){
    const vis=new Set([`${sx},${sy}`]);
    const q=[{tx:sx,ty:sy,path:[]}];
    while(q.length){
      const c=q.shift();
      if(c.tx===ex&&c.ty===ey) return c.path;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=c.tx+dx,ny=c.ty+dy;
        const k=`${nx},${ny}`;
        if(nx<0||ny<0||nx>=GRID_W||ny>=GRID_H||vis.has(k)) continue;
        const t=this.state.tiles[ny][nx];
        if(t===TILE.WALL||t===TILE.SOFT) continue;
        vis.add(k);
        q.push({tx:nx,ty:ny,path:[...c.path,{tx:nx,ty:ny}]});
      }
    }
    return null;
  }

  bfsAwayFrom(sx,sy,fx,fy){
    const vis=new Set([`${sx},${sy}`]);
    const q=[{tx:sx,ty:sy}];
    let best=null,bestDist=0;
    while(q.length){
      const c=q.shift();
      const d=this.dist(c.tx,c.ty,fx,fy);
      if(d>bestDist){bestDist=d;best=c;}
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=c.tx+dx,ny=c.ty+dy;
        const k=`${nx},${ny}`;
        if(nx<0||ny<0||nx>=GRID_W||ny>=GRID_H||vis.has(k)) continue;
        const t=this.state.tiles[ny][nx];
        if(t===TILE.WALL||t===TILE.SOFT) continue;
        vis.add(k);
        q.push({tx:nx,ty:ny});
        if(vis.size>50) return best;
      }
    }
    return best;
  }

  dist(ax,ay,bx,by){return Math.abs(ax-bx)+Math.abs(ay-by);}

  // ── Fim de Rodada ─────────────────────────────────────────────────────────

  checkRoundEnd(){
    const alive=this.state.players.filter(p=>p.alive);
    const dead =this.state.players.filter(p=>!p.alive);
    if(dead.length<this.state.toEliminate&&alive.length>0) return;
    this.state.phase='roundEnd';
    clearInterval(this.interval);
    dead.forEach(p=>this.tournament.ranking.unshift(p.id));
    this.tournament.alive=alive.map(p=>p.id);
    this.tournament.round++;
    const result={
      survivors:alive.map(p=>({id:p.id,name:p.name,kills:p.kills,isBot:p.isBot})),
      eliminated:dead.map(p=>({id:p.id,name:p.name})),
    };
    this.io.to(this.roomId).emit('game:roundEnd',result);
    if(alive.length<=1){setTimeout(()=>this.endTournament(),4500);}
    else{setTimeout(()=>this.startRound(),6000);}
  }

  endTournament(){
    const w=this.tournament.alive[0];
    if(w) this.tournament.ranking.unshift(w);
    const ranking=this.tournament.ranking.map((id,i)=>{
      const p=this.allPlayers.find(pl=>pl.id===id);
      return{position:i+1,id,name:p?.name||'Bot',isBot:p?.isBot||false,kills:p?.kills||0};
    });
    this.io.to(this.roomId).emit('game:tournamentEnd',{ranking});
    this.state.phase='ended';
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────

  broadcast(){
    if(!this.state) return;
    const ev=this.state.chaosEvent;
    this.io.to(this.roomId).emit('game:state',{
      tick:        this.state.tick,
      map:         {id:this.state.map.id,name:this.state.map.name,theme:this.state.map.theme},
      players:     this.state.players.map(p=>({
        id:p.id,name:p.name,x:p.x,y:p.y,
        direction:p.direction,moving:p.moving,frame:p.frame,
        alive:p.alive,shield:p.shield,kills:p.kills,isBot:p.isBot,
        bombs:p.bombs,range:p.range,ghost:p.ghostTimer>0,
      })),
      bombs:       this.state.bombs.map(b=>({id:b.id,tx:b.tx,ty:b.ty,timer:b.timer,maxTimer:b.maxTimer})),
      explosions:  this.state.explosions.map(e=>({tx:e.tx,ty:e.ty})),
      powerups:    this.state.powerups.map(p=>({tx:p.tx,ty:p.ty,type:p.type})),
      tiles:       this.state.tiles,
      matchTimer:  this.state.matchTimer,
      hotBomb:     {carrierId:this.state.hotBomb.carrierId,timer:this.state.hotBomb.timer,maxTimer:this.state.hotBomb.maxTimer},
      chaosActive: this.state.chaosActive,
      chaosEvent:  ev ? {id:ev.id,name:ev.name} : null,
      shrinkRing:  this.state.shrinkRing,
      phase:       this.state.phase,
    });
  }

  setInput(playerId,input){
    const p=this.state?.players.find(pl=>pl.id===playerId);
    if(p&&p.alive) p.input=input;
    // Bomba
    if(p&&p.alive&&input.bomb&&!p.bombPressed) this.plantBomb(p);
    p && (p.bombPressed=input.bomb);
  }

  stop(){ clearInterval(this.interval); this.state=null; }
}

module.exports = { GameRoom };
