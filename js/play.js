/* ============================================================================
   PLAY · pass-and-play academy board (requires js/chess.js)
   Renders in full 3D through js/board3d.js when WebGL is available;
   the classic 2D board below remains as a graceful fallback.
   ============================================================================ */
(function () {
  'use strict';
  const boardEl = document.getElementById('playBoard');
  if (!boardEl || typeof Chess === 'undefined') return;

  const PIECE_GLYPHS = {
    p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' },
    r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' }
  };
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const game = new Chess();
  let selected = null, legalTargets = [], lastMove = null;
  let api3 = null;

  const turnEl = document.getElementById('playTurn');
  const statusEl = document.getElementById('playStatus');
  const movesEl = document.getElementById('playMoves');
  const squareName = (row, col) => FILES[col] + (8 - row);

  /* ---------- 2D fallback board ---------- */
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
          const p = document.createElement('span');
          p.className = 'piece ' + (cell.color === 'w' ? 'white' : 'black');
          p.textContent = PIECE_GLYPHS[cell.type][cell.color];
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

  /* ---------- shared interaction logic ---------- */
  function onSquareAction(sq) {
    if (selected && legalTargets.includes(sq)) {
      const move = game.move({ from: selected, to: sq, promotion: 'q' });
      if (move) {
        lastMove = move;
        if (api3) api3.playMove(move); else render2D();
      }
      selected = null; legalTargets = [];
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

  function refresh() {
    if (!api3) render2D();
    if (api3) api3.setSelection(selected, legalTargets, sq => game.get(sq));
    updateStatus();
    updateMoves();
  }

  function updateStatus() {
    turnEl.textContent = (game.turn() === 'w' ? 'WHITE' : 'BLACK') + ' TO MOVE';
    statusEl.classList.remove('alert');
    if (game.in_checkmate()) {
      statusEl.textContent = 'Checkmate. ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins. Brilliant finish.';
      statusEl.classList.add('alert');
    } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
      statusEl.textContent = 'The game is a draw.';
      statusEl.classList.add('alert');
    } else if (game.in_check()) {
      statusEl.textContent = (game.turn() === 'w' ? 'White' : 'Black') + ' is in check.';
      statusEl.classList.add('alert');
    } else {
      statusEl.textContent = selected
        ? 'Selected ' + selected + '. Tap a highlighted square.'
        : 'Tap a piece, then tap a highlighted square to move it.';
    }
  }

  function updateMoves() {
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

  const newBtn = document.getElementById('playNewGame');
  const undoBtn = document.getElementById('playUndo');
  if (newBtn) newBtn.addEventListener('click', () => {
    game.reset(); selected = null; legalTargets = []; lastMove = null;
    if (api3) api3.sync(game.board());
    refresh();
  });
  if (undoBtn) undoBtn.addEventListener('click', () => {
    game.undo(); selected = null; legalTargets = []; lastMove = null;
    if (api3) api3.sync(game.board());
    refresh();
  });

  /* ---------- attach the 3D stage when ready ---------- */
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

  refresh();
  try3D();
})();
