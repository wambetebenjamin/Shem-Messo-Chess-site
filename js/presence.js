/* =============================================================================
   EFFECT-05 · COLLABORATIVE / PRESENCE LAYER
   js/presence.js

   Use case: during a live broadcast the room should feel like a room. People
   watching the same board see each other's pointers and reactions, which is
   the difference between "a diagram" and "a game other people are following".

   Design
     · optimistic local updates — your own cursor never waits for the server
     · WebSockets with exponential-backoff auto-reconnect
     · graceful single-visitor fallback: if no socket server is reachable the
       room falls back to a BroadcastChannel, so two tabs on the same device
       still sync, and a lone visitor is simply told they are alone
     · every presence decoration is aria-hidden; roster changes are announced
       through a polite live region instead
   ========================================================================== */
(function () {
  "use strict";

  var section = document.getElementById("live");
  if (!section) return;

  var KC = window.KC;
  var reduced = function () { return KC ? KC.motion.reduced : true; };

  var stage = section.querySelector("[data-presence-stage]");
  var layer = section.querySelector("[data-presence-layer]");
  var statusEl = section.querySelector("[data-presence-status]");
  var rosterEl = section.querySelector("[data-presence-roster]");
  var announceEl = section.querySelector("[data-presence-announce]");

  /* ---- identity --------------------------------------------------------- */
  var HANDLES = ["PawnStorm", "KnightRider", "BishopsEye", "RookLift", "QueenSac",
    "BackRank", "Zugzwang", "Fianchetto", "Tempo", "Endgame"];
  var COLORS = ["#1eaaf1", "#fda638", "#8cc152", "#f1453d", "#b98cf5", "#4fd6c0"];

  var me = { id: "", name: "", color: "" };
  try {
    var saved = sessionStorage.getItem("kc-presence");
    if (saved) me = JSON.parse(saved);
  } catch (e) {}
  if (!me.id) {
    me.id = "v" + Math.random().toString(36).slice(2, 9);
    me.name = HANDLES[Math.floor(Math.random() * HANDLES.length)] + " " + (Math.floor(Math.random() * 89) + 10);
    me.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    try { sessionStorage.setItem("kc-presence", JSON.stringify(me)); } catch (e) {}
  }

  var peers = {};        /* id → { id, name, color, x, y, el, last } */
  var url = section.getAttribute("data-ws") || "";
  var socket = null;
  var channel = null;
  var mode = "connecting";   /* connecting | live | solo | offline */
  var retries = 0;
  var retryTimer = 0;

  /* ---------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------- */
  function setStatus(state, text) {
    mode = state;
    if (statusEl) {
      statusEl.setAttribute("data-state", state);
      var label = statusEl.querySelector("[data-status-text]");
      if (label) label.textContent = text;
    }
  }

  function announce(msg) { if (announceEl) announceEl.textContent = msg; }

  function countText() {
    var n = Object.keys(peers).length + 1;
    return n + (n === 1 ? " person" : " people") + " on this board";
  }

  function renderRoster() {
    if (!rosterEl) return;
    var html = '<li><span class="swatch" style="background:' + me.color + '"></span>' +
      '<span class="who">' + me.name + '</span><span class="meta">you</span></li>';
    Object.keys(peers).forEach(function (id) {
      var p = peers[id];
      html += '<li><span class="swatch" style="background:' + p.color + '"></span>' +
        '<span class="who">' + p.name + '</span><span class="meta">' +
        (p.watching ? "watching" : "away") + "</span></li>";
    });
    rosterEl.innerHTML = html;
  }

  function cursorEl(p) {
    if (p.el) return p.el;
    var el = document.createElement("div");
    el.className = "presence__cursor";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M4 2l14 8-6 1.6L9.4 18 4 2z" fill="' + p.color + '" stroke="#04121f" stroke-width="1.2"/></svg>' +
      '<span class="presence__tag" style="--c:' + p.color + '">' + p.name + "</span>";
    layer.appendChild(el);
    p.el = el;
    return el;
  }

  function movePeer(p) {
    var el = cursorEl(p);
    el.style.setProperty("--x", (p.x * 100).toFixed(2) + "%");
    el.style.setProperty("--y", (p.y * 100).toFixed(2) + "%");
  }

  function dropPeer(id) {
    var p = peers[id];
    if (!p) return;
    if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    delete peers[id];
    renderRoster();
    announce(p.name + " left. " + countText() + ".");
  }

  function upsertPeer(msg) {
    var isNew = !peers[msg.id];
    var p = peers[msg.id] || { id: msg.id };
    p.name = msg.name || p.name || "Visitor";
    p.color = msg.color || p.color || "#1eaaf1";
    if (typeof msg.x === "number") p.x = Math.max(0, Math.min(1, msg.x));
    if (typeof msg.y === "number") p.y = Math.max(0, Math.min(1, msg.y));
    p.watching = typeof msg.x === "number" && msg.x >= 0;
    p.last = Date.now();
    peers[msg.id] = p;
    movePeer(p);
    if (p.el) p.el.style.opacity = p.watching ? "1" : "0";
    renderRoster();
    if (isNew) announce(p.name + " joined. " + countText() + ".");
  }

  /* Reactions float up from the board. Decorative; announced only for you. */
  function paintReaction(emoji, x, name) {
    if (!layer) return;
    var el = document.createElement("span");
    el.className = "presence__reaction";
    el.setAttribute("aria-hidden", "true");
    el.textContent = emoji;
    el.style.left = (x * 100).toFixed(1) + "%";
    layer.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-flying"); });
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
    if (name) announce(name + " reacted " + emoji);
  }

  /* ---------------------------------------------------------------------
     TRANSPORT
     --------------------------------------------------------------------- */
  function send(obj) {
    var payload = JSON.stringify(obj);
    if (socket && socket.readyState === 1) { try { socket.send(payload); } catch (e) {} }
    else if (channel) { try { channel.postMessage(obj); } catch (e) {} }
  }

  function onMessage(obj) {
    if (!obj || obj.id === me.id) return;
    if (obj.t === "hello" || obj.t === "move") upsertPeer(obj);
    else if (obj.t === "react") paintReaction(obj.emoji, typeof obj.x === "number" ? obj.x : 0.5, obj.name);
    else if (obj.t === "bye") dropPeer(obj.id);
    else if (obj.t === "sync") {
      /* A peer answering a newcomer: adopt their cursor. */
      upsertPeer(obj);
      send({ t: "hello", id: me.id, name: me.name, color: me.color, x: me.x || 0.5, y: me.y || 0.55 });
    }
  }

  function startChannel() {
    if (!("BroadcastChannel" in window)) { setStatus("offline", "Presence unavailable"); return; }
    channel = new BroadcastChannel("kc-live-room");
    channel.onmessage = function (e) { onMessage(e.data); };
    setStatus("solo", "Practice room · same-device sync");
    send({ t: "sync", id: me.id, name: me.name, color: me.color, x: me.x || 0.5, y: me.y || 0.55 });
    window.addEventListener("pagehide", function () { send({ t: "bye", id: me.id, name: me.name }); });
  }

  /* A static host (GitHub Pages, S3, …) has no socket server, and a blind
     connection would spend ~20s in backoff before giving up. One cheap HTTP
     probe decides which transport to use. */
  function resolveUrl(cb) {
    if (url && url !== "auto") { cb(url); return; }
    var scheme = location.protocol === "https:" ? "wss://" : "ws://";
    var candidate = scheme + location.host + "/presence";
    if (!window.fetch) { cb(""); return; }
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(""); } }, 1200);
    fetch("presence-health", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (done) return;
        done = true; clearTimeout(timer);
        cb(d && d.presence ? candidate : "");
      })
      .catch(function () { if (!done) { done = true; clearTimeout(timer); cb(""); } });
  }

  function connect() {
    if (!url) { startChannel(); return; }
    var ws;
    try { ws = new WebSocket(url); }
    catch (e) { startChannel(); return; }
    socket = ws;
    setStatus("connecting", "Connecting to the live room…");

    ws.onopen = function () {
      retries = 0;
      setStatus("live", "Live room connected");
      send({ t: "hello", id: me.id, name: me.name, color: me.color, x: me.x || 0.5, y: me.y || 0.55 });
      announce("Connected to the live room. " + countText() + ".");
    };
    ws.onmessage = function (e) {
      var obj = null;
      try { obj = JSON.parse(e.data); } catch (err) { return; }
      if (obj && obj.t === "peers" && Array.isArray(obj.list)) {
        obj.list.forEach(function (p) { if (p.id !== me.id) upsertPeer(p); });
        return;
      }
      onMessage(obj);
    };
    ws.onclose = function () {
      socket = null;
      setStatus("offline", "Reconnecting…");
      scheduleRetry();
    };
    ws.onerror = function () { /* onclose follows */ };
  }

  function scheduleRetry() {
    if (retryTimer) return;
    var delay = Math.min(8000, 600 * Math.pow(1.7, retries)) * (0.7 + Math.random() * 0.6);
    retries++;
    retryTimer = setTimeout(function () {
      retryTimer = 0;
      if (retries <= 4) { connect(); }
      else { startChannel(); }
    }, delay);
  }

  /* ---------------------------------------------------------------------
     LOCAL INPUT — optimistic: paint first, then broadcast (throttled)
     --------------------------------------------------------------------- */
  var lastSend = 0;
  function onPointer(e) {
    if (!stage) return;
    var r = stage.getBoundingClientRect();
    me.x = (e.clientX - r.left) / r.width;
    me.y = (e.clientY - r.top) / r.height;
    if (me.x < 0 || me.x > 1 || me.y < 0 || me.y > 1) return;
    var now = Date.now();
    if (now - lastSend < 55) return;
    lastSend = now;
    send({ t: "move", id: me.id, name: me.name, color: me.color, x: me.x, y: me.y });
  }

  if (stage) {
    stage.addEventListener("pointermove", onPointer, { passive: true });
    stage.addEventListener("pointerleave", function () {
      send({ t: "move", id: me.id, name: me.name, color: me.color, x: -1, y: -1 });
    });
  }

  /* EFFECT-12 · reaction buttons (aria-labelled) */
  Array.prototype.forEach.call(section.querySelectorAll("[data-react]"), function (btn) {
    btn.addEventListener("click", function () {
      var emoji = btn.getAttribute("data-react");
      var x = 0.3 + Math.random() * 0.4;
      paintReaction(emoji, x, null);
      send({ t: "react", id: me.id, name: me.name, emoji: emoji, x: x });
      announce("You reacted " + emoji);
      btn.classList.remove("is-firing");
      void btn.getBoundingClientRect();
      btn.classList.add("is-firing");
      setTimeout(function () { btn.classList.remove("is-firing"); }, 250);
    });
  });

  /* Stale peers are dropped so the roster never fills with ghosts. */
  setInterval(function () {
    var now = Date.now();
    Object.keys(peers).forEach(function (id) {
      if (now - (peers[id].last || 0) > 45000) dropPeer(id);
    });
  }, 12000);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) send({ t: "bye", id: me.id, name: me.name });
    else send({ t: "hello", id: me.id, name: me.name, color: me.color, x: me.x || 0.5, y: me.y || 0.55 });
  });

  /* ---------------------------------------------------------------------
     THE BOARD the room is watching (static broadcast position)
     --------------------------------------------------------------------- */
  function paintBoard() {
    var board = section.querySelector("[data-presence-board]");
    if (!board) return;
    var FEN = section.getAttribute("data-fen") ||
      "r2q1rk1/ppp2ppp/2n1bn2/2bpp3/3PP3/2P1BN2/PP1NBPPP/R2Q1RK1 w - - 6 8";
    var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
    var PIECES = {
      p: { w: "assets/pieces/wp.png", b: "assets/pieces/bp.png" },
      n: { w: "assets/pieces/wn.png", b: "assets/pieces/bn.png" },
      b: { w: "assets/pieces/wb.png", b: "assets/pieces/bb.png" },
      r: { w: "assets/pieces/wr.png", b: "assets/pieces/br.png" },
      q: { w: "assets/pieces/wq.png", b: "assets/pieces/bq.png" },
      k: { w: "assets/pieces/wk.png", b: "assets/pieces/bk.png" }
    };
    var g = null;
    if (typeof window.Chess === "function") { g = new window.Chess(FEN); }
    for (var r = 0; r < 8; r++) {
      for (var f = 0; f < 8; f++) {
        var sq = FILES[f] + (8 - r);
        var cell = document.createElement("div");
        cell.className = "board2d__sq " + ((r + f) % 2 ? "board2d__sq--dark" : "board2d__sq--light");
        var img = document.createElement("img");
        img.width = 64; img.height = 64; img.alt = ""; img.decoding = "async";
        var pc = g ? g.get(sq) : null;
        if (pc) { img.src = PIECES[pc.type][pc.color]; }
        else { img.style.visibility = "hidden"; }
        cell.appendChild(img);
        board.appendChild(cell);
      }
    }
    board.classList.add("board2d");
  }

  /* ---------------------------------------------------------------------
     BOOT — only once the section is actually on screen
     --------------------------------------------------------------------- */
  function start() {
    paintBoard();
    renderRoster();
    resolveUrl(function (resolved) { url = resolved; connect(); });
    /* A single visitor still gets an honest, useful message. */
    setTimeout(function () {
      if (Object.keys(peers).length === 0) {
        announce(mode === "live"
          ? "You are the only one in the room right now. " + countText() + "."
          : "Practice room: you are the only visitor, so presence is running locally. " + countText() + ".");
      }
    }, 1800);
  }

  if (KC) KC.onceInView(section, start, { threshold: 0.12 });
  else start();
})();
