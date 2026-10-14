import { Chess } from "chess.js";
export const puzzles = [
  {
    fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    hint: "Bring your queen next to the king, where your king protects her.",
  },
  {
    fen: "k7/8/1QK5/8/8/8/8/8 w - - 0 1",
    hint: "Your king protects the mating square on the seventh rank.",
  },
  {
    fen: "8/8/8/8/8/5kq1/8/7K b - - 0 1",
    hint: "Black to move. Use your king to support the queen.",
  },
];
export function dailyPuzzle(date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const index =
    Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) % puzzles.length;
  return { ...puzzles[index], date: day, id: index };
}
export function computerMove(game) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  let best = -Infinity,
    choice;
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  for (const move of moves) {
    game.move(move);
    let score = game.isCheckmate()
      ? 10000
      : (values[move.captured] || 0) * 10 + (game.isCheck() ? 2 : 0);
    if (!game.isGameOver()) {
      const responses = game.moves({ verbose: true });
      score -= Math.max(
        0,
        ...responses.map((m) => (values[m.captured] || 0) * 10),
      );
    }
    game.undo();
    score += Math.random();
    if (score > best) {
      best = score;
      choice = move;
    }
  }
  return game.move(choice);
}
export function gameState(game) {
  return {
    fen: game.fen(),
    turn: game.turn(),
    history: game.history(),
    over: game.isGameOver(),
    status: game.isCheckmate()
      ? `Checkmate — ${game.turn() === "w" ? "Black" : "White"} wins.`
      : game.isDraw()
        ? "Draw."
        : `${game.turn() === "w" ? "White" : "Black"} to move${game.isCheck() ? " — check" : ""}.`,
  };
}
