import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { io } from "socket.io-client";

// Starts a fresh server in a temp directory; restart() reuses the same data so
// saved games must survive a process restart.
async function startServer(dir, port) {
  const child = spawn(process.execPath, [resolve("server.js")], {
    cwd: dir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      ACADEMY_STORE: "local",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error("Server failed to start")), 10000);
    child.once("exit", () => fail(Error("Server exited")));
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("website ready")) {
        clearTimeout(timer);
        done();
      }
    });
  });
  return child;
}

function client(origin, cookie) {
  const headers = { Origin: origin, Cookie: cookie };
  return {
    async req(path, body, requestCookie = cookie) {
      const r = await fetch(origin + "/api/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Cookie: requestCookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return r;
    },
    socket() {
      return io(origin, {
        transports: ["websocket"],
        reconnection: false,
        forceNew: true,
        extraHeaders: headers,
      });
    },
  };
}

function nextEvent(socket, name) {
  return new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error("Timed out waiting for " + name)), 5000);
    socket.once(name, (value) => {
      clearTimeout(timer);
      done(value);
    });
  });
}

async function signUp(origin, name, email) {
  const r = await fetch(origin + "/api/register", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password: "secure-test-password" }),
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).pending, true);
  const login = await fetch(origin + "/api/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "secure-test-password" }),
  });
  assert.equal(login.status, 200);
  return login.headers.get("set-cookie").split(";")[0];
}

