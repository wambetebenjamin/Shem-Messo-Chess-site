import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";

const ADMIN = "kerichochessacademy@gmail.com";
const PLAYER = "parent@example.com";
const PASSWORD = "secure-test-password";

test("admin events and site content: CRUD for admins, 401/403 for everyone else", async () => {
  const dir = mkdtempSync(join(tmpdir(), "academy-admin-"));
  const port = 41000 + Math.floor(Math.random() * 10000),
    origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [resolve("server.js")], {
    cwd: dir,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test", ACADEMY_STORE: "local" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("Server failed to start")), 10000);
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

    // One cookie jar per visitor.
    const visitor = () => {
      const jar = { cookie: "" };
      jar.req = async (method, path, body) => {
        const r = await fetch(origin + "/api/" + path, {
          method,
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            Cookie: jar.cookie,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (r.headers.get("set-cookie")) jar.cookie = r.headers.get("set-cookie").split(";")[0];
        const text = await r.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return { status: r.status, data };
      };
      return jar;
    };

    const anon = visitor();
    const player = visitor();
    const admin = visitor();

    await player.req("POST", "register", { email: PLAYER, name: "Parent", password: PASSWORD });
    assert.equal((await player.req("POST", "login", { email: PLAYER, password: PASSWORD })).status, 200);
    await admin.req("POST", "register", { email: ADMIN, name: "Club Admin", password: PASSWORD });
    const adminLogin = await admin.req("POST", "login", { email: ADMIN, password: PASSWORD });
    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.data.user.admin, true);

    // Non-admin and signed-out visitors are blocked from every admin route.
    const adminRoutes = [
      ["GET", "admin/events"],
      ["POST", "admin/events", { title: "Blocked", date: "2099-01-01" }],
      ["PUT", "admin/events/1", { title: "Blocked", date: "2099-01-01" }],
      ["DELETE", "admin/events/1"],
      ["PUT", "admin/content/announcement", { text: "Blocked", show: true }],
    ];
    for (const [method, path, body] of adminRoutes) {
      assert.equal((await anon.req(method, path, body)).status, 401, `anon ${method} ${path}`);
      assert.equal((await player.req(method, path, body)).status, 403, `player ${method} ${path}`);
    }

    // Validation rejects bad input.
    const bad = [
      { title: "x", date: "2099-01-01" },
      { title: "Good title", date: "2099-02-30" },
      { title: "Good title", date: "2099-01-01", entryFee: -5 },
      { title: "Good title", date: "2099-01-01", registrationUrl: "javascript:alert(1)" },
    ];
    for (const body of bad)
      assert.equal((await admin.req("POST", "admin/events", body)).status, 400, JSON.stringify(body));

    // Create, publish, then check the public list.
    const future = await admin.req("POST", "admin/events", {
      title: "Junior Open",
      date: "2099-06-01",
      startTime: "09:00",
      location: "Kericho Town Hall",
      description: "Open to all juniors.",
      entryFee: 300,
      registrationUrl: "https://example.com/register",
      published: true,
    });
    assert.equal(future.status, 201);
    const futureId = future.data.id;
    await admin.req("POST", "admin/events", {
      title: "Draft Event",
      date: "2099-07-01",
      published: false,
    });
    await admin.req("POST", "admin/events", {
      title: "Old Event",
      date: "2000-01-01",
      published: true,
    });

    const publicList = (await anon.req("GET", "events")).data;
    assert.deepEqual(
      publicList.map((e) => e.title),
      ["Junior Open"],
      "public list hides drafts and past dates",
    );
    assert.equal(publicList[0].entryFee, 300);
    assert.equal(publicList[0].registrationUrl, "https://example.com/register");
    assert.equal("published" in publicList[0], false);

    const adminList = (await admin.req("GET", "admin/events")).data;
    assert.equal(adminList.length, 3, "admin sees drafts and past events");

    // Edit, then unpublish: it disappears from the public list.
    const edited = await admin.req("PUT", "admin/events/" + futureId, {
      title: "Junior Open 2099",
      date: "2099-06-01",
      entryFee: 350,
      published: false,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.data.title, "Junior Open 2099");
    assert.deepEqual((await anon.req("GET", "events")).data, []);
    assert.equal((await admin.req("PUT", "admin/events/999999", { title: "Nope", date: "2099-01-01" })).status, 404);

    // Delete.
    assert.equal((await admin.req("DELETE", "admin/events/" + futureId)).status, 200);
    assert.equal((await admin.req("GET", "admin/events")).data.length, 2);

    // Site content: public read, admin write, unknown keys refused.
    assert.deepEqual((await anon.req("GET", "content/announcement")).data, { text: "", show: false });
    assert.equal((await anon.req("GET", "content/secret-thing")).status, 404);
    const saved = await admin.req("PUT", "admin/content/announcement", {
      text: "Puzzle night on Friday",
      show: true,
    });
    assert.equal(saved.status, 200);
    assert.deepEqual((await anon.req("GET", "content/announcement")).data, {
      text: "Puzzle night on Friday",
      show: true,
    });
    assert.equal((await admin.req("PUT", "admin/content/unknown", { text: "x", show: true })).status, 404);

    // Booking status still works from the dashboard endpoint.
    const bookings = await admin.req("GET", "admin/bookings");
    assert.equal(bookings.status, 200);
    assert.equal((await admin.req("GET", "admin/group-registrations")).status, 200);
    assert.equal((await admin.req("GET", "admin/payments")).status, 200);
  } finally {
    child.kill();
    await once(child, "exit");
    rmSync(dir, { recursive: true, force: true });
  }
});
