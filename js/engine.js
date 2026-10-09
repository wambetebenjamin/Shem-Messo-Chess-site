/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · THE OTHER SIDE OF THE BOARD  (js/engine.js)
   ----------------------------------------------------------------------------
   A small alpha-beta search over chess.js so a learner can play a game with
   nobody else at the table. Material + piece-square tables + a few real
   patterns (doubled pawns, bishop pair, checks), move ordering by MVV-LVA,
   quiescence so it stops hanging pieces, and iterative deepening with a time
   budget so it always answers.

   The same file runs twice:
     · on the page, where js/play.js calls SMCEngine.think(fen, level)
     · inside a Web Worker, where it importScripts() chess.js and answers
       postMessage so the search never blocks painting
   No DOM, no globals beyond SMCEngine.
   ============================================================================ */
(function (global) {
  'use strict';

  var MATE = 100000;
  var VAL = { p: 100, n: 305, b: 320, r: 500, q: 900, k: 0 };

  /* tables from White's view, index 0 = a8 (chess.js board() order) */
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5, 5, 10, 25, 25, 10, 5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20]
  };

  var LEVELS = {
    /* warm-up lets a beginner win; club plays honest chess; tournament reads
       a few moves deep and answers as fast as the budget allows */
    warmup:     { depth: 1, q: 2, budget: 200,  jitter: 90, dice: 0.22, label: 'Warm-up' },
    club:       { depth: 2, q: 4, budget: 420,  jitter: 26, dice: 0,    label: 'Club' },
    tournament: { depth: 3, q: 6, budget: 1100, jitter: 0,  dice: 0,    label: 'Tournament' }
  };

  var now = (global.performance && performance.now)
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

  /* ---------------------------------------------------------------- eval */
  function evaluate(chess) {
    var board = chess.board();
    var score = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var cell = board[r][c];
        if (!cell) continue;
        var idx = (cell.color === 'w') ? (r * 8 + c) : ((7 - r) * 8 + c);
        var v = VAL[cell.type] + PST[cell.type][idx];
        score += (cell.color === 'w') ? v : -v;
      }
    }
    /* pawns: doubled and isolated are both weaknesses a coach would name */
    var files = { w: [0, 0, 0, 0, 0, 0, 0, 0], b: [0, 0, 0, 0, 0, 0, 0, 0] };
    var bishops = { w: 0, b: 0 };
    for (var r2 = 0; r2 < 8; r2++) {
      for (var c2 = 0; c2 < 8; c2++) {
        var p = board[r2][c2];
        if (!p) continue;
        if (p.type === 'p') files[p.color][c2]++;
        if (p.type === 'b') bishops[p.color]++;
      }
    }
    ['w', 'b'].forEach(function (color) {
      var sign = color === 'w' ? 1 : -1;
      for (var f = 0; f < 8; f++) {
        if (files[color][f] > 1) score -= sign * 12 * (files[color][f] - 1);
        if (files[color][f] > 0 &&
            (f === 0 || files[color][f - 1] === 0) &&
            (f === 7 || files[color][f + 1] === 0)) score -= sign * 12;
      }
      if (bishops[color] >= 2) score += sign * 28;
    });
    score += (chess.turn() === 'w' ? 8 : -8);   // tempo
    return score;
  }

  /* ------------------------------------------------------------- search */
  var nodes = 0, deadline = 0, aborted = false;

  function ordered(chess) {
    var ms = chess.moves({ verbose: true });
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      m._s = m.captured ? (VAL[m.captured] * 10 - VAL[m.piece]) : 0;
      if (m.promotion) m._s += 800;
      nodes++;
    }
    ms.sort(function (a, b) { return b._s - a._s; });
    return ms;
  }

  function quiesce(chess, alpha, beta, side, ply, cap) {
    if (aborted || ply > cap) return side * evaluate(chess);
    if ((nodes & 255) === 0 && now() > deadline) { aborted = true; return side * evaluate(chess); }
    var stand = side * evaluate(chess);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    var ms = chess.moves({ verbose: true });
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (!m.captured) continue;
      nodes++;
      chess.move(m);
      var sc = -quiesce(chess, -beta, -alpha, -side, ply + 1, cap);
      chess.undo();
      if (aborted) return alpha;
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  /* negamax. `side` is +1 when White is to move, and every score below is
     from the point of view of the player on the move */
  function search(chess, depth, alpha, beta, side, ply, qcap) {
    if (aborted) return alpha;
    if ((nodes & 255) === 0 && now() > deadline) { aborted = true; return alpha; }

    if (chess.in_checkmate()) return -MATE + ply;
    if (chess.in_stalemate() || chess.in_draw()) return 0;
    if (depth <= 0) return quiesce(chess, alpha, beta, side, 0, qcap);

    var best = -Infinity;
    var ms = ordered(chess);
    for (var i = 0; i < ms.length; i++) {
      chess.move(ms[i]);
      var sc = -search(chess, depth - 1, -beta, -alpha, -side, ply + 1, qcap);
      chess.undo();
      if (aborted) return best === -Infinity ? alpha : best;
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;                     // beta cutoff
    }
    return best;
  }

  /* --------------------------------------------------------------- root */
  function think(fen, levelKey) {
    var level = LEVELS[levelKey] || LEVELS.club;
    var chess = new global.Chess(fen);
    var replies = chess.moves({ verbose: true });
    if (!replies.length) return null;

    /* dice roll first, so a warm-up game stays winnable for a beginner */
    if (level.dice && Math.random() < level.dice) {
      var roll = replies[Math.floor(Math.random() * replies.length)];
      return { from: roll.from, to: roll.to, promotion: roll.promotion || 'q',
               san: roll.san, score: 0, depth: 0, nodes: 1, ms: 0, dice: true };
    }

    nodes = 0; aborted = false;
    var t0 = now();
    deadline = t0 + level.budget;
    var rootSide = chess.turn() === 'w' ? 1 : -1;

    var best = replies[0], bestScore = -Infinity, done = 0, roots = [];
    for (var d = 1; d <= level.depth; d++) {          // iterative deepening
      var alpha = -Infinity, local = null, scored = [];
      var ms = ordered(chess);
      for (var i = 0; i < ms.length; i++) {
        chess.move(ms[i]);
        var sc = -search(chess, d - 1, -Infinity, -alpha, -rootSide, 1, level.q);
        chess.undo();
        if (aborted) break;
        scored.push([ms[i], sc]);
        if (sc > alpha) { alpha = sc; local = ms[i]; }
      }
      if (local && !aborted) { best = local; bestScore = alpha; done = d; roots = scored; }
      if (aborted || bestScore >= MATE - 64) break;
    }

    /* loosen the choice a little at the easy levels: any move within `jitter`
       centipawns of the best one is acceptable, which is how a club player
       actually varies their games. the scores are already on the board from the
       last completed depth, so this costs nothing */
    var chosen = best;
    if (level.jitter > 0 && roots.length && bestScore < MATE - 64) {
      var pool = [];
      for (var j = 0; j < roots.length; j++) {
        if (roots[j][1] >= bestScore - level.jitter) pool.push(roots[j][0]);
      }
      if (pool.length) chosen = pool[Math.floor(Math.random() * pool.length)];
    }

    return { from: chosen.from, to: chosen.to, promotion: chosen.promotion || 'q',
             san: chosen.san, score: bestScore, depth: done, nodes: nodes,
             ms: Math.round(now() - t0) };
  }

  global.SMCEngine = { think: think, LEVELS: LEVELS, evaluate: evaluate };

  /* ------------------------------------------------------------ worker */
  if (typeof global.importScripts === 'function') {
    try { global.importScripts('chess.js'); } catch (e) { /* loaded by hand */ }
    global.onmessage = function (e) {
      var d = e.data || {};
      var out;
      try { out = think(d.fen, d.level); } catch (err) { out = null; }
      global.postMessage({ id: d.id, best: out });
    };
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
