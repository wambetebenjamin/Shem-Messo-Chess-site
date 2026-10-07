/* ============================================================================
   KERICHO CHESS CLUB & ACADEMY · live play server
   ----------------------------------------------------------------------------
   One small Node process, no npm dependencies:
     · serves the static site out of the repository root
     · upgrades /ws to a WebSocket (RFC 6455, hand-rolled)
     · hosts real-time two-player games, room codes, and a little chat

   Moves are validated on the server with the same js/chess.js rules engine the
   browser uses, so a client can never push an illegal position onto the board.

   Run it:      node server/server.js
   Elsewhere:   PORT=8080 node server/server.js
   ============================================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Chess } = require('../js/chess.js');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');

/* ==========================================================================
   Static files
   ========================================================================== */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
};

function sendFile(req, res, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath.split('?')[0]);
  } catch (e) {
    res.writeHead(400); return res.end('Bad request');
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  // resolve inside ROOT only — no path traversal
  const filePath = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + rel);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ==========================================================================
   WebSocket (RFC 6455) — handshake, framing, ping/pong
   ========================================================================== */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // RFC 6455 magic string
const OP = { CONT: 0x0, TEXT: 0x1, BIN: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xA };

function handshake(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) return false;
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  return true;
}

/* encode a text frame for the server -> client direction (never masked) */
function frame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  header[0] = 0x80 | OP.TEXT; // FIN + text
  return Buffer.concat([header, payload]);
}

function closeFrame(code) {
  const b = Buffer.alloc(4);
  b[0] = 0x80 | OP.CLOSE;
  b[1] = 2;
  b.writeUInt16BE(code || 1000, 2);
  return b;
}

function pongFrame(payload) {
  const p = payload && payload.length ? payload : Buffer.alloc(0);
  const header = Buffer.alloc(2);
  header[0] = 0x80 | OP.PONG;
  header[1] = p.length;
  return Buffer.concat([header, p]);
}

/* Parse as many complete frames as the buffer holds. Keeps a partially
   received frame (and continues an unfinished fragmented message). */
