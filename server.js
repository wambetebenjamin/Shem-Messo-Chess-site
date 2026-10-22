import express from "express";
import session from "express-session";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { Server } from "socket.io";
import webpush from "web-push";
import { loadSecrets } from "./lib/secrets.js";
import { mpesaConfig, paymentItems, normalizePhone, stkPush, parseCallback } from "./lib/mpesa.js";
import { Chess } from "chess.js";
import {
  dailyPuzzle,
  computerMove,
  gameState,
  movesOf,
  replay,
} from "./lib/chess.js";
import { createStore, StoreError } from "./lib/store.js";

if (existsSync(".env")) process.loadEnvFile(".env");
mkdirSync("data", { recursive: true });
// Everything persistent (accounts, games, bookings, sessions, feedback, push
// subscriptions) lives in the configured store (Supabase in production), so the
// host's disk can be ephemeral. Secrets come from environment variables in production.
const store = createStore(process.env);
// Confirmed accounts with these addresses get administrator access.
// ADMIN_EMAILS is a comma-separated list; the defaults are the club and its administrator.
const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  "kerichochessacademy@gmail.com,shambetz@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
// express-session expects callback-style stores; this adapts the async store.
class SessionStore extends session.Store {
  get(id, cb) {
    store.sessions.get(id).then(
      (data) => cb(null, data ?? null),
      (e) => cb(e),
    );
  }
  set(id, s, cb) {
    const expires = s.cookie.expires
      ? new Date(s.cookie.expires).getTime()
      : Date.now() + 86400000;
    store.sessions.save(id, s, expires).then(
      () => cb?.(),
      (e) => cb?.(e),
    );
  }
  destroy(id, cb) {
    store.sessions.destroy(id).then(
      () => cb?.(),
      (e) => cb?.(e),
    );
  }
}
const secrets = loadSecrets(process.env, "data");
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
  secret: secrets.session,
  store: new SessionStore(),
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
  // Safaricom's server posts payment results without a browser Origin. That one route is
  // exempt; it is protected by matching checkout IDs and amounts instead.
  if (
    req.path.startsWith("/api/") &&
    req.method !== "GET" &&
    req.path !== "/api/mpesa/callback"
  ) {
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
const adminOnly = (req, res, next) =>
  req.session.user?.admin
    ? next()
    : res.status(403).json({ error: "This area is for the academy only." });
// Route handlers return promises; route errors become a generic JSON response.
const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));
const validEmail = (email) =>
  typeof email === "string" && /^\S+@\S+\.\S+$/.test(email) && email.length <= 254;
