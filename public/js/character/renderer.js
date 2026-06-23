// ─── Character Renderer — Pixel Art Sprite ────────────────────────────────────
// Frames: 0=idle, 1-3=walk, 4=blink

const CharRenderer = (() => {

  const SKIN_COLORS = [
    { main:'#FFCBA4', shadow:'#D4956A', hi:'#FFE4CC', ear:'#F0A878', name:'Claro'     },
    { main:'#D4956A', shadow:'#A0643A', hi:'#E8B08A', ear:'#C07848', name:'Médio'     },
    { main:'#C68642', shadow:'#8A5A1E', hi:'#DDA060', ear:'#A86C28', name:'Bronzeado' },
    { main:'#8D5524', shadow:'#5C3010', hi:'#AA7040', ear:'#764418', name:'Moreno'    },
    { main:'#4A2912', shadow:'#280F00', hi:'#6A3D20', ear:'#341808', name:'Escuro'    },
    { main:'#B09070', shadow:'#806040', hi:'#C8AA90', ear:'#906850', name:'Oliva'     },
  ];

  const BODY_COLORS = [
    { main:'#3355FF', shadow:'#1133CC', hi:'#6688FF', name:'Azul'    },
    { main:'#FF3333', shadow:'#CC1111', hi:'#FF6655', name:'Vermelho' },
    { main:'#33AA44', shadow:'#117722', hi:'#55CC66', name:'Verde'    },
    { main:'#AA33FF', shadow:'#7711CC', hi:'#CC66FF', name:'Roxo'     },
    { main:'#FF9922', shadow:'#CC6600', hi:'#FFCC55', name:'Laranja'  },
    { main:'#33CCCC', shadow:'#118888', hi:'#66EEEE', name:'Ciano'    },
    { main:'#FF55AA', shadow:'#CC2277', hi:'#FF88CC', name:'Rosa'     },
    { main:'#888899', shadow:'#555566', hi:'#AABBCC', name:'Cinza'    },
  ];

  const PANTS_COLORS = [
    { main:'#224488', shadow:'#112255', hi:'#3366AA', name:'Jeans'    },
    { main:'#222222', shadow:'#111111', hi:'#444444', name:'Preto'    },
    { main:'#664422', shadow:'#332211', hi:'#885533', name:'Marrom'   },
    { main:'#446644', shadow:'#223322', hi:'#558866', name:'Camuflado'},
    { main:'#882222', shadow:'#551111', hi:'#AA4444', name:'Vinho'    },
    { main:'#887733', shadow:'#554400', hi:'#AAAA44', name:'Cáqui'    },
  ];

  const HAT_COLORS = [
    { main:'#CC2222', shadow:'#881111', hi:'#EE5544', name:'Vermelho' },
    { main:'#4422AA', shadow:'#221166', hi:'#6644CC', name:'Roxo'     },
    { main:'#DDAA00', shadow:'#997700', hi:'#FFCC33', name:'Dourado'  },
    { main:'#1A1A1A', shadow:'#000000', hi:'#333333', name:'Preto'    },
    { main:'#22AA44', shadow:'#117722', hi:'#44CC66', name:'Verde'    },
    { main:'#FF6622', shadow:'#CC3300', hi:'#FF9944', name:'Laranja'  },
    { main:'#CC8844', shadow:'#885522', hi:'#DDAA66', name:'Cáqui'    },
    { main:'#2255CC', shadow:'#112288', hi:'#4488EE', name:'Azul'     },
  ];

  const HAT_NAMES       = ['Boné','Mago','Coroa','Afro','Moicano','Cartola','Cowboy','Capacete','Bandana','Pirata','Headphone','Tiara'];
  const FACE_NAMES      = ['Normal','Feliz','Bravo','Estiloso','Surpreso','Sonolento','Malicioso','Feroz'];
  const ACCESSORY_NAMES = ['Nenhum','Cachecol','Gravata Borboleta','Medalha','Capa','Óculos','Máscara','Ombreiras','Colar','Asas','Bracelete','Pin Estrela'];
  const SKIN_NAMES      = SKIN_COLORS.map(c=>c.name);
  const BODY_NAMES      = BODY_COLORS.map(c=>c.name);
  const PANTS_NAMES     = PANTS_COLORS.map(c=>c.name);
  const HAT_COLOR_NAMES = HAT_COLORS.map(c=>c.name);

  const K = '#0d0d1a';

  function px(ctx, x, y, color, w=1, h=1, s=1) {
    if (!color || color==='T') return;
    ctx.fillStyle = color;
    ctx.fillRect(x*s, y*s, w*s, h*s);
  }

  // ── FRENTE ────────────────────────────────────────────────────────────────

  function drawFront(ctx, opts, frame, s, carryBomb) {
    const SK = SKIN_COLORS[opts.skin] || SKIN_COLORS[0];
    const B  = BODY_COLORS[opts.body] || BODY_COLORS[0];
    const P  = PANTS_COLORS[opts.pants] || PANTS_COLORS[0];

    const bob  = (frame===1||frame===3) ? -1 : 0;
    const legL = frame===1 ? 2 : frame===3 ? -2 : 0;
    const legR = -legL;
    const armL = legR;
    const armR = legL;

    // Sombra chão
    px(ctx,5,34,K,10,1,s);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(5*s,34*s,10*s,1*s);

    // Sapatos
    px(ctx,4,30+legL+bob,K,6,3,s);
    px(ctx,5,30+legL+bob,'#1a1a1a',4,2,s);
    px(ctx,5,30+legL+bob,'#333',2,1,s);
    px(ctx,11,30+legR+bob,K,6,3,s);
    px(ctx,12,30+legR+bob,'#1a1a1a',4,2,s);
    px(ctx,12,30+legR+bob,'#333',2,1,s);

    // Pernas
    px(ctx,5,23+bob,K,1,8,s); px(ctx,8,23+bob,K,1,8,s);
    px(ctx,6,23+legL+bob,P.main,2,7,s);
    px(ctx,7,25+legL+bob,P.shadow,1,4,s);
    px(ctx,12,23+bob,K,1,8,s); px(ctx,15,23+bob,K,1,8,s);
    px(ctx,13,23+legR+bob,P.main,2,7,s);
    px(ctx,14,25+legR+bob,P.shadow,1,4,s);

    // Cinto
    px(ctx,5,22+bob,'#CCAA00',10,1,s);
    px(ctx,9,22+bob,'#FF8800',2,1,s);

    // Corpo — outline
    px(ctx,4,14+bob,K,12,1,s);
    px(ctx,4,22+bob,K,12,1,s);
    px(ctx,4,15+bob,K,1,7,s);
    px(ctx,15,15+bob,K,1,7,s);
    // Corpo — fill
    px(ctx,5,15+bob,B.main,10,6,s);
    px(ctx,5,15+bob,B.hi,10,1,s);
    px(ctx,5,20+bob,B.shadow,10,1,s);
    // Gola
    px(ctx,8,14+bob,SK.main,4,1,s);

    // Braço esquerdo
    px(ctx,2,15+bob,K,3,8,s);
    px(ctx,3,15+armL+bob,B.main,1,7,s);
    px(ctx,2,15+armL+bob,B.shadow,1,7,s);
    px(ctx,2,22+armL+bob,SK.main,2,2,s);
    // Braço direito
    px(ctx,15,15+bob,K,3,8,s);
    px(ctx,16,15+armR+bob,B.main,1,7,s);
    px(ctx,17,15+armR+bob,B.shadow,1,7,s);
    px(ctx,16,22+armR+bob,SK.main,2,2,s);

    // Cabeça — outline (cantos cortados = pixel art rounded)
    px(ctx,5,4+bob,K,10,1,s);  // topo
    px(ctx,5,13+bob,K,10,1,s); // base
    px(ctx,4,5+bob,K,1,8,s);   // esq
    px(ctx,15,5+bob,K,1,8,s);  // dir
    // Cabeça — fill skin
    px(ctx,5,5+bob,SK.main,10,8,s);
    // Sombra lateral direita
    px(ctx,14,5+bob,SK.shadow,1,8,s);
    // Sombra base
    px(ctx,5,12+bob,SK.shadow,10,1,s);
    // Highlight topo-esq
    px(ctx,5,5+bob,SK.hi,3,2,s);

    // Orelhas (1px nub)
    px(ctx,3,7+bob,SK.ear,2,3,s);
    px(ctx,15,7+bob,SK.ear,2,3,s);
    px(ctx,3,8+bob,SK.shadow,1,2,s);

    // Bochechas
    px(ctx,5,10+bob,'#FF9999',2,1,s);
    px(ctx,13,10+bob,'#FF9999',2,1,s);

    drawFrontFace(ctx, opts.eyeStyle, bob, s, SK, frame);
    drawHat(ctx, opts, bob, s);
    drawAccessoryFront(ctx, opts, bob, s, B);

    if (carryBomb) drawBombAbove(ctx, 10, 2+bob, s);
  }

  function drawFrontFace(ctx, style, oy, s, SK, frame) {
    const blink = frame===4;
    const faces = [
      ()=>{ // 0 Normal
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        px(ctx,6,7+oy,K,3,3,s); px(ctx,6,7+oy,'#fff',2,2,s); px(ctx,8,8+oy,K,1,1,s);
        px(ctx,11,7+oy,K,3,3,s); px(ctx,11,7+oy,'#fff',2,2,s); px(ctx,13,8+oy,K,1,1,s);
        px(ctx,6,11+oy,K,1,1,s); px(ctx,7,11+oy,K,5,1,s); px(ctx,12,11+oy,K,1,1,s);
      },
      ()=>{ // 1 Feliz
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        px(ctx,6,7+oy,'#0a0a1e',1,1,s); px(ctx,7,6+oy,'#0a0a1e',1,1,s); px(ctx,8,7+oy,'#0a0a1e',1,1,s);
        px(ctx,11,7+oy,'#0a0a1e',1,1,s); px(ctx,12,6+oy,'#0a0a1e',1,1,s); px(ctx,13,7+oy,'#0a0a1e',1,1,s);
        px(ctx,6,10+oy,K,1,1,s); px(ctx,14,10+oy,K,1,1,s);
        px(ctx,7,10+oy,'#cc3322',6,1,s); px(ctx,7,11+oy,K,6,1,s);
        px(ctx,7,10+oy,'#fff',2,1,s); px(ctx,10,10+oy,'#fff',2,1,s);
      },
      ()=>{ // 2 Bravo
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        px(ctx,5,6+oy,K,1,1,s); px(ctx,6,7+oy,K,2,1,s);
        px(ctx,14,6+oy,K,1,1,s); px(ctx,12,7+oy,K,2,1,s);
        px(ctx,6,8+oy,K,3,2,s); px(ctx,7,8+oy,'#dd0000',1,2,s);
        px(ctx,11,8+oy,K,3,2,s); px(ctx,12,8+oy,'#dd0000',1,2,s);
        px(ctx,7,11+oy,K,6,1,s); px(ctx,6,11+oy,K,1,1,s); px(ctx,13,11+oy,K,1,1,s);
      },
      ()=>{ // 3 Estiloso — óculos pixel
        px(ctx,5,7+oy,'#111',9,2,s);
        px(ctx,5,7+oy,'#223388',3,2,s); px(ctx,10,7+oy,'#111',1,2,s); px(ctx,11,7+oy,'#223388',3,2,s);
        px(ctx,5,6+oy,K,9,1,s); px(ctx,5,9+oy,K,9,1,s);
        px(ctx,8,11+oy,K,4,1,s); px(ctx,7,11+oy,K,1,1,s);
      },
      ()=>{ // 4 Surpreso
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        px(ctx,6,6+oy,K,3,4,s); px(ctx,6,6+oy,'#fff',2,3,s); px(ctx,8,8+oy,K,1,1,s);
        px(ctx,11,6+oy,K,3,4,s); px(ctx,11,6+oy,'#fff',2,3,s); px(ctx,13,8+oy,K,1,1,s);
        px(ctx,8,10+oy,K,4,3,s); px(ctx,9,11+oy,'#880000',2,1,s);
        px(ctx,6,5+oy,K,2,1,s); px(ctx,12,5+oy,K,2,1,s);
      },
      ()=>{ // 5 Sonolento
        px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s);
        px(ctx,6,7+oy,'#fff',3,1,s); px(ctx,11,7+oy,'#fff',3,1,s);
        px(ctx,8,11+oy,K,4,1,s);
        px(ctx,14,5+oy,'#6666ff',2,1,s); px(ctx,15,4+oy,'#6666ff',2,1,s);
      },
      ()=>{ // 6 Malicioso
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        // Sobrancelhas levantadas no interno
        px(ctx,8,5+oy,K,2,1,s); px(ctx,12,5+oy,K,2,1,s);
        px(ctx,6,6+oy,K,1,1,s); px(ctx,13,6+oy,K,1,1,s);
        // Olhos semicerrados com brilho
        px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s);
        px(ctx,6,7+oy,'#fff',2,1,s); px(ctx,7,8+oy,'#880000',1,1,s);
        px(ctx,11,7+oy,'#fff',2,1,s); px(ctx,12,8+oy,'#880000',1,1,s);
        // Sorriso assimétrico
        px(ctx,10,11+oy,K,4,1,s); px(ctx,9,10+oy,K,1,1,s);
      },
      ()=>{ // 7 Feroz
        if(blink){ px(ctx,6,8+oy,K,3,1,s); px(ctx,11,8+oy,K,3,1,s); return; }
        // Sobrancelhas grossas inclinadas
        px(ctx,5,6+oy,K,4,1,s); px(ctx,6,5+oy,K,2,1,s);
        px(ctx,11,6+oy,K,4,1,s); px(ctx,12,5+oy,K,2,1,s);
        // Olhos vermelhos
        px(ctx,6,7+oy,K,4,3,s); px(ctx,6,7+oy,'#CC0000',3,2,s); px(ctx,9,8+oy,K,1,1,s);
        px(ctx,11,7+oy,K,4,3,s); px(ctx,11,7+oy,'#CC0000',3,2,s); px(ctx,14,8+oy,K,1,1,s);
        // Boca aberta com dentes
        px(ctx,7,10+oy,K,6,2,s); px(ctx,8,11+oy,'#880000',4,1,s);
        px(ctx,8,10+oy,'#fff',1,1,s); px(ctx,10,10+oy,'#fff',2,1,s);
      },
    ];
    (faces[style % faces.length] || faces[0])();
  }

  // ── COSTAS ────────────────────────────────────────────────────────────────

  function drawBack(ctx, opts, frame, s, carryBomb) {
    const SK = SKIN_COLORS[opts.skin] || SKIN_COLORS[0];
    const B  = BODY_COLORS[opts.body] || BODY_COLORS[0];
    const P  = PANTS_COLORS[opts.pants] || PANTS_COLORS[0];

    const bob  = (frame===1||frame===3) ? -1 : 0;
    const legL = frame===1 ? 2 : frame===3 ? -2 : 0;
    const legR = -legL;
    const armL = legR;
    const armR = legL;

    px(ctx,5,34,K,10,1,s);

    // Sapatos
    px(ctx,4,30+legL+bob,K,6,3,s); px(ctx,5,30+legL+bob,'#111',4,2,s);
    px(ctx,11,30+legR+bob,K,6,3,s); px(ctx,12,30+legR+bob,'#111',4,2,s);

    // Pernas
    px(ctx,5,23+bob,K,1,8,s); px(ctx,8,23+bob,K,1,8,s);
    px(ctx,6,23+legL+bob,P.shadow,2,7,s);
    px(ctx,12,23+bob,K,1,8,s); px(ctx,15,23+bob,K,1,8,s);
    px(ctx,13,23+legR+bob,P.shadow,2,7,s);

    // Cinto
    px(ctx,5,22+bob,'#AA8800',10,1,s);

    // Corpo (costas — mais escuro)
    px(ctx,4,14+bob,K,12,1,s); px(ctx,4,22+bob,K,12,1,s);
    px(ctx,4,15+bob,K,1,7,s); px(ctx,15,15+bob,K,1,7,s);
    px(ctx,5,15+bob,B.shadow,10,6,s);
    px(ctx,5,15+bob,B.main,8,5,s);

    // Braços
    px(ctx,2,15+bob,K,3,8,s);
    px(ctx,2,15+armL+bob,B.shadow,2,7,s);
    px(ctx,2,22+armL+bob,SK.shadow,2,2,s);
    px(ctx,15,15+bob,K,3,8,s);
    px(ctx,16,15+armR+bob,B.shadow,2,7,s);
    px(ctx,16,22+armR+bob,SK.shadow,2,2,s);

    // Cabeça costas
    px(ctx,5,4+bob,K,10,1,s); px(ctx,5,13+bob,K,10,1,s);
    px(ctx,4,5+bob,K,1,8,s); px(ctx,15,5+bob,K,1,8,s);
    px(ctx,5,5+bob,SK.shadow,10,8,s);
    px(ctx,5,5+bob,SK.main,9,7,s);
    px(ctx,14,5+bob,SK.shadow,1,8,s);
    px(ctx,5,5+bob,SK.shadow,1,2,s);

    // Orelhas
    px(ctx,3,7+bob,SK.ear,2,3,s); px(ctx,15,7+bob,SK.ear,2,3,s);

    drawHatBack(ctx, opts, bob, s);
    drawAccessoryBack(ctx, opts, bob, s, B);

    if (carryBomb) drawBombAbove(ctx, 10, 2+bob, s);
  }

  // ── LADO ──────────────────────────────────────────────────────────────────

  function drawSide(ctx, opts, frame, s, carryBomb, flip) {
    const SK = SKIN_COLORS[opts.skin] || SKIN_COLORS[0];
    const B  = BODY_COLORS[opts.body] || BODY_COLORS[0];
    const P  = PANTS_COLORS[opts.pants] || PANTS_COLORS[0];

    const step = frame===1 ? 2 : frame===3 ? -2 : 0;
    const bob  = step!==0 ? -1 : 0;
    const armF = -step;

    if (flip) { ctx.save(); ctx.translate(20*s,0); ctx.scale(-1,1); }

    px(ctx,5,34,K,8,1,s);

    // Sapato frente
    px(ctx,6,30+step+bob,K,6,3,s); px(ctx,7,30+step+bob,'#1a1a1a',4,2,s); px(ctx,7,30+step+bob,'#333',2,1,s);
    // Sapato trás
    px(ctx,5,30-step+bob,K,5,2,s); px(ctx,6,30-step+bob,'#111',3,2,s);

    // Perna frente
    px(ctx,7,23+bob,K,1,8,s); px(ctx,11,23+bob,K,1,8,s);
    px(ctx,8,23+step+bob,P.main,3,7,s); px(ctx,10,25+step+bob,P.shadow,1,4,s);
    // Perna trás
    px(ctx,7,23+bob,K,3,7,s); px(ctx,8,23-step+bob,P.shadow,2,7,s);

    // Cinto
    px(ctx,5,22+bob,'#AA8800',8,1,s);

    // Corpo perfil
    px(ctx,5,14+bob,K,8,1,s); px(ctx,5,22+bob,K,8,1,s);
    px(ctx,5,15+bob,K,1,7,s); px(ctx,12,15+bob,K,1,7,s);
    px(ctx,6,15+bob,B.main,6,6,s); px(ctx,6,15+bob,B.hi,6,1,s);
    px(ctx,6,20+bob,B.shadow,6,1,s);
    px(ctx,7,14+bob,SK.main,3,1,s);

    // Braço frontal (oscila)
    px(ctx,3,15+bob,K,3,8,s);
    px(ctx,4,15+armF+bob,B.main,2,7,s);
    px(ctx,3,22+armF+bob,SK.main,3,2,s);
    // Braço traseiro
    px(ctx,11,15+bob,K,3,6,s); px(ctx,12,16+step+bob,B.shadow,1,5,s);

    // Cabeça perfil
    px(ctx,5,4+bob,K,9,1,s); px(ctx,5,13+bob,K,9,1,s);
    px(ctx,4,5+bob,K,1,8,s); px(ctx,13,5+bob,K,1,8,s);
    px(ctx,5,5+bob,SK.main,8,8,s);
    px(ctx,12,5+bob,SK.shadow,1,8,s);
    px(ctx,5,12+bob,SK.shadow,8,1,s);
    px(ctx,5,5+bob,SK.hi,3,2,s);

    // Orelha (lado visível)
    px(ctx,3,7+bob,SK.ear,2,3,s);
    px(ctx,3,8+bob,SK.shadow,1,2,s);

    // Bochecha
    px(ctx,5,10+bob,'#FF9999',2,1,s);

    // Rosto perfil
    drawSideFace(ctx, opts.eyeStyle, bob, s, SK, frame);
    drawHatSide(ctx, opts, bob, s);
    drawAccessoryFront(ctx, opts, bob, s, B);

    if (flip) ctx.restore();
    if (carryBomb) drawBombAbove(ctx, 10, 2+bob, s);
  }

  function drawSideFace(ctx, style, oy, s, SK, frame) {
    const blink = frame===4;
    if(blink){ px(ctx,9,8+oy,K,2,1,s); return; }
    px(ctx,9,7+oy,K,2,3,s); px(ctx,9,7+oy,'#fff',1,2,s); px(ctx,10,8+oy,K,1,1,s);
    // Nariz
    px(ctx,12,10+oy,SK.shadow,1,1,s);
    // Boca
    px(ctx,11,11+oy,K,2,1,s);
    // Sobrancelha
    px(ctx,8,6+oy,K,3,1,s);
  }

  // ── CHAPÉUS ───────────────────────────────────────────────────────────────

  function drawHat(ctx, opts, oy, s) {
    const H = HAT_COLORS[opts.hatColor||0];
    const fns=[
      ()=>{ // Boné
        px(ctx,4,1+oy,H.main,12,3,s);
        px(ctx,4,1+oy,K,12,1,s); px(ctx,4,1+oy,K,1,3,s); px(ctx,15,1+oy,K,1,3,s);
        px(ctx,4,4+oy,K,12,1,s);
        px(ctx,1,3+oy,H.shadow,8,1,s); px(ctx,1,3+oy,K,1,1,s); px(ctx,8,3+oy,K,1,1,s);
        px(ctx,1,4+oy,K,8,1,s);
        px(ctx,9,2+oy,H.hi,2,1,s);
      },
      ()=>{ // Mago
        px(ctx,9,-4+oy,K,2,9,s); px(ctx,8,-3+oy,H.main,4,8,s);
        px(ctx,7,-1+oy,H.main,6,5,s); px(ctx,5,3+oy,H.main,10,1,s);
        px(ctx,4,3+oy,K,1,1,s); px(ctx,15,3+oy,K,1,1,s); px(ctx,4,4+oy,K,12,1,s);
        px(ctx,9,0+oy,H.hi,1,2,s);
        px(ctx,9,-1+oy,'#FFEE00',1,1,s); px(ctx,7,1+oy,'#FFEE00',1,1,s);
      },
      ()=>{ // Coroa
        px(ctx,4,3+oy,H.main,12,2,s);
        px(ctx,4,1+oy,H.main,2,2,s); px(ctx,8,1+oy,H.main,2,2,s); px(ctx,12,1+oy,H.main,2,2,s);
        px(ctx,4,0+oy,K,12,1,s); px(ctx,4,5+oy,K,12,1,s);
        px(ctx,4,1+oy,K,1,4,s); px(ctx,15,1+oy,K,1,4,s);
        px(ctx,5,3+oy,'#FF2244',1,1,s); px(ctx,9,3+oy,'#2244FF',1,1,s); px(ctx,13,3+oy,'#22CC44',1,1,s);
        px(ctx,5,4+oy,H.hi,6,1,s);
      },
      ()=>{ // Afro
        const c='#1a0800',hi='#3a1800';
        for(let dy=0;dy<7;dy++){
          const t=Math.abs(dy-3)*1.2;
          const x0=Math.max(1,2+(t*0.5)|0), x1=Math.min(19,(18-t*0.5)|0);
          if(x1>x0) px(ctx,x0,dy-4+oy,c,x1-x0,1,s);
        }
        px(ctx,5,-1+oy,hi,3,1,s); px(ctx,11,-2+oy,hi,2,1,s);
      },
      ()=>{ // Moicano
        px(ctx,9,-5+oy,H.main,2,9,s);
        px(ctx,9,-5+oy,K,1,9,s); px(ctx,10,-5+oy,K,1,9,s);
        px(ctx,8,-3+oy,H.shadow,1,7,s); px(ctx,11,-3+oy,H.hi,1,7,s);
        px(ctx,4,0+oy,'#886644',4,3,s); px(ctx,12,0+oy,'#886644',4,3,s);
      },
      ()=>{ // Cartola
        px(ctx,5,-4+oy,K,10,1,s); px(ctx,5,3+oy,K,10,1,s);
        px(ctx,5,-3+oy,K,1,7,s); px(ctx,14,-3+oy,K,1,7,s);
        px(ctx,6,-3+oy,H.main,8,6,s);
        px(ctx,6,-3+oy,H.hi,8,1,s);
        px(ctx,6,2+oy,'#DDAA00',8,1,s);
        px(ctx,3,3+oy,K,14,1,s); px(ctx,3,5+oy,K,14,1,s);
        px(ctx,3,4+oy,H.shadow,14,1,s);
        px(ctx,4,4+oy,H.main,12,1,s);
      },
      ()=>{ // Cowboy
        px(ctx,5,-1+oy,K,10,1,s); px(ctx,5,-1+oy,K,1,5,s); px(ctx,14,-1+oy,K,1,5,s); px(ctx,5,4+oy,K,10,1,s);
        px(ctx,6,0+oy,H.main,8,4,s); px(ctx,6,0+oy,H.hi,8,1,s);
        px(ctx,6,2+oy,'#553311',8,1,s);
        px(ctx,1,4+oy,K,18,1,s); px(ctx,1,6+oy,K,18,1,s);
        px(ctx,2,5+oy,H.shadow,16,1,s); px(ctx,3,5+oy,H.main,14,1,s);
        px(ctx,1,4+oy,H.shadow,2,2,s); px(ctx,17,4+oy,H.shadow,2,2,s);
      },
      ()=>{ // Capacete
        px(ctx,4,3+oy,K,12,1,s);
        px(ctx,4,4+oy,H.shadow,12,1,s);
        for(let dy=0;dy<7;dy++){
          const t=Math.abs(dy-3)*1.1;
          const x0=Math.max(4,(4+t*0.5)|0), x1=Math.min(16,(16-t*0.5)|0);
          if(x1>x0){ px(ctx,x0,dy-3+oy,dy===0?K:H.main,x1-x0,1,s); }
        }
        px(ctx,4,-4+oy,K,1,8,s); px(ctx,15,-4+oy,K,1,8,s);
        px(ctx,5,-3+oy,H.hi,3,1,s);
        px(ctx,6,3+oy,'#44AACC',8,2,s);
        px(ctx,6,3+oy,'#88DDFF',4,1,s);
        px(ctx,5,3+oy,K,1,2,s); px(ctx,14,3+oy,K,1,2,s);
      },
      ()=>{ // Bandana
        px(ctx,4,3+oy,H.main,12,3,s);
        px(ctx,4,3+oy,K,12,1,s); px(ctx,4,6+oy,K,12,1,s);
        px(ctx,4,3+oy,K,1,3,s); px(ctx,15,3+oy,K,1,3,s);
        px(ctx,5,4+oy,H.hi,4,1,s);
        // Laço do lado direito
        px(ctx,15,2+oy,H.shadow,3,2,s); px(ctx,15,2+oy,K,1,2,s); px(ctx,17,2+oy,K,1,2,s);
        px(ctx,16,2+oy,H.main,1,1,s); px(ctx,16,3+oy,H.shadow,1,1,s);
      },
      ()=>{ // Pirata
        px(ctx,4,1+oy,K,12,1,s); px(ctx,4,5+oy,K,12,1,s);
        px(ctx,4,1+oy,K,1,4,s); px(ctx,15,1+oy,K,1,4,s);
        px(ctx,5,2+oy,'#111',10,3,s);
        px(ctx,5,2+oy,'#222',10,1,s);
        // Aba larga
        px(ctx,2,4+oy,K,16,1,s); px(ctx,2,6+oy,K,16,1,s);
        px(ctx,3,5+oy,'#111',14,1,s); px(ctx,3,5+oy,'#222',12,1,s);
        // Caveira
        px(ctx,8,2+oy,'#DDD',4,2,s);
        px(ctx,7,3+oy,'#DDD',1,1,s); px(ctx,12,3+oy,'#DDD',1,1,s);
        px(ctx,9,3+oy,'#111',1,1,s); px(ctx,11,3+oy,'#111',1,1,s);
        px(ctx,8,4+oy,'#DDD',1,1,s); px(ctx,9,4+oy,'#DDD',1,1,s); px(ctx,11,4+oy,'#DDD',1,1,s); px(ctx,12,4+oy,'#DDD',1,1,s);
      },
      ()=>{ // Headphone
        // Aro sobre a cabeça
        px(ctx,6,-2+oy,H.shadow,8,2,s);
        px(ctx,6,-2+oy,K,8,1,s); px(ctx,6,-1+oy,K,1,2,s); px(ctx,13,-1+oy,K,1,2,s);
        px(ctx,7,-1+oy,H.main,6,1,s);
        // Hastes
        px(ctx,4,-1+oy,H.shadow,3,5,s); px(ctx,13,-1+oy,H.shadow,3,5,s);
        // Conchas
        px(ctx,2,3+oy,K,5,5,s); px(ctx,3,4+oy,H.main,3,3,s); px(ctx,3,4+oy,H.hi,2,1,s);
        px(ctx,13,3+oy,K,5,5,s); px(ctx,14,4+oy,H.main,3,3,s); px(ctx,14,4+oy,H.hi,2,1,s);
        // Detalhe sonoro
        px(ctx,4,5+oy,'#000',1,1,s); px(ctx,15,5+oy,'#000',1,1,s);
      },
      ()=>{ // Tiara
        px(ctx,5,3+oy,H.main,10,2,s);
        px(ctx,5,3+oy,K,10,1,s); px(ctx,5,5+oy,K,10,1,s);
        px(ctx,5,3+oy,K,1,2,s); px(ctx,14,3+oy,K,1,2,s);
        px(ctx,6,4+oy,H.hi,3,1,s);
        // Joinha central — flor/gema
        px(ctx,9,0+oy,'#FF99CC',1,1,s); px(ctx,8,1+oy,'#FF99CC',1,1,s); px(ctx,10,1+oy,'#FF99CC',1,1,s);
        px(ctx,9,1+oy,H.hi,1,2,s);
        px(ctx,8,2+oy,'#FF99CC',1,1,s); px(ctx,10,2+oy,'#FF99CC',1,1,s);
        px(ctx,9,3+oy,'#FF99CC',1,1,s);
      },
    ];
    (fns[opts.hat % fns.length] || fns[0])();
  }

  function drawHatBack(ctx, opts, oy, s) {
    const H = HAT_COLORS[opts.hatColor||0];
    const fns=[
      ()=>{ px(ctx,4,1+oy,H.shadow,12,3,s); px(ctx,4,1+oy,K,12,1,s); px(ctx,4,1+oy,K,1,3,s); px(ctx,15,1+oy,K,1,3,s); px(ctx,4,4+oy,K,12,1,s); },
      ()=>{ px(ctx,9,-4+oy,K,2,9,s); px(ctx,8,-3+oy,H.shadow,4,8,s); px(ctx,7,-1+oy,H.shadow,6,5,s); px(ctx,5,3+oy,H.shadow,10,1,s); px(ctx,4,4+oy,K,12,1,s); },
      ()=>{ px(ctx,4,3+oy,H.shadow,12,2,s); px(ctx,4,1+oy,H.shadow,2,2,s); px(ctx,8,1+oy,H.shadow,2,2,s); px(ctx,12,1+oy,H.shadow,2,2,s); px(ctx,4,0+oy,K,12,1,s); px(ctx,4,5+oy,K,12,1,s); },
      ()=>{ const c='#1a0800'; for(let dy=0;dy<7;dy++){const t=Math.abs(dy-3)*1.2;const x0=Math.max(1,(2+t*0.5)|0),x1=Math.min(19,(18-t*0.5)|0);if(x1>x0)px(ctx,x0,dy-4+oy,c,x1-x0,1,s);} },
      ()=>{ px(ctx,9,-5+oy,H.shadow,2,9,s); px(ctx,9,-5+oy,K,1,9,s); px(ctx,10,-5+oy,K,1,9,s); },
      ()=>{ px(ctx,5,-4+oy,K,10,1,s); px(ctx,5,3+oy,K,10,1,s); px(ctx,5,-3+oy,K,1,7,s); px(ctx,14,-3+oy,K,1,7,s); px(ctx,6,-3+oy,H.shadow,8,6,s); px(ctx,6,2+oy,'#997700',8,1,s); px(ctx,3,3+oy,K,14,2,s); px(ctx,4,4+oy,H.shadow,12,1,s); },
      ()=>{ px(ctx,5,-1+oy,K,10,5,s); px(ctx,6,0+oy,H.shadow,8,4,s); px(ctx,1,4+oy,K,18,2,s); px(ctx,2,5+oy,H.shadow,16,1,s); },
      ()=>{ for(let dy=0;dy<7;dy++){const t=Math.abs(dy-3)*1.1;const x0=Math.max(4,(4+t*0.5)|0),x1=Math.min(16,(16-t*0.5)|0);if(x1>x0)px(ctx,x0,dy-3+oy,dy===0?K:H.shadow,x1-x0,1,s);} px(ctx,4,-4+oy,K,1,8,s); px(ctx,15,-4+oy,K,1,8,s); px(ctx,4,3+oy,K,12,2,s); px(ctx,5,4+oy,H.shadow,10,1,s); },
      ()=>{ // Bandana costas
        px(ctx,4,3+oy,H.shadow,12,3,s);
        px(ctx,4,3+oy,K,12,1,s); px(ctx,4,6+oy,K,12,1,s);
        px(ctx,4,3+oy,K,1,3,s); px(ctx,15,3+oy,K,1,3,s);
        px(ctx,15,2+oy,H.shadow,3,3,s); px(ctx,15,2+oy,K,1,3,s);
      },
      ()=>{ // Pirata costas
        px(ctx,4,1+oy,K,12,4,s); px(ctx,5,2+oy,'#111',10,3,s);
        px(ctx,2,4+oy,K,16,2,s); px(ctx,3,5+oy,'#111',14,1,s);
      },
      ()=>{ // Headphone costas
        px(ctx,6,-2+oy,H.shadow,8,2,s); px(ctx,6,-2+oy,K,8,1,s);
        px(ctx,4,-1+oy,H.shadow,3,5,s); px(ctx,13,-1+oy,H.shadow,3,5,s);
        px(ctx,2,3+oy,K,5,5,s); px(ctx,3,4+oy,H.shadow,3,3,s);
        px(ctx,13,3+oy,K,5,5,s); px(ctx,14,4+oy,H.shadow,3,3,s);
      },
      ()=>{ // Tiara costas
        px(ctx,5,3+oy,H.shadow,10,2,s);
        px(ctx,5,3+oy,K,10,1,s); px(ctx,5,5+oy,K,10,1,s);
      },
    ];
    (fns[opts.hat % fns.length] || fns[0])();
  }

  function drawHatSide(ctx, opts, oy, s) {
    const H = HAT_COLORS[opts.hatColor||0];
    const fns=[
      ()=>{ px(ctx,5,1+oy,H.main,9,3,s); px(ctx,5,1+oy,K,9,1,s); px(ctx,5,1+oy,K,1,3,s); px(ctx,13,1+oy,K,1,3,s); px(ctx,5,4+oy,K,9,1,s); px(ctx,4,3+oy,H.shadow,6,1,s); px(ctx,4,4+oy,K,6,1,s); },
      ()=>{ px(ctx,9,-4+oy,K,2,8,s); px(ctx,8,-3+oy,H.main,3,7,s); px(ctx,7,-1+oy,H.main,5,4,s); px(ctx,5,3+oy,K,9,1,s); px(ctx,9,-1+oy,H.hi,1,1,s); },
      ()=>{ px(ctx,5,3+oy,H.main,9,2,s); px(ctx,5,1+oy,H.main,2,2,s); px(ctx,9,1+oy,H.main,2,2,s); px(ctx,5,0+oy,K,9,1,s); px(ctx,5,5+oy,K,9,1,s); px(ctx,5,1+oy,K,1,4,s); px(ctx,13,1+oy,K,1,4,s); },
      ()=>{ for(let dy=0;dy<7;dy++){const t=Math.abs(dy-3)*1.5;const x0=Math.max(3,(3+t*0.5)|0),x1=Math.min(16,(16-t*0.5)|0);if(x1>x0)px(ctx,x0,dy-4+oy,'#1a0800',x1-x0,1,s);} },
      ()=>{ px(ctx,9,-5+oy,H.main,2,9,s); px(ctx,9,-5+oy,K,1,9,s); px(ctx,10,-5+oy,K,1,9,s); },
      ()=>{ px(ctx,5,-4+oy,K,9,7,s); px(ctx,6,-3+oy,H.main,7,6,s); px(ctx,6,-3+oy,H.hi,7,1,s); px(ctx,6,2+oy,'#DDAA00',7,1,s); px(ctx,3,3+oy,K,12,2,s); px(ctx,4,4+oy,H.shadow,10,1,s); },
      ()=>{ px(ctx,5,-1+oy,K,9,5,s); px(ctx,6,0+oy,H.main,7,4,s); px(ctx,6,0+oy,H.hi,7,1,s); px(ctx,1,4+oy,K,14,2,s); px(ctx,2,5+oy,H.shadow,12,1,s); },
      ()=>{ for(let dy=0;dy<7;dy++){const t=Math.abs(dy-3)*1.1;const x0=Math.max(4,(4+t*0.5)|0),x1=Math.min(14,(14-t*0.5)|0);if(x1>x0)px(ctx,x0,dy-3+oy,dy===0?K:H.main,x1-x0,1,s);} px(ctx,4,-4+oy,K,1,8,s); px(ctx,13,-4+oy,K,1,8,s); px(ctx,4,3+oy,K,10,1,s); px(ctx,5,3+oy,'#44AACC',8,2,s); px(ctx,5,3+oy,'#88DDFF',4,1,s); },
      ()=>{ // Bandana lado
        px(ctx,5,3+oy,H.main,9,3,s);
        px(ctx,5,3+oy,K,9,1,s); px(ctx,5,6+oy,K,9,1,s);
        px(ctx,5,3+oy,K,1,3,s); px(ctx,13,3+oy,K,1,3,s);
        px(ctx,6,4+oy,H.hi,3,1,s);
      },
      ()=>{ // Pirata lado
        px(ctx,5,1+oy,K,9,4,s); px(ctx,6,2+oy,'#111',7,3,s);
        px(ctx,2,4+oy,K,14,2,s); px(ctx,3,5+oy,'#111',12,1,s);
        px(ctx,7,2+oy,'#DDD',3,2,s); px(ctx,9,3+oy,'#111',1,1,s);
      },
      ()=>{ // Headphone lado
        px(ctx,6,-2+oy,H.shadow,6,2,s); px(ctx,6,-2+oy,K,6,1,s);
        px(ctx,4,-1+oy,H.shadow,3,5,s); px(ctx,11,-1+oy,H.shadow,3,5,s);
        px(ctx,2,3+oy,K,5,5,s); px(ctx,3,4+oy,H.main,3,3,s);
        px(ctx,12,3+oy,K,4,5,s); px(ctx,13,4+oy,H.main,2,3,s);
      },
      ()=>{ // Tiara lado
        px(ctx,5,3+oy,H.main,9,2,s);
        px(ctx,5,3+oy,K,9,1,s); px(ctx,5,5+oy,K,9,1,s);
        px(ctx,5,3+oy,K,1,2,s); px(ctx,13,3+oy,K,1,2,s);
        // Flor lateral
        px(ctx,9,0+oy,'#FF99CC',3,1,s); px(ctx,10,1+oy,'#FF99CC',1,1,s);
        px(ctx,10,1+oy,H.hi,1,1,s);
      },
    ];
    (fns[opts.hat % fns.length] || fns[0])();
  }

  // ── ACESSÓRIOS ────────────────────────────────────────────────────────────

  function drawAccessoryFront(ctx, opts, oy, s, B) {
    const fns=[
      ()=>{},
      ()=>{ // Cachecol
        px(ctx,4,13+oy,'#CC2222',12,1,s); px(ctx,4,14+oy,'#EE4444',12,1,s);
        px(ctx,13,14+oy,'#BB1111',3,4,s); px(ctx,14,14+oy,'#AA1111',2,4,s);
      },
      ()=>{ // Gravata borboleta
        px(ctx,7,14+oy,K,2,2,s); px(ctx,11,14+oy,K,2,2,s);
        px(ctx,9,14+oy,K,2,2,s); px(ctx,9,15+oy,'#EE1111',1,1,s);
        px(ctx,7,14+oy,'#EE1111',2,2,s); px(ctx,11,14+oy,'#EE1111',2,2,s);
      },
      ()=>{ // Medalha
        px(ctx,9,13+oy,'#CCAA00',2,4,s);
        px(ctx,8,17+oy,K,4,4,s); px(ctx,9,18+oy,'#FFDD00',2,2,s);
        px(ctx,9,18+oy,'#FFAA00',1,1,s);
      },
      ()=>{ // Capa (bordas)
        px(ctx,3,15+oy,'#CC2222',1,7,s); px(ctx,16,15+oy,'#CC2222',1,7,s);
        px(ctx,3,21+oy,'#CC2222',14,1,s);
      },
      ()=>{ // Óculos
        px(ctx,4,7+oy,'#333',11,2,s);
        px(ctx,5,7+oy,'#4488CC',3,2,s); px(ctx,11,7+oy,'#4488CC',3,2,s);
        px(ctx,9,8+oy,'#333',2,1,s);
        px(ctx,5,6+oy,'#333',9,1,s);
      },
      ()=>{ // Máscara ninja (cobre metade inferior da face)
        px(ctx,5,9+oy,'#223388',10,5,s);
        px(ctx,4,10+oy,K,1,3,s); px(ctx,15,10+oy,K,1,3,s);
        px(ctx,5,9+oy,K,10,1,s); px(ctx,5,13+oy,K,10,1,s);
        px(ctx,6,10+oy,'#3344AA',8,1,s);
        px(ctx,9,11+oy,'#5566CC',2,1,s);
      },
      ()=>{ // Ombreiras
        // Esquerda
        px(ctx,1,14+oy,'#888',4,3,s); px(ctx,1,14+oy,K,4,1,s); px(ctx,1,14+oy,K,1,3,s); px(ctx,4,14+oy,K,1,3,s);
        px(ctx,1,16+oy,K,4,1,s); px(ctx,2,15+oy,'#AAA',2,1,s);
        // Direita
        px(ctx,15,14+oy,'#888',4,3,s); px(ctx,15,14+oy,K,4,1,s); px(ctx,15,14+oy,K,1,3,s); px(ctx,18,14+oy,K,1,3,s);
        px(ctx,15,16+oy,K,4,1,s); px(ctx,16,15+oy,'#AAA',2,1,s);
      },
      ()=>{ // Colar de Ouro
        px(ctx,6,13+oy,'#DDAA00',8,1,s);
        px(ctx,5,14+oy,'#DDAA00',1,1,s); px(ctx,14,14+oy,'#DDAA00',1,1,s);
        px(ctx,9,15+oy,K,2,1,s); px(ctx,9,14+oy,'#CC8800',2,1,s);
        px(ctx,9,15+oy,'#FF3366',2,1,s);
        px(ctx,5,13+oy,'#FFDD00',1,1,s); px(ctx,14,13+oy,'#FFDD00',1,1,s);
      },
      ()=>{ // Asas
        // Asa esquerda
        px(ctx,1,14+oy,'#DDDDDD',3,8,s); px(ctx,2,15+oy,'#FFFFFF',1,6,s);
        px(ctx,1,14+oy,K,3,1,s); px(ctx,1,21+oy,K,3,1,s); px(ctx,1,14+oy,K,1,7,s);
        // Asa direita
        px(ctx,16,14+oy,'#DDDDDD',3,8,s); px(ctx,17,15+oy,'#FFFFFF',1,6,s);
        px(ctx,16,14+oy,K,3,1,s); px(ctx,16,21+oy,K,3,1,s); px(ctx,18,14+oy,K,1,7,s);
      },
      ()=>{ // Bracelete dourado
        // Pulso esquerdo
        px(ctx,2,20+oy,'#DDAA00',2,2,s); px(ctx,2,20+oy,K,2,1,s); px(ctx,2,21+oy,K,2,1,s);
        px(ctx,2,20+oy,K,1,2,s); px(ctx,3,20+oy,'#FFDD00',1,1,s);
        // Pulso direito
        px(ctx,16,20+oy,'#DDAA00',2,2,s); px(ctx,16,20+oy,K,2,1,s); px(ctx,16,21+oy,K,2,1,s);
        px(ctx,17,20+oy,K,1,2,s); px(ctx,16,20+oy,'#FFDD00',1,1,s);
      },
      ()=>{ // Pin Estrela (no peito)
        // Estrela de 5 pontas simplificada
        px(ctx,9,15+oy,'#FFDD00',2,3,s);
        px(ctx,8,16+oy,'#FFDD00',4,1,s);
        px(ctx,8,15+oy,K,1,1,s); px(ctx,11,15+oy,K,1,1,s);
        px(ctx,8,17+oy,K,1,1,s); px(ctx,11,17+oy,K,1,1,s);
        px(ctx,9,17+oy,'#CC8800',2,1,s);
        px(ctx,9,16+oy,'#FFF8AA',1,1,s);
      },
    ];
    (fns[opts.accessory % fns.length] || fns[0])();
  }

  function drawAccessoryBack(ctx, opts, oy, s) {
    const fns=[
      ()=>{},
      ()=>{ px(ctx,4,13+oy,'#CC2222',12,1,s); px(ctx,4,14+oy,'#BB1111',12,1,s); px(ctx,5,15+oy,'#AA1111',3,4,s); px(ctx,8,15+oy,'#AA1111',2,3,s); },
      ()=>{},
      ()=>{},
      ()=>{ // Capa costas
        px(ctx,3,15+oy,'#CC2222',14,6,s);
        px(ctx,4,15+oy,'#AA1111',12,5,s);
        px(ctx,3,20+oy,'#BB1111',14,1,s);
        px(ctx,3,15+oy,K,14,1,s);
      },
      ()=>{},
      ()=>{ // Máscara costas
        px(ctx,5,9+oy,'#223388',10,4,s);
        px(ctx,4,10+oy,K,1,2,s); px(ctx,15,10+oy,K,1,2,s);
        px(ctx,5,9+oy,K,10,1,s); px(ctx,5,13+oy,K,10,1,s);
      },
      ()=>{}, // Ombreiras (visíveis na frente)
      ()=>{}, // Colar (não visível atrás)
      ()=>{ // Asas costas — maiores e mais detalhadas
        px(ctx,1,12+oy,'#CCCCCC',3,10,s); px(ctx,2,13+oy,'#EEEEEE',1,8,s);
        px(ctx,1,12+oy,K,3,1,s); px(ctx,1,21+oy,K,3,1,s); px(ctx,1,12+oy,K,1,9,s);
        px(ctx,16,12+oy,'#CCCCCC',3,10,s); px(ctx,17,13+oy,'#EEEEEE',1,8,s);
        px(ctx,16,12+oy,K,3,1,s); px(ctx,16,21+oy,K,3,1,s); px(ctx,18,12+oy,K,1,9,s);
      },
      ()=>{}, // Bracelete (frontal)
      ()=>{}, // Pin (frontal)
    ];
    (fns[opts.accessory % fns.length] || fns[0])();
  }

  // ── BOMBA ACIMA DA CABEÇA ─────────────────────────────────────────────────

  function drawBombAbove(ctx, cx, cy, s) {
    const spark = Math.floor(Date.now()/300)%2===0 ? '#FFCC00' : '#FF4400';
    px(ctx,cx+1,cy-3,'#885533',1,3,s);
    px(ctx,cx+1,cy-3,spark,1,1,s);
    px(ctx,cx-2,cy-2,K,5,5,s);
    px(ctx,cx-1,cy-1,'#111',3,3,s);
    px(ctx,cx-1,cy-1,'#222',2,2,s);
    px(ctx,cx-1,cy-1,'#444',1,1,s);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  function render(canvas, opts, scale=4, direction='down', frame=0, carryBomb=false) {
    const W=20*scale, H=36*scale;
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(0,4*scale);
    switch(direction){
      case 'down':  drawFront(ctx,opts,frame,scale,carryBomb); break;
      case 'up':    drawBack (ctx,opts,frame,scale,carryBomb); break;
      case 'left':  drawSide (ctx,opts,frame,scale,carryBomb,false); break;
      case 'right': drawSide (ctx,opts,frame,scale,carryBomb,true);  break;
    }
    ctx.restore();
  }

  function renderMini(canvas,opts,scale=2,direction='down',frame=0){
    render(canvas,opts,scale,direction,frame,false);
  }

  function idleFrame(t) {
    return Math.floor(t/100)%30===0 ? 4 : 0;
  }

  function drawBombSprite(ctx,x,y,ts,timerFrac){
    const cx=x+ts/2, cy=y+ts/2, r=ts*0.32;
    const spark=Math.floor(Date.now()/300)%2===0?'#FFCC00':'#FF6600';
    // Pavio
    ctx.fillStyle='#885533'; ctx.fillRect(cx+r*0.5,cy-r*1.8,2,r*0.9);
    ctx.fillStyle=spark; ctx.fillRect(cx+r*0.5,cy-r*1.9,2,2);
    // Corpo
    const bx=cx-r, by=cy-r, bd=r*2;
    ctx.fillStyle=K; ctx.fillRect(bx-1,by-1,bd+2,bd+2);
    ctx.fillStyle='#111'; ctx.fillRect(bx,by,bd,bd);
    ctx.fillStyle='#222'; ctx.fillRect(bx+2,by+2,bd-4,bd-4);
    ctx.fillStyle='#444'; ctx.fillRect(bx+3,by+3,4,3);
    // Timer arc
    if(timerFrac>0){
      ctx.strokeStyle=timerFrac>0.5?'#22FF44':timerFrac>0.25?'#FFAA00':'#FF2200';
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*timerFrac); ctx.stroke();
    }
  }

  return {
    render, renderMini, idleFrame, drawBombSprite,
    SKIN_COLORS, BODY_COLORS, PANTS_COLORS, HAT_COLORS,
    HAT_NAMES, FACE_NAMES, ACCESSORY_NAMES,
    SKIN_NAMES, BODY_NAMES, PANTS_NAMES, HAT_COLOR_NAMES,
    defaultOpts: ()=>({ skin:0, hat:0, hatColor:0, body:0, pants:0, eyeStyle:0, accessory:0 }),
  };
})();
