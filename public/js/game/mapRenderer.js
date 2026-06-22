// ─── Renderizador de Mapas — Pixel Art Detalhado ─────────────────────────────

const MapRenderer = (() => {

  const T = { FLOOR:0, WALL:1, SOFT:2, SPECIAL:4 };

  const THEMES = {
    classic: {
      sky:'#2d5a1b', floor1:'#4a8c3a', floor2:'#3e7830',
      wallTop:'#8b6914', wall:'#6b4e14', wallDark:'#3d2a08',
      softTop:'#c8741e', soft:'#a05a14', softDark:'#6b3a08',
      special:null,
      floorDetail:'#3a6828', edgeLight:'rgba(255,255,200,0.12)', edgeDark:'rgba(0,0,0,0.25)',
    },
    ice: {
      sky:'#4a8ea8', floor1:'#a8d8f0', floor2:'#90c4e0',
      wallTop:'#5090c0', wall:'#2a6090', wallDark:'#0e3055',
      softTop:'#80c0e8', soft:'#5090c0', softDark:'#2a5a88',
      special:'#c8f0ff',
      floorDetail:'#78b8e0', edgeLight:'rgba(200,240,255,0.3)', edgeDark:'rgba(0,30,60,0.25)',
    },
    volcano: {
      sky:'#2a0800', floor1:'#3a1800', floor2:'#2a1000',
      wallTop:'#333', wall:'#1a1a1a', wallDark:'#0a0a0a',
      softTop:'#7a3800', soft:'#5a2800', softDark:'#2a1000',
      special:'#ff4400',
      floorDetail:'#2a1000', edgeLight:'rgba(255,100,0,0.1)', edgeDark:'rgba(0,0,0,0.4)',
    },
    space: {
      sky:'#04040e', floor1:'#14142a', floor2:'#0e0e20',
      wallTop:'#3a3a6a', wall:'#22224a', wallDark:'#0e0e28',
      softTop:'#3a50a0', soft:'#283880', softDark:'#141c50',
      special:'#00eeff',
      floorDetail:'#0e0e1e', edgeLight:'rgba(0,200,255,0.12)', edgeDark:'rgba(0,0,0,0.4)',
    },
    forest: {
      sky:'#0e2208', floor1:'#2e5018', floor2:'#243e12',
      wallTop:'#3a6820', wall:'#1e3a0e', wallDark:'#0e1e06',
      softTop:'#5a7a28', soft:'#3a5818', softDark:'#1e2e0a',
      special:'#8b6914',
      floorDetail:'#243e12', edgeLight:'rgba(100,200,50,0.1)', edgeDark:'rgba(0,20,0,0.3)',
    },
    city: {
      sky:'#1a1a1a', floor1:'#3a3a3a', floor2:'#303030',
      wallTop:'#555', wall:'#2a2a2a', wallDark:'#111',
      softTop:'#666', soft:'#444', softDark:'#222',
      special:'#ff9900',
      floorDetail:'#252525', edgeLight:'rgba(255,255,255,0.07)', edgeDark:'rgba(0,0,0,0.35)',
    },
    desert: {
      sky:'#c87820', floor1:'#d4a054', floor2:'#c89040',
      wallTop:'#b87030', wall:'#8a4818', wallDark:'#4a2008',
      softTop:'#e8c080', soft:'#c8a060', softDark:'#886030',
      special:'#ff6600',
      floorDetail:'#b88838', edgeLight:'rgba(255,220,140,0.18)', edgeDark:'rgba(80,30,0,0.3)',
    },
    ocean: {
      sky:'#0a2840', floor1:'#0e3a60', floor2:'#0a3055',
      wallTop:'#1a5a88', wall:'#0e3a60', wallDark:'#061828',
      softTop:'#2070a8', soft:'#185888', softDark:'#0a2840',
      special:'#00ccff',
      floorDetail:'#0a3050', edgeLight:'rgba(0,180,255,0.15)', edgeDark:'rgba(0,10,30,0.35)',
    },
  };

  let animTick = 0;
  let lastAnim = 0;

  function tick(now) {
    if (now - lastAnim > 100) { animTick++; lastAnim = now; }
  }

  function getTheme(id) { return THEMES[id] || THEMES.classic; }

  // ── CHÃO detalhado ────────────────────────────────────────────────────────

  function drawFloor(ctx, x, y, ts, th, alt, now) {
    // Base
    ctx.fillStyle = alt ? th.floor2 : th.floor1;
    ctx.fillRect(x, y, ts, ts);

    // Textura por tema
    switch(th) {
      case THEMES.classic: drawFloorClassic(ctx, x, y, ts, th, alt); break;
      case THEMES.ice:     drawFloorIce(ctx, x, y, ts, th, now); break;
      case THEMES.volcano: drawFloorVolcano(ctx, x, y, ts, th, now); break;
      case THEMES.space:   drawFloorSpace(ctx, x, y, ts, th); break;
      case THEMES.forest:  drawFloorForest(ctx, x, y, ts, th, alt); break;
      case THEMES.city:    drawFloorCity(ctx, x, y, ts, th, alt); break;
      case THEMES.desert:  drawFloorDesert(ctx, x, y, ts, th, alt, now); break;
      case THEMES.ocean:   drawFloorOcean(ctx, x, y, ts, th, now); break;
    }

    // Borda suave
    ctx.fillStyle = th.edgeDark;
    ctx.fillRect(x, y+ts-1, ts, 1);
    ctx.fillRect(x+ts-1, y, 1, ts);
    ctx.fillStyle = th.edgeLight;
    ctx.fillRect(x, y, ts, 1);
    ctx.fillRect(x, y, 1, ts);
  }

  function drawFloorClassic(ctx, x, y, ts, th, alt) {
    // Grama pontilhada
    ctx.fillStyle = th.floorDetail;
    const seed = (x/ts + y/ts*17) | 0;
    const pseudo = [0.2,0.7,0.4,0.9,0.15,0.6,0.35,0.8];
    const gx = x + (pseudo[seed%8]*ts*0.7)|0;
    const gy = y + (pseudo[(seed+3)%8]*ts*0.7)|0;
    ctx.fillRect(gx, gy, 2, 3);
    ctx.fillRect(gx+1, gy-1, 1, 2);
    if (!alt) {
      const gx2 = x + (pseudo[(seed+5)%8]*ts*0.5)|0;
      const gy2 = y + (pseudo[(seed+7)%8]*ts*0.5)|0;
      ctx.fillRect(gx2, gy2, 2, 3);
    }
  }

  function drawFloorIce(ctx, x, y, ts, th, now) {
    // Cristal reflexivo
    const t = (now/700)%1;
    ctx.fillStyle = 'rgba(220,240,255,0.18)';
    const rx = x + ts*0.15, ry = y + ts*0.1;
    ctx.fillRect(rx, ry, ts*0.35, ts*0.12);
    ctx.fillRect(rx+ts*0.1, ry-ts*0.05, ts*0.1, ts*0.08);
    // Linha de cristal diagonal
    ctx.strokeStyle = 'rgba(180,220,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x+ts*0.05, y+ts*0.5);
    ctx.lineTo(x+ts*0.5, y+ts*0.05);
    ctx.stroke();
  }

  function drawFloorVolcano(ctx, x, y, ts, th, now) {
    // Linhas de lava fria (rachaduras)
    ctx.strokeStyle = 'rgba(180,40,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x+ts*0.2, y+ts*0.8);
    ctx.lineTo(x+ts*0.6, y+ts*0.3);
    ctx.lineTo(x+ts*0.9, y+ts*0.6);
    ctx.stroke();
    // Brilho fraco de calor
    const t = (now/500)%1;
    ctx.fillStyle = `rgba(255,80,0,${0.03+0.03*Math.sin(t*Math.PI*2)})`;
    ctx.fillRect(x, y, ts, ts);
  }

  function drawFloorSpace(ctx, x, y, ts, th) {
    // Grade metálica
    ctx.strokeStyle = 'rgba(0,150,200,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x+ts*0.5, y); ctx.lineTo(x+ts*0.5, y+ts);
    ctx.moveTo(x, y+ts*0.5); ctx.lineTo(x+ts, y+ts*0.5);
    ctx.stroke();
    // Parafusos nos cantos
    ctx.fillStyle = 'rgba(80,120,180,0.4)';
    [[0.1,0.1],[0.9,0.1],[0.1,0.9],[0.9,0.9]].forEach(([fx,fy])=>{
      ctx.beginPath();
      ctx.arc(x+ts*fx, y+ts*fy, 2, 0, Math.PI*2);
      ctx.fill();
    });
  }

  function drawFloorForest(ctx, x, y, ts, th, alt) {
    // Raízes e folhas
    ctx.fillStyle = 'rgba(100,60,20,0.2)';
    const seed = ((x/ts)|0)*7 + ((y/ts)|0)*13;
    if (seed%3===0) {
      ctx.beginPath();
      ctx.moveTo(x+ts*0.2, y+ts*0.5);
      ctx.quadraticCurveTo(x+ts*0.5, y+ts*0.3, x+ts*0.8, y+ts*0.6);
      ctx.lineWidth = 1.5; ctx.strokeStyle='rgba(80,40,10,0.3)'; ctx.stroke();
    }
    if (alt && seed%4===0) {
      ctx.fillStyle = 'rgba(40,120,20,0.3)';
      ctx.beginPath();
      ctx.arc(x+ts*0.6, y+ts*0.4, ts*0.12, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawFloorCity(ctx, x, y, ts, th, alt) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    if (!alt) {
      ctx.beginPath();
      ctx.moveTo(x, y+ts*0.5); ctx.lineTo(x+ts, y+ts*0.5);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(100,100,100,0.15)';
    ctx.fillRect(x+ts*0.3, y+ts*0.2, ts*0.4, 1);
  }

  function drawFloorDesert(ctx, x, y, ts, th, alt, now) {
    // Ondulações de areia
    const seed = ((x/ts)|0)*5 + ((y/ts)|0)*11;
    ctx.fillStyle = 'rgba(180,110,30,0.18)';
    ctx.beginPath();
    ctx.ellipse(x+ts*(0.3+(seed%3)*0.2), y+ts*(0.4+(seed%2)*0.2), ts*0.28, ts*0.08, 0, 0, Math.PI*2);
    ctx.fill();
    if (!alt) {
      // Pedrinhas
      ctx.fillStyle = 'rgba(150,90,20,0.3)';
      ctx.beginPath(); ctx.arc(x+ts*0.7, y+ts*0.6, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+ts*0.3, y+ts*0.3, 1.5, 0, Math.PI*2); ctx.fill();
    }
    // Calor oscilante
    const t = (now/600)%1;
    ctx.fillStyle = `rgba(255,120,0,${0.03+0.02*Math.sin(t*Math.PI*2)})`;
    ctx.fillRect(x, y, ts, ts);
  }

  function drawFloorOcean(ctx, x, y, ts, th, now) {
    // Ondas animadas
    const t = (now/800)%1;
    const seed = ((x/ts)|0)*3 + ((y/ts)|0)*7;
    ctx.strokeStyle = `rgba(0,160,220,${0.3+0.15*Math.sin(t*Math.PI*2+seed)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y+ts*(0.4+0.1*Math.sin(t*Math.PI*2+seed)));
    ctx.quadraticCurveTo(x+ts*0.5, y+ts*(0.35+0.12*Math.sin(t*Math.PI*2+seed+1)), x+ts, y+ts*(0.4+0.1*Math.sin(t*Math.PI*2+seed+2)));
    ctx.stroke();
    // Brilho de bolhas
    ctx.fillStyle = `rgba(120,220,255,${0.15+0.1*Math.sin(t*Math.PI*2+seed*2)})`;
    ctx.beginPath(); ctx.arc(x+ts*(0.25+(seed%4)*0.15), y+ts*(0.6+(seed%3)*0.1), 2, 0, Math.PI*2); ctx.fill();
  }

  // ── PAREDE dura (3D) ──────────────────────────────────────────────────────

  function drawWall(ctx, x, y, ts, th) {
    const TOP = ts * 0.22;
    const SIDE = ts * 0.1;

    // Face frontal
    ctx.fillStyle = th.wall;
    ctx.fillRect(x, y+TOP, ts, ts-TOP);

    // Topo
    ctx.fillStyle = th.wallTop;
    ctx.fillRect(x, y, ts, TOP);

    // Lateral direita (sombra)
    ctx.fillStyle = th.wallDark;
    ctx.fillRect(x+ts-SIDE, y+TOP, SIDE, ts-TOP);

    // Borda do topo
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, ts, 1);
    ctx.fillRect(x, y, 1, TOP);

    // Detalhes por tema
    drawWallDetail(ctx, x, y, ts, th, TOP, SIDE);

    // Borda exterior
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, ts-1, ts-1);
  }

  function drawWallDetail(ctx, x, y, ts, th, TOP, SIDE) {
    if (th === THEMES.classic || th === THEMES.city) {
      // Tijolos
      const bh = (ts-TOP)/2;
      ctx.fillStyle = th.wallDark;
      ctx.fillRect(x, y+TOP+bh, ts, 1);
      ctx.fillRect(x+ts*0.5, y+TOP, 1, bh);
      ctx.fillRect(x+ts*0.25, y+TOP+bh, 1, bh);
      ctx.fillRect(x+ts*0.75, y+TOP+bh, 1, bh);
    } else if (th === THEMES.ice) {
      // Cristal
      ctx.fillStyle = 'rgba(150,220,255,0.25)';
      ctx.fillRect(x+ts*0.2, y+TOP+2, ts*0.15, ts*0.4);
      ctx.fillRect(x+ts*0.6, y+TOP+ts*0.15, ts*0.12, ts*0.3);
    } else if (th === THEMES.volcano) {
      // Rachaduras com brilho
      ctx.strokeStyle = 'rgba(255,80,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x+ts*0.3, y+TOP); ctx.lineTo(x+ts*0.5, y+ts*0.6); ctx.lineTo(x+ts*0.4, y+ts);
      ctx.stroke();
    } else if (th === THEMES.space) {
      // Painéis com luz
      ctx.fillStyle = 'rgba(0,200,255,0.2)';
      ctx.fillRect(x+3, y+TOP+3, ts-6-SIDE, 4);
      ctx.fillRect(x+3, y+ts-8, ts-6-SIDE, 4);
    } else if (th === THEMES.forest) {
      ctx.strokeStyle = 'rgba(60,30,5,0.35)';
      ctx.lineWidth = 1;
      for (let i=0; i<3; i++) {
        ctx.beginPath();
        ctx.moveTo(x+ts*0.2+i*ts*0.25, y+TOP);
        ctx.quadraticCurveTo(x+ts*0.1+i*ts*0.25, y+ts*0.5, x+ts*0.25+i*ts*0.25, y+ts);
        ctx.stroke();
      }
    } else if (th === THEMES.desert) {
      // Arenito com camadas
      ctx.fillStyle = 'rgba(120,60,10,0.4)';
      const bh = (ts-TOP)/3;
      for (let i=0;i<3;i++) ctx.fillRect(x, y+TOP+bh*i, ts, 1);
      ctx.fillStyle = 'rgba(200,150,60,0.25)';
      ctx.fillRect(x+2, y+TOP+2, ts-SIDE-4, ts-TOP-6);
    } else if (th === THEMES.ocean) {
      // Coral/pedra submarina
      ctx.fillStyle = 'rgba(0,120,180,0.35)';
      ctx.fillRect(x+3, y+TOP+3, ts-SIDE-6, ts-TOP-6);
      ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+ts*0.3,y+TOP+4); ctx.quadraticCurveTo(x+ts*0.5,y+ts*0.5,x+ts*0.7,y+TOP+4); ctx.stroke();
    }
  }

  // ── BLOCO QUEBRÁVEL (caixote) ─────────────────────────────────────────────

  function drawSoft(ctx, x, y, ts, th) {
    const TOP  = ts * 0.2;
    const SIDE = ts * 0.1;

    // Face frontal
    ctx.fillStyle = th.soft;
    ctx.fillRect(x, y+TOP, ts, ts-TOP);

    // Topo claro
    ctx.fillStyle = th.softTop;
    ctx.fillRect(x, y, ts, TOP);

    // Sombra direita
    ctx.fillStyle = th.softDark;
    ctx.fillRect(x+ts-SIDE, y+TOP, SIDE, ts-TOP);

    // Detalhe: X de caixote ou padrão temático
    drawSoftDetail(ctx, x, y, ts, th, TOP, SIDE);

    // Highlight topo
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, ts, 1);

    // Borda
    ctx.strokeStyle = th.softDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x+0.5, y+0.5, ts-1, ts-1);
  }

  function drawSoftDetail(ctx, x, y, ts, th, TOP, SIDE) {
    const inner = ts - SIDE - 2;
    const iy = y + TOP + 2;

    if (th === THEMES.classic || th === THEMES.city) {
      // Caixote de madeira com X
      ctx.strokeStyle = th.softDark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x+2, iy); ctx.lineTo(x+inner, iy+ts-TOP-4);
      ctx.moveTo(x+inner, iy); ctx.lineTo(x+2, iy+ts-TOP-4);
      ctx.stroke();
      // Bordas da caixa
      ctx.fillStyle = th.softDark;
      ctx.fillRect(x+2, iy, inner-2, 2);
      ctx.fillRect(x+2, iy+ts-TOP-4, inner-2, 2);
      ctx.fillRect(x+2, iy, 2, ts-TOP-4);
    } else if (th === THEMES.ice) {
      // Bloco de gelo com fissura
      ctx.fillStyle = 'rgba(150,220,255,0.3)';
      ctx.fillRect(x+4, iy+2, ts-SIDE-8, ts-TOP-6);
      ctx.strokeStyle = 'rgba(200,240,255,0.6)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+ts*0.4,iy); ctx.lineTo(x+ts*0.3,iy+ts*0.35); ctx.lineTo(x+ts*0.5,iy+ts*0.6); ctx.stroke();
    } else if (th === THEMES.volcano) {
      // Rocha vulcânica
      ctx.fillStyle = 'rgba(255,80,0,0.2)';
      ctx.fillRect(x+4, iy+2, ts-SIDE-8, ts-TOP-6);
      ctx.strokeStyle='rgba(255,60,0,0.5)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+ts*0.3,iy+ts*0.1); ctx.lineTo(x+ts*0.5,iy+ts*0.5); ctx.lineTo(x+ts*0.2,iy+ts*0.75); ctx.stroke();
    } else if (th === THEMES.space) {
      // Container metálico
      ctx.fillStyle = 'rgba(0,180,255,0.2)';
      ctx.fillRect(x+4, iy+2, ts-SIDE-8, 6);
      ctx.fillRect(x+4, iy+ts-TOP-10, ts-SIDE-8, 6);
      ctx.strokeStyle='rgba(0,200,255,0.5)'; ctx.lineWidth=1;
      ctx.strokeRect(x+4, iy+2, ts-SIDE-8, ts-TOP-6);
    } else if (th === THEMES.forest) {
      ctx.fillStyle = 'rgba(60,30,5,0.4)';
      ctx.fillRect(x+ts*0.35, iy, ts*0.3, ts-TOP-4);
      ctx.strokeStyle='rgba(40,20,0,0.5)'; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x+ts*0.35,iy+4); ctx.quadraticCurveTo(x+ts*0.5,iy+ts*0.3,x+ts*0.65,iy+4); ctx.stroke();
    } else if (th === THEMES.desert) {
      // Caixa de arenito
      ctx.fillStyle = 'rgba(160,100,30,0.35)';
      ctx.fillRect(x+4, iy+2, inner-2, ts-TOP-6);
      ctx.strokeStyle='rgba(100,60,10,0.6)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x+2,iy); ctx.lineTo(x+inner,iy+ts-TOP-4); ctx.moveTo(x+inner,iy); ctx.lineTo(x+2,iy+ts-TOP-4); ctx.stroke();
    } else if (th === THEMES.ocean) {
      // Baú submerso
      ctx.fillStyle = 'rgba(0,100,160,0.4)';
      ctx.fillRect(x+4, iy+2, inner-2, ts-TOP-6);
      ctx.fillStyle='rgba(0,200,255,0.3)'; ctx.fillRect(x+4,iy+2,inner-2,4);
      ctx.strokeStyle='rgba(0,160,220,0.6)'; ctx.lineWidth=1;
      ctx.strokeRect(x+4, iy+2, inner-2, ts-TOP-6);
      ctx.beginPath(); ctx.moveTo(x+4,iy+2+(ts-TOP-6)/2); ctx.lineTo(x+4+inner-2,iy+2+(ts-TOP-6)/2); ctx.stroke();
    }
  }

  // ── ESPECIAL por tema ─────────────────────────────────────────────────────

  function drawSpecial(ctx, x, y, ts, th, now) {
    const t = (now/400)%1;
    if (th === THEMES.volcano) {
      // Lava animada
      const g = ctx.createRadialGradient(x+ts/2,y+ts/2,0,x+ts/2,y+ts/2,ts*0.7);
      g.addColorStop(0,'#ff9900'); g.addColorStop(0.5,'#ff4400'); g.addColorStop(1,'#aa1100');
      ctx.fillStyle=g; ctx.fillRect(x,y,ts,ts);
      ctx.fillStyle='#ffcc00';
      for(let i=0;i<4;i++){
        const bx=x+ts*(0.15+((Math.sin(t*Math.PI*2+i*1.6)+1)/2)*0.7);
        const by=y+ts*(0.2+((Math.cos(t*Math.PI*2+i*1.3)+1)/2)*0.6);
        const r=ts*(0.04+0.03*Math.sin(t*Math.PI*2+i));
        ctx.beginPath(); ctx.arc(bx,by,r,0,Math.PI*2); ctx.fill();
      }
      ctx.strokeStyle='#cc2200'; ctx.lineWidth=2; ctx.strokeRect(x,y,ts,ts);
    } else if (th === THEMES.ice) {
      // Gelo extra-escorregadio
      ctx.fillStyle='#c0eaff'; ctx.fillRect(x,y,ts,ts);
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(x+ts*0.1,y+ts*0.1,ts*0.35,ts*0.12);
      const a=t*Math.PI*2;
      for(let i=0;i<6;i++){
        const ang=i*Math.PI/3+a*0.3;
        ctx.strokeStyle='rgba(160,210,255,0.5)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x+ts/2,y+ts/2); ctx.lineTo(x+ts/2+Math.cos(ang)*ts*0.42,y+ts/2+Math.sin(ang)*ts*0.42); ctx.stroke();
      }
    } else if (th === THEMES.space) {
      // Portal / teletransporte
      const pulse=0.6+0.4*Math.sin(t*Math.PI*2);
      ctx.fillStyle=`rgba(0,10,30,${0.9})`; ctx.fillRect(x,y,ts,ts);
      ctx.strokeStyle=`rgba(0,200,255,${pulse})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2,ts*0.35,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=`rgba(0,100,255,${pulse*0.5})`; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2,ts*0.22,0,Math.PI*2); ctx.stroke();
    } else if (th === THEMES.desert) {
      // Poça de areia movediça
      const t2=(now/600)%1;
      const g2=ctx.createRadialGradient(x+ts/2,y+ts/2,0,x+ts/2,y+ts/2,ts*0.5);
      g2.addColorStop(0,'#cc7700'); g2.addColorStop(0.6,'#994400'); g2.addColorStop(1,'#662200');
      ctx.fillStyle=g2; ctx.fillRect(x,y,ts,ts);
      ctx.fillStyle=`rgba(200,120,0,${0.4+0.3*Math.sin(t2*Math.PI*2)})`;
      ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2,ts*(0.25+0.05*Math.sin(t2*Math.PI*2)),0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff8800'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2,ts*0.38,0,Math.PI*2); ctx.stroke();
    } else if (th === THEMES.ocean) {
      // Redemunho / corrente
      const t3=(now/500)%1;
      ctx.fillStyle='#003366'; ctx.fillRect(x,y,ts,ts);
      ctx.strokeStyle=`rgba(0,180,255,${0.5+0.3*Math.sin(t3*Math.PI*2)})`;
      ctx.lineWidth=2;
      for(let r=0.15;r<0.5;r+=0.12){
        ctx.beginPath();
        ctx.arc(x+ts/2,y+ts/2,ts*r,t3*Math.PI*2,t3*Math.PI*2+Math.PI*1.5);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle=th.special||'#ff8800'; ctx.fillRect(x,y,ts,ts);
    }
  }

  // ── POWER-UP ──────────────────────────────────────────────────────────────

  const PU_COLOR = {
    extra_bomb:'#ff5533', bigger_range:'#ff9900', speed:'#33ff99',
    shield:'#4488ff', teleport:'#cc44ff', ghost:'#aaaaff', mega_range:'#ff4444',
  };
  const PU_ICON = {
    extra_bomb:'💣', bigger_range:'💥', speed:'⚡',
    shield:'🛡', teleport:'🌀', ghost:'👻', mega_range:'🔥',
  };

  function drawPowerup(ctx, x, y, ts, type, now) {
    const t = (now/500)%1;
    const bob = Math.sin(t*Math.PI*2)*3;
    const c = PU_COLOR[type]||'#fff';
    ctx.fillStyle=c+'22'; ctx.fillRect(x+4,y+4+bob,ts-8,ts-8);
    ctx.strokeStyle=c; ctx.lineWidth=2; ctx.strokeRect(x+4,y+4+bob,ts-8,ts-8);
    ctx.font=`${ts*0.44}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(PU_ICON[type]||'?', x+ts/2, y+ts/2+bob);
  }

  // ── EXPLOSÃO ──────────────────────────────────────────────────────────────

  function drawExplosion(ctx, x, y, ts, isCenter, now) {
    const t = ((now%700)/700);
    const sz = t<0.4?t/0.4:1-(t-0.4)/0.6;
    const al = 1-t*0.5;
    if (isCenter) {
      const g=ctx.createRadialGradient(x+ts/2,y+ts/2,0,x+ts/2,y+ts/2,ts*0.6*sz);
      g.addColorStop(0,`rgba(255,255,200,${al})`);
      g.addColorStop(0.3,`rgba(255,200,0,${al})`);
      g.addColorStop(0.7,`rgba(255,80,0,${al*0.7})`);
      g.addColorStop(1,'rgba(200,0,0,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x+ts/2,y+ts/2,ts*0.65*sz,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle=`rgba(255,150,0,${al*0.85})`;
      ctx.fillRect(x+ts*0.08,y+ts*0.08,ts*0.84,ts*0.84);
      ctx.fillStyle=`rgba(255,230,80,${al*0.5})`;
      ctx.fillRect(x+ts*0.22,y+ts*0.22,ts*0.56,ts*0.56);
    }
  }

  // ── Renderização completa ─────────────────────────────────────────────────

  function renderMap(ctx, state, ts, now) {
    if (!state?.map) return;
    const th = getTheme(state.map.theme);
    const tiles = state.tiles || state.map.tiles;

    const GRID_W = (state.tiles?.[0]?.length) || 21;
    const GRID_H = (state.tiles?.length)       || 17;

    ctx.fillStyle = th.sky;
    ctx.fillRect(0, 0, GRID_W*ts, GRID_H*ts);

    for (let ty=0; ty<GRID_H; ty++) {
      for (let tx=0; tx<GRID_W; tx++) {
        const x=tx*ts, y=ty*ts;
        const tile = tiles[ty]?.[tx] ?? T.WALL;
        const alt  = (tx+ty)%2===1;

        // Sempre desenha chão por baixo
        if (tile !== T.SPECIAL) drawFloor(ctx,x,y,ts,th,alt,now);

        switch(tile) {
          case T.WALL:    drawWall(ctx,x,y,ts,th); break;
          case T.SOFT:    drawSoft(ctx,x,y,ts,th); break;
          case T.SPECIAL: drawSpecial(ctx,x,y,ts,th,now); break;
        }
      }
    }

    // Powerups
    if (state.powerups) {
      state.powerups.forEach(pu=>{
        drawFloor(ctx,pu.tx*ts,pu.ty*ts,ts,th,(pu.tx+pu.ty)%2===1,now);
        drawPowerup(ctx,pu.tx*ts,pu.ty*ts,ts,pu.type,now);
      });
    }

    // Explosões
    if (state.explosions?.length) {
      const expSet=new Set(state.explosions.map(e=>`${e.tx},${e.ty}`));
      expSet.forEach(key=>{
        const [tx2,ty2]=key.split(',').map(Number);
        const neighbors=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>expSet.has(`${tx2+dx},${ty2+dy}`));
        drawExplosion(ctx,tx2*ts,ty2*ts,ts,!neighbors,now);
      });
    }
  }

  return { renderMap, getTheme, tick, THEMES };
})();
