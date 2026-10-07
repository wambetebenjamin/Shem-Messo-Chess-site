/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · online play client
   ----------------------------------------------------------------------------
   Talks to server/server.js over a WebSocket so two people can play in real
   time, each on their own device.

   The server is authoritative: it validates every move with the same
   js/chess.js rules the board uses, and this client simply mirrors whatever
   state it is sent. If the socket cannot be reached the caller is told and the
   page falls back to pass-and-play rather than breaking.

   Usage:
     const net = SMCOnline.create({ onHello, onState, onMoved, ... });
     net.connect();
     net.createGame();            // -> onHello({ code, seat })
     net.joinGame('AB12C');
     net.move({ from:'e2', to:'e4' });
   Set window.SMC_ONLINE_URL to point at a server hosted somewhere else.
   ============================================================================ */
(function (root) {
  'use strict';

  function defaultUrl() {
    if (root.SMC_ONLINE_URL) return root.SMC_ONLINE_URL;
    if (!root.location) return 'ws://localhost:8080/ws';
    const secure = root.location.protocol === 'https:';
    return (secure ? 'wss://' : 'ws://') + root.location.host + '/ws';
  }

  function create(handlers) {
    const h = handlers || {};
    const api = {
      url: defaultUrl(),
      connected: false,
      code: null,
      seat: null
    };

    let ws = null;
    let closedByUs = false;
    let retries = 0;
    let reconnectTimer = null;
    const MAX_RETRIES = 6;

    function emit(name, payload) {
      if (typeof h[name] === 'function') {
        try { h[name](payload); } catch (e) { /* keep the socket alive */ }
      }
    }

    function send(obj) {
      if (!ws || ws.readyState !== 1) return false;
      try { ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
    }

    function handle(msg) {
      switch (msg.t) {
        case 'hello':
          api.code = msg.code;
          api.seat = msg.seat;
          emit('onHello', msg);
          break;
        case 'state':
          api.seat = msg.seat;
          emit('onState', msg);
          break;
        case 'moved':
          emit('onMoved', msg);
          emit('onState', { state: msg.state });
          break;
        case 'presence':
          emit('onPresence', msg);
          break;
        case 'chat':
          emit('onChat', msg);
          break;
        case 'ended':
          emit('onEnded', msg);
          if (msg.state) emit('onState', { state: msg.state });
          break;
        case 'rematch':
          emit('onRematch', msg);
          break;
        case 'restarted':
          emit('onRestarted', msg);
          emit('onState', { state: msg.state });
          break;
        case 'error':
          emit('onError', msg);
          break;
        case 'pong':
          break;
        default:
          break;
      }
    }

    function connect() {
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
      closedByUs = false;

      try {
        ws = new WebSocket(api.url);
      } catch (e) {
        emit('onUnavailable', { reason: 'WebSocket is not available in this browser.' });
        return;
      }

      ws.onopen = () => {
        api.connected = true;
        retries = 0;
        emit('onOpen', {});
        // if we were in a game, slip straight back into the same room
        if (api.code) send({ t: 'join', code: api.code });
      };

      ws.onmessage = ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        handle(msg);
      };

      ws.onerror = () => { /* onclose carries the recovery */ };

      ws.onclose = () => {
        api.connected = false;
        ws = null;
        emit('onClose', { willRetry: !closedByUs && retries < MAX_RETRIES });
        if (closedByUs) return;
        if (retries >= MAX_RETRIES) {
          emit('onUnavailable', { reason: 'Lost the connection to the game server.' });
          return;
        }
        const wait = Math.min(8000, 500 * Math.pow(2, retries));
        retries++;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, wait);
      };
    }

    api.connect = connect;

    api.disconnect = function () {
      closedByUs = true;
      clearTimeout(reconnectTimer);
      if (ws) { try { ws.close(); } catch (e) { /* already gone */ } }
      ws = null;
      api.connected = false;
      api.code = null;
      api.seat = null;
    };

    api.createGame = function () { return send({ t: 'create' }); };
    api.joinGame = function (code) {
      api.code = String(code || '').trim().toUpperCase();
      if (!api.connected) { connect(); return false; }
      return send({ t: 'join', code: api.code });
    };
    api.move = function (m) {
      return send({ t: 'move', from: m.from, to: m.to, promotion: m.promotion || 'q' });
    };
    api.chat = function (text) { return send({ t: 'chat', text: text }); };
    api.resign = function () { return send({ t: 'resign' }); };
    api.rematch = function () { return send({ t: 'rematch' }); };
    api.sync = function () { return send({ t: 'sync' }); };

    return api;
  }

  root.SMCOnline = { create: create, defaultUrl: defaultUrl };
})(window);
