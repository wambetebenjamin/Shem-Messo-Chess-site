// Data access for accounts, games, coach bookings, sessions, feedback and push subscriptions.
// Production uses Supabase (Auth + Postgres, row-level security on, accessed only
// by this server with a secret key). A local JSON file store exists for development
// and tests; it is refused when NODE_ENV=production.
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export class StoreError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

const emailTaken = /already (registered|been registered)|user already exists/i;

export function supabaseStore({ url, publishableKey, secretKey }) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  // The publishable client only checks passwords; the secret client does every data query.
  const authClient = createClient(url, publishableKey, options);
  const db = createClient(url, secretKey, options);
  const check = ({ error }) => {
    if (error) throw new StoreError("database", error.message);
  };
  const game = (r) => ({
    id: r.id,
    kind: r.kind,
    whiteId: r.white_id,
    blackId: r.black_id,
    whiteName: r.white_name,
    blackName: r.black_name,
    moves: r.moves,
    status: r.status,
    result: r.result,
    updatedAt: r.updated_at,
  });
  const booking = (r) => ({
    id: Number(r.id),
    userId: r.user_id,
    name: r.name,
    sessionType: r.session_type,
    preferredDate: r.preferred_date,
    timeSlot: r.time_slot,
    level: r.level,
    contact: r.contact,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
  });
  return {
    kind: "supabase",
    auth: {
      async signUp({ email, password, name }) {
        const { error } = await authClient.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        // Same response whether or not the address already exists (no account enumeration).
        if (error && !emailTaken.test(error.message)) {
          if (/rate limit/i.test(error.message))
            throw new StoreError("rate", "Too many confirmation emails were requested. Please try again later.");
          throw new StoreError("signup", "Unable to create this account. Check the details and try again.");
        }
      },
      async signIn({ email, password }) {
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });
        if (error && /not confirmed/i.test(error.message))
          throw new StoreError("unconfirmed");
        if (error || !data?.user) throw new StoreError("invalid");
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || "Player",
        };
      },
    },
    games: {
      async create(g) {
        check(
          await db.from("games").insert({
            id: g.id,
            kind: g.kind,
            white_id: g.whiteId,
            black_id: g.blackId,
            white_name: g.whiteName,
            black_name: g.blackName,
            moves: [],
            status: "active",
          }),
        );
        return this.get(g.id);
      },
      async get(id) {
        const { data, error } = await db.from("games").select("*").eq("id", id).maybeSingle();
        if (error) throw new StoreError("database", error.message);
        return data ? game(data) : null;
      },
      async listForUser(userId, limit = 20) {
        const { data, error } = await db
          .from("games")
          .select("*")
          .or(`white_id.eq.${userId},black_id.eq.${userId}`)
          .order("updated_at", { ascending: false })
          .limit(limit);
        if (error) throw new StoreError("database", error.message);
        return data.map(game);
      },
      async save(id, patch) {
        const row = { updated_at: new Date().toISOString() };
        for (const key of ["moves", "status", "result"])
          if (key in patch) row[key] = patch[key];
        check(await db.from("games").update(row).eq("id", id));
      },
    },
    bookings: {
      async create(b) {
        const { data, error } = await db
          .from("bookings")
          .insert({
            user_id: b.userId,
            name: b.name,
            session_type: b.sessionType,
            preferred_date: b.preferredDate,
            time_slot: b.timeSlot,
            level: b.level,
            contact: b.contact,
            notes: b.notes,
            status: "requested",
          })
          .select("*")
          .single();
        if (error) throw new StoreError("database", error.message);
        return booking(data);
      },
      async listForUser(userId) {
        const { data, error } = await db
          .from("bookings")
          .select("*")
          .eq("user_id", userId)
          .order("id", { ascending: false })
          .limit(20);
        if (error) throw new StoreError("database", error.message);
        return data.map(booking);
      },
      async listAll() {
        const { data, error } = await db
          .from("bookings")
          .select("*")
          .order("preferred_date", { ascending: true })
          .order("time_slot", { ascending: true })
          .limit(500);
        if (error) throw new StoreError("database", error.message);
        return data.map(booking);
      },
      async setStatus(id, status) {
        const { data, error } = await db
          .from("bookings")
          .update({ status })
          .eq("id", id)
          .select("*")
          .maybeSingle();
        if (error) throw new StoreError("database", error.message);
        return data ? booking(data) : null;
      },
    },
    sessions: {
      async get(id) {
        const { data, error } = await db
          .from("sessions")
          .select("data,expires_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw new StoreError("database", error.message);
        return data && Date.parse(data.expires_at) > Date.now() ? data.data : null;
      },
      async save(id, data, expires) {
        check(
          await db
            .from("sessions")
            .upsert({ id, data, expires_at: new Date(expires).toISOString() }),
        );
      },
      async destroy(id) {
        check(await db.from("sessions").delete().eq("id", id));
      },
    },
    feedback: {
      async add({ category, message }) {
        check(await db.from("feedback").insert({ category, message }));
      },
      async list() {
        const { data, error } = await db
          .from("feedback")
          .select("category,message,created_at")
          .order("id", { ascending: false });
        if (error) throw new StoreError("database", error.message);
        return data;
      },
    },
    push: {
      async save(endpoint, subscription) {
        check(await db.from("push_subscriptions").upsert({ endpoint, subscription }));
      },
      async remove(endpoint) {
        check(await db.from("push_subscriptions").delete().eq("endpoint", endpoint));
      },
      async list() {
        const { data, error } = await db
          .from("push_subscriptions")
          .select("endpoint,subscription");
        if (error) throw new StoreError("database", error.message);
        return data;
      },
    },
  };
}

