/* ============================================================================
   Computer opponent, off the main thread.
   Thin wrapper so the search runs in a Web Worker and the board keeps
   animating while the engine thinks. js/play.js falls back to calling
   SMCEngine directly if a Worker cannot be created.
   ============================================================================ */
/* eslint-disable no-undef */
importScripts('chess.js');
importScripts('engine.js');

self.onmessage = function (e) {
  const data = e.data || {};
  try {
    const move = self.SMCEngine.think(data.fen, {
      level: data.level,
      timeMs: data.timeMs,
      Chess: self.Chess
    });
    self.postMessage({ id: data.id, move: move });
  } catch (err) {
    self.postMessage({ id: data.id, error: (err && err.message) || String(err) });
  }
};
