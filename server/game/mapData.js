// ─── Mapas — Arenas Abertas (21×17) ──────────────────────────────────────────
const TILE   = { FLOOR: 0, WALL: 1, SOFT: 2, POWERUP_SPAWN: 3, SPECIAL: 4 };
const GRID_W = 21;
const GRID_H = 17;

const SPAWN_POINTS = [
  { x:1,  y:1  }, { x:19, y:1  }, { x:1,  y:15 }, { x:19, y:15 },
  { x:10, y:1  }, { x:10, y:15 }, { x:1,  y:8  }, { x:19, y:8  },
  { x:5,  y:4  }, { x:15, y:4  }, { x:5,  y:12 }, { x:15, y:12 },
];

const CLEAR_ZONES = new Set();
SPAWN_POINTS.forEach(sp => {
  for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++)
    CLEAR_ZONES.add(`${sp.x+dx},${sp.y+dy}`);
});

function makeGrid(fill) {
  return Array.from({length:GRID_H}, (_,y) => Array.from({length:GRID_W}, (_,x) => fill(x,y)));
}

function generateOpen({ specials=0 } = {}) {
  const g = makeGrid((x,y) => (x===0||x===GRID_W-1||y===0||y===GRID_H-1) ? TILE.WALL : TILE.FLOOR);
  let placed=0, attempts=0;
  while (placed < specials && attempts < 300) {
    attempts++;
    const x = 2 + Math.floor(Math.random()*(GRID_W-4));
    const y = 2 + Math.floor(Math.random()*(GRID_H-4));
    if (!CLEAR_ZONES.has(`${x},${y}`) && g[y][x] === TILE.FLOOR) {
      g[y][x] = TILE.SPECIAL; placed++;
    }
  }
  return g;
}

const MAP_TEMPLATES = [
  {
    id:'classico',   name:'Clássico',          theme:'classic',
    gen: () => generateOpen(),
  },
  {
    id:'gelo',       name:'Cripta de Gelo',    theme:'ice',
    gen: () => generateOpen(),
    slippery: true,
  },
  {
    id:'vulcao',     name:'Vulcão Ativo',       theme:'volcano',
    gen: () => generateOpen({ specials:8 }),
  },
  {
    id:'espaco',     name:'Estação Espacial',  theme:'space',
    gen: () => generateOpen(),
  },
  {
    id:'floresta',   name:'Floresta Sombria',  theme:'forest',
    gen: () => generateOpen(),
  },
  {
    id:'cidade',     name:'Cidade em Ruínas',  theme:'city',
    gen: () => generateOpen(),
    bigBombs: true,
  },
  {
    id:'deserto',    name:'Deserto Ardente',   theme:'desert',
    gen: () => generateOpen({ specials:6 }),
  },
  {
    id:'oceano',     name:'Fundo do Oceano',   theme:'ocean',
    gen: () => generateOpen(),
    slippery: true,
  },
];

function freshMap(mapId) {
  const tmpl = MAP_TEMPLATES.find(m => m.id === mapId) || MAP_TEMPLATES[0];
  return { ...tmpl, tiles: tmpl.gen() };
}

const MAPS = MAP_TEMPLATES;
module.exports = { MAPS, MAP_TEMPLATES, SPAWN_POINTS, TILE, GRID_W, GRID_H, freshMap };
