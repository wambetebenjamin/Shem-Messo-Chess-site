/* =============================================================================
   EFFECT-02 · SCROLLYTELLING GAME REPLAY  +  EFFECT-20 backdrops  +  EFFECT-26
   js/replay.js

   Use case: teach the shape of a classic game — opening, middlegame, tactics,
   endgame — without a video host. Scroll advances the board; the wheel is
   never intercepted or slowed.

   · EFFECT-02  pinned board + four narrative beats driven by scroll
   · EFFECT-20  per-beat animated chessboard-pattern backdrop, aria-hidden,
                first frame static under reduced motion
   · EFFECT-26  sidebar move cards reveal notation detail on hover /
                focus-visible, with a tap equivalent on touch
   · EFFECT-22  "Open in analysis board" performs an in-page View Transition
                into a playable analysis board and moves focus to its heading
   ========================================================================== */
(function () {
  "use strict";

  var section = document.getElementById("replay");
  if (!section) return;

  var KC = window.KC;
  var reduced = function () { return KC ? KC.motion.reduced : true; };

  /* ---------------------------------------------------------------------
     THE GAME — Morphy vs Duke Karl of Brunswick & Count Isouard,
     Paris 1858 ("the Opera Game"). Public domain, and short enough that a
     visitor can follow every beat without scrubbing.
     --------------------------------------------------------------------- */
  var PGN = [
    "e4", "e5", "Nf3", "d6", "d4", "Bg4", "dxe5", "Bxf3",
    "Qxf3", "dxe5", "Bc4", "Nf6", "Qb3", "Qe7", "Nc3", "c6",
    "Bg5", "b5", "Nxb5", "cxb5", "Bxb5+", "Nbd7", "O-O-O", "Rd8",
    "Rxd7", "Rxd7", "Rd1", "Qe6", "Bxd7+", "Nxd7", "Qb8+", "Nxb8", "Rd8#"
  ];

  var BEATS = [
    {
      key: "Opening",
      title: "The opening: development before anything else",
      text: "Morphy opens with 1.e4 and answers 1...e5 with 2.Nf3, hitting the e5 pawn. Black's 2...d6 is passive and 3.d4 strikes in the centre immediately. By move four White has three pieces out and Black has one.",
      eval: 18,
      cards: [
        { san: "1.e4", note: "Takes the centre and frees the f1 bishop and d1 queen.", v: "52%" },
        { san: "3.d4", note: "Opens the centre while Black is still undeveloped. A pawn offer Black cannot safely take.", v: "61%" },
        { san: "4.dxe5", note: "Wins a pawn and, more importantly, drags the black bishop away from the defence.", v: "66%" }
      ]
    },
    {
      key: "Middlegame",
      title: "The middlegame: trade on your own terms",
      text: "4...Bxf3 5.Qxf3 looks like relief for Black, but it simply hands White a developed queen. 6.Bc4 aims at f7, and 7.Qb3 hits b7 and f7 at the same time — two threats from one square.",
      eval: 62,
      cards: [
        { san: "5.Qxf3", note: "White recaptures with the queen: the same move develops a piece.", v: "63%" },
        { san: "6.Bc4", note: "The bishop lands on the weak f7 square, right in front of the black king.", v: "70%" },
        { san: "7.Qb3", note: "A double attack: b7 hangs and f7 is hit a second time.", v: "78%" }
      ]
    },
    {
      key: "Tactics",
      title: "The tactics: remove the defender",
      text: "8.Nc3 c6 9.Bg5 pins nothing yet but loads the d-file. 10.Nxb5! sacrifices a knight to open the c-file and the b5 square, 11.Bxb5+ pins the c6 pawn's replacement, and 12.O-O-O puts the rook opposite the black queen. Every piece has a job.",
      eval: 86,
      cards: [
        { san: "10.Nxb5", note: "A knight offer. Declining leaves White a pawn up with a bind; accepting opens the position.", v: "84%" },
        { san: "11.Bxb5+", note: "Check first, so Black cannot defend the knight on d7 in peace.", v: "90%" },
        { san: "12.O-O-O", note: "Castling as an attacking move: the rook joins the d-file with tempo.", v: "93%" }
      ]
    },
    {
      key: "Endgame",
      title: "The finish: mate with two pieces and a file",
      text: "13.Rxd7! removes the only defender of d8. After 13...Rxd7 14.Rd1 the pin is absolute, 15.Bxd7+ rips away the last guard, and 16.Qb8+! forces 16...Nxb8 so that 17.Rd8 is mate. The whole game is one long argument about the d-file.",
      eval: 100,
      cards: [
        { san: "13.Rxd7", note: "Deflection: the rook that guards d8 is removed with check-free force.", v: "97%" },
        { san: "15.Bxd7+", note: "The last defender of the back rank disappears.", v: "99%" },
        { san: "17.Rd8#", note: "Back-rank mate. The king never left e8.", v: "100%" }
      ]
    }
  ];

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  var PIECES = {
    p: { w: "assets/pieces/wp.png", b: "assets/pieces/bp.png" },
    n: { w: "assets/pieces/wn.png", b: "assets/pieces/bn.png" },
    b: { w: "assets/pieces/wb.png", b: "assets/pieces/bb.png" },
    r: { w: "assets/pieces/wr.png", b: "assets/pieces/br.png" },
    q: { w: "assets/pieces/wq.png", b: "assets/pieces/bq.png" },
    k: { w: "assets/pieces/wk.png", b: "assets/pieces/bk.png" }
  };
  var NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

  var hasEngine = typeof window.Chess === "function";
  var game = null;
  if (hasEngine) {
    game = new window.Chess();
    for (var i = 0; i < PGN.length; i++) {
      try { game.move(PGN[i]); } catch (e) { break; }
    }
  }
  var plies = hasEngine ? (game.history({ verbose: true })) : [];

  /* ---------------------------------------------------------------------
     BEAT RANGES (1-based ply numbers, inclusive)
     --------------------------------------------------------------------- */
  var RANGES = [[1, 8], [9, 16], [17, 24], [25, 33]];
  var total = PGN.length;

  /* ---------------------------------------------------------------------
     DOM
     --------------------------------------------------------------------- */
  var boardEl = section.querySelector("[data-replay-board]");
  var plyEl = section.querySelector("[data-replay-ply]");
  var cardsEl = section.querySelector("[data-replay-cards]");
  var beatEls = Array.prototype.slice.call(section.querySelectorAll(".beat"));
  var prevBtn = section.querySelector("[data-replay-prev]");
  var nextBtn = section.querySelector("[data-replay-next]");
  var resetBtn = section.querySelector("[data-replay-reset]");
  var analyseBtn = section.querySelector("[data-replay-analyse]");
  var statusEl = section.querySelector("[data-replay-status]");

  var currentPly = 0;   /* 0 = starting position */
  var activeBeat = -1;

  /* ---------------------------------------------------------------------
     EFFECT-20 · per-beat animated chessboard-pattern backdrop
     Built here so the markup stays small; aria-hidden and decorative.
     --------------------------------------------------------------------- */
  function buildBackdrops() {
    beatEls.forEach(function (beat, bi) {
      var bg = document.createElement("div");
      bg.className = "beat-bg";
      bg.setAttribute("aria-hidden", "true");
      var NS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

      var defs = document.createElementNS(NS, "defs");
      var pat = document.createElementNS(NS, "pattern");
      pat.setAttribute("id", "beatpat" + bi);
      pat.setAttribute("width", "12.5");
      pat.setAttribute("height", "12.5");
      pat.setAttribute("patternUnits", "userSpaceOnUse");
      var base = document.createElementNS(NS, "rect");
      base.setAttribute("width", "12.5"); base.setAttribute("height", "12.5");
      base.setAttribute("fill", "rgba(234,242,250,.035)");
      var sq = document.createElementNS(NS, "rect");
      sq.setAttribute("width", "6.25"); sq.setAttribute("height", "6.25");
      sq.setAttribute("fill", "rgba(234,242,250,.055)");
      var sq2 = document.createElementNS(NS, "rect");
      sq2.setAttribute("x", "6.25"); sq2.setAttribute("y", "6.25");
      sq2.setAttribute("width", "6.25"); sq2.setAttribute("height", "6.25");
      sq2.setAttribute("fill", "rgba(234,242,250,.055)");
      pat.appendChild(base); pat.appendChild(sq); pat.appendChild(sq2);
      defs.appendChild(pat);
      svg.appendChild(defs);

      var full = document.createElementNS(NS, "rect");
      full.setAttribute("width", "100"); full.setAttribute("height", "100");
      full.setAttribute("fill", "url(#beatpat" + bi + ")");
      svg.appendChild(full);

      /* A handful of tiles pulse; the rest of the pattern stays put. */
      var spots = [[6, 10], [30, 4], [56, 18], [82, 8], [18, 62], [44, 74], [70, 58], [90, 82], [2, 40], [60, 90]];
      spots.forEach(function (s, i) {
        var t = document.createElementNS(NS, "rect");
        t.setAttribute("x", s[0]); t.setAttribute("y", s[1]);
        t.setAttribute("width", "12.5"); t.setAttribute("height", "12.5");
        t.setAttribute("class", "beat-bg__tile");
        t.style.setProperty("--i", i);
        svg.appendChild(t);
      });

      bg.appendChild(svg);
      beat.insertBefore(bg, beat.firstChild);
    });
  }

  /* ---------------------------------------------------------------------
     BOARD RENDERING
     The 64 squares are built once and then updated in place, so a ply
     change never re-lays out the grid.
     --------------------------------------------------------------------- */
  var cells = {};
  function buildBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = "";
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = FILES[f] + (8 - r);
        var cell = document.createElement("div");
        cell.className = "board2d__sq " + ((r + f) % 2 ? "board2d__sq--dark" : "board2d__sq--light");
        cell.dataset.sq = sq;
        var img = document.createElement("img");
        img.src = "";
        img.alt = "";
        img.width = 64; img.height = 64;
        img.loading = "eager";
        img.decoding = "async";
        img.style.visibility = "hidden";
        cell.appendChild(img);
        if (r === 7 || f === 0) {
          var c = document.createElement("span");
          c.className = "coord";
          c.setAttribute("aria-hidden", "true");
          c.textContent = (r === 7 ? FILES[f] : 8 - r);
          cell.appendChild(c);
        }
        boardEl.appendChild(cell);
        cells[sq] = cell;
      }
    }
  }

  function positionAt(ply) {
    /* Board state after `ply` moves. */
    if (!hasEngine) return null;
    var g = new window.Chess();
    for (var i = 0; i < ply; i++) {
      try { g.move(PGN[i]); } catch (e) { break; }
    }
    return g;
  }

  function paintBoard(ply) {
    if (!boardEl) return;
    var g = positionAt(ply);
    if (!g) return;
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = FILES[f] + (8 - r);
        var cell = cells[sq];
        if (!cell) continue;
        var pc = g.get(sq);
        var img = cell.querySelector("img");
        cell.classList.remove("is-from", "is-to", "is-flash");
        if (!pc) {
          img.style.visibility = "hidden";
          img.removeAttribute("src");
          img.alt = "";
        } else {
          if (img.getAttribute("src") !== PIECES[pc.type][pc.color]) img.src = PIECES[pc.type][pc.color];
          img.alt = "";  /* the board is described by its own aria-label */
          img.style.visibility = "visible";
        }
      }
    }
    var last = plies[ply - 1];
    if (last) {
      if (cells[last.from]) cells[last.from].classList.add("is-from", "is-flash");
      if (cells[last.to]) cells[last.to].classList.add("is-to", "is-flash");
    }
    if (statusEl) {
      statusEl.textContent = "Move " + ply + " of " + total + ". " +
        (ply === 0 ? "Starting position." : "Last move " + PGN[ply - 1] + ".");
    }
  }

  function beatForPly(ply) {
    for (var i = 0; i < RANGES.length; i++) {
      if (ply >= RANGES[i][0] - 1 && ply <= RANGES[i][1]) return i;
    }
    return RANGES.length - 1;
  }

  function setPly(ply) {
    ply = Math.max(0, Math.min(total, ply));
    if (ply === currentPly) return;
    currentPly = ply;
    paintBoard(ply);
    if (plyEl) {
      plyEl.textContent = ply === 0
        ? "Start · 0 / " + total
        : "Move " + Math.ceil(ply / 2) + (ply % 2 ? " (White)" : " (Black)") + " · " + ply + " / " + total;
    }
    var b = beatForPly(ply);
    if (b !== activeBeat) { activeBeat = b; setBeat(b); }
    highlightCard();
  }

  function setBeat(i) {
    beatEls.forEach(function (el, n) { el.classList.toggle("is-active", n === i); });
    renderCards(i);
  }

  /* EFFECT-26 · move cards (hover / focus-visible / tap) */
  function renderCards(i) {
    if (!cardsEl) return;
    var beat = BEATS[i];
    cardsEl.innerHTML = "";
    beat.cards.forEach(function (c, n) {
      var el = document.createElement("article");
      el.className = "movecard";
      el.setAttribute("data-tap-reveal", "");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", c.san + ". " + c.note + " Evaluation " + c.v + ".");
      el.innerHTML =
        '<span class="movecard__no">' + BEATS[i].key.slice(0, 3).toUpperCase() + " " + (n + 1) + "</span>" +
        '<span class="movecard__san">' + c.san + "</span>" +
        '<span class="movecard__eval" aria-hidden="true"><i style="--v:' + c.v + '"></i></span>' +
        '<span class="movecard__note">' + c.note + "</span>";
      /* Jumping to the move is a real link-like action, keyboard reachable. */
      el.addEventListener("click", function () {
        var idx = PGN.indexOf(c.san);
        if (idx > -1) goToPly(idx + 1);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          var idx = PGN.indexOf(c.san);
          if (idx > -1) goToPly(idx + 1);
        }
      });
      cardsEl.appendChild(el);
    });
  }

  function highlightCard() {
    if (!cardsEl) return;
    var san = PGN[currentPly - 1];
    Array.prototype.forEach.call(cardsEl.children, function (el) {
      el.classList.toggle("is-current", !!san && el.querySelector(".movecard__san").textContent === san);
    });
  }

  /* ---------------------------------------------------------------------
     SCROLL MAPPING — passive only, wheel speed is untouched
     --------------------------------------------------------------------- */
  var focusLine = 0.45;
  var ticking = false;

  function readScroll() {
    ticking = false;
    if (!beatEls.length) return;
    var focus = window.innerHeight * focusLine;
    var best = 0, bestDist = Infinity, local = 0;
    for (var i = 0; i < beatEls.length; i++) {
      var rect = beatEls[i].getBoundingClientRect();
      if (rect.top <= focus && rect.bottom >= focus) {
        best = i;
        local = (focus - rect.top) / Math.max(1, rect.height);
        bestDist = 0;
        break;
      }
      var d = rect.top < focus ? focus - rect.bottom : rect.top - focus;
      if (d < bestDist) { bestDist = d; best = i; local = rect.top < focus ? 1 : 0; }
    }
    var range = RANGES[best];
    var span = range[1] - (range[0] - 1);
    var ply = Math.round((range[0] - 1) + local * span);
    setPly(ply);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(readScroll);
  }

  function goToPly(ply) {
    /* Scroll is the single source of truth: the buttons move the page to the
       position that produces this ply, so the two never disagree. */
    ply = Math.max(0, Math.min(total, ply));
    var b = beatForPly(ply);
    var beat = beatEls[b];
    if (!beat) { setPly(ply); return; }
    var range = RANGES[b];
    var span = range[1] - (range[0] - 1) || 1;
    var local = (ply - (range[0] - 1)) / span;
    var rect = beat.getBoundingClientRect();
    var top = window.scrollY + rect.top + local * rect.height - window.innerHeight * focusLine;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------------------
     EFFECT-22 · replay → analysis board (in-page View Transition)
     --------------------------------------------------------------------- */
  var analysisEl = section.querySelector("[data-analysis]");
  var analysing = false;

  function buildAnalysis() {
    if (!analysisEl || analysisEl.dataset.built) return;
    var grid = analysisEl.querySelector("[data-analysis-board]");
    var note = analysisEl.querySelector("[data-analysis-note]");
    var undoBtn = analysisEl.querySelector("[data-analysis-undo]");
    var resetBtnA = analysisEl.querySelector("[data-analysis-reset]");
    if (!grid) return;

    var g = new window.Chess();
    var sel = null;
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", "Analysis board");

    function squares() { return Array.prototype.slice.call(grid.children); }

    function label(sq) {
      var p = g.get(sq);
      return sq + (p ? ", " + (p.color === "w" ? "white " : "black ") + NAMES[p.type] : ", empty");
    }

    function paint() {
      squares().forEach(function (btn) {
        var sq = btn.dataset.sq;
        var p = g.get(sq);
        var img = btn.querySelector("img");
        btn.classList.remove("is-sel", "is-target", "is-last");
        if (p) {
          if (img.getAttribute("src") !== PIECES[p.type][p.color]) img.src = PIECES[p.type][p.color];
          img.style.visibility = "visible";
        } else {
          img.style.visibility = "hidden";
          img.removeAttribute("src");
        }
        btn.setAttribute("aria-label", label(sq));
      });
      if (sel) {
        var s = grid.querySelector('[data-sq="' + sel + '"]');
        if (s) s.classList.add("is-sel");
        g.moves({ square: sel, verbose: true }).forEach(function (m) {
          var t = grid.querySelector('[data-sq="' + m.to + '"]');
          if (t) t.classList.add("is-target");
        });
      }
      if (note) {
        note.textContent = g.in_checkmate() ? "Checkmate. " + (g.turn() === "w" ? "Black" : "White") + " wins."
          : g.in_check() ? (g.turn() === "w" ? "White" : "Black") + " is in check."
          : (g.turn() === "w" ? "White" : "Black") + " to move.";
      }
    }

    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = FILES[f] + (8 - r);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "board2d__sq " + ((r + f) % 2 ? "board2d__sq--dark" : "board2d__sq--light");
        btn.dataset.sq = sq;
        btn.setAttribute("aria-label", label(sq));
        var img = document.createElement("img");
        img.src = ""; img.alt = ""; img.width = 64; img.height = 64;
        img.style.visibility = "hidden";
        btn.appendChild(img);
        grid.appendChild(btn);
      }
    }
    grid.classList.add("board2d", "board2d--playable");

    grid.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button[data-sq]") : null;
      if (!btn) return;
      var sq = btn.dataset.sq;
      if (sel) {
        var move = null;
        try { move = g.move({ from: sel, to: sq, promotion: "q" }); } catch (err) { move = null; }
        sel = null;
        if (!move) {
          var p = g.get(sq);
          if (p && p.color === g.turn()) sel = sq;
        }
      } else {
        var pc = g.get(sq);
        if (pc && pc.color === g.turn()) sel = sq;
      }
      paint();
    });

    if (undoBtn) undoBtn.addEventListener("click", function () { g.undo(); sel = null; paint(); });
    if (resetBtnA) resetBtnA.addEventListener("click", function () { g.reset(); sel = null; paint(); });

    analysisEl.dataset.built = "1";
    paint();
  }

  function swapToAnalysis() {
    if (!analysisEl) return;
    buildAnalysis();
    var heading = analysisEl.querySelector("h3");
    var run = function () {
      analysing = true;
      section.querySelector("[data-replay-panel]").hidden = true;
      analysisEl.hidden = false;
    };
    if (KC && KC.swap) {
      KC.swap(run, {
        focus: heading,
        message: "Analysis board open. The position from the replay is on the board; move pieces freely."
      });
    } else { run(); }
  }

  function swapBackToReplay() {
    if (!analysisEl) return;
    var run = function () {
      analysing = false;
      analysisEl.hidden = true;
      section.querySelector("[data-replay-panel]").hidden = false;
    };
    if (KC && KC.swap) {
      KC.swap(run, { focus: section.querySelector("h2"), message: "Back to the game replay." });
    } else { run(); }
  }

  /* ---------------------------------------------------------------------
     BOOT
     --------------------------------------------------------------------- */
  function init() {
    buildBackdrops();
    buildBoard();
    setPly(0);
    setBeat(0);

    if (boardEl) {
      boardEl.setAttribute("role", "img");
      boardEl.setAttribute("aria-label",
        "Interactive board showing the Opera Game, Morphy against the Duke of Brunswick and Count Isouard, Paris 1858. " +
        "The board advances as you scroll through the four chapters below.");
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    readScroll();

    if (prevBtn) prevBtn.addEventListener("click", function () { goToPly(currentPly - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goToPly(currentPly + 1); });
    if (resetBtn) resetBtn.addEventListener("click", function () { goToPly(0); });
    if (analyseBtn && hasEngine) analyseBtn.addEventListener("click", swapToAnalysis);
    else if (analyseBtn) analyseBtn.hidden = true;

    var backBtn = section.querySelector("[data-analysis-back]");
    if (backBtn) backBtn.addEventListener("click", swapBackToReplay);

    /* Reduced motion: every beat is visible (CSS drops the dimming) and the
       board still tracks scroll — it just changes instantly with no flash. */
    if (KC) {
      document.addEventListener("kc:motion", function () { paintBoard(currentPly); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