// Local development: a JSON file with the same interface.
// Accounts are confirmed immediately because no email is sent.
export function localStore(dir) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "local-store.json");
  const state = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { users: [], games: [], bookings: [], nextBooking: 1 };
  state.sessions ??= {};
  state.feedback ??= [];
  state.push ??= {};
  const save = () => {
    const temp = file + ".tmp";
    writeFileSync(temp, JSON.stringify(state));
    renameSync(temp, file);
  };
  const game = (r) => ({ ...r });
  const booking = (r) => ({ ...r });
  return {
    kind: "local",
    auth: {
      async signUp({ email, password, name }) {
        if (state.users.some((u) => u.email === email)) return;
        state.users.push({
          id: randomUUID(),
          email,
          name,
          passwordHash: await bcrypt.hash(password, 10),
        });
        save();
      },
      async signIn({ email, password }) {
        const user = state.users.find((u) => u.email === email);
        if (!user || !(await bcrypt.compare(password, user.passwordHash)))
          throw new StoreError("invalid");
        return { id: user.id, email: user.email, name: user.name };
      },
    },
    games: {
      async create(g) {
        const row = {
          id: g.id,
          kind: g.kind,
          whiteId: g.whiteId,
          blackId: g.blackId,
          whiteName: g.whiteName,
          blackName: g.blackName,
          moves: [],
          status: "active",
          result: null,
          updatedAt: new Date().toISOString(),
        };
        state.games.push(row);
        save();
        return game(row);
      },
      async get(id) {
        const row = state.games.find((g) => g.id === id);
        return row ? game(row) : null;
      },
      async listForUser(userId, limit = 20) {
        return state.games
          .filter((g) => g.whiteId === userId || g.blackId === userId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, limit)
          .map(game);
      },
      async save(id, patch) {
        const row = state.games.find((g) => g.id === id);
        if (!row) return;
        Object.assign(row, patch, { updatedAt: new Date().toISOString() });
        save();
      },
    },
    bookings: {
      async create(b) {
        const row = {
          id: state.nextBooking++,
          userId: b.userId,
          name: b.name,
          sessionType: b.sessionType,
          preferredDate: b.preferredDate,
          timeSlot: b.timeSlot,
          level: b.level,
          contact: b.contact,
          notes: b.notes,
          status: "requested",
          createdAt: new Date().toISOString(),
        };
        state.bookings.push(row);
        save();
        return booking(row);
      },
      async listForUser(userId) {
        return state.bookings
          .filter((b) => b.userId === userId)
          .sort((a, b) => b.id - a.id)
          .slice(0, 20)
          .map(booking);
      },
      async listAll() {
        return state.bookings
          .slice()
          .sort((a, b) =>
            a.preferredDate.localeCompare(b.preferredDate) ||
            a.timeSlot.localeCompare(b.timeSlot),
          )
          .slice(0, 500)
          .map(booking);
      },
      async setStatus(id, status) {
        const row = state.bookings.find((b) => b.id === id);
        if (!row) return null;
        row.status = status;
        save();
        return booking(row);
      },
    },
    sessions: {
      async get(id) {
        const row = state.sessions[id];
        return row && row.expires > Date.now() ? row.data : null;
      },
      async save(id, data, expires) {
        state.sessions[id] = { data, expires };
        save();
      },
      async destroy(id) {
        delete state.sessions[id];
        save();
      },
    },
    feedback: {
      async add({ category, message }) {
        state.feedback.push({ category, message, created_at: new Date().toISOString() });
        save();
      },
      async list() {
        return state.feedback.slice().reverse();
      },
    },
    push: {
      async save(endpoint, subscription) {
        state.push[endpoint] = subscription;
        save();
      },
      async remove(endpoint) {
        delete state.push[endpoint];
        save();
      },
      async list() {
        return Object.entries(state.push).map(([endpoint, subscription]) => ({
          endpoint,
          subscription,
        }));
      },
    },
  };
}

// Chooses the store from the environment. Production must have Supabase configured.
export function createStore(env = process.env, dataDir = "data") {
  if (env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY && env.SUPABASE_SECRET_KEY)
    return supabaseStore({
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
      secretKey: env.SUPABASE_SECRET_KEY,
    });
  if (env.ACADEMY_STORE === "local" && env.NODE_ENV !== "production")
    return localStore(dataDir);
  throw Error(
    "Accounts need Supabase: set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.",
  );
}
