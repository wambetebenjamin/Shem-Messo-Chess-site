import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { Server } from "socket.io";
import webpush from "web-push";
import { Chess } from "chess.js";
import { dailyPuzzle, computerMove, gameState } from "./lib/chess.js";
mkdirSync("data", { recursive: true });
const db = new DatabaseSync("data/academy.sqlite");
db.exec(
  `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,data TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,category TEXT,message TEXT,created TEXT); CREATE TABLE IF NOT EXISTS subscriptions(endpoint TEXT PRIMARY KEY,subscription TEXT);`,
);
class Store extends session.Store {
  get(id, cb) {
    try {
      const r = db.prepare("SELECT * FROM sessions WHERE id=?").get(id);
      cb(null, r && r.expires > Date.now() ? JSON.parse(r.data) : null);
    } catch (e) {
      cb(e);
    }
  }
  set(id, s, cb) {
    try {
      db.prepare("INSERT OR REPLACE INTO sessions VALUES(?,?,?)").run(
        id,
        JSON.stringify(s),
        s.cookie.expires
          ? new Date(s.cookie.expires).getTime()
          : Date.now() + 86400000,
      );
      cb?.();
    } catch (e) {
      cb?.(e);
    }
  }
  destroy(id, cb) {
    db.prepare("DELETE FROM sessions WHERE id=?").run(id);
    cb?.();
  }
}
if (!existsSync("data/secrets.json"))
  writeFileSync(
    "data/secrets.json",
    JSON.stringify({
      session: randomBytes(48).toString("hex"),
      vapid: webpush.generateVAPIDKeys(),
    }),
    { mode: 0o600 },
  );
const secrets = JSON.parse(readFileSync("data/secrets.json"));
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:kerichochessacademy@gmail.com",
  secrets.vapid.publicKey,
  secrets.vapid.privateKey,
);
const app = express(),
  server = createServer(app),
  io = new Server(server);
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));
const sessions = session({
  secret: process.env.SESSION_SECRET || secrets.session,
  store: new Store(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 86400000 * 7,
  },
});
app.use(sessions);
io.engine.use(sessions);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/api/") && req.method !== "GET") {
    const origin = req.headers.origin;
    if (!origin || new URL(origin).host !== req.get("host"))
      return res.status(403).json({ error: "Request origin is not allowed." });
  }
  next();
});
const attempts = new Map();
function limit(req, res, next) {
  const key = req.ip + req.path,
    now = Date.now();
  let r = attempts.get(key);
  if (!r || now - r.time > 600000) {
    r = { time: now, n: 0 };
    attempts.set(key, r);
  }
  if (++r.n > 20)
    return res
      .status(429)
      .json({ error: "Too many attempts. Please try again in ten minutes." });
  next();
}
setInterval(() => {
  for (const [k, v] of attempts)
    if (Date.now() - v.time > 600000) attempts.delete(k);
}, 600000).unref();
const auth = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ error: "Please log in first." });
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));
app.post("/api/register", limit, async (req, res) => {
  const { email, name, password } = req.body;
  if (
    typeof email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 50 ||
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 72
  )
    return res
      .status(400)
      .json({
        error:
          "Use a display name, valid email and a password of 10–72 characters.",
      });
  const hashed = await bcrypt.hash(password, 12);
  let user;
  try {
    const r = db
      .prepare("INSERT INTO users(email,name,password) VALUES(?,?,?)")
      .run(email.toLowerCase().trim(), name.trim(), hashed);
    user = { id: Number(r.lastInsertRowid), name: name.trim() };
  } catch {
    return res
      .status(409)
      .json({
        error: "Unable to create this account. Try logging in instead.",
      });
  }
  req.session.regenerate((e) => {
    if (e) return res.status(500).json({ error: "Unable to start session." });
    req.session.user = user;
    res.json({ user });
  });
});
app.post("/api/login", limit, async (req, res) => {
  const { email, password } = req.body;
  const u =
    typeof email === "string"
      ? db
          .prepare("SELECT * FROM users WHERE email=?")
          .get(email.toLowerCase().trim())
      : null;
  if (
    typeof password !== "string" ||
    password.length > 72 ||
    !u ||
    !(await bcrypt.compare(password, u.password))
  )
    return res.status(401).json({ error: "Email or password is incorrect." });
  req.session.regenerate((e) => {
    if (e) return res.status(500).json({ error: "Unable to start session." });
    req.session.user = { id: u.id, name: u.name };
    res.json({ user: req.session.user });
  });
});
const computerGames = new Map(),
  rooms = new Map(),
  queue = new Map();