test("computer and online games are saved, resumable and bookings are private", async () => {
  const dir = mkdtempSync(join(tmpdir(), "games-test-"));
  writeFileSync(join(dir, "events.json"), "[]");
  const port = 31000 + Math.floor(Math.random() * 10000),
    origin = `http://127.0.0.1:${port}`;
  let server = await startServer(dir, port);
  const sockets = [];
  try {
    const anna = client(origin, await signUp(origin, "Anna", "anna@example.com"));
    const ben = client(origin, await signUp(origin, "Ben", "ben@example.com"));

    // Computer game: each move is saved and the game survives a restart.
    let r = await anna.req("computer", {});
    assert.equal(r.status, 200);
    const computer = await r.json();
    assert.match(computer.gameId, /^[a-f0-9]{24}$/);
    r = await anna.req("computer/move", { gameId: computer.gameId, from: "e2", to: "e4" });
    assert.equal(r.status, 200);
    const afterMove = await r.json();
    assert.equal(afterMove.history.length, 2);
    assert.equal(afterMove.turn, "w");
    const illegal = await anna.req("computer/move", { gameId: computer.gameId, from: "e2", to: "e5" });
    assert.equal(illegal.status, 400);
    assert.equal((await ben.req("games/" + computer.gameId)).status, 404, "other players cannot read the game");
    assert.equal((await ben.req("computer/move", { gameId: computer.gameId, from: "d2", to: "d4" })).status, 400);

    // Online game with two real socket connections.
    const annaSocket = anna.socket(),
      benSocket = ben.socket();
    sockets.push(annaSocket, benSocket);
    await Promise.all([once(annaSocket, "connect"), once(benSocket, "connect")]);
    const annaWaiting = nextEvent(annaSocket, "waiting");
    annaSocket.emit("queue");
    await annaWaiting;
    const annaMatched = nextEvent(annaSocket, "matched");
    const benMatched = nextEvent(benSocket, "matched");
    benSocket.emit("queue");
    const [annaView, benView] = await Promise.all([annaMatched, benMatched]);
    assert.equal(annaView.color, "w");
    assert.equal(benView.color, "b");
    assert.equal(annaView.live, true);
    assert.equal(benView.opponent, "Anna");
    const gameId = annaView.gameId;

    const benError = nextEvent(benSocket, "moveError");
    benSocket.emit("move", { from: "e7", to: "e5" });
    assert.match(await benError, /not your turn/);

    const annaState = nextEvent(annaSocket, "state");
    const benState = nextEvent(benSocket, "state");
    annaSocket.emit("move", { from: "e2", to: "e4" });
    const [a1, b1] = await Promise.all([annaState, benState]);
    assert.equal(a1.history.join(" "), "e4");
    assert.equal(b1.turn, "b");
    assert.equal(b1.live, true);

    // Anna leaves: Ben is told the game is waiting, and moves are blocked until she returns.
    const benAway = nextEvent(benSocket, "state");
    annaSocket.disconnect();
    const away = await benAway;
    assert.equal(away.live, false);
    assert.match(away.notice, /reconnect/);
    const blocked = nextEvent(benSocket, "moveError");
    benSocket.emit("move", { from: "e7", to: "e5" });
    assert.match(await blocked, /not connected/);

    // Anna reconnects from a fresh socket and resumes the saved game.
    const annaAgain = anna.socket();
    sockets.push(annaAgain);
    await once(annaAgain, "connect");
    const annaResumed = nextEvent(annaAgain, "state");
    const benBack = nextEvent(benSocket, "state");
    annaAgain.emit("resume", gameId);
    const resumed = await annaResumed;
    assert.equal(resumed.live, true);
    assert.equal(resumed.history.join(" "), "e4");
    assert.equal((await benBack).live, true);

    // The game is still saved after a server restart.
    server.kill();
    await once(server, "exit");
    server = await startServer(dir, port);
    const listed = await (await anna.req("games")).json();
    const saved = listed.find((game) => game.id === gameId);
    assert.ok(saved, "online game listed after restart");
    assert.equal(saved.moves, 1);
    assert.equal(saved.status, "active");
    const restoredOpen = await (await anna.req("games/" + gameId)).json();
    assert.equal(restoredOpen.live, false, "rooms are empty until players reconnect");
    assert.equal(restoredOpen.history.join(" "), "e4");

    // Both players reconnect after the restart and continue from the saved position.
    const annaFinal = anna.socket(),
      benFinal = ben.socket();
    sockets.push(annaFinal, benFinal);
    await Promise.all([once(annaFinal, "connect"), once(benFinal, "connect")]);
    annaFinal.emit("resume", gameId);
    const annaAlone = await nextEvent(annaFinal, "state");
    assert.equal(annaAlone.live, false, "one returning player waits for the other");
    const annaLiveNext = nextEvent(annaFinal, "state"),
      benLiveNext = nextEvent(benFinal, "state");
    benFinal.emit("resume", gameId);
    const [annaLive, benLive] = await Promise.all([annaLiveNext, benLiveNext]);
    assert.equal(annaLive.live, true);
    assert.equal(benLive.live, true);
    assert.equal(benLive.color, "b");

    // Resign ends the game and records the result.
    const annaEnded = nextEvent(annaFinal, "state");
    annaFinal.emit("resign");
    const ended = await annaEnded;
    assert.equal(ended.over, true);
    assert.match(ended.status, /Anna resigned\. Ben wins\./);
    const finished = await (await ben.req("games/" + gameId)).json();
    assert.equal(finished.over, true);

    // Coach bookings: validated, private and visible only to their owner.
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    const booking = {
      sessionType: "Online game with the coach",
      preferredDate: tomorrow,
      timeSlot: "16:00",
      level: "Beginner",
      contact: "+254700000000",
      notes: "Learning the Sicilian",
    };
    assert.equal((await anna.req("bookings", { ...booking, preferredDate: "2000-01-01" })).status, 400);
    assert.equal((await anna.req("bookings", { ...booking, timeSlot: "03:00" })).status, 400);
    assert.equal((await anna.req("bookings", { ...booking, contact: "x" })).status, 400);
    assert.equal((await fetch(origin + "/api/bookings", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    })).status, 401);
    const made = await anna.req("bookings", booking);
    assert.equal(made.status, 200);
    assert.equal((await made.json()).booking.status, "requested");
    const mine = await (await anna.req("bookings")).json();
    assert.equal(mine.length, 1);
    assert.equal(mine[0].contact, undefined, "contact is not echoed back");
    assert.equal((await (await ben.req("bookings")).json()).length, 0);

    // Administrators: only the club and shambetz@gmail.com can see and manage requests.
    const club = client(origin, await signUp(origin, "Academy", "kerichochessacademy@gmail.com"));
    assert.equal((await ben.req("admin/bookings")).status, 403);
    assert.equal((await anna.req("admin/bookings")).status, 403);
    const admin2 = client(origin, await signUp(origin, "Shambetz", "shambetz@gmail.com"));
    assert.equal((await admin2.req("admin/bookings")).status, 200, "second administrator can list requests");
    const all = await club.req("admin/bookings");
    assert.equal(all.status, 200);
    const rows = await all.json();
    const adminRow = rows.find((row) => row.contact === "+254700000000");
    assert.ok(adminRow, "admin sees contact details of requests");
    assert.equal(
      (await club.req("admin/bookings/" + adminRow.id + "/status", { status: "confirmed" })).status,
      200,
    );
    assert.equal((await club.req("admin/bookings/" + adminRow.id + "/status", { status: "approved" })).status, 400);
    assert.equal((await anna.req("admin/bookings/" + adminRow.id + "/status", { status: "declined" })).status, 403);
    const annaBookings = await (await anna.req("bookings")).json();
    assert.equal(annaBookings[0].status, "confirmed");
  } finally {
    for (const socket of sockets) socket.disconnect();
    server.kill();
    await once(server, "exit").catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});

