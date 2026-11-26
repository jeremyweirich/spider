import { SUIT_COUNTS, type SuitCount } from "./game/types";

export interface DifficultyStats {
  played: number;
  won: number;
  /** Sum of winning game times, for the average. */
  totalWinMs: number;
  fastestMs: number | null;
  bestScore: number | null;
  streak: number;
  bestStreak: number;
}

export type Stats = Record<SuitCount, DifficultyStats>;

export function emptyStats(): Stats {
  const blank = (): DifficultyStats => ({
    played: 0,
    won: 0,
    totalWinMs: 0,
    fastestMs: null,
    bestScore: null,
    streak: 0,
    bestStreak: 0,
  });
  return { 1: blank(), 2: blank(), 4: blank() };
}

export function recordWin(stats: Stats, suits: SuitCount, ms: number, score: number): Stats {
  const d = stats[suits];
  const streak = d.streak + 1;
  return {
    ...stats,
    [suits]: {
      played: d.played + 1,
      won: d.won + 1,
      totalWinMs: d.totalWinMs + ms,
      fastestMs: d.fastestMs === null ? ms : Math.min(d.fastestMs, ms),
      bestScore: d.bestScore === null ? score : Math.max(d.bestScore, score),
      streak,
      bestStreak: Math.max(d.bestStreak, streak),
    },
  };
}

/** A started game that was abandoned (a new game was begun before winning). */
export function recordLoss(stats: Stats, suits: SuitCount): Stats {
  const d = stats[suits];
  return { ...stats, [suits]: { ...d, played: d.played + 1, streak: 0 } };
}

export function winPercent(d: DifficultyStats): number | null {
  return d.played === 0 ? null : Math.round((100 * d.won) / d.played);
}

export function averageWinMs(d: DifficultyStats): number | null {
  return d.won === 0 ? null : d.totalWinMs / d.won;
}

/** Merge whatever was stored over blank stats, ignoring anything malformed. */
export function parseStats(raw: unknown): Stats {
  const stats = emptyStats();
  if (!raw || typeof raw !== "object") return stats;
  for (const suits of SUIT_COUNTS) {
    const src = (raw as Record<string, unknown>)[suits];
    if (!src || typeof src !== "object") continue;
    const dst = stats[suits];
    for (const key of Object.keys(dst) as (keyof DifficultyStats)[]) {
      const v = (src as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) (dst[key] as number) = v;
    }
  }
  return stats;
}