function parseFrames(sock) {
  const buf = sock._buf;
  let offset = 0;

  while (true) {
    if (buf.length - offset < 2) break;
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let headLen = 2;

    if (len === 126) {
      if (buf.length - offset < 4) break;
      len = buf.readUInt16BE(offset + 2);
      headLen = 4;
    } else if (len === 127) {
      if (buf.length - offset < 10) break;
      const hi = buf.readUInt32BE(offset + 2);
      const lo = buf.readUInt32BE(offset + 6);
      if (hi !== 0) { sock.destroy(); return; } // far too large for us
      len = lo;
      headLen = 10;
    }

    let mask = null;
    if (masked) {
      if (buf.length - offset < headLen + 4) break;
      mask = buf.slice(offset + headLen, offset + headLen + 4);
      headLen += 4;
    }

    if (buf.length - offset < headLen + len) break; // frame not fully here yet

    const payload = Buffer.from(buf.slice(offset + headLen, offset + headLen + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    offset += headLen + len;

    if (opcode === OP.CLOSE) {
      sock.destroy();
      return;
    }
    if (opcode === OP.PING) {
      try { sock.write(pongFrame(payload)); } catch (e) { /* gone */ }
      continue;
    }
    if (opcode === OP.PONG) continue;

    if (opcode === OP.CONT) {
      if (!sock._frag) { sock.destroy(); return; }
      sock._frag.parts.push(payload);
      if (fin) {
        const full = Buffer.concat(sock._frag.parts).toString('utf8');
        const op = sock._frag.op;
        sock._frag = null;
        if (op === OP.TEXT) onMessage(sock, full);
      }
      continue;
    }

    if (opcode === OP.TEXT) {
      if (!fin) { sock._frag = { op: OP.TEXT, parts: [payload] }; continue; }
      onMessage(sock, payload.toString('utf8'));
      continue;
    }
    // binary frames are not part of this protocol
  }

  sock._buf = offset ? buf.slice(offset) : buf;
}

/* ==========================================================================
   Rooms
   ========================================================================== */
const rooms = new Map();
const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679'; // no O/0/I/1/S/5/B/8 confusion
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;             // sweep idle rooms after 6h
const MAX_CHAT = 60;

function newCode() {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return null;
}

function createRoom() {
  const code = newCode();
  if (!code) return null;
  const room = {
    code,
    game: new Chess(),
    seats: { w: null, b: null },
    sockets: new Set(),
    chat: [],
    result: null,
    rematch: { w: false, b: false },
    touched: Date.now()
  };
  rooms.set(code, room);
  return room;
}

function roomState(room) {
  return {
    code: room.code,
    fen: room.game.fen(),
    turn: room.game.turn(),
    moves: room.game.history(),
    over: room.game.game_over() || !!room.result,
    result: room.result,
    seats: { w: !!room.seats.w, b: !!room.seats.b },
    check: room.game.in_check(),
    rematch: room.rematch
  };
}

function send(sock, obj) {
  if (!sock || sock.destroyed) return;
  try { sock.write(frame(JSON.stringify(obj))); } catch (e) { /* gone */ }
}

function broadcast(room, obj) {
  room.sockets.forEach(s => send(s, obj));
}

function seatOf(room, sock) {
  if (room.seats.w === sock) return 'w';
  if (room.seats.b === sock) return 'b';
  return null;
}

function leaveRoom(sock) {
  const room = sock._room;
  if (!room) return;
  room.sockets.delete(sock);
  const seat = seatOf(room, sock);
  if (seat) {
    room.seats[seat] = null;
    broadcast(room, { t: 'presence', seats: roomState(room).seats, left: seat });
  }
  sock._room = null;
  // drop empty rooms straight away so codes can be reused
  if (room.sockets.size === 0) rooms.delete(room.code);
}

/* ==========================================================================
   Protocol
   ========================================================================== */
function onMessage(sock, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return send(sock, { t: 'error', message: 'Bad JSON' }); }
  if (!msg || typeof msg.t !== 'string') return;

  switch (msg.t) {
    /* ---- create a game, sit as white ---- */
    case 'create': {
      leaveRoom(sock);
      const room = createRoom();
      if (!room) return send(sock, { t: 'error', message: 'Could not create a game just now.' });
      room.sockets.add(sock);
      room.seats.w = sock;
      sock._room = room;
      room.touched = Date.now();
      send(sock, { t: 'hello', code: room.code, seat: 'w', state: roomState(room) });
      break;
    }

    /* ---- join an existing game ---- */
    case 'join': {
      const code = String(msg.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(sock, { t: 'error', message: 'No game found with code ' + code + '.' });

      let seat = null;
      if (!room.seats.w) { room.seats.w = sock; seat = 'w'; }
      else if (!room.seats.b) { room.seats.b = sock; seat = 'b'; }
      // both taken -> spectate

      leaveRoom(sock);
      room.sockets.add(sock);
      sock._room = room;
      room.touched = Date.now();
      send(sock, { t: 'hello', code: room.code, seat, state: roomState(room), chat: room.chat });
      broadcast(room, { t: 'presence', seats: roomState(room).seats, joined: seat });
      break;
    }

    /* ---- make a move ---- */
    case 'move': {
      const room = sock._room;
      if (!room) return send(sock, { t: 'error', message: 'You are not in a game.' });
      const seat = seatOf(room, sock);
      if (!seat) return send(sock, { t: 'error', message: 'You are watching this game, not playing it.' });
      // a resignation ends the game even though the position itself is not over
      if (room.game.game_over() || room.result) {
        return send(sock, { t: 'error', message: 'This game has finished.' });
      }
      if (room.game.turn() !== seat) return send(sock, { t: 'error', message: 'It is not your turn.' });

      const move = room.game.move({
        from: msg.from,
        to: msg.to,
        promotion: msg.promotion || 'q'
      });
      if (!move) return send(sock, { t: 'error', message: 'That move is not legal.' });

      room.touched = Date.now();
      room.rematch = { w: false, b: false };

      if (room.game.game_over()) {
        room.result = room.game.in_checkmate()
          ? (room.game.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate')
          : 'Draw';
      }

      broadcast(room, {
        t: 'moved',
        move: { from: move.from, to: move.to, san: move.san, color: move.color, flags: move.flags },
        state: roomState(room)
      });
      if (room.result) broadcast(room, { t: 'ended', result: room.result });
      break;
    }

    /* ---- resign ---- */
    case 'resign': {
      const room = sock._room;
      if (!room) return;
      const seat = seatOf(room, sock);
      if (!seat || room.game.game_over()) return;
      room.result = (seat === 'w' ? 'White' : 'Black') + ' resigned. ' +
                    (seat === 'w' ? 'Black' : 'White') + ' wins.';
      room.touched = Date.now();
      broadcast(room, { t: 'ended', result: room.result, state: roomState(room) });
      break;
    }

    /* ---- offer / accept a rematch ---- */
    case 'rematch': {
      const room = sock._room;
      if (!room) return;
      const seat = seatOf(room, sock);
      if (!seat) return;
      room.rematch[seat] = true;
      room.touched = Date.now();
      if (room.rematch.w && room.rematch.b) {
        room.game.reset();
        room.result = null;
        room.rematch = { w: false, b: false };
        broadcast(room, { t: 'restarted', state: roomState(room) });
      } else {
        broadcast(room, { t: 'rematch', rematch: room.rematch });
      }
      break;
    }

    /* ---- chat ---- */
    case 'chat': {
      const room = sock._room;
      if (!room) return;
      const seat = seatOf(room, sock);
      const text = String(msg.text || '').slice(0, 200).trim();
      if (!text) return;
      const line = { seat, text, ts: Date.now() };
      room.chat.push(line);
      if (room.chat.length > MAX_CHAT) room.chat.shift();
      room.touched = Date.now();
      broadcast(room, { t: 'chat', line });
      break;
    }

    /* ---- ask for the current state (reconnect, resync) ---- */
    case 'sync': {
      const room = sock._room;
      if (!room) return send(sock, { t: 'error', message: 'You are not in a game.' });
      send(sock, { t: 'state', state: roomState(room), seat: seatOf(room, sock), chat: room.chat });
      break;
    }

    case 'ping':
      send(sock, { t: 'pong' });
      break;

    default:
      send(sock, { t: 'error', message: 'Unknown message: ' + msg.t });
  }
}

/* ==========================================================================
   Server
   ========================================================================== */
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }
  sendFile(req, res, req.url);
});