test("group registration needs sign-in, validates players and is visible only to administrators", async () => {
  const dir = mkdtempSync(join(tmpdir(), "group-test-"));
  writeFileSync(join(dir, "events.json"), "[]");
  const port = 31000 + Math.floor(Math.random() * 10000),
    origin = `http://127.0.0.1:${port}`;
  let server = await startServer(dir, port);
  const post = (path, body, cookie) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    const parent = await signUp(origin, "Parent", "parent@example.com");
    const admin = await signUp(origin, "Club", "kerichochessacademy@gmail.com");
    const payload = {
      contactName: "Mary Wanjiru",
      contact: "0712345678",
      notes: "Two children",
      players: [
        { name: "Ann", level: "Beginner" },
        { name: "Brian", level: "Improving player" },
      ],
    };

    // Anonymous visitors cannot register.
    assert.equal((await post("/api/group-registrations", payload)).status, 401);

    // Invalid input is rejected.
    const bad = await post(
      "/api/group-registrations",
      { ...payload, players: [{ name: "A", level: "Beginner" }] },
      parent,
    );
    assert.equal(bad.status, 400);

    // A valid registration is saved.
    const ok = await post("/api/group-registrations", payload, parent);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).status, "received");

    // The parent cannot read the administrator list.
    const parentView = await fetch(origin + "/api/admin/group-registrations", {
      headers: { Cookie: parent },
    });
    assert.equal(parentView.status, 403);

    // The administrator sees the registration with contact details.
    const adminView = await fetch(origin + "/api/admin/group-registrations", {
      headers: { Cookie: admin },
    });
    assert.equal(adminView.status, 200);
    const rows = await adminView.json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].contact, "0712345678");
    assert.equal(rows[0].players.length, 2);
  } finally {
    server.kill();
    await once(server, "exit").catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});

test("payments are closed by default and the callback acknowledges unknown checkouts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mpesa-test-"));
  writeFileSync(join(dir, "events.json"), "[]");
  const port = 31000 + Math.floor(Math.random() * 10000),
    origin = `http://127.0.0.1:${port}`;
  let server = await startServer(dir, port);
  try {
    const cookie = await signUp(origin, "Payer", "payer@example.com");
    const closed = await fetch(origin + "/api/payments", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ item: "membership", phone: "0712345678" }),
    });
    assert.equal(closed.status, 503);

    const items = await (await fetch(origin + "/api/payments/items")).json();
    assert.deepEqual(items, { open: false, items: [] });
    assert.equal((await fetch(origin + "/api/payments/1")).status, 401);
    const badName = await fetch(origin + "/api/payments", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ item: "academy-fee", name: "A", phone: "0712345678" }),
    });
    assert.equal(badName.status, 503);

    const anonymous = await fetch(origin + "/api/payments", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ item: "membership", phone: "0712345678" }),
    });
    assert.equal(anonymous.status, 401);

    // Safaricom's callback for a checkout we never started is acknowledged but changes nothing.
    const cb = await fetch(origin + "/api/mpesa/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Body: { stkCallback: { CheckoutRequestID: "unknown", ResultCode: 0, ResultDesc: "ok" } },
      }),
    });
    assert.equal(cb.status, 200);
    assert.equal((await cb.json()).ResultCode, 0);
  } finally {
    server.kill();
    await once(server, "exit").catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
