#!/usr/bin/env node
/* =============================================================================
   DEV SERVER · static files + the EFFECT-05 presence WebSocket
   server/server.js   (zero dependencies — Node 18+)

     node server/server.js             → http://0.0.0.0:4173

   The presence socket shares the HTTP port, so the page can simply connect to
   ws(s)://<same-host>/presence with no configuration. Deployed as plain static
   files (GitHub Pages, for example) the socket 404s or refuses, and the
   presence layer falls back to BroadcastChannel — that path is tested first and
   is the one most visitors will see.

   Wire protocol (JSON, one object per message):
     → {t:"hello"|"move", id, name, color, x, y}   announce / move a cursor
     → {t:"react", id, name, emoji, x}             float a reaction
     → {t:"bye", id}                               leaving
     ← {t:"peers", list:[…]}                       sent once, on join
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4"
};

/* ------------------------------------------------------------------ static */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  /* The presence layer asks this before opening a socket, so a static deploy
     (no socket server) falls back instantly instead of retrying. */
  if (url.pathname === "/presence-health") {
    const body = JSON.stringify({ presence: true, peers: room.size });
    res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";

  const file = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ""));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found: " + rel);
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(file).pipe(res);
  });
});

/* --------------------------------------------------------------- websocket */
const room = new Map();   /* socket → { id, name, color, x, y } */

function acceptKey(key) {
  return crypto.createHash("sha1").update(key + GUID).digest("base64");
}

function frame(opcode, payload) {
  const data = Buffer.from(payload);
  const len = data.length;
  let head;
  if (len < 126) {
    head = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode; head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode; head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, data]);
}

function broadcast(payload, except) {
  const buf = frame(1, payload);
  for (const sock of room.keys()) {
    if (sock === except) continue;
    try { sock.write(buf); } catch (e) { /* gone */ }
  }
}

server.on("upgrade", (req, socket) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/presence") { socket.destroy(); return; }

  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }

  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + acceptKey(key) + "\r\n\r\n"
  );
  socket.setNoDelay(true);

  const peer = { id: "", name: "", color: "", x: 0.5, y: 0.5 };
  room.set(socket, peer);

  /* Send the newcomer everyone else, so cursors appear without a round trip. */
  try {
    socket.write(frame(1, JSON.stringify({
      t: "peers",
      list: Array.from(room.entries())
        .filter(([s]) => s !== socket)
        .map(([, p]) => p)
        .filter((p) => p.id)
    })));
  } catch (e) {}

  let buffer = Buffer.alloc(0);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    /* A presence message is a few dozen bytes; one pass per chunk is plenty. */
    for (;;) {
      if (buffer.length < 2) return;
      const fin = (buffer[0] & 0x80) !== 0;
      const opcode = buffer[0] & 0x0f;
      const masked = (buffer[1] & 0x80) !== 0;
      let len = buffer[1] & 0x7f;
      let off = 2;

      if (len === 126) {
        if (buffer.length < 4) return;
        len = buffer.readUInt16BE(2); off = 4;
      } else if (len === 127) {
        if (buffer.length < 10) return;
        len = Number(buffer.readBigUInt64BE(2)); off = 10;
      }
      if (!fin) { socket.destroy(); return; }   /* no fragmentation needed */
      const maskKey = masked ? buffer.slice(off, off + 4) : null;
      if (masked) off += 4;
      if (buffer.length < off + len) return;

      let payload = buffer.slice(off, off + len);
      if (maskKey) {
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i & 3];
      }
      buffer = buffer.slice(off + len);

      if (opcode === 0x8) { socket.end(); return; }
      if (opcode === 0x9) { try { socket.write(frame(0x0a, payload)); } catch (e) {} continue; }
      if (opcode !== 0x1) continue;

      let msg;
      try { msg = JSON.parse(payload.toString("utf8")); } catch (e) { continue; }
      if (!msg || typeof msg !== "object") continue;

      if (msg.t === "hello" || msg.t === "move") {
        peer.id = String(msg.id || "").slice(0, 40);
        peer.name = String(msg.name || "Visitor").slice(0, 40);
        peer.color = String(msg.color || "#1eaaf1").slice(0, 20);
        peer.x = Number(msg.x) || 0;
        peer.y = Number(msg.y) || 0;
        broadcast(JSON.stringify(peer), socket);
      } else if (msg.t === "react") {
        broadcast(JSON.stringify({
          t: "react",
          id: String(msg.id || "").slice(0, 40),
          name: String(msg.name || "Visitor").slice(0, 40),
          emoji: String(msg.emoji || "♟").slice(0, 8),
          x: Number(msg.x) || 0.5
        }), socket);
      } else if (msg.t === "bye") {
        broadcast(JSON.stringify({ t: "bye", id: String(msg.id || "").slice(0, 40) }), socket);
      }
    }
  });

  let dropped = false;
  const drop = () => {
    if (dropped) return;
    dropped = true;
    room.delete(socket);
    if (peer.id) {
      broadcast(JSON.stringify({ t: "bye", id: peer.id, name: peer.name }), socket);
    }
  };
  socket.on("close", drop);
  socket.on("error", drop);
});

server.listen(PORT, HOST, () => {
  console.log("Kericho Chess dev server → http://" + HOST + ":" + PORT);
  console.log("presence socket        → ws://" + HOST + ":" + PORT + "/presence");
});
