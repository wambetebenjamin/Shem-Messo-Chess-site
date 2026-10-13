import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/academy.sqlite");
console.log(
  JSON.stringify(
    db
      .prepare("SELECT category,message,created FROM feedback ORDER BY id DESC")
      .all(),
    null,
    2,
  ),
);
