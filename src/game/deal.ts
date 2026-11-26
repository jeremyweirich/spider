import { COLUMN_COUNT, RUNS_TO_WIN, type Card, type GameState, type Suit, type SuitCount } from "./types";

/** Mulberry32: a small, fast seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUITS_FOR: Record<SuitCount, readonly Suit[]> = {
  1: [0],
  2: [0, 1],
  4: [0, 1, 2, 3],
};

/** The 104 cards: eight full sets of Ace–King, spread evenly over the chosen suits. */
export function buildDeck(suits: SuitCount): Card[] {
  const palette = SUITS_FOR[suits];
  const deck: Card[] = [];
  for (let set = 0; set < RUNS_TO_WIN; set++) {
    const suit = palette[set % palette.length];
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: deck.length, suit, rank, faceUp: false });
    }
  }
  return deck;
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deal a game: 54 cards to the tableau (6 in each of the first four columns, 5 in the rest), 50 to the stock. */
export function newGame(seed: number, suits: SuitCount): GameState {
  const deck = shuffle(buildDeck(suits), seed);
  const columns: Card[][] = Array.from({ length: COLUMN_COUNT }, () => []);
  for (let i = 0; i < 54; i++) columns[i % COLUMN_COUNT].push(deck[i]);
  for (const col of columns) {
    col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
  }
  return { columns, stock: deck.slice(54), completed: [] };
}

export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 999_999);
}
