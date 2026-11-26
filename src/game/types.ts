/** 0 = spades, 1 = hearts, 2 = diamonds, 3 = clubs. */
export type Suit = 0 | 1 | 2 | 3;

/** Difficulty: how many suits are in the 104-card deck. */
export type SuitCount = 1 | 2 | 4;

export interface Card {
  /** Unique within a deal (0..103), used as a React key. */
  readonly id: number;
  readonly suit: Suit;
  /** 1 = Ace … 13 = King. */
  readonly rank: number;
  readonly faceUp: boolean;
}

export type Column = readonly Card[];

export interface GameState {
  readonly columns: readonly Column[];
  /** Undealt cards; each deal takes the last ten. */
  readonly stock: readonly Card[];
  /** Suits of the King-to-Ace runs removed so far, in order. */
  readonly completed: readonly Suit[];
}

export type Action =
  | { readonly type: "move"; readonly from: number; readonly index: number; readonly to: number }
  | { readonly type: "deal" };

export const COLUMN_COUNT = 10;
export const RUNS_TO_WIN = 8;
export const SUIT_COUNTS: readonly SuitCount[] = [1, 2, 4];
