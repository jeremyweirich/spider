import { newGame } from "./deal";
import { applyAction, isWon } from "./rules";
import { SUIT_COUNTS, type Action, type GameState, type SuitCount } from "./types";

/** One game in progress: the deal, everything done to it, and the clock. */
export interface Session {
  readonly suits: SuitCount;
  readonly seed: number;
  /** history[0] is the deal; the last entry is the current position. */
  readonly history: readonly GameState[];
  /** actions[i] turned history[i] into history[i + 1]. */
  readonly actions: readonly Action[];
  /** Moves, deals and undos taken. Never decreases, so undo still costs a point. */
  readonly moves: number;
  readonly elapsedMs: number;
}

export const START_SCORE = 500;
export const RUN_BONUS = 100;

export function createSession(seed: number, suits: SuitCount): Session {
  return { suits, seed, history: [newGame(seed, suits)], actions: [], moves: 0, elapsedMs: 0 };
}

export function currentState(s: Session): GameState {
  return s.history[s.history.length - 1];
}

export function act(s: Session, action: Action): Session | null {
  const next = applyAction(currentState(s), action);
  if (!next) return null;
  return { ...s, history: [...s.history, next], actions: [...s.actions, action], moves: s.moves + 1 };
}

export function canUndo(s: Session): boolean {
  return s.history.length > 1 && !isWon(currentState(s));
}

export function undo(s: Session): Session | null {
  if (!canUndo(s)) return null;
  return { ...s, history: s.history.slice(0, -1), actions: s.actions.slice(0, -1), moves: s.moves + 1 };
}

/** Has the player done anything yet? An untouched deal isn't counted in the stats. */
export function isStarted(s: Session): boolean {
  return s.moves > 0;
}

/** Classic Spider scoring: start at 500, lose 1 per move (undo included), gain 100 per completed run. */
export function score(s: Session): number {
  return Math.max(0, START_SCORE - s.moves + RUN_BONUS * currentState(s).completed.length);
}

/** What's stored in localStorage: the deal and the actions, which are replayed on load. */
export interface SavedSession {
  v: 1;
  suits: SuitCount;
  seed: number;
  actions: Action[];
  moves: number;
  elapsedMs: number;
}

export function serialize(s: Session): SavedSession {
  return { v: 1, suits: s.suits, seed: s.seed, actions: s.actions.slice(), moves: s.moves, elapsedMs: s.elapsedMs };
}

export function deserialize(data: unknown): Session | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<SavedSession>;
  if (d.v !== 1 || !SUIT_COUNTS.includes(d.suits as SuitCount) || typeof d.seed !== "number") return null;
  if (!Array.isArray(d.actions)) return null;
  let s: Session | null = createSession(d.seed, d.suits as SuitCount);
  for (const a of d.actions) {
    s = act(s, a);
    if (!s) return null;
  }
  return { ...s, moves: num(d.moves, s.moves), elapsedMs: num(d.elapsedMs, 0) };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}