server.on('upgrade', (req, socket) => {
  if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }
  const pathname = (req.url || '').split('?')[0];
  if (pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  if (!handshake(req, socket)) { socket.destroy(); return; }

  socket.setNoDelay(true);
  socket._buf = Buffer.alloc(0);
  socket._frag = null;
  socket._room = null;
  socket._alive = true;

  socket.on('data', chunk => {
    socket._alive = true;
    socket._buf = Buffer.concat([socket._buf, chunk]);
    if (socket._buf.length > 1 << 20) { socket.destroy(); return; } // 1MB guard
    try { parseFrames(socket); } catch (e) { try { socket.destroy(); } catch (e2) {} }
  });

  socket.on('error', () => leaveRoom(socket));
  socket.on('close', () => leaveRoom(socket));
  socket.on('end', () => leaveRoom(socket));
});

/* heartbeat + idle room sweep */
setInterval(() => {
  const now = Date.now();
  rooms.forEach(room => {
    room.sockets.forEach(sock => {
      if (!sock._alive) { try { sock.terminate ? sock.terminate() : sock.destroy(); } catch (e) {} return; }
      sock._alive = false;
      try { sock.write(pongFrame(Buffer.alloc(0))); } catch (e) {}
    });
    if (now - room.touched > ROOM_TTL_MS && room.sockets.size === 0) rooms.delete(room.code);
  });
}, 30000).unref();

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('Kericho Chess live server → http://' + HOST + ':' + PORT);
    console.log('  static root : ' + ROOT);
    console.log('  websocket   : /ws');
  });
}

module.exports = { server, rooms, roomState };
