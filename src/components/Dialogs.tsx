import { useEffect, useState, type ReactNode } from "react";
import { SUIT_COUNTS, type SuitCount } from "../game/types";
import { averageWinMs, winPercent, type Stats } from "../stats";

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export const DIFFICULTY_LABEL: Record<SuitCount, string> = { 1: "1 suit", 2: "2 suits", 4: "4 suits" };
const DIFFICULTY_HINT: Record<SuitCount, string> = { 1: "Easy", 2: "Medium", 4: "Hard" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface NewGameProps {
  suits: SuitCount;
  /** A started, unfinished game will be recorded as a loss. */
  abandoning: boolean;
  onStart: (suits: SuitCount, seed: number | null) => void;
  onClose: () => void;
}

export function NewGameDialog({ suits: initial, abandoning, onStart, onClose }: NewGameProps) {
  const [suits, setSuits] = useState<SuitCount>(initial);
  const [seedText, setSeedText] = useState("");
  const seed = /^\d{1,9}$/.test(seedText.trim()) ? Number(seedText.trim()) : null;
  const seedInvalid = seedText.trim() !== "" && seed === null;
  return (
    <Modal title="New game" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!seedInvalid) onStart(suits, seed);
        }}
      >
        <fieldset className="difficulty">
          <legend>Difficulty</legend>
          {[...SUIT_COUNTS].reverse().map((n) => (
            <label key={n} className={suits === n ? "chosen" : ""}>
              <input type="radio" name="suits" checked={suits === n} onChange={() => setSuits(n)} />
              <strong>{DIFFICULTY_LABEL[n]}</strong> <span className="muted">{DIFFICULTY_HINT[n]}</span>
            </label>
          ))}
        </fieldset>
        <label className="seed">
          Game number <span className="muted">(optional, to replay a deal)</span>
          <input
            inputMode="numeric"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="Random"
            aria-invalid={seedInvalid}
          />
        </label>
        {abandoning && <p className="warn">The current game will count as a loss.</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={seedInvalid}>
            Deal
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatsTable({ stats, highlight }: { stats: Stats; highlight: SuitCount }) {
  const cols = [...SUIT_COUNTS].reverse();
  const dash = "—";
  const rows: [string, (n: SuitCount) => string][] = [
    ["Played", (n) => String(stats[n].played)],
    ["Won", (n) => String(stats[n].won)],
    ["Win rate", (n) => (winPercent(stats[n]) === null ? dash : `${winPercent(stats[n])}%`)],
    ["Fastest win", (n) => (stats[n].fastestMs === null ? dash : formatTime(stats[n].fastestMs!))],
    ["Average win", (n) => (averageWinMs(stats[n]) === null ? dash : formatTime(averageWinMs(stats[n])!))],
    ["Best score", (n) => (stats[n].bestScore === null ? dash : String(stats[n].bestScore))],
    ["Streak", (n) => `${stats[n].streak} (best ${stats[n].bestStreak})`],
  ];
  return (
    <div className="table-wrap">
      <table className="stats">
        <thead>
          <tr>
            <th />
            {cols.map((n) => (
              <th key={n} className={n === highlight ? "current" : ""}>
                {DIFFICULTY_LABEL[n]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {cols.map((n) => (
                <td key={n} className={n === highlight ? "current" : ""}>
                  {value(n)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StatsProps {
  stats: Stats;
  suits: SuitCount;
  onReset: () => void;
  onClose: () => void;
}

export function StatsDialog({ stats, suits, onReset, onClose }: StatsProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal title="Statistics" onClose={onClose}>
      <StatsTable stats={stats} highlight={suits} />
      <p className="muted small">
        A game counts once you've made a move. Starting a new one before winning counts as a loss. Score: 500, −1 per
        move or undo, +100 per completed run.
      </p>
      <div className="actions">
        {confirming ? (
          <>
            <span className="warn">Erase all stats?</span>
            <button onClick={() => setConfirming(false)}>Keep</button>
            <button
              className="danger"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              Erase
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setConfirming(true)}>Reset…</button>
            <button className="primary" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

interface WinProps {
  stats: Stats;
  suits: SuitCount;
  score: number;
  elapsedMs: number;
  onNewGame: () => void;
  onClose: () => void;
}

export function WinDialog({ stats, suits, score, elapsedMs, onNewGame, onClose }: WinProps) {
  const d = stats[suits];
  const newBestTime = d.fastestMs === elapsedMs;
  const newBestScore = d.bestScore === score;
  return (
    <Modal title="You won!" onClose={onClose}>
      <div className="win-summary">
        <div>
          <span className="big">{score}</span>
          <span className="muted">score{newBestScore && d.won > 1 ? " · new best" : ""}</span>
        </div>
        <div>
          <span className="big">{formatTime(elapsedMs)}</span>
          <span className="muted">time{newBestTime && d.won > 1 ? " · new best" : ""}</span>
        </div>
      </div>
      <StatsTable stats={stats} highlight={suits} />
      <div className="actions">
        <button onClick={onClose}>Admire the board</button>
        <button className="primary" onClick={onNewGame}>
          New game
        </button>
      </div>
    </Modal>
  );
}