app.post(
  "/api/register",
  limit,
  route(async (req, res) => {
    const { email, name, password } = req.body;
    if (
      !validEmail(email) ||
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
    try {
      await store.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
      });
    } catch (error) {
      if (error instanceof StoreError && error.code === "rate")
        return res.status(429).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
    // The same answer is given whether or not the address already has an account.
    res.json({
      pending: true,
      message:
        "Check your email to confirm your account, then log in. If you do not receive it, check your spam folder.",
    });
  }),
);
app.post(
  "/api/login",
  limit,
  route(async (req, res) => {
    const { email, password } = req.body;
    if (!validEmail(email) || typeof password !== "string" || password.length > 72)
      return res
        .status(401)
        .json({ error: "Email or password is incorrect." });
    let account;
    try {
      account = await store.auth.signIn({
        email: email.toLowerCase().trim(),
        password,
      });
    } catch (error) {
      if (error instanceof StoreError && error.code === "unconfirmed")
        return res.status(403).json({
          error:
            "Please confirm your email address first. Use the link we sent you.",
        });
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    const user = {
      id: account.id,
      name: account.name,
      admin: ADMIN_EMAILS.includes(account.email.toLowerCase()),
    };
    req.session.regenerate((e) => {
      if (e) return res.status(500).json({ error: "Unable to start session." });
      req.session.user = user;
      res.json({ user });
    });
  }),
);

// Games are saved after every move. The store is the source of truth; in-memory
// rooms only track which signed-in players are connected to each game.
const queue = new Map(), // userId -> socket waiting for an opponent
  rooms = new Map(); // gameId -> Map(userId -> socket)
const newId = () => randomBytes(12).toString("hex");
// Moves for one game run one at a time so concurrent requests cannot overwrite each other.
const gameLocks = new Map();
function withGame(id, task) {
  const previous = gameLocks.get(id) ?? Promise.resolve();
  const next = previous.then(task, task);
  const settled = next.catch(() => {});
  gameLocks.set(id, settled);
  settled.then(() => {
    if (gameLocks.get(id) === settled) gameLocks.delete(id);
  });
  return next;
}
async function ownGame(user, id, kind) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) return null;
  const row = await store.games.get(id);
  if (
    !row ||
    (row.whiteId !== user.id && row.blackId !== user.id) ||
    (kind && row.kind !== kind)
  )
    return null;
  return row;
}
async function latestComputerGame(user) {
  const games = await store.games.listForUser(user.id);
  return (
    games.find(
      (g) => g.kind === "computer" && g.whiteId === user.id && g.status === "active",
    ) ?? null
  );
}
async function saveGame(id, game) {
  const over = game.isGameOver();
  await store.games.save(id, {
    moves: movesOf(game),
    status: over ? "finished" : "active",
    result: over ? gameState(game).status : null,
  });
}
function gameView(row, userId) {
  const game = replay(row.moves),
    color = row.whiteId === userId ? "w" : "b",
    state = gameState(game),
    live = row.kind === "computer" || rooms.get(row.id)?.size === 2,
    active = row.status === "active";
  return {
    gameId: row.id,
    kind: row.kind,
    color,
    opponent: color === "w" ? row.blackName : row.whiteName,
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
async function broadcast(id) {
  const sockets = rooms.get(id);
  if (!sockets) return;
  const row = await store.games.get(id);
  if (!row) return;
  for (const [userId, socket] of sockets)
    socket.emit("state", gameView(row, userId));
}
// Removes one player's socket from a room; the saved game remains available.
async function detach(socket, user) {
  for (const [id, sockets] of rooms) {
    if (sockets.get(user.id) !== socket) continue;
    sockets.delete(user.id);
    if (sockets.size === 0) rooms.delete(id);
    else await broadcast(id);
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
app.get(
  "/api/games",
  auth,
  route(async (req, res) => {
    const user = req.session.user;
    const games = await store.games.listForUser(user.id);
    res.json(
      games.map((row) => ({
        id: row.id,
        kind: row.kind,
        opponent: row.whiteId === user.id ? row.blackName : row.whiteName,
        status: row.status,
        result: row.result,
        moves: row.moves.length,
        updated: row.updatedAt,
      })),
    );
  }),
);
app.get(
  "/api/games/:id",
  auth,
  route(async (req, res) => {
    const row = await ownGame(req.session.user, req.params.id);
    if (!row) return res.status(404).json({ error: "Game not found." });
    res.json(gameView(row, req.session.user.id));
  }),
);
app.post(
  "/api/computer",
  auth,
  route(async (req, res) => {
    const user = req.session.user;
    const row = await store.games.create({
      id: newId(),
      kind: "computer",
      whiteId: user.id,
      blackId: null,
      whiteName: user.name,
      blackName: "Computer",
    });
    res.json(gameView(row, user.id));
  }),
);
app.post(
  "/api/computer/move",
  auth,
  route(async (req, res) => {
    const user = req.session.user;
    const row =
      req.body.gameId !== undefined
        ? await ownGame(user, req.body.gameId, "computer")
        : await latestComputerGame(user);
    if (!row || row.status !== "active" || row.kind !== "computer")
      return res.status(400).json({ error: "Start a new game first." });
    const result = await withGame(row.id, async () => {
      const current = await store.games.get(row.id);
      const game = replay(current.moves);
      try {
        if (game.isGameOver() || game.turn() !== "w") throw Error();
        game.move({
          from: req.body.from,
          to: req.body.to,
          promotion: req.body.promotion || "q",
        });
      } catch {
        return { error: "That move is not legal." };
      }
      if (!game.isGameOver()) computerMove(game);
      await saveGame(row.id, game);
      return { row: await store.games.get(row.id) };
    });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(gameView(result.row, user.id));
  }),
);
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
app.post("/api/feedback", limit, async (req, res) => {
  const { category, message } = req.body;
  if (
    !["Suggestion", "Question", "Issue"].includes(category) ||
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 3000
  )
    return res.status(400).json({ error: "Please write 10–3,000 characters." });
  try {
    await store.feedback.add({ category, message: message.trim() });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Feedback could not be saved. Please try again." });
  }
});
// Coach booking requests are private; the coach confirms them directly.
const sessionTypes = ["Online game with the coach", "Online coaching lesson"],
  levels = ["Beginner", "Improving player", "Club or competitive player"],
  timeSlots = ["09:00", "11:00", "14:00", "16:00", "18:00"],
  bookingStatuses = ["requested", "confirmed", "declined", "cancelled"];
const nairobiDate = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
app.post(
  "/api/bookings",
  auth,
  limit,
  route(async (req, res) => {
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
    const created = await store.bookings.create({
      userId: user.id,
      name: user.name,
      sessionType: b.sessionType,
      preferredDate: date,
      timeSlot: b.timeSlot,
      level: b.level,
      contact: b.contact.trim(),
      notes: (b.notes ?? "").trim(),
    });
    res.json({
      ok: true,
      booking: {
        id: created.id,
        sessionType: created.sessionType,
        preferredDate: created.preferredDate,
        timeSlot: created.timeSlot,
        level: created.level,
        status: created.status,
        created: created.createdAt,
      },
    });
  }),
);
app.get(
  "/api/bookings",
  auth,
  route(async (req, res) => {
    const rows = await store.bookings.listForUser(req.session.user.id);
    res.json(
      rows.map((row) => ({
        id: row.id,
        sessionType: row.sessionType,
        preferredDate: row.preferredDate,
        timeSlot: row.timeSlot,
        level: row.level,
        status: row.status,
        created: row.createdAt,
      })),
    );
  }),
);
// Administrator access: the club's confirmed account only.
app.get(
  "/api/admin/bookings",
  auth,
  adminOnly,
  route(async (req, res) => {
    const rows = await store.bookings.listAll();
    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        sessionType: row.sessionType,
        preferredDate: row.preferredDate,
        timeSlot: row.timeSlot,
        level: row.level,
        contact: row.contact,
        notes: row.notes,
        status: row.status,
        created: row.createdAt,
      })),
    );
  }),
);
app.post(
  "/api/admin/bookings/:id/status",
  auth,
  adminOnly,
  route(async (req, res) => {
    const id = Number(req.params.id),
      status = req.body.status;
    if (!Number.isInteger(id) || !bookingStatuses.includes(status))
      return res.status(400).json({ error: "Choose a valid booking and status." });
    const row = await store.bookings.setStatus(id, status);
    if (!row) return res.status(404).json({ error: "Booking not found." });
    res.json({ ok: true, id: row.id, status: row.status });
  }),
);
// Group registration: one signed-in parent, coach or club member registers several players.
app.post(
  "/api/group-registrations",
  auth,
  limit,
  route(async (req, res) => {
    const g = req.body ?? {};
    const contactName = typeof g.contactName === "string" ? g.contactName.trim() : "";
    const contact = typeof g.contact === "string" ? g.contact.trim() : "";
    const notes = typeof g.notes === "string" ? g.notes.trim() : "";
    const players = Array.isArray(g.players)
      ? g.players.map((p) => ({
          name: typeof p?.name === "string" ? p.name.trim() : "",
          level: p?.level,
        }))
      : [];
    const valid =
      contactName.length >= 2 &&
      contactName.length <= 120 &&
      contact.length >= 5 &&
      contact.length <= 200 &&
      notes.length <= 500 &&
      players.length >= 1 &&
      players.length <= 10 &&
      players.every(
        (p) => p.name.length >= 2 && p.name.length <= 80 && levels.includes(p.level),
      );
    if (!valid)
      return res.status(400).json({
        error:
          "Add your name and a contact (phone or email), then 1–10 players, each with a name (2–80 characters) and a level.",
      });
    const created = await store.groupRegistrations.create({
      userId: req.session.user.id,
      contactName,
      contact,
      players,
      notes,
    });
    res.json({ ok: true, id: created.id, status: created.status });
  }),
);
// Administrator view of group registrations, with contact details.
app.get(
  "/api/admin/group-registrations",
  auth,
  adminOnly,
  route(async (req, res) => {
    const rows = await store.groupRegistrations.listAll();
    res.json(
      rows.map((row) => ({
        id: row.id,
        contactName: row.contactName,
        contact: row.contact,
        players: row.players,
        notes: row.notes,
        status: row.status,
        created: row.createdAt,
      })),
    );
  }),
);
// M-Pesa Express (STK Push). Payments stay closed until MPESA_* and MPESA_ITEMS are set.
app.post(
  "/api/payments",
  auth,
  limit,
  route(async (req, res) => {
    const config = mpesaConfig(process.env);
    const items = paymentItems(process.env);
    if (!config || !Object.keys(items).length)
      return res
        .status(503)
        .json({ error: "Online payments are not open yet. Please contact the academy." });
    const item = typeof req.body?.item === "string" ? req.body.item : "";
    const amount = Object.hasOwn(items, item) ? items[item] : 0;
    const phone = normalizePhone(req.body?.phone);
    if (!amount || !phone)
      return res.status(400).json({
        error: "Choose an item and enter a Safaricom number, for example 0712345678.",
      });
    const pay = await store.payments.create({
      userId: req.session.user.id,
      item,
      amount,
      phone,
      reference: item,
    });
    try {
      const r = await stkPush(
        config,
        { phone, amount, reference: item, description: "Chess academy" },
        fetch,
      );
      await store.payments.setCheckout(pay.id, r.checkoutRequestId, r.merchantRequestId);
      res.json({ ok: true, id: pay.id, status: "pending", message: r.customerMessage });
    } catch (e) {
      await store.payments.setFailed(pay.id, e.message);
      res.status(502).json({ error: "The payment prompt could not be sent. " + e.message });
    }
  }),
);
// Safaricom calls this after the customer enters (or cancels) their PIN.
// Daraja does not sign callbacks, so we only accept a result for a checkout we started,
// and only as paid when the amount matches what we asked for.
app.post(
  "/api/mpesa/callback",
  route(async (req, res) => {
    const cb = parseCallback(req.body);
    if (cb) {
      const pay = await store.payments.findByCheckout(cb.checkoutRequestId);
      if (pay && pay.status !== "paid") {
        const paid = cb.resultCode === 0 && Number(cb.amount) === pay.amount;
        await store.payments.markResult(cb.checkoutRequestId, {
          status: paid ? "paid" : "failed",
          resultDesc: cb.resultDesc,
          receipt: cb.receipt,
        });
      }
    }
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }),
);
app.get(
  "/api/payments",
  auth,
  route(async (req, res) => {
    const rows = await store.payments.listForUser(req.session.user.id);
    res.json(
      rows.map((r) => ({ id: r.id, item: r.item, amount: r.amount, status: r.status, created: r.createdAt })),
    );
  }),
);
app.get(
  "/api/admin/payments",
  auth,
  adminOnly,
  route(async (req, res) => {
    const rows = await store.payments.listAll();
    res.json(
      rows.map((r) => ({
        id: r.id,
        item: r.item,
        amount: r.amount,
        phone: r.phone,
        status: r.status,
        receipt: r.receipt,
        resultDesc: r.resultDesc,
        created: r.createdAt,
      })),
    );
  }),
);
app.get("/api/push/key", (req, res) =>
  res.json({ key: secrets.vapid.publicKey }),
);
app.post("/api/push/subscribe", limit, async (req, res) => {
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
    await store.push.save(s.endpoint, s);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof StoreError)
      return res.status(500).json({ error: "Subscription could not be saved." });
    res.status(400).json({ error: "Unsupported push subscription." });
  }
});
app.post("/api/push/unsubscribe", async (req, res) => {
  if (typeof req.body.endpoint === "string")
    await store.push.remove(req.body.endpoint).catch(() => {});
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
  async function attach(row) {
    await detach(socket, user);
    queue.delete(user.id);
    const sockets = rooms.get(row.id) ?? new Map();
    rooms.set(row.id, sockets);
    const old = sockets.get(user.id);
    sockets.set(user.id, socket);
    if (old && old !== socket) old.disconnect(true);
    await broadcast(row.id);
  }
  const guard = (task) => (...args) =>
    Promise.resolve(task(...args)).catch(() =>
      socket.emit("moveError", "Something went wrong. Please try again."),
    );
  socket.on(
    "queue",
    guard(async () => {
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
      queue.delete(other.id);
      const row = await store.games.create({
        id: newId(),
        kind: "online",
        whiteId: other.id,
        blackId: user.id,
        whiteName: other.name,
        blackName: user.name,
      });
      rooms.set(
        row.id,
        new Map([
          [other.id, opponent],
          [user.id, socket],
        ]),
      );
      for (const [userId, s] of rooms.get(row.id))
        s.emit("matched", gameView(row, userId));
    }),
  );
  socket.on("cancel", guard(() => detach(socket, user)));
  // Resume a saved online game after leaving, refreshing or a dropped connection.
  socket.on(
    "resume",
    guard(async (gameId) => {
      const row = await ownGame(user, gameId, "online");
      if (!row || row.status !== "active") {
        socket.emit("moveError", "That online game is no longer available.");
        return;
      }
      await attach(row);
    }),
  );
  socket.on(
    "move",
    guard(async (move) => {
      const found = roomOf();
      if (!found) {
        socket.emit("moveError", "Start or resume an online game first.");
        return;
      }
      const [id, sockets] = found;
      if (sockets.size < 2) {
        socket.emit(
          "moveError",
          "Your opponent is not connected. Your game is saved and moves continue when they return.",
        );
        return;
      }
      await withGame(id, async () => {
        const row = await store.games.get(id);
        const color = row.whiteId === user.id ? "w" : "b",
          game = replay(row.moves);
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
        await saveGame(id, game);
        await broadcast(id);
        if (game.isGameOver()) rooms.delete(id);
      });
    }),
  );
  socket.on(
    "resign",
    guard(async () => {
      const found = roomOf();
      if (!found) return;
      const [id] = found;
      await withGame(id, async () => {
        const row = await store.games.get(id);
        if (row.status !== "active") return;
        const winner = row.whiteId === user.id ? row.blackName : row.whiteName;
        await store.games.save(id, {
          status: "finished",
          result: `${user.name} resigned. ${winner} wins.`,
        });
        await broadcast(id);
        rooms.delete(id);
      });
    }),
  );
  socket.on(
    "disconnect",
    guard(() => detach(socket, user)),
  );
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
