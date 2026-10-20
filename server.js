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
import {
  dailyPuzzle,
  computerMove,
  gameState,
  movesOf,
  replay,
} from "./lib/chess.js";
mkdirSync("data", { recursive: true });
const db = new DatabaseSync("data/academy.sqlite");
db.exec(
  `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,data TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,category TEXT,message TEXT,created TEXT); CREATE TABLE IF NOT EXISTS subscriptions(endpoint TEXT PRIMARY KEY,subscription TEXT); CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY,kind TEXT NOT NULL,white_id INTEGER NOT NULL,black_id INTEGER,white_name TEXT NOT NULL,black_name TEXT NOT NULL,moves TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'active',result TEXT,created TEXT NOT NULL,updated TEXT NOT NULL); CREATE INDEX IF NOT EXISTS games_white ON games(white_id,updated); CREATE INDEX IF NOT EXISTS games_black ON games(black_id,updated); CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,name TEXT NOT NULL,session_type TEXT NOT NULL,preferred_date TEXT NOT NULL,time_slot TEXT NOT NULL,level TEXT NOT NULL,contact TEXT NOT NULL,notes TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'requested',created TEXT NOT NULL);`,
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
  // Lets the browser tell this Node service apart from static-only hosting.
  if (req.path.startsWith("/api/")) res.setHeader("X-Academy-Service", "node");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/api/") && req.method !== "GET") {
    // Some browsers omit Origin on same-origin POSTs; Fetch Metadata then
    // identifies the request as same-origin. Cross-site requests still fail.
    const origin = req.headers.origin;
    let allowed;
    try {
      allowed = origin
        ? new URL(origin).host === req.get("host")
        : req.headers["sec-fetch-site"] === "same-origin";
    } catch {
      allowed = false;
    }
    if (!allowed)
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
    return res.status(400).json({
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
    return res.status(409).json({
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
// Games are saved in SQLite after every move. The database is the source of
// truth; in-memory rooms only track which signed-in players are connected.
const queue = new Map(),
  rooms = new Map(); // gameId -> Map(userId -> socket)
const now = () => new Date().toISOString();
const newId = () => randomBytes(12).toString("hex");
const gameRow = (id) => db.prepare("SELECT * FROM games WHERE id=?").get(id);
function ownGame(user, id, kind) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) return null;
  const row = gameRow(id);
  if (
    !row ||
    (row.white_id !== user.id && row.black_id !== user.id) ||
    (kind && row.kind !== kind)
  )
    return null;
  return row;
}
function latestComputerGame(user) {
  return db
    .prepare(
      "SELECT * FROM games WHERE kind='computer' AND white_id=? AND status='active' ORDER BY updated DESC LIMIT 1",
    )
    .get(user.id);
}
function saveGame(id, game) {
  const over = game.isGameOver();
  db.prepare(
    "UPDATE games SET moves=?,status=?,result=?,updated=? WHERE id=?",
  ).run(
    JSON.stringify(movesOf(game)),
    over ? "finished" : "active",
    over ? gameState(game).status : null,
    now(),
    id,
  );
}
function gameView(row, user) {
  const game = replay(JSON.parse(row.moves)),
    color = row.white_id === user.id ? "w" : "b",
    state = gameState(game),
    live = row.kind === "computer" || rooms.get(row.id)?.size === 2,
    active = row.status === "active";
  return {
    gameId: row.id,
    kind: row.kind,
    color,
    opponent: color === "w" ? row.black_name : row.white_name,
    ...state,
    status: row.result || state.status,
    over: !active,
    live,
    notice:
      row.kind === "online" && active && !live
        ? "Waiting for your opponent to reconnect. Your game is saved and moves continue when they return."
        : "",
  };
}
// Sends each connected player their own view of the saved game.
function sendState(row) {
  const sockets = rooms.get(row.id);
  if (!sockets) return;
  for (const [userId, socket] of sockets)
    socket.emit("state", gameView(row, { id: userId }));
}
// Removes one player's socket from a room; the saved game remains available.
function detach(socket, user) {
  for (const [id, sockets] of rooms) {
    if (sockets.get(user.id) !== socket) continue;
    sockets.delete(user.id);
    if (sockets.size === 0) rooms.delete(id);
    else sendState(gameRow(id));
  }
  if (queue.get(user.id) === socket) queue.delete(user.id);
}
app.post("/api/logout", (req, res) => {
  const id = req.session.user?.id;
  queue.delete(id);
  for (const socket of io.sockets.sockets.values())
    if (socket.request.session.user?.id === id) socket.disconnect(true);
  req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/games", auth, (req, res) => {
  const user = req.session.user;
  res.json(
    db
      .prepare(
        "SELECT * FROM games WHERE white_id=? OR black_id=? ORDER BY updated DESC LIMIT 20",
      )
      .all(user.id, user.id)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        opponent:
          row.white_id === user.id ? row.black_name : row.white_name,
        status: row.status,
        result: row.result,
        moves: JSON.parse(row.moves).length,
        updated: row.updated,
      })),
  );
});
app.get("/api/games/:id", auth, (req, res) => {
  const row = ownGame(req.session.user, req.params.id);
  if (!row) return res.status(404).json({ error: "Game not found." });
  res.json(gameView(row, req.session.user));
});
app.post("/api/computer", auth, (req, res) => {
  const id = newId(),
    t = now(),
    user = req.session.user;
  db.prepare(
    "INSERT INTO games(id,kind,white_id,black_id,white_name,black_name,moves,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)",
  ).run(id, "computer", user.id, null, user.name, "Computer", "[]", "active", t, t);
  res.json(gameView(gameRow(id), user));
});
app.post("/api/computer/move", auth, (req, res) => {
  const user = req.session.user,
    row =
      req.body.gameId !== undefined
        ? ownGame(user, req.body.gameId, "computer")
        : latestComputerGame(user);
  if (!row || row.status !== "active" || row.kind !== "computer")
    return res.status(400).json({ error: "Start a new game first." });
  const game = replay(JSON.parse(row.moves));
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
  saveGame(row.id, game);
  res.json(gameView(gameRow(row.id), user));
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
// Coach booking requests are private; the coach confirms them directly.
const sessionTypes = ["Online game with the coach", "Online coaching lesson"],
  levels = ["Beginner", "Improving player", "Club or competitive player"],
  timeSlots = ["09:00", "11:00", "14:00", "16:00", "18:00"];
const nairobiDate = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
app.post("/api/bookings", auth, limit, (req, res) => {
  const b = req.body,
    user = req.session.user,
    today = nairobiDate(),
    maxDay = nairobiDate(new Date(Date.now() + 180 * 86400000)),
    date = b.preferredDate;
  const text = (value, max, min = 0) =>
    typeof value === "string" &&
    value.trim().length >= min &&
    value.trim().length <= max;
  if (
    !sessionTypes.includes(b.sessionType) ||
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date + "T00:00:00Z")) ||
    nairobiDate(new Date(date + "T12:00:00Z")) !== date ||
    date < today ||
    date > maxDay ||
    !timeSlots.includes(b.timeSlot) ||
    !levels.includes(b.level) ||
    !text(b.contact, 120, 5) ||
    !text(b.notes ?? "", 500)
  )
    return res.status(400).json({
      error:
        "Choose a session type, a date within the next six months, a time, a level and a contact (phone or email).",
    });
  const t = now();
  const result = db
    .prepare(
      "INSERT INTO bookings(user_id,name,session_type,preferred_date,time_slot,level,contact,notes,status,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      user.id,
      user.name,
      b.sessionType,
      date,
      b.timeSlot,
      b.level,
      b.contact.trim(),
      (b.notes ?? "").trim(),
      "requested",
      t,
    );
  res.json({
    ok: true,
    booking: {
      id: Number(result.lastInsertRowid),
      sessionType: b.sessionType,
      preferredDate: date,
      timeSlot: b.timeSlot,
      level: b.level,
      status: "requested",
      created: t,
    },
  });
});
app.get("/api/bookings", auth, (req, res) => {
  res.json(
    db
      .prepare(
        "SELECT id,session_type,preferred_date,time_slot,level,status,created FROM bookings WHERE user_id=? ORDER BY id DESC LIMIT 20",
      )
      .all(req.session.user.id)
      .map((row) => ({
        id: row.id,
        sessionType: row.session_type,
        preferredDate: row.preferred_date,
        timeSlot: row.time_slot,
        level: row.level,
        status: row.status,
        created: row.created,
      })),
  );
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
    // Same-origin polling GETs may omit Origin; Fetch Metadata still identifies
    // the browser's origin relationship. WebSocket handshakes include Origin.
    if (origin) {
      if (new URL(origin).host !== socket.handshake.headers.host) throw Error();
    } else if (socket.handshake.headers["sec-fetch-site"] !== "same-origin") {
      throw Error();
    }
    if (!socket.request.session.user) throw Error();
    next();
  } catch {
    next(Error("Please log in to play."));
  }
});
io.on("connection", (socket) => {
  const user = socket.request.session.user;
  const roomOf = () =>
    [...rooms].find(([, sockets]) => sockets.get(user.id) === socket);
  // Each player has one live tab: the newest connection replaces the older one.
  function attach(row) {
    detach(socket, user);
    queue.delete(user.id);
    const sockets = rooms.get(row.id) ?? new Map();
    rooms.set(row.id, sockets);
    const old = sockets.get(user.id);
    sockets.set(user.id, socket);
    if (old && old !== socket) old.disconnect(true);
    sendState(row);
  }
  socket.on("queue", () => {
    if (roomOf()) return;
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
    const other = opponent.request.session.user;
    queue.delete(opponent.request.session.user.id);
    const id = newId(),
      t = now();
    db.prepare(
      "INSERT INTO games(id,kind,white_id,black_id,white_name,black_name,moves,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?)",
    ).run(id, "online", other.id, user.id, other.name, user.name, "[]", "active", t, t);
    const row = gameRow(id);
    rooms.set(
      id,
      new Map([
        [other.id, opponent],
        [user.id, socket],
      ]),
    );
    for (const [userId, s] of rooms.get(id))
      s.emit("matched", gameView(row, { id: userId }));
  });
  socket.on("cancel", () => detach(socket, user));
  // Resume a saved online game after leaving, refreshing or a dropped connection.
  socket.on("resume", (gameId) => {
    const row = ownGame(user, gameId, "online");
    if (!row || row.status !== "active") {
      socket.emit("moveError", "That online game is no longer available.");
      return;
    }
    attach(row);
  });
  socket.on("move", (move) => {
    const found = roomOf();
    if (!found) {
      socket.emit("moveError", "Start or resume an online game first.");
      return;
    }
    const [id, sockets] = found,
      row = gameRow(id);
    if (sockets.size < 2) {
      socket.emit(
        "moveError",
        "Your opponent is not connected. Your game is saved and moves continue when they return.",
      );
      return;
    }
    const color = row.white_id === user.id ? "w" : "b",
      game = replay(JSON.parse(row.moves));
    if (row.status !== "active" || game.turn() !== color) {
      socket.emit("moveError", "It is not your turn, or the game has ended.");
      return;
    }
    try {
      game.move({
        from: move?.from,
        to: move?.to,
        promotion: move?.promotion || "q",
      });
    } catch {
      socket.emit("moveError", "That move is not legal.");
      return;
    }
    saveGame(id, game);
    const saved = gameRow(id);
    sendState(saved);
    if (game.isGameOver()) rooms.delete(id);
  });
  socket.on("resign", () => {
    const found = roomOf();
    if (!found) return;
    const [id] = found,
      row = gameRow(id);
    if (row.status !== "active") return;
    const winner = row.white_id === user.id ? row.black_name : row.white_name;
    db.prepare(
      "UPDATE games SET status='finished',result=?,updated=? WHERE id=?",
    ).run(`${user.name} resigned. ${winner} wins.`, now(), id);
    sendState(gameRow(id));
    rooms.delete(id);
  });
  socket.on("disconnect", () => detach(socket, user));
});
app.get("/vendor/chess.js", (req, res) =>
  res.sendFile(process.cwd() + "/node_modules/chess.js/dist/esm/chess.js"),
);
// Serve only explicitly public files, never credentials or account data.
app.use("/assets", express.static("assets"));
for (const f of [
  "style.css",
  "script.js",
  "sw.js",
  "community.js",
  "Mr. Ochieng.jpeg",
  "Njambi.jpeg",
])
  app.get(encodeURI("/" + f), (req, res) =>
    res.sendFile(process.cwd() + "/" + f),
  );
