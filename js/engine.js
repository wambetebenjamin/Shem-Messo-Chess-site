/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · chess engine
   ----------------------------------------------------------------------------
   The "play the computer" opponent. No external engine and no network: this is
   a small alpha-beta searcher written against the same js/chess.js rules the
   board already uses, so it can never suggest an illegal move.

   How it works
   ------------
   · Evaluate   material + piece-square tables, middlegame and endgame king
                tables, with a small bonus for tempo. Positive is good for the
                side to move (negamax convention).
   · Search     iterative deepening negamax with alpha-beta pruning, MVV-LVA
                capture ordering, killer moves and a quiescence search so it
                does not stop thinking in the middle of a capture sequence.
   · Strength   three levels that trade thinking time for depth, and at the
                easy level pick from the near-best moves so it varies its play.

   Runs on the main thread or inside js/engine.worker.js — it has no DOM and no
   window dependency, so both work unchanged.
   ============================================================================ */
(function (root) {
  'use strict';

  const P = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const MATE = 1000000;

  /* Piece-square tables, written from White's point of view in a8..h1 order,
     which matches chess.js board() row 0 = rank 8, column 0 = file a. */
  const PST = {
    p: [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 25, 25, 10,  5,  5,
       0,  0,  0, 20, 20,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-20,-20, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0],
    n: [
     -50,-40,-30,-30,-30,-30,-40,-50,
     -40,-20,  0,  0,  0,  0,-20,-40,
     -30,  0, 10, 15, 15, 10,  0,-30,
     -30,  5, 15, 20, 20, 15,  5,-30,
     -30,  0, 15, 20, 20, 15,  0,-30,
     -30,  5, 10, 15, 15, 10,  5,-30,
     -40,-20,  0,  5,  5,  0,-20,-40,
     -50,-40,-30,-30,-30,-30,-40,-50],
    b: [
     -20,-10,-10,-10,-10,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5, 10, 10,  5,  0,-10,
     -10,  5,  5, 10, 10,  5,  5,-10,
     -10,  0, 10, 10, 10, 10,  0,-10,
     -10, 10, 10, 10, 10, 10, 10,-10,
     -10,  5,  0,  0,  0,  0,  5,-10,
     -20,-10,-10,-10,-10,-10,-10,-20],
    r: [
       0,  0,  0,  0,  0,  0,  0,  0,
       5, 10, 10, 10, 10, 10, 10,  5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
       0,  0,  0,  5,  5,  0,  0,  0],
    q: [
     -20,-10,-10, -5, -5,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5,  5,  5,  5,  0,-10,
      -5,  0,  5,  5,  5,  5,  0, -5,
       0,  0,  5,  5,  5,  5,  0, -5,
     -10,  5,  5,  5,  5,  5,  0,-10,
     -10,  0,  5,  0,  0,  0,  0,-10,
     -20,-10,-10, -5, -5,-10,-10,-20],
    kMid: [
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -20,-30,-30,-40,-40,-30,-30,-20,
     -10,-20,-20,-20,-20,-20,-20,-10,
      20, 20,  0,  0,  0,  0, 20, 20,
      20, 30, 10,  0,  0, 10, 30, 20],
    kEnd: [
     -50,-40,-30,-20,-20,-30,-40,-50,
     -30,-20,-10,  0,  0,-10,-20,-30,
     -30,-10, 20, 30, 30, 20,-10,-30,
     -30,-10, 30, 40, 40, 30,-10,-30,
     -30,-10, 30, 40, 40, 30,-10,-30,
     -30,-10, 20, 30, 30, 20,-10,-30,
     -30,-30,  0,  0,  0,  0,-30,-30,
     -50,-30,-30,-30,-30,-30,-30,-50]
  };

  /* index into a PST for a chess.js row/col */
  const idx = (row, col) => row * 8 + col;
  const flip = i => i ^ 56; // mirror a square for Black

  /* ------------------------------------------------------------------ *
   * Evaluation
   * ------------------------------------------------------------------ */
  function evaluate(chess) {
    const b = chess.board();
    let material = 0, mid = 0, end = 0;
    let phase = 0; // 0 = endgame, 24 = opening

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = b[row][col];
        if (!cell) continue;
        const i = idx(row, col);
        const white = cell.color === 'w';
        const val = P[cell.type];
        const sq = white ? i : flip(i);

        material += white ? val : -val;

        if (cell.type === 'k') {
          mid += white ? PST.kMid[sq] : -PST.kMid[sq];
          end += white ? PST.kEnd[sq] : -PST.kEnd[sq];
        } else {
          mid += white ? PST[cell.type][sq] : -PST[cell.type][sq];
          end += white ? PST[cell.type][sq] : -PST[cell.type][sq];
          if (cell.type === 'n' || cell.type === 'b') phase += 1;
          else if (cell.type === 'r') phase += 2;
          else if (cell.type === 'q') phase += 4;
        }
      }
    }

    if (phase > 24) phase = 24;
    const positional = (mid * phase + end * (24 - phase)) / 24;
    const score = material + positional;

    // negamax: return from the point of view of the side to move
    return chess.turn() === 'w' ? score : -score;
  }

  /* ------------------------------------------------------------------ *
   * Move ordering
   * ------------------------------------------------------------------ */
  function scoreMove(chess, move, killers, ply) {
    let s = 0;
    if (move.captured) {
      // most valuable victim, least valuable aggressor
      s += 10 * P[move.captured] - P[move.piece] + 10000;
    }
    if (move.promotion) s += 8000 + P[move.promotion];
    const k = killers[ply];
    if (k && ((k[0] && k[0].from === move.from && k[0].to === move.to) ||
              (k[1] && k[1].from === move.from && k[1].to === move.to))) {
      s += 5000;
    }
    return s;
  }

  function orderMoves(chess, moves, killers, ply) {
    const scored = moves.map(m => ({ m, s: scoreMove(chess, m, killers, ply) }));
    scored.sort((a, b) => b.s - a.s);
    return scored.map(x => x.m);
  }

  /* ------------------------------------------------------------------ *
   * Search
   * ------------------------------------------------------------------ */
  function quiesce(chess, alpha, beta, ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) { ctx.aborted = true; return alpha; }

    const stand = evaluate(chess);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (chess.in_checkmate()) return -MATE;

    const captures = chess.moves({ verbose: true })
      .filter(m => m.captured || m.promotion);
    const ordered = orderMoves(chess, captures, ctx.killers, 0);

    for (let i = 0; i < ordered.length; i++) {
      chess.move(ordered[i]);
      const score = -quiesce(chess, -beta, -alpha, ctx);
      chess.undo();
      if (ctx.aborted) return alpha;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(chess, depth, alpha, beta, ply, ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) { ctx.aborted = true; return alpha; }

    const inCheck = chess.in_check();
    if (inCheck) depth++; // do not stop searching while the king is attacked

    if (depth <= 0) return quiesce(chess, alpha, beta, ctx);

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      return inCheck ? -MATE + ply : 0; // checkmate or stalemate
    }
    if (chess.in_draw() || chess.in_threefold_repetition()) return 0;

    const ordered = orderMoves(chess, moves, ctx.killers, ply);
    let best = -Infinity;

    for (let i = 0; i < ordered.length; i++) {
      const move = ordered[i];
      chess.move(move);
      const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, ctx);
      chess.undo();

      if (ctx.aborted) return best === -Infinity ? alpha : best;

      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        // a non-capture that refutes the position is worth trying early next time
        if (!move.captured) {
          if (!ctx.killers[ply]) ctx.killers[ply] = [];
          ctx.killers[ply].unshift({ from: move.from, to: move.to });
          ctx.killers[ply] = ctx.killers[ply].slice(0, 2);
        }
        break;
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ *
   * Levels
   * ------------------------------------------------------------------ */
  const LEVELS = {
    easy:   { maxDepth: 2, timeMs: 220,  spread: 55,  blunder: 0.55 },
    medium: { maxDepth: 3, timeMs: 800,  spread: 18,  blunder: 0.18 },
    hard:   { maxDepth: 6, timeMs: 1900, spread: 0,   blunder: 0 }
  };

  /* Pick a move for the position in `fen`.
     Returns { from, to, promotion, san } or null if there is nothing to play. */
  function think(fen, options) {
    const opts = options || {};
    const level = LEVELS[opts.level] || LEVELS.medium;
    const ChessCtor = opts.Chess || root.Chess;
    if (!ChessCtor) return null;

    const chess = new ChessCtor(fen);
    const legal = chess.moves({ verbose: true });
    if (!legal.length) return null;

    // only one legal move — no need to think about it
    if (legal.length === 1) return pack(legal[0]);

    const ctx = {
      nodes: 0,
      deadline: Date.now() + (opts.timeMs || level.timeMs),
      killers: [],
      aborted: false
    };

    let best = null;
    let bestScore = -Infinity;

    /* iterative deepening: depth 1 first so there is always an answer,
       then deeper while the clock allows */
    for (let depth = 1; depth <= level.maxDepth; depth++) {
      let localBest = null, localScore = -Infinity;
      const ordered = depth === 1
        ? orderMoves(chess, legal, ctx.killers, 0)
        : withFirst(legal, best);

      for (let i = 0; i < ordered.length; i++) {
        const move = ordered[i];
        chess.move(move);
        const score = -negamax(chess, depth - 1, -Infinity, -localScore, 1, ctx);
        chess.undo();

        if (ctx.aborted) break;

        if (score > localScore) {
          localScore = score;
          localBest = move;
        }
      }

      if (ctx.aborted && localBest === null) break; // nothing finished at this depth
      if (localBest) { best = localBest; bestScore = localScore; }
      if (ctx.aborted) break;
      if (bestScore > MATE - 1000) break; // a forced mate is found
    }

    if (!best) best = pickRandom(legal);

    /* easy/medium: sometimes choose from the moves that scored close to the
       best one, so the computer does not play the same reply every game */
    if (level.spread > 0 && !ctx.aborted) {
      best = vary(chess, legal, best, bestScore, level, ctx);
    }

    return pack(best);
  }

  function withFirst(moves, first) {
    if (!first) return moves;
    const rest = moves.filter(m => !(m.from === first.from && m.to === first.to && m.promotion === first.promotion));
    return [first].concat(rest);
  }

  function vary(chess, legal, best, bestScore, level, ctx) {
    const scored = [];
    for (let i = 0; i < legal.length; i++) {
      const move = legal[i];
      chess.move(move);
      const score = -negamax(chess, 0, -Infinity, Infinity, 1, {
        nodes: ctx.nodes, deadline: Date.now() + 400,
        killers: [], aborted: false
      });
      chess.undo();
      scored.push({ move, score });
    }
    const pool = scored.filter(x => x.score >= bestScore - level.spread);
    if (!pool.length) return best;
    if (Math.random() < level.blunder && pool.length > 1) {
      return pool[Math.floor(Math.random() * pool.length)].move;
    }
    return best;
  }

  function pickRandom(moves) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function pack(move) {
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q',
      san: move.san
    };
  }

  /* Expose a tiny "how good is this position" helper too — handy for a
     coaching sidebar later, and used by the engine's own tests. */
  root.SMCEngine = { think: think, evaluate: evaluate, LEVELS: LEVELS };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
