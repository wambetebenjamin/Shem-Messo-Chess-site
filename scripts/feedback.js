import { existsSync } from "node:fs";
import { createStore } from "../lib/store.js";
if (existsSync(".env")) process.loadEnvFile(".env");
const store = createStore(process.env);
console.log(JSON.stringify(await store.feedback.list(), null, 2));