// Independent source-based comparison preview; selecting it as root is opt-in.
for (const file of [
  "template-preview.html",
  "template-preview.css",
  "template-preview.js",
]) {
  app.get("/" + file, (req, res) => res.sendFile(process.cwd() + "/" + file));
}
app.get("/template-preview", (req, res) =>
  res.redirect(302, "/template-preview.html"),
);
// Real documents work on Node hosting and static hosting alike.
app.get("/", (req, res) => {
  const file =
    process.env.TEMPLATE_PREVIEW === "1"
      ? "template-preview.html"
      : "index.html";
  res.sendFile(process.cwd() + "/" + file);
});
app.get("/index.html", (req, res) =>
  res.sendFile(process.cwd() + "/index.html"),
);
app.get(["/team", "/team.html"], (req, res) =>
  res.redirect(302, "/about.html#officials"),
);
for (const page of [
  "about",
  "programs",
  "merchandise",
  "contact",
  "registration",
  "events",
  "help",
  "play",
]) {
  app.get("/" + page, (req, res) => {
    const query = req.url.includes("?")
      ? req.url.slice(req.url.indexOf("?"))
      : "";
    res.redirect(302, "/" + page + ".html" + query);
  });
  app.get("/" + page + ".html", (req, res) => {
    if (req.path.endsWith("/")) {
      const query = req.url.includes("?")
        ? req.url.slice(req.url.indexOf("?"))
        : "";
      return res.redirect(302, "/" + page + ".html" + query);
    }
    res.sendFile(process.cwd() + "/" + page + ".html");
  });
}
app.use("/api", (req, res) =>
  res.status(404).json({ error: "This request is not available." }),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
server.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log("Academy website ready on port " + (process.env.PORT || 3000)),
);
