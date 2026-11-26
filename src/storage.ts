import { deserialize, serialize, type Session } from "./game/session";
import { SUIT_COUNTS, type SuitCount } from "./game/types";
import { parseStats, type Stats } from "./stats";

const GAME_KEY = "spider.game.v1";
const STATS_KEY = "spider.stats.v1";
const PREFS_KEY = "spider.prefs.v1";

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the game still works, it just won't be remembered.
  }
}

export const loadSession = (): Session | null => deserialize(read(GAME_KEY));
export const saveSession = (s: Session): void => write(GAME_KEY, serialize(s));

export const loadStats = (): Stats => parseStats(read(STATS_KEY));
export const saveStats = (s: Stats): void => write(STATS_KEY, s);

export interface Prefs {
  suits: SuitCount;
}

export function loadPrefs(): Prefs {
  const p = read(PREFS_KEY) as Partial<Prefs> | null;
  const suits = p && SUIT_COUNTS.includes(p.suits as SuitCount) ? (p.suits as SuitCount) : 4;
  return { suits };
}

export const savePrefs = (p: Prefs): void => write(PREFS_KEY, p);
