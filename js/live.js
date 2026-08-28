/* ============================================================================
   LIVE · broadcast room simulation (requires js/chess.js)
   Replays the evening's featured game move-by-move with live clocks, an
   evaluation bar, spectator chat and viewer telemetry: the "WATCH LIVE NOW"
   premium experience. When real fixtures are running, this page is where
   boards stream from the hall.
   ============================================================================ */
(function () {
  'use strict';
  const boardEl = document.getElementById('liveBoard');
  if (!boardEl || typeof Chess === 'undefined') return;

  const PIECE_GLYPHS = {
    p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' },
    r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' }
  };
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  // Featured game of the evening: the Opera Game (Morphy, 1858), the same
  // miniature the juniors study in week six. Replayed live as a demo feed.
  const PGN = [
    '[Event "Kericho Inter-Schools League · Board 1"]',
    '[White "Barasa K. (Kapsaos Boys)"]',
    '[Black "Chebet A. (Kericho Primary)"]',
    '',
    '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5',
    '6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5',
    '11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6',
    '15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0'
  ].join('\n');

  // Scripted evaluation curve (pawns), roughly following the game.
  const EVALS = [0.2, 0.2, 0.3, 0.2, 0.4, 0.5, 0.9, 0.7, 1.1, 0.9, 1.3, 0.8,
                 1.5, 1.2, 1.6, 1.4, 2.4, 2.0, 3.0, 2.6, 3.4, 3.0, 4.2, 3.8,
                 4.6, 4.2, 5.1, 4.8, 5.6, 6.0, 8.5, 9.2, 12.0, 99];

  const CHAT_POOL = [
    ['Watching from Eldoret', 'that knight jump to f3 was pure Shem-school'],
    ['Coach Rono', 'Black needed 6...Nf6 two moves ago, the pin is coming'],
    ['Team Kapsaos', 'LETS GO BARASA 🔥'],
    ['Mama Chebet', 'Chebet play your game, breathe!'],
    ['Junior Lions', 'this is the Opera Game line from week six 😮'],
    ['Arbiter_SIM', 'Board 1 clock synced. 10 minutes each, no increment.'],
    ['Nakuru Chess Fam', 'whoever finds Qb8+ wins a trophy'],
    ['Watching from Litein', 'these kids calculate faster than me fr'],
    ['Coach Shem', 'Note the rook lift. Textbook conversion.'],
    ['Team Kericho', 'mate incoming… watch the d-file 👀']
  ];

  const game = new Chess();
  const replay = new Chess();
  replay.load_pgn(PGN);
  const MOVES = replay.history({ verbose: true });

  const clockW = document.getElementById('clockW');
  const clockB = document.getElementById('clockB');
  const movesEl = document.getElementById('liveMoves');
  const evalFill = document.getElementById('evalFill');
  const evalNum = document.getElementById('evalNum');
  const viewersEl = document.getElementById('liveViewers');
  const chatEl = document.getElementById('liveChat');
  const resultEl = document.getElementById('liveResult');
  const stateEl = document.getElementById('liveState');

  let idx = 0, timeW = 600, timeB = 600, paused = false, viewers = 128, chatIdx = 0, timer = null;

  const fmt = s => {
    s = Math.max(0, Math.round(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  function renderBoard() {
    boardEl.innerHTML = '';
    const b = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = b[row][col];
        const div = document.createElement('div');
        const last = idx > 0 ? MOVES[idx - 1] : null;
        const sq = FILES[col] + (8 - row);
        div.className = 'sq ' + (((row + col) % 2 === 0) ? 'light' : 'dark');
        if (last && (last.from === sq || last.to === sq)) div.classList.add('lastmove');
        if (cell) {
          const p = document.createElement('span');
          p.className = 'piece ' + (cell.color === 'w' ? 'white' : 'black');
          p.textContent = PIECE_GLYPHS[cell.type][cell.color];
          div.appendChild(p);
        }
        boardEl.appendChild(div);
      }
    }
  }

  function renderClocks() {
    clockW.textContent = fmt(timeW);
    clockB.textContent = fmt(timeB);
    const whiteActive = game.turn() === 'w';
    clockW.classList.toggle('active', whiteActive);
    clockB.classList.toggle('active', !whiteActive);
  }

  function renderMoves() {
    const hist = game.history();
    movesEl.innerHTML = '';
    for (let i = 0; i < hist.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row' + (i + 2 >= hist.length ? ' latest' : '');
      row.innerHTML = '<span class="mv-num">' + (i / 2 + 1) + '.</span>' +
        '<span class="mv-w">' + (hist[i] || '') + '</span>' +
        '<span class="mv-b">' + (hist[i + 1] || '') + '</span>';
      movesEl.appendChild(row);
    }
    movesEl.scrollTop = movesEl.scrollHeight;
  }

  function renderEval() {
    const ev = EVALS[Math.min(idx, EVALS.length - 1)];
    const clamped = Math.max(-6, Math.min(6, ev));
    const pct = 50 + clamped * 7.5;             // white advantage grows downward fill
    evalFill.style.height = Math.min(100, Math.max(4, pct)) + '%';
    evalNum.textContent = ev >= 90 ? '#M1' : (ev > 0 ? '+' : '') + ev.toFixed(1);
  }

  function pushChat() {
    const [who, what] = CHAT_POOL[chatIdx % CHAT_POOL.length];
    chatIdx++;
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = '<b>' + who + '</b> · ' + what;
    chatEl.appendChild(line);
    while (chatEl.children.length > 9) chatEl.removeChild(chatEl.firstChild);
  }

  function finish() {
    clearInterval(timer); timer = null;
    resultEl.textContent = '1-0 · CHECKMATE · BARASA TAKES BOARD 1';
    resultEl.classList.add('show');
    if (stateEl) stateEl.textContent = 'FULL TIME · REPLAY RESTARTS SHORTLY';
    setTimeout(start, 9000);
  }

  function stepFn() {
    if (paused) return;
    if (idx >= MOVES.length) { finish(); return; }
    const mv = MOVES[idx];
    const burn = 6 + Math.random() * 22;             // seconds "thought"
    if (mv.color === 'w') timeW -= burn; else timeB -= burn;
    game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || 'q' });
    idx++;
    renderBoard(); renderClocks(); renderMoves(); renderEval();
    if (idx % 4 === 0) pushChat();
    if (idx % 6 === 0) {
      viewers = Math.max(40, viewers + Math.round((Math.random() * 2 - 0.8) * 7));
      if (viewersEl) viewersEl.textContent = viewers;
    }
    if (game.in_checkmate()) finish();
  }

  function start() {
    clearInterval(timer);
    game.reset(); idx = 0; timeW = 600; timeB = 600; chatIdx = 0; viewers = 128;
    chatEl.innerHTML = '';
    resultEl.classList.remove('show');
    if (stateEl) stateEl.textContent = 'LIVE · ROUND 4 IN PROGRESS';
    renderBoard(); renderClocks(); renderMoves(); renderEval();
    pushChat();
    timer = setInterval(stepFn, 2400);
  }

  const pauseBtn = document.getElementById('bcPause');
  const restartBtn = document.getElementById('bcRestart');
  if (pauseBtn) pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.innerHTML = paused ? '<i class="fas fa-play"></i> Resume Feed' : '<i class="fas fa-pause"></i> Pause Feed';
    if (stateEl && idx < MOVES.length) stateEl.textContent = paused ? 'FEED PAUSED' : 'LIVE · ROUND 4 IN PROGRESS';
  });
  if (restartBtn) restartBtn.addEventListener('click', start);

  start();
})();
