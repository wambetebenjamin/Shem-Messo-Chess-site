/* ============================================================================
   PLAY · the academy board (requires js/chess.js)
   ----------------------------------------------------------------------------
   Three ways to play, all on one board:

     local     two players share the device (pass & play)
     online    two players on separate devices, live, via server/server.js
     computer  one player against the engine in js/engine.js

   Plus the coach-booking form, which composes a WhatsApp request.

   Rendering: full 3D through js/board3d.js when WebGL is available, with the
   classic 2D board kept underneath as a graceful fallback.
   ============================================================================ */
(function () {
  'use strict';

  const boardEl = document.getElementById('playBoard');
  if (!boardEl || typeof Chess === 'undefined') return;

  /* Piece art: local PNGs so pieces render on every device,
     no dependence on system chess-glyph fonts. */
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

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */
  let game = new Chess();
  let selected = null, legalTargets = [], lastMove = null;
  let api3 = null;
  let mode = 'local';                 // local | online | computer
  let cpuSide = 'w';                  // which colour the human plays vs the engine
  let thinking = false;

  const $ = id => document.getElementById(id);
  const turnEl = $('playTurn');
  const cpuTurnEl = $('cpuTurn');
  const statusEl = $('playStatus');
  const cpuStatusEl = $('cpuStatus');
  const movesEl = $('playMoves');
  const bannerEl = $('boardBanner');
  const bannerText = $('boardBannerText');
  const squareName = (row, col) => FILES[col] + (8 - row);

  /* ------------------------------------------------------------------ *
   * 2D fallback board
   * ------------------------------------------------------------------ */
  function render2D() {
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
        div.dataset.sq = sq;
        if (cell) {
          const p = document.createElement('img');
          p.className = 'piece-img';
          p.src = PIECE_IMAGES[cell.type][cell.color];
          p.alt = (cell.color === 'w' ? 'White ' : 'Black ') + PIECE_NAMES[cell.type];
          div.appendChild(p);
        }
        if (legalTargets.includes(sq)) {
          const marker = document.createElement('span');
          marker.className = cell ? 'ring' : 'dot';
          div.appendChild(marker);
        }
        div.addEventListener('click', () => onSquareAction(sq));
        boardEl.appendChild(div);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Who is allowed to move right now?
   * ------------------------------------------------------------------ */
  function humanMayMove() {
    if (thinking) return false;
    if (game.game_over()) return false;
    if (mode === 'local') return true;
    if (mode === 'computer') return game.turn() === cpuSide;
    if (mode === 'online') {
      return !!(net && net.seat && net.seat === game.turn() && opponentHere);
    }
    return true;
  }

  function onSquareAction(sq) {
    if (!humanMayMove()) {
      if (mode === 'computer' && !thinking) flash('It is the computer\'s move.');
      return;
    }

    if (selected && legalTargets.includes(sq)) {
      const move = game.move({ from: selected, to: sq, promotion: 'q' });
      selected = null; legalTargets = [];
      if (move) {
        lastMove = move;
        if (api3) api3.playMove(move); else render2D();
        afterMove(move);
      }
      refresh();
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

  /* called once a move has actually been played on the board */
  function afterMove(move) {
    if (mode === 'online' && net) net.move(move);
    if (mode === 'computer') maybeReply();
  }

  /* ------------------------------------------------------------------ *
   * Rendering + status
   * ------------------------------------------------------------------ */
  function refresh() {
    if (!api3) render2D();
    else api3.setSelection(selected, legalTargets, sq => game.get(sq));
    updateStatus();
    updateMoves();
  }

  function flash(text) {
    statusEl.textContent = text;
    if (cpuStatusEl) cpuStatusEl.textContent = text;
  }

  function updateStatus() {
    const label = (game.turn() === 'w' ? 'WHITE' : 'BLACK') + ' TO MOVE';
    turnEl.textContent = label;
    if (cpuTurnEl) cpuTurnEl.textContent = label;
    statusEl.classList.remove('alert');

    let line;
    if (game.in_checkmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      line = 'Checkmate. ' + winner + ' wins. Brilliant finish.';
      statusEl.classList.add('alert');
    } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      line = 'The game is a draw.';
      statusEl.classList.add('alert');
    } else if (game.in_check()) {
      line = (game.turn() === 'w' ? 'White' : 'Black') + ' is in check.';
      statusEl.classList.add('alert');
    } else if (mode === 'computer' && !humanMayMove()) {
      line = 'The computer is thinking…';
    } else if (mode === 'online' && net && net.seat && game.turn() !== net.seat) {
      line = opponentHere ? 'Waiting for your opponent…' : 'Waiting for someone to join…';
    } else {
      line = selected ? 'Selected ' + selected + '. Tap a highlighted square.'
                      : 'Tap a piece, then tap a highlighted square to move it.';
    }
    statusEl.textContent = line;
    if (cpuStatusEl) cpuStatusEl.textContent = line;
  }

  function updateMoves() {
    const hist = game.history();
    movesEl.innerHTML = '';
    if (!hist.length) {
      const empty = document.createElement('p');
      empty.className = 'text-muted small mb-0';
      empty.textContent = 'No moves yet.';
      movesEl.appendChild(empty);
      return;
    }
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

  function setBanner(text) {
    if (!bannerEl) return;
    if (!text) { bannerEl.hidden = true; return; }
    bannerText.textContent = text;
    bannerEl.hidden = false;
  }

  function resetGame() {
    game = new Chess();
    selected = null; legalTargets = []; lastMove = null; thinking = false;
    if (api3) api3.sync(game.board());
    setBanner(null);
    refresh();
    if (mode === 'computer') maybeReply();
  }

  /* ================================================================== *
   * COMPUTER
   * ================================================================== */
  let worker = null;
  let workerBroken = false;
  let reqId = 0;
  let pending = null;

  function initWorker() {
    if (worker || workerBroken || typeof Worker === 'undefined') return;
    try {
      worker = new Worker('js/engine.worker.js');
      worker.onmessage = e => {
        const data = e.data || {};
        if (!pending || data.id !== pending.id) return;
        const done = pending; pending = null;
        thinking = false;
        if (data.error || !data.move) {
          flash('The computer could not find a move. Your turn.');
          refresh();
          return;
        }
        applyMove(data.move);
      };
      worker.onerror = () => { workerBroken = true; try { worker.terminate(); } catch (e) {} worker = null; };
    } catch (e) {
      workerBroken = true;
      worker = null;
    }
  }

  function maybeReply() {
    if (mode !== 'computer' || game.game_over()) return;
    if (game.turn() === cpuSide) return;           // human's move
    thinking = true;
    updateStatus();
    const fen = game.fen();
    const level = ($('cpuLevel') && $('cpuLevel').value) || 'medium';

    initWorker();
    if (worker && !workerBroken) {
      const id = ++reqId;
      pending = { id, fen };
      worker.postMessage({ id, fen, level });
      return;
    }

    // no worker available (older browser or file://) — think on this thread,
    // but yield once so the "thinking" state paints first
    setTimeout(() => {
      let move = null;
      try {
        if (window.SMCEngine) move = window.SMCEngine.think(fen, { level, Chess });
      } catch (e) { move = null; }
      thinking = false;
      if (move) applyMove(move);
      else { flash('The computer could not find a move. Your turn.'); refresh(); }
    }, 30);
  }

  function applyMove(move) {
    const m = game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!m) { refresh(); return; }
    lastMove = m;
    if (api3) api3.playMove(m); else render2D();
    refresh();
  }

  /* ================================================================== *
   * ONLINE
   * ================================================================== */
  let net = null;
  let opponentHere = false;
  let endedText = null;        // set once the game finishes, so presence updates
                               // do not wipe the result off the banner

  function netState(text, kind) {
    const el = $('netState'), txt = $('netStateText');
    if (!el || !txt) return;
    txt.textContent = text;
    el.className = 'net-state' + (kind ? ' ' + kind : '');
  }

  function rebuildFromMoves(list) {
    const g = new Chess();
    for (let i = 0; i < list.length; i++) {
      if (!g.move(list[i])) return null;
    }
    return g;
  }

  /* placement + side to move — clocks and the en-passant square are not
     part of "is this the same position" for our purposes. */
  const posKey = fen => String(fen).split(' ').slice(0, 2).join(' ');

  function applyServerState(state, skipSync) {
    if (!state) return;
    // Prefer replaying the move list: it keeps the notation intact. The FEN is
    // a cross-check on the position itself, not on the clocks.
    const rebuilt = state.moves && state.moves.length ? rebuildFromMoves(state.moves) : null;
    if (rebuilt && (!state.fen || posKey(rebuilt.fen()) === posKey(state.fen))) game = rebuilt;
    else if (state.fen) game.load(state.fen);
    selected = null; legalTargets = [];
    lastMove = game.history({ verbose: true }).slice(-1)[0] || null;
    if (api3 && !skipSync) api3.sync(game.board());
    refresh();
  }

  function showRoom(code) {
    const box = $('roomBox'), codeEl = $('roomCode');
    if (!box || !codeEl) return;
    codeEl.textContent = code;
    box.hidden = false;
  }

  function setSeat(seat) {
    const row = $('seatRow'), badge = $('seatBadge'), txt = $('seatText');
    if (!row || !badge || !txt) return;
    if (!seat) { row.hidden = true; return; }
    row.hidden = false;
    badge.textContent = seat === 'w' ? 'W' : 'B';
    badge.className = 'seat-badge ' + (seat === 'w' ? 'w' : 'b');
    txt.textContent = seat === 'w' ? 'You are White' : 'You are Black';
  }

  function pushChat(line) {
    const log = $('chatLog');
    if (!log) return;
    const row = document.createElement('div');
    row.className = 'chat-msg ' + (line.seat || 'w');
    row.innerHTML = '<b>' + (line.seat === 'b' ? 'Black' : line.seat === 'w' ? 'White' : 'Watch') + '</b> ';
    row.appendChild(document.createTextNode(line.text));
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function initOnline() {
    if (net || typeof SMCOnline === 'undefined') return;
    net = SMCOnline.create({
      onOpen: () => netState('Connected', 'good'),
      onClose: info => {
        opponentHere = false;
        netState(info && info.willRetry ? 'Reconnecting…' : 'Disconnected', 'warn');
        if (info && info.willRetry) setBanner('Connection dropped — trying to rejoin your game.');
      },
      onUnavailable: () => {
        netState('Server unreachable', 'bad');
        setBanner('Live play is not reachable right now. Pass & play still works.');
      },
      onHello: msg => {
        netState('Connected', 'good');
        showRoom(msg.code);
        setSeat(msg.seat);
        $('netActions').hidden = false;
        $('netChat').hidden = false;
        $('netLeave').hidden = false;
        if (msg.chat && msg.chat.length) $('chatLog').innerHTML = '', msg.chat.forEach(pushChat);
        updatePresence(msg.state);
        applyServerState(msg.state);
      },
      onMoved: msg => {
        // play the move locally first so the 3D board can animate it properly,
        // then take the server's position as the truth
        let verbose = null;
        if (msg.move && msg.move.from) {
          try {
            verbose = game.move({ from: msg.move.from, to: msg.move.to, promotion: msg.move.promotion || 'q' });
          } catch (e) { verbose = null; }
        }
        if (verbose) lastMove = verbose;
        if (verbose && api3) api3.playMove(verbose);
        updatePresence(msg.state);
        applyServerState(msg.state, !!(verbose && api3));
      },
      onState: msg => { updatePresence(msg.state); applyServerState(msg.state); },
      onPresence: msg => updatePresence(msg),
      onError: msg => flash(msg.message || 'That did not work.'),
      onChat: msg => pushChat(msg.line),
      onEnded: msg => {
        endedText = msg.result || 'Game over';
        setBanner(endedText);
        flash(endedText);
      },
      onRestarted: () => {
        endedText = null;
        setBanner(null);
        $('chatLog').innerHTML = '';
      },
      onRematch: msg => {
        const both = msg.rematch && msg.rematch.w && msg.rematch.b;
        setBanner(both ? null : 'Your opponent wants a rematch.');
      }
    });
    net.connect();
    netState('Connecting…', 'warn');
  }

  function updatePresence(state) {
    const seats = state && state.seats;
    if (!seats) return;
    if (net && net.seat === 'w') opponentHere = !!seats.b;
    else if (net && net.seat === 'b') opponentHere = !!seats.w;
    else opponentHere = !!(seats.w && seats.b);

    if (mode === 'online' && !endedText) {
      setBanner(opponentHere ? null : 'Share your game code — waiting for your opponent to join.');
      updateStatus();
    }
  }

  /* ================================================================== *
   * MODE SWITCHING
   * ================================================================== */
  function setMode(next) {
    mode = next;
    thinking = false;
    pending = null;

    document.querySelectorAll('.play-mode').forEach(btn => {
      const on = btn.getAttribute('data-mode') === next;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-panel]').forEach(panel => {
      panel.hidden = panel.getAttribute('data-panel') !== next;
    });

    if (next === 'online') {
      initOnline();
      setBanner(net && net.code
        ? (opponentHere ? endedText : 'Share your game code — waiting for your opponent to join.')
        : 'Create a game, then share the code with your friend.');
    } else {
      endedText = null;
      setBanner(null);
    }

    if (next === 'computer') {
      const sideSel = $('cpuSide');
      if (sideSel) {
        const v = sideSel.value;
        cpuSide = v === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : v;
      }
    }
    refresh();
    if (next === 'computer') maybeReply();
  }

  /* ================================================================== *
   * CONTROLS
   * ================================================================== */
  document.querySelectorAll('.play-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.hasAttribute('data-book')) {
        const target = document.getElementById('book');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.play-mode').forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        return;
      }
      setMode(btn.getAttribute('data-mode'));
    });
  });

  const newBtn = $('playNewGame');
  const undoBtn = $('playUndo');
  if (newBtn) newBtn.addEventListener('click', resetGame);
  if (undoBtn) undoBtn.addEventListener('click', () => {
    if (mode === 'online') return flash('Ask your opponent for a takeback — the server runs the game.');
    game.undo();
    if (mode === 'computer') { game.undo(); }   // step back over the computer's reply too
    selected = null; legalTargets = []; lastMove = null;
    if (api3) api3.sync(game.board());
    refresh();
  });

  /* --- computer controls --- */
  if ($('cpuNew')) $('cpuNew').addEventListener('click', () => {
    const v = $('cpuSide').value;
    cpuSide = v === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : v;
    resetGame();
  });
  if ($('cpuUndo')) $('cpuUndo').addEventListener('click', () => {
    game.undo(); game.undo();
    selected = null; legalTargets = []; lastMove = null; thinking = false;
    if (api3) api3.sync(game.board());
    refresh();
  });
  if ($('cpuSide')) $('cpuSide').addEventListener('change', () => {
    const v = $('cpuSide').value;
    cpuSide = v === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : v;
    resetGame();
  });
  if ($('cpuLevel')) $('cpuLevel').addEventListener('change', () => { /* applies to the next move */ });

  /* --- online controls --- */
  if ($('netCreate')) $('netCreate').addEventListener('click', () => {
    initOnline();
    if (!net) return;
    if (!net.connected) { netState('Connecting…', 'warn'); net.connect(); }
    // wait briefly for the socket, then create
    const start = Date.now();
    (function wait() {
      if (net.connected) return net.createGame();
      if (Date.now() - start > 4000) {
        netState('Server unreachable', 'bad');
        return setBanner('Live play is not reachable right now. Pass & play still works.');
      }
      setTimeout(wait, 120);
    })();
  });

  if ($('netJoin')) $('netJoin').addEventListener('click', () => {
    const code = ($('netCode').value || '').trim().toUpperCase();
    if (code.length !== 5) return flash('Game codes are five characters.');
    initOnline();
    $('netCode').value = code;
    net.joinGame(code);
  });
  if ($('netCode')) $('netCode').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('netJoin').click(); }
  });

  if ($('roomCopy')) $('roomCopy').addEventListener('click', () => {
    const code = $('roomCode').textContent.trim();
    const done = () => { const b = $('roomCopy'); const old = b.innerHTML; b.innerHTML = '<i class="fas fa-check"></i> Copied'; setTimeout(() => { b.innerHTML = old; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code, done));
    } else fallbackCopy(code, done);
  });

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  if ($('netResign')) $('netResign').addEventListener('click', () => { if (net) net.resign(); });
  if ($('netRematch')) $('netRematch').addEventListener('click', () => { if (net) net.rematch(); });
  if ($('netLeave')) $('netLeave').addEventListener('click', () => {
    if (net) net.disconnect();
    $('roomBox').hidden = true;
    $('netActions').hidden = true;
    $('netChat').hidden = true;
    $('netLeave').hidden = true;
    $('chatLog').innerHTML = '';
    setSeat(null);
    netState('Not connected');
    endedText = null;
    setBanner(null);
    resetGame();
  });

  if ($('chatSend')) $('chatSend').addEventListener('click', () => {
    const input = $('chatInput');
    const text = (input.value || '').trim();
    if (!text || !net) return;
    net.chat(text);
    input.value = '';
  });
  if ($('chatInput')) $('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('chatSend').click(); }
  });

  /* ================================================================== *
   * COACH BOOKING  ->  WhatsApp
   * ================================================================== */
  (function booking() {
    const form = $('coachForm');
    if (!form) return;
    const number = (window.SMC && window.SMC.WHATSAPP) || '254729037585';
    const prettyDate = iso => {
      if (!iso) return '—';
      const parts = iso.split('-');
      if (parts.length !== 3) return iso;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return parseInt(parts[2], 10) + ' ' + (months[parseInt(parts[1], 10) - 1] || '') + ' ' + parts[0];
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('bk_msg');
      const required = ['bk_name', 'bk_phone', 'bk_date', 'bk_slot', 'bk_type'];
      let bad = null;
      required.forEach(id => {
        const el = $(id);
        const wrap = el.closest('.f');
        const empty = !el.value.trim();
        if (wrap) wrap.classList.toggle('bad', empty);
        if (empty && !bad) bad = el;
      });
      if (bad) {
        if (msg) { msg.textContent = 'Please fill in the highlighted fields.'; msg.className = 'form-msg show error'; }
        bad.focus();
        return;
      }

      const v = id => $(id).value.trim();
      const text =
        'Hi Shem, I would like to book a coaching session.\n\n' +
        'Name: ' + v('bk_name') + '\n' +
        'Phone: ' + v('bk_phone') + '\n' +
        'Preferred date: ' + prettyDate(v('bk_date')) + '\n' +
        'Time of day: ' + v('bk_slot') + '\n' +
        'Session type: ' + v('bk_type') + '\n' +
        (v('bk_focus') ? 'Focus: ' + v('bk_focus') + '\n' : '') +
        (v('bk_notes') ? 'Notes: ' + v('bk_notes') + '\n' : '') +
        '\nSent from kerichochessacademy · Play page';

      window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      if (msg) {
        msg.textContent = 'Opening WhatsApp with your booking. Just press send — we confirm every request on WhatsApp.';
        msg.className = 'form-msg show success';
      }
    });
  })();

  /* ================================================================== *
   * 3D
   * ================================================================== */
  function try3D() {
    if (api3 || !window.SMC3D) return;
    const stage = document.getElementById('stage3d');
    const frame = boardEl.closest('.board-frame');
    if (!stage) return;
    try {
      api3 = window.SMC3D.mount(stage, { interactive: true, onSquare: onSquareAction });
      if (frame) frame.classList.add('has-3d');
      api3.sync(game.board());
      refresh();
    } catch (err) {
      api3 = null;
    }
  }
  document.addEventListener('smc3d:ready', try3D);

  setMode('local');
  try3D();
})();
