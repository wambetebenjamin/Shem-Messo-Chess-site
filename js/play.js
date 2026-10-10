/* ============================================================================
   PLAY · one board, two ways to sit down at it               (js/play.js)
   ----------------------------------------------------------------------------
   · vs the computer  : free, js/engine.js answers in a Web Worker when the
     browser has one and on the main thread when it does not.
   · vs another person: pass and play on one device, opened by a contribution
     to the academy (the academy has no payment gateway, so the code the
     learner types is checked for shape only and remembered on this device).

   The board renders in full 3D through js/board3d.js when WebGL is available;
   the 2D board in this file is the fallback and it also drives the interaction
   for both. Nothing here talks to a server.
   ============================================================================ */
(function () {
  'use strict';

  const boardEl = document.getElementById('playBoard');
  if (!boardEl || typeof Chess === 'undefined') return;

  const PIECE_IMAGES = {
    p: { w: 'assets/pieces/wp.png', b: 'assets/pieces/bp.png' },
    n: { w: 'assets/pieces/wn.png', b: 'assets/pieces/bn.png' },
    b: { w: 'assets/pieces/wb.png', b: 'assets/pieces/bb.png' },
    r: { w: 'assets/pieces/wr.png', b: 'assets/pieces/br.png' },
    q: { w: 'assets/pieces/wq.png', b: 'assets/pieces/bq.png' },
    k: { w: 'assets/pieces/wk.png', b: 'assets/pieces/bk.png' }
  };
  const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const PAY = { paybill: '880100', WHATSAPP: '254729037585', KEY: 'kcPassPlay' };

  const game = new Chess();
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let selected = null, legalTargets = [], lastMove = null, api3 = null;
  let mode = 'cpu';                 // 'cpu' | 'person'
  let human = 'w';                  // the colour the visitor controls in cpu mode
  let level = 'club';
  let busy = false;                 // the engine is thinking
  let locked = false;               // person mode waiting on a contribution
  let dealtOnce = false;
  let hint = null;

  const $ = id => document.getElementById(id);
  const turnEl = $('playTurn'), statusEl = $('playStatus'), movesEl = $('playMoves');
  const resultEl = $('playResult'), thinkEl = $('playThink'), whoEl = $('playWho');
  const modesEl = $('playModes'), morphEl = $('playMorph');
  const btnCpu = $('playModeCpu'), btnPerson = $('playModePerson');
  const setupEl = $('playSetup'), sideEl = $('playSide'), levelEl = $('playLevel');
  const hintBtn = $('playHint'), gateEl = $('playGate'), paidEl = $('playPaid');
  const gateForm = $('gateForm'), gateMsg = $('gateMsg'), gateWa = $('gateWa');
  const squareName = (row, col) => FILES[col] + (8 - row);
  const sideWord = color => (color === 'w' ? 'White' : 'Black');

  /* =============================================================
     contribution gate
     ============================================================= */
  function paid() {
    try {
      const raw = JSON.parse(localStorage.getItem(PAY.KEY) || 'null');
      if (!raw || !raw.t) return null;
      return (Date.now() - raw.t < 864e5 * 30) ? raw : null;   // a month of play
    } catch (e) { return null; }
  }
  function isUnlocked() { return mode === 'cpu' || !!paid(); }
  function refreshGate() {
    const ok = isUnlocked();
    locked = !ok;
    if (gateEl) gateEl.hidden = (mode !== 'person' || !!paid());
    if (paidEl) paidEl.hidden = !(mode === 'person' && paid());
    const fp = paid();
    if (fp && paidEl) {
      const who = paidEl.querySelector('b');
      if (who) who.textContent = 'Table unlocked' + (fp.name ? ' for ' + fp.name : '') +
        '. Two players, this device, as many games as you like.';
    }
    boardEl.classList.toggle('is-locked', locked);
    const frame = boardEl.closest('.board-frame');
    if (frame) frame.classList.toggle('is-locked', locked);
    boardEl.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) say('Add a contribution below to open this table, or go back to the computer.');
    if (btnPerson) {
      const chip = btnPerson.querySelector('.kc-mode__price');
      if (chip) chip.textContent = paid() ? 'Unlocked' : 'Contribution';
    }
  }

  if (gateForm) {
    gateForm.addEventListener('submit', e => {
      e.preventDefault();
      const code = ($('gateRef').value || '').trim().toUpperCase();
      const name = ($('gateName').value || '').trim();
      const tierEl = gateForm.querySelector('input[name="kcTier"]:checked');
      const tier = tierEl ? tierEl.value : '200';
      // shape only: 6 to 12 characters with at least four digits in them
      if (!/^[A-Z0-9]{6,12}$/.test(code) || (code.match(/\d/g) || []).length < 4) {
        gateMsg.textContent = 'That does not look like an M-Pesa code. Type the confirmation code as sent, letters and digits together, like QGH1234567.';
        gateMsg.className = 'form-msg show error';
        return;
      }
      try {
        localStorage.setItem(PAY.KEY, JSON.stringify({ t: Date.now(), code: code, name: name, tier: tier }));
      } catch (err) { /* private mode: unlock for this page view only */ }
      gateMsg.textContent = 'Thank you. The second table is open on this device.';
      gateMsg.className = 'form-msg show success';
      if (gateEl) gateEl.classList.add('is-paid');
      setTimeout(() => { refreshGate(); say('Your table is open. White starts.'); }, 620);
    });
    const waText = () => {
      const t = gateForm.querySelector('input[name="kcTier"]:checked');
      return 'Hi Shem, I want to pay for a board on the site. Tier: KES ' +
        (t ? t.value : '200') + '. My M-Pesa code is: ';
    };
    if (gateWa) gateWa.href = 'https://wa.me/' + PAY.WHATSAPP + '?text=' + encodeURIComponent(waText());
    if (gateForm) gateForm.addEventListener('change', () => { if (gateWa) gateWa.href = 'https://wa.me/' + PAY.WHATSAPP + '?text=' + encodeURIComponent(waText()); });
  }

  /* =============================================================
     mode picker, and the block that morphs between the two choices
     ============================================================= */
  function placeMorph(animate) {
    if (!modesEl || !morphEl) return;
    const on = modesEl.querySelector('.kc-mode[aria-pressed="true"]');
    if (!on) return;
    if (!animate) morphEl.style.transition = 'none';
    morphEl.style.width = on.offsetWidth + 'px';
    morphEl.style.height = on.offsetHeight + 'px';
    morphEl.style.transform = 'translate(' + (on.offsetLeft - morphEl.offsetLeft) + 'px,' +
      (on.offsetTop - morphEl.offsetTop) + 'px)';
    if (!animate) requestAnimationFrame(() => { morphEl.style.transition = ''; });
    modesEl.classList.add('is-ready');
  }
  function setMode(next) {
    mode = next;
    const readout = $('playModeReadout');
    if (readout) readout.textContent = mode === 'cpu' ? 'vs the computer · ' + (levelEl ? levelEl.options[levelEl.selectedIndex].text.split(',')[0] : label()) : 'pass and play';
    if (btnCpu) btnCpu.setAttribute('aria-pressed', String(mode === 'cpu'));
    if (btnPerson) btnPerson.setAttribute('aria-pressed', String(mode === 'person'));
    if (setupEl) setupEl.hidden = mode !== 'cpu';
    placeMorph(!reduce);
    refreshGate();
    if (isUnlocked()) {
      if (mode === 'cpu') {
        say('You are ' + sideWord(human) + '. Pick a level and play.');
        maybeCpu();
      } else {
        say('Pass and play. White starts, then hand the device over.');
      }
    }
    updateStatus();
  }
  if (btnCpu) btnCpu.addEventListener('click', () => setMode('cpu'));
  if (btnPerson) btnPerson.addEventListener('click', () => setMode('person'));
  window.addEventListener('resize', () => placeMorph(false));

  /* =============================================================
     the other side of the board: worker first, main thread if not
     ============================================================= */
  let worker = null, seq = 0, pending = {};
  function initWorker() {
    if (worker || !window.Worker || location.protocol === 'file:') return;
    try {
      worker = new Worker('js/engine.js');
      worker.onmessage = e => {
        const d = e.data || {};
        const cb = pending[d.id];
        delete pending[d.id];
        if (cb) cb(d.best);
      };
      worker.onerror = () => {
        worker = null;
        const waiting = pending; pending = {};
        Object.keys(waiting).forEach(k => waiting[k](null));   // callers fall back
      };
    } catch (err) { worker = null; }
  }
  function fallbackPick() {
    /* no engine at all: take the best free capture, otherwise any legal move.
       Better than a board that refuses to answer. */
    const ms = game.moves({ verbose: true });
    if (!ms.length) return null;
    const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let best = null;
    ms.forEach(m => { if (m.captured && (!best || VAL[m.captured] > VAL[best.captured])) best = m; });
    const pick = best || ms[Math.floor(Math.random() * ms.length)];
    return { from: pick.from, to: pick.to, promotion: 'q' };
  }
  function think(fen, lvl) {
    return new Promise(resolve => {
      if (worker) {
        const id = ++seq;
        // if the worker dies, finish the job on the main thread
        pending[id] = best => resolve(best || (window.SMCEngine
          ? window.SMCEngine.think(game.fen(), level) : fallbackPick()));
        worker.postMessage({ id: id, fen: fen, level: lvl });
        setTimeout(() => {
          if (pending[id]) { delete pending[id]; resolve(fallbackPick()); }
        }, 6000);
        return;
      }
      setTimeout(() => {
        resolve(window.SMCEngine ? window.SMCEngine.think(fen, lvl) : fallbackPick());
      }, 40);
    });
  }

  function maybeCpu() {
    if (mode !== 'cpu' || locked || busy || game.game_over()) return;
    if (game.turn() === human) return;
    busy = true;
    if (thinkEl) thinkEl.hidden = false;
    if (whoEl) whoEl.classList.add('is-deciding');
    say('The ' + label() + ' is thinking.');
    initWorker();
    think(game.fen(), level).then(best => {
      busy = false;
      if (thinkEl) thinkEl.hidden = true;
      if (whoEl) whoEl.classList.remove('is-deciding');
      if (!best || game.game_over()) { updateStatus(); return; }
      const move = game.move({ from: best.from, to: best.to, promotion: best.promotion || 'q' });
      if (!move) { updateStatus(); return; }
      lastMove = move;
      if (api3) api3.playMove(move);
      refresh(move, best);
    });
  }
  function label() {
    return level === 'warmup' ? 'warm-up opponent' : level === 'tournament' ? 'club-strength engine' : 'engine';
  }

  /* =============================================================
     board rendering (2D) with a slide on the move that just happened
     ============================================================= */
  function render2D(justMoved) {
    boardEl.innerHTML = '';
    const b = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = squareName(row, col);
        const cell = b[row][col];
        const div = document.createElement('div');
        div.className = 'sq ' + (((row + col) % 2 === 0) ? 'light' : 'dark');
        if (selected === sq) div.classList.add('selected');
        if (lastMove && (lastMove.from === sq || lastMove.to === sq)) div.classList.add('lastmove');
        if (hint && (hint.from === sq || hint.to === sq)) div.classList.add('is-hint');
        if (!dealtOnce) div.style.setProperty('--d', row + col);
        div.dataset.sq = sq;
        if (cell) {
          const p = document.createElement('img');
          p.className = 'piece-img';
          p.src = PIECE_IMAGES[cell.type][cell.color];
          p.alt = (cell.color === 'w' ? 'White ' : 'Black ') + PIECE_NAMES[cell.type];
          p.dataset.sq = sq;
          div.appendChild(p);
        }
        if (legalTargets.includes(sq)) {
          const marker = document.createElement('span');
          marker.className = cell ? 'ring' : 'dot';
          div.appendChild(marker);
        }
        if (game.in_check() && cell && cell.type === 'k' && cell.color === game.turn()) {
          div.classList.add('is-check');
        }
        div.addEventListener('click', () => onSquareAction(sq));
        boardEl.appendChild(div);
      }
    }
    if (!dealtOnce) {
      dealtOnce = true;
      if (!reduce) boardEl.classList.add('is-dealt');
    }
    if (justMoved && !reduce) slide(justMoved);
  }

  /* the piece travels from the square it left instead of appearing */
  function slide(move) {
    const img = boardEl.querySelector('.piece-img[data-sq="' + move.to + '"]');
    const cell = boardEl.clientWidth / 8;
    if (!img || !img.animate || !cell) return;
    const from = FILES.indexOf(move.from[0]), to = FILES.indexOf(move.to[0]);
    const fromR = 8 - parseInt(move.from[1], 10), toR = 8 - parseInt(move.to[1], 10);
    const dx = (from - to) * cell, dy = (fromR - toR) * cell;
    img.animate(
      [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)', opacity: .55 },
       { transform: 'translate(0,0) scale(1)', opacity: 1 }],
      { duration: 340, easing: 'cubic-bezier(.2,.85,.25,1)' }
    );
    if (move.captured) {
      const host = img.parentElement;
      host.animate([{ boxShadow: 'inset 0 0 0 2px rgba(16,18,20,.85)' },
                    { boxShadow: 'inset 0 0 0 0 rgba(16,18,20,0)' }],
                   { duration: 620, easing: 'ease-out' });
    }
  }

  /* =============================================================
     interaction
     ============================================================= */
  function onSquareAction(sq) {
    if (locked || busy) return;
    if (mode === 'cpu' && game.turn() !== human) return;
    if (selected && legalTargets.includes(sq)) {
      const move = game.move({ from: selected, to: sq, promotion: 'q' });
      hint = null;
      if (move) {
        lastMove = move;
        if (api3) api3.playMove(move);
      }
      selected = null; legalTargets = [];
      refresh(move, move);          // the second arg names the move in the status
      maybeCpu();
      return;
    }
    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      selected = sq;
      legalTargets = game.moves({ square: sq, verbose: true }).map(m => m.to);
    } else {
      selected = null; legalTargets = [];
    }
    refresh();
  }

  function refresh(justMoved, meta) {
    if (!api3) render2D(justMoved);
    if (api3) api3.setSelection(selected, legalTargets, sq => game.get(sq));
    updateStatus(meta);
    updateMoves();
  }

  function say(text) { if (statusEl) statusEl.textContent = text; }

  function updateStatus(meta) {
    const over = game.game_over();
    /* turn card */
    if (turnEl) {
      turnEl.textContent = over ? 'GAME OVER'
        : (mode === 'cpu'
            ? (game.turn() === human ? 'YOUR MOVE' : 'ENGINE TO MOVE')
            : sideWord(game.turn()).toUpperCase() + ' TO MOVE');
    }
    if (whoEl) {
      const you = mode === 'cpu' && game.turn() === human && !over;
      whoEl.classList.toggle('is-you', you);
      const icon = whoEl.querySelector('i');
      const text = over ? resultLine()
        : mode === 'cpu'
          ? (you ? 'You are ' + sideWord(human) + ' · ' + label()
                 : label() + ' is ' + sideWord(human === 'w' ? 'b' : 'w'))
          : sideWord(game.turn()) + ' to move, pass the device';
      if (icon) icon.className = 'fas ' + (over ? 'fa-flag-checkered' : mode === 'cpu' && !you ? 'fa-microchip' : 'fa-user');
      const span = whoEl.querySelector('span');
      if (span) span.textContent = text;
    }
    /* status line */
    statusEl.classList.remove('alert');
    if (over) {
      statusEl.classList.add('alert');
      say(resultLine());
    } else if (game.in_check()) {
      statusEl.classList.add('alert');
      say(sideWord(game.turn()) + ' is in check.');
    } else if (busy) {
      say('The ' + label() + ' is thinking.');
    } else if (locked) {
      say('This table opens as soon as the contribution code is in below.');
    } else if (selected) {
      say('Selected ' + selected + '. Tap a marked square to move it there.');
    } else if (meta && meta.san) {
      say(sideWord(lastMove.color) + ' played ' + meta.san + '.');
    } else {
      say('Tap a piece, then tap a marked square to move it.');
    }
    if (resultEl) {
      resultEl.textContent = over ? resultLine() : '';
      resultEl.classList.toggle('show', over);
    }
    if (hintBtn) hintBtn.disabled = over || mode !== 'cpu' || busy || locked;
  }

  function resultLine() {
    if (game.in_checkmate()) {
      const winner = sideWord(game.turn() === 'w' ? 'b' : 'w');
      if (mode === 'cpu') {
        return winner === sideWord(human) ? 'Checkmate. You beat the ' + label() + '.'
          : 'Checkmate. The ' + label() + ' took it. Replay, or ask a coach for the line you missed.';
      }
      return 'Checkmate. ' + winner + ' wins.';
    }
    if (game.in_stalemate()) return 'Stalemate. The king has nowhere legal to go, so it is a draw.';
    return 'The game is a draw.';
  }

  function updateMoves() {
    if (!movesEl) return;
    const hist = game.history();
    movesEl.innerHTML = '';
    for (let i = 0; i < hist.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row' + (i + 2 >= hist.length ? ' latest' : '');
      const num = document.createElement('span'); num.className = 'mv-num'; num.textContent = (i / 2 + 1) + '.';
      const w = document.createElement('span'); w.className = 'mv-w'; w.textContent = hist[i] || '';
      const b = document.createElement('span'); b.className = 'mv-b'; b.textContent = hist[i + 1] || '';
      row.appendChild(num); row.appendChild(w); row.appendChild(b);
      movesEl.appendChild(row);
    }
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  /* =============================================================
     controls
     ============================================================= */
  function reset(keepColor) {
    game.reset();
    selected = null; legalTargets = []; lastMove = null; hint = null; busy = false;
    if (thinkEl) thinkEl.hidden = true;
    if (!keepColor && mode === 'cpu' && sideEl && sideEl.value === 'random') {
      human = Math.random() < .5 ? 'w' : 'b';
      say('You are ' + sideWord(human) + '. ' + (human === 'b' ? 'The engine opens.' : 'You open.'));
    }
    if (api3) api3.sync(game.board());
    refresh();
    maybeCpu();
  }
  const newBtn = $('playNewGame'), undoBtn = $('playUndo');
  if (newBtn) newBtn.addEventListener('click', () => reset(false));
  if (undoBtn) undoBtn.addEventListener('click', () => {
    if (busy) return;
    game.undo();
    if (mode === 'cpu' && game.turn() !== human) game.undo();
    selected = null; legalTargets = []; lastMove = null; hint = null;
    if (api3) api3.sync(game.board());
    refresh();
  });
  if (hintBtn) hintBtn.addEventListener('click', () => {
    if (busy || mode !== 'cpu' || game.game_over()) return;
    busy = true;
    think(game.fen(), 'club').then(best => {
      busy = false;
      if (!best) return;
      hint = best;
      refresh();
      say('Try ' + (best.san || (best.from + best.to)) + '.');
      setTimeout(() => { hint = null; refresh(); }, 2400);
    });
  });
  if (sideEl) sideEl.addEventListener('change', () => {
    human = sideEl.value === 'b' ? 'b' : sideEl.value === 'random' ? (Math.random() < .5 ? 'w' : 'b') : 'w';
    reset(true);
  });
  if (levelEl) levelEl.addEventListener('change', () => {
    level = levelEl.value;
    const readout = $('playModeReadout');
    if (readout && mode === 'cpu') readout.textContent = 'vs the computer · ' + levelEl.options[levelEl.selectedIndex].text.split(',')[0];
    updateStatus();
    maybeCpu();
  });

  /* =============================================================
     3D stage
     ============================================================= */
  function try3D() {
    if (api3 || !window.SMC3D) return;
    const stage = $('stage3d');
    const frame = boardEl.closest('.board-frame');
    if (!stage) return;
    try {
      api3 = window.SMC3D.mount(stage, { interactive: true, onSquare: onSquareAction });
      if (frame) frame.classList.add('has-3d');
      api3.sync(game.board());
      refresh();
    } catch (err) { api3 = null; }
  }
  document.addEventListener('smc3d:ready', try3D);

  /* =============================================================
     boot
     ============================================================= */
  if (sideEl) human = sideEl.value === 'b' ? 'b'
    : sideEl.value === 'random' ? (Math.random() < .5 ? 'w' : 'b') : 'w';
  if (levelEl) level = levelEl.value || 'club';
  setMode('cpu');
  placeMorph(false);
  refreshGate();
  updateStatus();
  setTimeout(() => placeMorph(false), 260);   // after webfonts settle
})();
