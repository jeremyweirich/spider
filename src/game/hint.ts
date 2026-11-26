import { canDeal, canDropOn, isRunFrom } from "./rules";
import { COLUMN_COUNT, type GameState } from "./types";

export type Hint = { kind: "move"; from: number; index: number; to: number } | { kind: "deal" };

/**
 * Useful moves, best first. A move is skipped when it only shuffles a card sideways
 * (it already sits on the next rank up and isn't gaining a suit match), or moves a whole column into an empty one.
 * When nothing useful is left, dealing is suggested if possible.
 */
export function findHints(state: GameState): Hint[] {
  const scored: { hint: Hint; score: number }[] = [];
  state.columns.forEach((src, from) => {
    for (let index = src.length - 1; index >= 0 && isRunFrom(src, index); index--) {
      const card = src[index];
      const below = index > 0 ? src[index - 1] : null;
      const sitsOnNext = !!below && below.faceUp && below.rank === card.rank + 1;
      const naturalFit = sitsOnNext && below!.suit === card.suit;
      if (naturalFit) continue; // the run can only be split by moving it, which loses a suit match

      for (let to = 0; to < COLUMN_COUNT; to++) {
        if (to === from) continue;
        const dest = state.columns[to];
        if (!canDropOn(dest, card)) continue;
        const toEmpty = dest.length === 0;
        if (toEmpty && index === 0) continue;
        const suitMatch = !toEmpty && dest[dest.length - 1].suit === card.suit;
        if (sitsOnNext && !suitMatch) continue;

        let score = src.length - index; // longer runs first, all else equal
        if (suitMatch) score += 40;
        if (below && !below.faceUp) score += 25; // reveals a hidden card
        if (index === 0) score += 30; // empties a column
        if (below && below.faceUp && !sitsOnNext) score += 5; // exposes a card that might take something
        if (toEmpty) score -= 30; // empty columns are precious
        scored.push({ hint: { kind: "move", from, index, to }, score });
      }
    }
  });
  scored.sort((a, b) => b.score - a.score);
  const hints = scored.map((s) => s.hint);
  if (canDeal(state)) hints.push({ kind: "deal" });
  return hints;
}
