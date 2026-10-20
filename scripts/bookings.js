import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/academy.sqlite");
console.log(
  JSON.stringify(
    db
      .prepare(
        "SELECT id,name,session_type,preferred_date,time_slot,level,contact,notes,status,created FROM bookings ORDER BY preferred_date,time_slot",
      )
      .all(),
    null,
    2,
  ),
);
