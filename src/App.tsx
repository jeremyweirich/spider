import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Board } from "./components/Board";
import { DIFFICULTY_LABEL, NewGameDialog, StatsDialog, ThemeDialog, WinDialog, formatTime } from "./components/Dialogs";
import { applyTheme, themeById } from "./themes";
import { randomSeed } from "./game/deal";
import { findHints, type Hint } from "./game/hint";
import { canDeal, isWon } from "./game/rules";
import { act, canUndo, createSession, currentState, isStarted, score, undo, type Session } from "./game/session";
import type { Action, SuitCount } from "./game/types";
import { emptyStats, recordLoss, recordWin, type Stats } from "./stats";
import { loadPrefs, loadSession, loadStats, savePrefs, saveSession, saveStats } from "./storage";

type Dialog = "new" | "stats" | "theme" | "win" | null;

export function App() {
  const [session, setSession] = useState<Session>(() => loadSession() ?? createSession(randomSeed(), loadPrefs().suits));
  const [stats, setStats] = useState<Stats>(loadStats);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const hintIndex = useRef(0);
  const [themeId, setThemeId] = useState(() => loadPrefs().theme);

  useLayoutEffect(() => applyTheme(themeById(themeId)), [themeId]);

  const state = currentState(session);
  const won = isWon(state);
  const started = isStarted(session);

  useEffect(() => saveSession(session), [session]);

  // The clock runs from the first move until the win, and only while the page is visible.
  useEffect(() => {
    if (!started || won) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 1500); // don't count time the tab spent throttled in the background
      last = now;
      if (document.visibilityState === "visible") setSession((s) => ({ ...s, elapsedMs: s.elapsedMs + delta }));
    }, 1000);
    return () => clearInterval(id);
  }, [started, won]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(null), 2500);
    return () => clearTimeout(id);
  }, [hint]);

  const updateStats = (next: Stats) => {
    setStats(next);
    saveStats(next);
  };

  const commit = (next: Session) => {
    setSession(next);
    setHint(null);
    hintIndex.current = 0;
  };

  const onAction = (action: Action) => {
    if (won) return;
    const next = act(session, action);
    if (!next) {
      if (action.type === "deal" && state.stock.length > 0 && !canDeal(state)) {
        setToast("Fill every empty column before dealing");
      }
      return;
    }
    commit(next);
    if (isWon(currentState(next))) {
      updateStats(recordWin(stats, next.suits, next.elapsedMs, score(next)));
      setDialog("win");
    }
  };

  const onUndo = () => {
    const next = undo(session);
    if (next) commit(next);
  };

  const onHint = () => {
    if (won) return;
    const hints = findHints(state);
    if (hints.length === 0) {
      setToast("No useful moves left. Try undo, or start a new game.");
      return;
    }
    setHint(hints[hintIndex.current % hints.length]);
    hintIndex.current++;
  };

  const startGame = (suits: SuitCount, seed: number | null) => {
    if (started && !won) updateStats(recordLoss(stats, session.suits));
    savePrefs({ suits });
    commit(createSession(seed ?? randomSeed(), suits));
    setDialog(null);
  };

  // Keyboard: Ctrl/Cmd+Z undo, H hint, D deal, N new game.
  const keys = useRef({ onUndo, onHint, onAction, dialog });
  keys.current = { onUndo, onHint, onAction, dialog };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (k.dialog || e.altKey) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        k.onUndo();
      } else if (!e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "h") k.onHint();
        else if (key === "d") k.onAction({ type: "deal" });
        else if (key === "n") setDialog("new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Board state={state} onAction={onAction} hint={hint} />

      {/* At the bottom, for thumbs: info first so that when it wraps, the buttons get the lowest row. */}
      <footer className="toolbar">
        <div className="info">
          <span title={`Game #${session.seed}`}>
            {DIFFICULTY_LABEL[session.suits]} <span className="muted">#{session.seed}</span>
          </span>
          <span>
            <span className="muted">Score</span> {score(session)}
          </span>
          <span className="hide-narrow">
            <span className="muted">Moves</span> {session.moves}
          </span>
          <span className="time">{formatTime(session.elapsedMs)}</span>
        </div>
        {/* Rarely used on the left, Undo on the far right under the thumb. */}
        <div className="buttons">
          <button onClick={() => setDialog("stats")} title="Statistics">
            Stats
          </button>
          <button onClick={() => setDialog("theme")} title="Background">
            Theme
          </button>
          <button onClick={() => setDialog("new")} title="New game (N)">
            New
          </button>
          <button onClick={onHint} disabled={won} title="Hint (H)">
            Hint
          </button>
          <button className="undo" onClick={onUndo} disabled={!canUndo(session)} title="Undo (Ctrl+Z)">
            Undo
          </button>
        </div>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {dialog === "new" && (
        <NewGameDialog
          suits={session.suits}
          abandoning={started && !won}
          onStart={startGame}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "stats" && (
        <StatsDialog
          stats={stats}
          suits={session.suits}
          onReset={() => updateStats(emptyStats())}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "theme" && (
        <ThemeDialog
          current={themeId}
          onPick={(id) => {
            setThemeId(id);
            savePrefs({ theme: id });
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "win" && (
        <WinDialog
          stats={stats}
          suits={session.suits}
          score={score(session)}
          elapsedMs={session.elapsedMs}
          onNewGame={() => setDialog("new")}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
