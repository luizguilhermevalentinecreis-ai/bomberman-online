// ─── Tela de Customização de Personagem ──────────────────────────────────────

const CharacterScreen = (() => {
  let opts = null;
  let idleInterval = null;
  let idleFrame  = 0;
  let idleTick   = 0;
  let walkFrame  = 0;
  let walkInterval = null;
  let previewDir = 'down';

  const DIRECTIONS = [
    { id:'down',  label:'Frente' },
    { id:'up',    label:'Costas' },
    { id:'left',  label:'Esquerda' },
    { id:'right', label:'Direita' },
  ];

  function init() {
    const el = document.getElementById('screen-char');
    el.innerHTML = `
      <div class="char-layout">

        <!-- Preview -->
        <div class="char-preview-col">
          <div class="px-box char-preview-box px-box-accent">
            <div class="section-title" style="width:100%;text-align:center;">PRÉVIA</div>

            <!-- 4 direções juntas -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
              ${DIRECTIONS.map(d=>`
                <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                  <canvas id="char-dir-${d.id}" style="image-rendering:pixelated;border:1px solid #2a2a5a;background:#0a0a18;"></canvas>
                  <span style="font-size:6px;color:#8888bb;">${d.label}</span>
                </div>
              `).join('')}
            </div>

            <!-- Preview grande animado -->
            <canvas id="char-canvas-preview" style="image-rendering:pixelated;border:2px solid #ff5533;background:#0a0a18;"></canvas>
            <div style="display:flex;gap:6px;margin-top:6px;">
              ${DIRECTIONS.map(d=>`
                <button class="btn btn-sm dir-btn ${d.id==='down'?'btn-primary':'btn-secondary'}"
                  data-dir="${d.id}" style="font-size:6px;padding:4px 6px;">${d.label}</button>
              `).join('')}
            </div>
            <div id="char-anim-label" style="font-size:6px;color:#8888bb;margin-top:4px;">🚶 ANDANDO</div>
            <div class="char-name-display" id="char-name-display">—</div>
          </div>
          <button class="btn btn-gold btn-full" id="char-save">✓ SALVAR E VOLTAR</button>
          <button class="btn btn-secondary btn-full" id="char-random">⚄ ALEATÓRIO</button>
        </div>

        <!-- Opções -->
        <div class="char-options-col">

          <div class="char-section">
            <div class="section-title">APELIDO</div>
            <input class="px-input" id="char-name-input" maxlength="18" placeholder="Seu nome..." />
          </div>

          <div class="char-section">
            <div class="section-title">COR DA TELA</div>
            <div class="options-grid" id="opts-skin"></div>
          </div>

          <div class="char-section">
            <div class="section-title">EXPRESSÃO</div>
            <div class="options-grid" id="opts-face"></div>
          </div>

          <div class="char-section">
            <div class="section-title">CHAPÉU / CABELO</div>
            <div class="options-grid" id="opts-hat"></div>
          </div>

          <div class="char-section">
            <div class="section-title">COR DO CHAPÉU</div>
            <div class="options-grid" id="opts-hatcolor"></div>
          </div>

          <div class="char-section">
            <div class="section-title">COR DA CAMISA</div>
            <div class="options-grid" id="opts-body"></div>
          </div>

          <div class="char-section">
            <div class="section-title">COR DA CALÇA</div>
            <div class="options-grid" id="opts-pants"></div>
          </div>

          <div class="char-section">
            <div class="section-title">ACESSÓRIO</div>
            <div class="options-grid" id="opts-acc"></div>
          </div>

        </div>
      </div>
    `;

    opts = { ...App.state.character };
    document.getElementById('char-name-input').value = App.state.playerName;

    document.getElementById('char-name-input').oninput = redrawName;
    document.getElementById('char-save').onclick   = save;
    document.getElementById('char-random').onclick = randomize;

    // Botões de direção
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.onclick = () => {
        previewDir = btn.dataset.dir;
        document.querySelectorAll('.dir-btn').forEach(b => {
          b.className = `btn btn-sm dir-btn ${b.dataset.dir === previewDir ? 'btn-primary' : 'btn-secondary'}`;
          b.style.fontSize='6px'; b.style.padding='4px 6px';
        });
      };
    });

    buildAllOpts();
    startAnimations();
    redrawAll();
    redrawName();
  }

  // ── Animações ──────────────────────────────────────────────────────────────

  function startAnimations() {
    stopAnimations();

    // Walk animation no preview grande
    walkInterval = setInterval(() => {
      walkFrame = (walkFrame + 1) % 4;
      redrawPreviewLarge();
    }, 120);

    // Idle lento nos 4 pequenos
    idleInterval = setInterval(() => {
      idleTick++;
      // pisca a cada ~3s
      idleFrame = (idleTick % 25 === 0) ? 1 : 0;
      redrawSmallPreviews();
    }, 120);
  }

  function stopAnimations() {
    if (walkInterval) clearInterval(walkInterval);
    if (idleInterval) clearInterval(idleInterval);
  }

  function redrawAll() {
    redrawSmallPreviews();
    redrawPreviewLarge();
  }

  function redrawSmallPreviews() {
    DIRECTIONS.forEach(d => {
      const canvas = document.getElementById(`char-dir-${d.id}`);
      if (!canvas) return;
      CharRenderer.render(canvas, opts, 2, d.id, idleFrame, false);
    });
  }

  function redrawPreviewLarge() {
    const canvas = document.getElementById('char-canvas-preview');
    if (!canvas) return;
    CharRenderer.render(canvas, opts, 5, previewDir, walkFrame, false);
    document.getElementById('char-anim-label').textContent =
      walkFrame > 0 ? '🚶 ANDANDO' : '🧍 PARADO';
  }

  function redrawName() {
    const el    = document.getElementById('char-name-display');
    const input = document.getElementById('char-name-input');
    if (el && input) el.textContent = input.value || '—';
  }

  // ── Opções ────────────────────────────────────────────────────────────────

  function buildAllOpts() {
    buildColorOpts('opts-skin',     CharRenderer.SKIN_COLORS,   'skin');
    buildCanvasOpts('opts-face',    CharRenderer.FACE_NAMES,    'eyeStyle',  buildFacePreview);
    buildCanvasOpts('opts-hat',     CharRenderer.HAT_NAMES,     'hat',       buildHatPreview);
    buildColorOpts('opts-hatcolor', CharRenderer.HAT_COLORS,    'hatColor');
    buildColorOpts('opts-body',     CharRenderer.BODY_COLORS,   'body');
    buildColorOpts('opts-pants',    CharRenderer.PANTS_COLORS,  'pants');
    buildCanvasOpts('opts-acc',     CharRenderer.ACCESSORY_NAMES,'accessory', buildAccPreview);
  }

  function buildColorOpts(containerId, palette, key) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    palette.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = `opt-btn${i === opts[key] ? ' active' : ''}`;
      btn.title = c.name || '';
      btn.innerHTML = `<div class="color-swatch"><div class="color-dot" style="background:${c.main};"></div></div>`;
      btn.onclick = () => {
        opts[key] = i;
        container.querySelectorAll('.opt-btn').forEach((b,j) => b.classList.toggle('active', j===i));
        redrawAll();
      };
      container.appendChild(btn);
    });
  }

  function buildCanvasOpts(containerId, names, key, previewFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    names.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = `opt-btn${i === opts[key] ? ' active' : ''}`;

      const c = document.createElement('canvas');
      c.style.imageRendering = 'pixelated';
      previewFn(c, i, opts);

      const span = document.createElement('span');
      span.textContent = name;

      btn.appendChild(c);
      btn.appendChild(span);
      btn.onclick = () => {
        opts[key] = i;
        container.querySelectorAll('.opt-btn').forEach((b,j) => b.classList.toggle('active', j===i));
        // Atualiza preview do botão com novo opts
        container.querySelectorAll('.opt-btn').forEach((b,j) => {
          const bc = b.querySelector('canvas');
          if (bc) previewFn(bc, j, opts);
        });
        redrawAll();
      };
      container.appendChild(btn);
    });
  }

  function buildFacePreview(canvas, idx, currentOpts) {
    const o = { ...currentOpts, eyeStyle: idx };
    CharRenderer.render(canvas, o, 2, 'down', 0, false);
  }

  function buildHatPreview(canvas, idx, currentOpts) {
    const o = { ...currentOpts, hat: idx };
    CharRenderer.render(canvas, o, 2, 'down', 0, false);
  }

  function buildAccPreview(canvas, idx, currentOpts) {
    const o = { ...currentOpts, accessory: idx };
    CharRenderer.render(canvas, o, 2, 'down', 0, false);
  }

  // ── Salvar / Aleatório ────────────────────────────────────────────────────

  function save() {
    const name = document.getElementById('char-name-input').value.trim();
    if (name) App.state.playerName = name;
    App.state.character = { ...opts };
    App.saveLocal();
    if (GameSocket.id()) {
      GameSocket.emit('player:updateCharacter', { character: opts });
    }
    stopAnimations();
    App.toast('Personagem salvo!', 'success');
    App.show('menu');
  }

  function randomize() {
    const rand = max => Math.floor(Math.random() * max);
    opts = {
      skin:      rand(CharRenderer.SKIN_COLORS.length),
      hat:       rand(CharRenderer.HAT_NAMES.length),
      hatColor:  rand(CharRenderer.HAT_COLORS.length),
      body:      rand(CharRenderer.BODY_COLORS.length),
      pants:     rand(CharRenderer.PANTS_COLORS.length),
      eyeStyle:  rand(CharRenderer.FACE_NAMES.length),
      accessory: rand(CharRenderer.ACCESSORY_NAMES.length),
    };
    buildAllOpts();
    redrawAll();
  }

  function refresh() {
    opts = { ...App.state.character };
    const input = document.getElementById('char-name-input');
    if (input) input.value = App.state.playerName;
    walkFrame = 0; idleFrame = 0;
    buildAllOpts();
    startAnimations();
    redrawAll();
    redrawName();
  }

  return { init, refresh };
})();
