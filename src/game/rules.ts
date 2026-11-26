import { COLUMN_COUNT, RUNS_TO_WIN, type Action, type Card, type Column, type GameState, type Suit } from "./types";

/** True if the cards from `index` to the end are face up, one suit, and descending by one. */
export function isRunFrom(col: Column, index: number): boolean {
  if (index < 0 || index >= col.length || !col[index].faceUp) return false;
  for (let i = index + 1; i < col.length; i++) {
    const above = col[i - 1];
    const card = col[i];
    if (!card.faceUp || card.suit !== above.suit || card.rank !== above.rank - 1) return false;
  }
  return true;
}

/** Index of the first card of the longest movable run at the bottom of the column (col.length if empty). */
export function runStart(col: Column): number {
  if (col.length === 0) return 0;
  let i = col.length - 1;
  while (i > 0 && isRunFrom(col, i - 1)) i--;
  return i;
}

/** Can `card` be placed on this column? Any suit works, as long as the top card is one rank higher. */
export function canDropOn(col: Column, card: Card): boolean {
  if (col.length === 0) return true;
  const top = col[col.length - 1];
  return top.faceUp && top.rank === card.rank + 1;
}

export function canMove(state: GameState, from: number, index: number, to: number): boolean {
  if (from === to || !inRange(from) || !inRange(to)) return false;
  const src = state.columns[from];
  if (!isRunFrom(src, index)) return false;
  return canDropOn(state.columns[to], src[index]);
}

export function canDeal(state: GameState): boolean {
  return state.stock.length > 0 && state.columns.every((c) => c.length > 0);
}

export function isWon(state: GameState): boolean {
  return state.completed.length >= RUNS_TO_WIN;
}

/** Apply an action, returning the new state, or null if it isn't legal. */
export function applyAction(state: GameState, action: Action): GameState | null {
  if (action.type === "deal") {
    if (!canDeal(state)) return null;
    const stock = state.stock.slice();
    const columns = state.columns.map((col) => {
      const card = stock.pop()!;
      return [...col, { ...card, faceUp: true }];
    });
    return collectRuns({ columns, stock, completed: state.completed }, columns.map((_, i) => i));
  }

  const { from, index, to } = action;
  if (!canMove(state, from, index, to)) return null;
  const columns = state.columns.slice();
  const moving = columns[from].slice(index);
  columns[from] = flipTop(columns[from].slice(0, index));
  columns[to] = [...columns[to], ...moving];
  return collectRuns({ columns, stock: state.stock, completed: state.completed }, [to]);
}

/** Remove any complete King-to-Ace run sitting at the bottom of the given columns. */
function collectRuns(state: GameState, which: number[]): GameState {
  let columns: Column[] | null = null;
  let completed: Suit[] | null = null;
  for (const i of which) {
    const col = (columns ?? state.columns)[i];
    const start = col.length - 13;
    if (start < 0 || col[start].rank !== 13 || !isRunFrom(col, start)) continue;
    columns ??= state.columns.slice();
    completed ??= state.completed.slice();
    completed.push(col[start].suit);
    columns[i] = flipTop(col.slice(0, start));
  }
  if (!columns) return state;
  return { columns, stock: state.stock, completed: completed! };
}

function flipTop(col: Card[]): Card[] {
  const top = col[col.length - 1];
  if (top && !top.faceUp) col[col.length - 1] = { ...top, faceUp: true };
  return col;
}

function inRange(i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < COLUMN_COUNT;
}

/**
 * Where a click on a card should send it: a same-suit match first, then any rank match,
 * then an empty column (unless the run is already the whole column). Searches rightward from the source.
 */
export function bestTarget(state: GameState, from: number, index: number): number | null {
  const src = state.columns[from];
  if (!isRunFrom(src, index)) return null;
  const card = src[index];
  let sameSuit: number | null = null;
  let anySuit: number | null = null;
  let empty: number | null = null;
  for (let step = 1; step < COLUMN_COUNT; step++) {
    const to = (from + step) % COLUMN_COUNT;
    const dest = state.columns[to];
    if (!canDropOn(dest, card)) continue;
    if (dest.length === 0) {
      if (index > 0) empty ??= to;
    } else if (dest[dest.length - 1].suit === card.suit) {
      sameSuit ??= to;
    } else {
      anySuit ??= to;
    }
  }
  return sameSuit ?? anySuit ?? empty;
}
