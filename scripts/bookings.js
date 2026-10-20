// Lists coach booking requests for an authorised operator. Needs the same
// SUPABASE_* environment variables as the server.
import { existsSync } from "node:fs";
import { createStore } from "../lib/store.js";
if (existsSync(".env")) process.loadEnvFile(".env");
const store = createStore(process.env);
const rows = await store.bookings.listAll();
console.log(
  JSON.stringify(
    rows.map(({ id, name, sessionType, preferredDate, timeSlot, level, contact, notes, status, createdAt }) => ({
      id, name, sessionType, preferredDate, timeSlot, level, contact, notes, status, created: createdAt,
    })),
    null,
    2,
  ),
);
