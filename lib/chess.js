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
  {
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    hint: "Slide the rook to the back rank. The king's own pawns block its escape.",
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    hint: "Look at f7. Your bishop on c4 supports the queen's attack there.",
  },
  {
    fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
    hint: "A knight can give check where the king cannot run. Its own rook and pawns trap it.",
  },
  {
    fen: "k7/8/1K6/8/8/8/8/R7 w - - 0 1",
    hint: "The rook on the a-file gives check. Your king covers the squares next to the black king.",
  },
  {
    fen: "k7/7R/1K6/8/8/8/8/8 w - - 0 1",
    hint: "Your rook checks along the top row. Your king already covers the squares the enemy king would use.",
  },
  {
    fen: "6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1",
    hint: "Check along the back rank. Your king on g6 covers the escape squares.",
  },
  {
    fen: "k1K5/8/8/8/8/8/8/1R6 w - - 0 1",
    hint: "Check along the a-file with the rook. Your king on c8 covers the squares beside the black king.",
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
export function movesOf(game) {
  return game
    .history({ verbose: true })
    .map(({ from, to, promotion }) =>
      promotion ? { from, to, promotion } : { from, to },
    );
}
export function replay(moves) {
  const game = new Chess();
  for (const move of moves) game.move(move);
  return game;
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
