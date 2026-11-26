import { describe, expect, it } from "vitest";
import { buildDeck, newGame } from "../src/game/deal";
import { findHints } from "../src/game/hint";
import { columnOffsets } from "../src/game/layout";
import { applyAction, bestTarget, canDeal, canMove, isRunFrom, isWon, runStart } from "../src/game/rules";
import type { Card, GameState, Suit } from "../src/game/types";

let nextId = 1000;
const c = (rank: number, suit: Suit = 0, faceUp = true): Card => ({ id: nextId++, rank, suit, faceUp });
const down = (rank = 1, suit: Suit = 0) => c(rank, suit, false);

function board(cols: Card[][], stock: Card[] = [], completed: Suit[] = []): GameState {
  const columns = Array.from({ length: 10 }, (_, i) => cols[i] ?? [c(13, 3)]);
  return { columns, stock, completed };
}

describe("deal", () => {
  it("builds 104 cards with the right suit spread", () => {
    for (const [suits, expected] of [
      [1, [104, 0, 0, 0]],
      [2, [52, 52, 0, 0]],
      [4, [26, 26, 26, 26]],
    ] as const) {
      const deck = buildDeck(suits);
      expect(deck).toHaveLength(104);
      const counts = [0, 0, 0, 0];
      for (const card of deck) counts[card.suit]++;
      expect(counts).toEqual(expected);
    }
  });

  it("lays out 6,6,6,6,5,5,5,5,5,5 with only the top card face up, and 50 in stock", () => {
    const g = newGame(42, 4);
    expect(g.columns.map((col) => col.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    for (const col of g.columns) {
      expect(col.map((card) => card.faceUp)).toEqual(col.map((_, i) => i === col.length - 1));
    }
    expect(g.stock).toHaveLength(50);
    const ids = new Set([...g.columns.flat(), ...g.stock].map((card) => card.id));
    expect(ids.size).toBe(104);
  });

  it("is deterministic per seed", () => {
    expect(newGame(7, 4)).toEqual(newGame(7, 4));
    expect(newGame(7, 4)).not.toEqual(newGame(8, 4));
  });
});

describe("runs and moves", () => {
  it("recognises same-suit descending runs", () => {
    const col = [down(), c(9, 1), c(8, 0), c(7, 0), c(6, 0)];
    expect(isRunFrom(col, 2)).toBe(true);
    expect(isRunFrom(col, 1)).toBe(false); // suit break
    expect(isRunFrom(col, 0)).toBe(false); // face down
    expect(runStart(col)).toBe(2);
  });

  it("moves a run onto any suit one rank higher, and flips the exposed card", () => {
    const s = board([[down(5), c(7, 0), c(6, 0)], [c(8, 1)]]);
    expect(canMove(s, 0, 1, 1)).toBe(true);
    const next = applyAction(s, { type: "move", from: 0, index: 1, to: 1 })!;
    expect(next.columns[1].map((x) => x.rank)).toEqual([8, 7, 6]);
    expect(next.columns[0]).toHaveLength(1);
    expect(next.columns[0][0].faceUp).toBe(true);
  });

  it("rejects mixed-suit runs, wrong ranks and moving onto itself", () => {
    const s = board([[c(7, 1), c(6, 0)], [c(8, 1)], [c(9, 0)]]);
    expect(canMove(s, 0, 0, 1)).toBe(false); // 7♥ 6♠ is not a run
    expect(canMove(s, 0, 1, 2)).toBe(false); // 6 on 9
    expect(canMove(s, 0, 1, 0)).toBe(false);
    expect(applyAction(s, { type: "move", from: 0, index: 0, to: 1 })).toBeNull();
  });

  it("anything can go into an empty column", () => {
    const s = board([[c(4, 2)], []]);
    expect(canMove(s, 0, 0, 1)).toBe(true);
  });

  it("removes a completed King-to-Ace run and records its suit", () => {
    const run = Array.from({ length: 12 }, (_, i) => c(13 - i, 1)); // K..2
    const s = board([[down(3), ...run], [c(1, 1)]]);
    const next = applyAction(s, { type: "move", from: 1, index: 0, to: 0 })!;
    expect(next.completed).toEqual([1]);
    expect(next.columns[0]).toHaveLength(1);
    expect(next.columns[0][0].faceUp).toBe(true);
    expect(next.columns[1]).toHaveLength(0);
  });

  it("wins at eight runs", () => {
    expect(isWon(board([], [], [0, 0, 0, 0, 0, 0, 0, 0]))).toBe(true);
    expect(isWon(board([], [], [0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });
});

describe("dealing from the stock", () => {
  it("deals one face-up card to each column", () => {
    const g = newGame(1, 4);
    const next = applyAction(g, { type: "deal" })!;
    expect(next.stock).toHaveLength(40);
    next.columns.forEach((col, i) => {
      expect(col).toHaveLength(g.columns[i].length + 1);
      expect(col[col.length - 1].faceUp).toBe(true);
    });
  });

  it("is blocked while a column is empty or the stock is out", () => {
    const stock = Array.from({ length: 10 }, () => down());
    expect(canDeal(board([[]], stock))).toBe(false);
    expect(canDeal(board([], stock))).toBe(true);
    expect(canDeal(board([], []))).toBe(false);
  });

  it("can complete a run when the dealt card is the Ace", () => {
    const run = Array.from({ length: 12 }, (_, i) => c(13 - i, 2));
    const stock = [...Array.from({ length: 9 }, () => down(5, 3)), down(1, 2)]; // last card goes to column 0
    const next = applyAction(board([[down(), ...run]], stock), { type: "deal" })!;
    expect(next.completed).toEqual([2]);
  });
});

describe("click target", () => {
  it("prefers a same-suit home, then any suit, then an empty column", () => {
    const s = board([[c(5, 0), c(4, 0)], [c(5, 1)], [c(5, 0)], []]);
    expect(bestTarget(s, 0, 1)).toBe(2);
    const s2 = board([[c(9, 0), c(4, 0)], [c(5, 1)], [c(9, 0)], []]);
    expect(bestTarget(s2, 0, 1)).toBe(1);
    const s3 = board([[c(9, 0), c(4, 0)], [c(9, 1)], [c(9, 0)], []]);
    expect(bestTarget(s3, 0, 1)).toBe(3);
  });

  it("won't move a whole column into an empty one", () => {
    const s = board([[c(4, 0)], [c(9, 1)], []]);
    expect(bestTarget(s, 0, 0)).toBeNull();
  });
});

describe("hints", () => {
  it("puts a same-suit move ahead of an off-suit one", () => {
    const s = board([[down(), c(4, 0)], [c(5, 1)], [c(5, 0)]]);
    const [first] = findHints(s);
    expect(first).toEqual({ kind: "move", from: 0, index: 1, to: 2 });
  });

  it("skips sideways moves and suggests dealing when stuck", () => {
    // 4♠ already sits on 5♥; moving it to another 5♥ gains nothing.
    const stock = Array.from({ length: 10 }, () => down());
    const s = board([[c(5, 1), c(4, 0)], [c(5, 1)]], stock);
    expect(findHints(s)).toEqual([{ kind: "deal" }]);
  });
});

describe("layout", () => {
  it("keeps natural spacing when there's room, and squeezes when there isn't", () => {
    const col = [down(), down(), c(9), c(8), c(7)];
    const roomy = columnOffsets(col, 100, 1000);
    expect(roomy[1] - roomy[0]).toBeCloseTo(12);
    expect(roomy[3] - roomy[2]).toBeCloseTo(28);

    const tall = Array.from({ length: 30 }, (_, i) => c(13 - (i % 13)));
    const tight = columnOffsets(tall, 100, 700);
    expect(tight[tight.length - 1] + 100).toBeLessThanOrEqual(700 + 1e-6);
  });
});
