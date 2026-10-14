import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { Chess } from "chess.js";
test("accounts, protected games, puzzle, feedback and public-file security", async () => {
  const dir = mkdtempSync(join(tmpdir(), "academy-test-"));
  writeFileSync(join(dir, "events.json"), "[]");
  const port = 31000 + Math.floor(Math.random() * 10000),
    origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [resolve("server.js")], {
    cwd: dir,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Server failed to start")),
        10000,
      );
      child.once("exit", () => {
        clearTimeout(timer);
        reject(Error("Server exited"));
      });
      child.stdout.on("data", (chunk) => {
        if (chunk.toString().includes("website ready")) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    let cookie = "";
    const req = async (path, body, requestOrigin = origin) => {
      const r = await fetch(origin + "/api/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: requestOrigin,
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      return r;
    };
    assert.equal((await req("computer", {})).status, 401);
    assert.equal(
      (
        await req("register", {
          email: "test@example.com",
          name: "Test Player",
          password: "short",
        })
      ).status,
      400,
    );
    const r = await req("register", {
      email: "test@example.com",
      name: "Test Player",
      password: "secure-test-password",
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).user.name, "Test Player");
    assert.equal((await (await req("me")).json()).user.name, "Test Player");
    assert.equal((await req("computer", {})).status, 200);
    assert.equal(
      (await req("computer/move", { from: "e2", to: "e5" })).status,
      400,
    );
    const state = await (
      await req("computer/move", { from: "e2", to: "e4" })
    ).json();
    assert.equal(state.history.length, 2);
    assert.equal(state.turn, "w");
    assert.equal(
      (await req("computer", {}, "https://evil.example")).status,
      403,
    );
    const puzzle = await (await req("puzzle")).json(),
      g = new Chess(puzzle.fen);
    let mate;
    for (const m of g.moves({ verbose: true })) {
      g.move(m);
      if (g.isCheckmate()) mate = m;
      g.undo();
    }
    assert.ok(mate);
    assert.equal(
      (await (await req("puzzle", { from: mate.from, to: mate.to })).json())
        .solved,
      true,
    );
    assert.equal(
      (
        await req("feedback", {
          category: "Suggestion",
          message: "More daily challenges would be useful.",
        })
      ).status,
      200,
    );
    assert.equal(
      (await req("feedback", { category: "Question", message: "x" })).status,
      400,
    );
    assert.equal(
      (
        await req("push/subscribe", {
          endpoint: "https://localhost/test",
          keys: { p256dh: "x", auth: "y" },
        })
      ).status,
      400,
    );
    const key = await (await req("push/key")).json();
    assert.ok(key.key.length > 60);
    for (const path of [
      "/data/academy.sqlite",
      "/data/secrets.json",
      "/server.js",
      "/.git/config",
    ])
      assert.equal((await fetch(origin + path)).status, 404);
    assert.equal((await req("logout", {})).status, 200);
    assert.equal((await req("computer", {})).status, 401);
    assert.equal(
      (
        await req("login", {
          email: "test@example.com",
          password: "wrong-password",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await req("login", {
          email: "test@example.com",
          password: "secure-test-password",
        })
      ).status,
      200,
    );
    assert.equal((await (await req("events")).json()).length, 0);
    writeFileSync(
      join(dir, "events.json"),
      JSON.stringify([
        { title: "Past fixture", date: "2000-01-01" },
        { title: "Future fixture", date: "2099-01-01" },
      ]),
    );
    const events = await (await req("events")).json();
    assert.equal(events.length, 1);
    assert.equal(events[0].title, "Future fixture");
  } finally {
    child.kill();
    await once(child, "exit");
    rmSync(dir, { recursive: true, force: true });
  }
});
