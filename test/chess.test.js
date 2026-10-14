import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { puzzles, dailyPuzzle, computerMove, gameState } from "../lib/chess.js";
test("every daily puzzle has a legal mate in one", () => {
  for (const p of puzzles) {
    const g = new Chess(p.fen);
    let mates = 0;
    for (const m of g.moves()) {
      g.move(m);
      if (g.isCheckmate()) mates++;
      g.undo();
    }
    assert.ok(mates > 0);
  }
});
test("daily puzzle follows Nairobi midnight and repeats consistently", () => {
  assert.deepEqual(
    dailyPuzzle(new Date("2026-10-13T06:00:00Z")),
    dailyPuzzle(new Date("2026-10-13T20:59:59Z")),
  );
  assert.notEqual(
    dailyPuzzle(new Date("2026-10-13T20:59:59Z")).date,
    dailyPuzzle(new Date("2026-10-13T21:00:00Z")).date,
  );
});
test("computer returns legal moves and history for a full game", () => {
  const g = new Chess();
  for (let i = 0; i < 60 && !g.isGameOver(); i++) assert.ok(computerMove(g));
  assert.ok(gameState(g).history.length > 0);
});
test("engine enforces check, castling, en passant and promotion", () => {
  const g = new Chess();
  assert.throws(() => g.move({ from: "e2", to: "e5" }));
  g.load("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.equal(g.move("O-O").san, "O-O");
  g.load("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
  assert.equal(g.move("exd6").captured, "p");
  g.load("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
  assert.equal(g.move("a8=N").promotion, "n");
});