app.post("/api/logout", (req, res) => {
  const id = req.session.user?.id;
  computerGames.delete(id);
  queue.delete(id);
  for (const socket of io.sockets.sockets.values())
    if (socket.request.session.user?.id === id) socket.disconnect(true);
  req.session.destroy(() => res.json({ ok: true }));
});
app.post("/api/computer", auth, (req, res) => {
  const game = new Chess();
  computerGames.set(req.session.user.id, game);
  res.json(gameState(game));
});
app.post("/api/computer/move", auth, (req, res) => {
  const game = computerGames.get(req.session.user.id);
  if (!game) return res.status(400).json({ error: "Start a new game first." });
  try {
    if (game.isGameOver() || game.turn() !== "w") throw Error();
    game.move({
      from: req.body.from,
      to: req.body.to,
      promotion: req.body.promotion || "q",
    });
  } catch {
    return res.status(400).json({ error: "That move is not legal." });
  }
  if (!game.isGameOver()) computerMove(game);
  res.json(gameState(game));
});
app.get("/api/puzzle", (req, res) => res.json(dailyPuzzle()));
app.post("/api/puzzle", (req, res) => {
  const p = dailyPuzzle(),
    g = new Chess(p.fen);
  try {
    g.move({ from: req.body.from, to: req.body.to, promotion: "q" });
  } catch {
    return res.status(400).json({ error: "That move is not legal." });
  }
  res.json({ ...gameState(g), solved: g.isCheckmate() });
});
app.post("/api/feedback", limit, (req, res) => {
  const { category, message } = req.body;
  if (
    !["Suggestion", "Question", "Issue"].includes(category) ||
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 3000
  )
    return res.status(400).json({ error: "Please write 10–3,000 characters." });
  db.prepare(
    "INSERT INTO feedback(category,message,created) VALUES(?,?,?)",
  ).run(category, message.trim(), new Date().toISOString());
  res.json({ ok: true });
});
app.get("/api/push/key", (req, res) =>
  res.json({ key: secrets.vapid.publicKey }),
);
app.post("/api/push/subscribe", limit, (req, res) => {
  const s = req.body;
  try {
    const url = new URL(s.endpoint);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname.endsWith(".push.apple.com")
      ) ||
      !s.keys?.p256dh ||
      !s.keys?.auth
    )
      throw Error();
    db.prepare("INSERT OR REPLACE INTO subscriptions VALUES(?,?)").run(
      s.endpoint,
      JSON.stringify(s),
    );
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Unsupported push subscription." });
  }
});
app.post("/api/push/unsubscribe", (req, res) => {
  if (typeof req.body.endpoint === "string")
    db.prepare("DELETE FROM subscriptions WHERE endpoint=?").run(
      req.body.endpoint,
    );
  res.json({ ok: true });
});
app.get("/api/events", (req, res) =>
  res.json(
    JSON.parse(readFileSync("events.json", "utf8")).filter(
      (e) =>
        e.date >=
        new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
    ),
  ),
);
io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;
  try {
    if (!origin || new URL(origin).host !== socket.handshake.headers.host)
      throw Error();
    if (!socket.request.session.user) throw Error();
    next();
  } catch {
    next(Error("Please log in to play."));
  }
});
io.on("connection", (socket) => {
  const user = socket.request.session.user;
  const active = () =>
    [...rooms.values()].find(
      (r) => r.white === socket.id || r.black === socket.id,
    );
  socket.on("queue", () => {
    if (active()) return;
    for (const [id, s] of queue) if (!s.connected) queue.delete(id);
    if (queue.has(user.id)) return;
    const opponent = [...queue.values()].find(
      (s) => s.request.session.user.id !== user.id,
    );
    if (!opponent) {
      queue.set(user.id, socket);
      socket.emit("waiting");
      return;
    }
    queue.delete(opponent.request.session.user.id);
    const id = randomBytes(10).toString("hex"),
      r = { white: opponent.id, black: socket.id, game: new Chess() };
    rooms.set(id, r);
    opponent.join(id);
    socket.join(id);
    opponent.emit("matched", {
      color: "w",
      opponent: user.name,
      ...gameState(r.game),
    });
    socket.emit("matched", {
      color: "b",
      opponent: opponent.request.session.user.name,
      ...gameState(r.game),
    });
  });
  socket.on("cancel", () => {
    if (queue.get(user.id)?.id === socket.id) queue.delete(user.id);
  });
  socket.on("move", (move) => {
    const r = active();
    if (!r) return;
    const color = r.white === socket.id ? "w" : "b";
    if (r.game.turn() !== color || r.game.isGameOver()) return;
    try {
      r.game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q",
      });
      for (const id of [r.white, r.black])
        io.to(id).emit("state", gameState(r.game));
    } catch {
      socket.emit("moveError", "That move is not legal.");
    }
  });
  socket.on("disconnect", () => {
    if (queue.get(user.id)?.id === socket.id) queue.delete(user.id);
    for (const [id, r] of rooms) {
      if (r.white === socket.id || r.black === socket.id) {
        io.to(r.white === socket.id ? r.black : r.white).emit("opponentLeft");
        rooms.delete(id);
      }
    }
  });
});
app.get("/vendor/chess.js", (req, res) =>
  res.sendFile(process.cwd() + "/node_modules/chess.js/dist/esm/chess.js"),
);
// Serve only explicitly public files, never credentials or account data.
app.use("/assets", express.static("assets"));
for (const f of ["style.css", "script.js", "sw.js"])
  app.get("/" + f, (req, res) => res.sendFile(process.cwd() + "/" + f));
app.get(
  ["/", "/about", "/registration", "/events", "/play", "/help"],
  (req, res) => res.sendFile(process.cwd() + "/index.html"),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
server.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log("Academy website ready on port " + (process.env.PORT || 3000)),
);
