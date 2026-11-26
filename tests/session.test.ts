import { describe, expect, it } from "vitest";
import { findHints } from "../src/game/hint";
import { act, canUndo, createSession, currentState, deserialize, score, serialize, undo } from "../src/game/session";
import { averageWinMs, emptyStats, parseStats, recordLoss, recordWin, winPercent } from "../src/stats";

/** Play the top hint a few times to get a session with some history. */
function playSome(seed: number, n: number) {
  let s = createSession(seed, 4);
  for (let i = 0; i < n; i++) {
    const h = findHints(currentState(s))[0];
    if (!h) break;
    s = act(s, h.kind === "deal" ? { type: "deal" } : { type: "move", from: h.from, index: h.index, to: h.to })!;
  }
  return s;
}

describe("session", () => {
  it("undo restores the previous position and still costs a move", () => {
    const s0 = createSession(3, 4);
    const s1 = act(s0, { type: "deal" })!;
    expect(s1.moves).toBe(1);
    const s2 = undo(s1)!;
    expect(currentState(s2)).toEqual(currentState(s0));
    expect(s2.moves).toBe(2);
    expect(canUndo(s2)).toBe(false);
  });

  it("scores 500 minus moves plus 100 per run", () => {
    const s = act(createSession(3, 4), { type: "deal" })!;
    expect(score(s)).toBe(499);
  });

  it("round-trips through storage by replaying actions", () => {
    const s = { ...playSome(11, 25), elapsedMs: 12345 };
    expect(s.actions.length).toBeGreaterThan(5);
    const back = deserialize(JSON.parse(JSON.stringify(serialize(s))))!;
    expect(currentState(back)).toEqual(currentState(s));
    expect(back.moves).toBe(s.moves);
    expect(back.elapsedMs).toBe(12345);
    expect(back.history).toHaveLength(s.history.length);
  });

  it("rejects corrupt saves", () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize({ v: 1, suits: 3, seed: 1, actions: [] })).toBeNull();
    expect(deserialize({ v: 1, suits: 4, seed: 1, actions: [{ type: "move", from: 0, index: 0, to: 0 }] })).toBeNull();
  });
});

describe("stats", () => {
  it("tracks wins, losses, times, best score and streaks per difficulty", () => {
    let st = emptyStats();
    st = recordWin(st, 4, 600_000, 900);
    st = recordWin(st, 4, 300_000, 1000);
    st = recordLoss(st, 4);
    st = recordWin(st, 1, 100_000, 1200);
    expect(st[4]).toMatchObject({ played: 3, won: 2, fastestMs: 300_000, bestScore: 1000, streak: 0, bestStreak: 2 });
    expect(winPercent(st[4])).toBe(67);
    expect(averageWinMs(st[4])).toBe(450_000);
    expect(st[1].won).toBe(1);
    expect(winPercent(st[2])).toBeNull();
  });

  it("parses stored stats defensively", () => {
    const st = parseStats({ 4: { played: 5, won: "x", fastestMs: 1000 }, 2: null });
    expect(st[4].played).toBe(5);
    expect(st[4].won).toBe(0);
    expect(st[4].fastestMs).toBe(1000);
    expect(st[2]).toEqual(emptyStats()[2]);
  });
});
