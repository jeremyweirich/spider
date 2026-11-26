import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Hint } from "../game/hint";
import { columnOffsets } from "../game/layout";
import { bestTarget, canDeal, canMove, isRunFrom } from "../game/rules";
import { RUNS_TO_WIN, type Action, type GameState } from "../game/types";
import { CardView, SUIT_SYMBOL } from "./CardView";

interface Props {
  state: GameState;
  onAction: (action: Action) => void;
  hint: Hint | null;
}

interface Drag {
  from: number;
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  /** False until the pointer has moved far enough to count as a drag rather than a click. */
  active: boolean;
  over: number | null;
  /** Horizontal centre of the grabbed card when the drag began. */
  centerX: number;
}

const DRAG_THRESHOLD = 6;

export function Board({ state, onAction, hint }: Props) {
  const tableauRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  // A brief shake on a card that was clicked or dropped with nowhere legal to go.
  const [shake, setShake] = useState<{ from: number; index: number; n: number } | null>(null);
  const latest = useRef({ state, onAction });
  latest.current = { state, onAction };
  const nudge = (from: number, index: number) => setShake((s) => ({ from, index, n: (s?.n ?? 0) + 1 }));

  useEffect(() => {
    if (!shake) return;
    const id = setTimeout(() => setShake(null), 400);
    return () => clearTimeout(id);
  }, [shake]);

  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  useLayoutEffect(() => {
    const el = tableauRef.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const columnAt = (x: number): number | null => {
      let best: number | null = null;
      let bestDist = Infinity;
      colRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    };
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const active = d.active || Math.hypot(dx, dy) > DRAG_THRESHOLD;
      if (active) e.preventDefault();
      setDrag({ ...d, dx, dy, active, over: active ? columnAt(d.centerX + dx) : null });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      setDrag(null);
      const { state, onAction } = latest.current;
      if (d.active) {
        if (d.over === null || d.over === d.from) return;
        if (canMove(state, d.from, d.index, d.over)) onAction({ type: "move", from: d.from, index: d.index, to: d.over });
        else nudge(d.from, d.index);
      } else {
        const to = bestTarget(state, d.from, d.index);
        if (to === null) nudge(d.from, d.index);
        else onAction({ type: "move", from: d.from, index: d.index, to });
      }
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  const onCardDown = (e: ReactPointerEvent<HTMLDivElement>, from: number, index: number) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!isRunFrom(state.columns[from], index)) {
      nudge(from, index);
      return;
    }
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setDrag({
      from,
      index,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      active: false,
      over: null,
      centerX: r.left + r.width / 2,
    });
  };

  const gap = Math.max(3, Math.min(12, size.w * 0.012));
  const cardW = Math.max(0, Math.min(110, (size.w - gap * 9) / 10));
  const cardH = cardW * 1.4;
  const vars = { "--cw": `${cardW}px`, "--ch": `${cardH}px`, "--gap": `${gap}px` } as CSSProperties;

  const activeDrag = drag?.active ? drag : null;
  const dropLegal =
    activeDrag && activeDrag.over !== null && activeDrag.over !== activeDrag.from
      ? canMove(state, activeDrag.from, activeDrag.index, activeDrag.over)
      : null;
  const hintMove = hint?.kind === "move" ? hint : null;
  const dealsLeft = state.stock.length / 10;

  return (
    <div className="board" style={vars}>
      <div className="tableau" ref={tableauRef}>
        {cardW > 0 &&
          state.columns.map((col, i) => {
            const offsets = columnOffsets(col, cardH, size.h - 4);
            const isOver = activeDrag?.over === i && i !== activeDrag.from;
            const colClass = [
              "column",
              isOver ? (dropLegal ? "drop-ok" : "drop-bad") : "",
              hintMove?.to === i ? "hint-dst" : "",
            ].join(" ");
            return (
              <div
                key={i}
                className={colClass}
                ref={(el) => {
                  colRefs.current[i] = el;
                }}
                style={{ zIndex: drag?.from === i ? 5 : undefined }}
              >
                <div className="slot" />
                {col.map((card, j) => {
                  const dragging = !!activeDrag && activeDrag.from === i && j >= activeDrag.index;
                  const hinted = !!hintMove && hintMove.from === i && j >= hintMove.index;
                  const movable = card.faceUp && isRunFrom(col, j);
                  const shaking = !!shake && shake.from === i && j >= shake.index;
                  const style: CSSProperties = {
                    top: offsets[j],
                    zIndex: j + (dragging ? 100 : 0),
                    transform: dragging ? `translate(${activeDrag.dx}px, ${activeDrag.dy}px)` : undefined,
                  };
                  const cls = [
                    dragging ? "dragging" : "",
                    hinted ? "hinted" : "",
                    movable ? "movable" : "",
                    shaking ? (shake.n % 2 ? "shake" : "shake2") : "",
                  ].join(" ");
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      style={style}
                      className={cls}
                      onPointerDown={card.faceUp ? (e) => onCardDown(e, i, j) : undefined}
                    />
                  );
                })}
              </div>
            );
          })}
      </div>

      <div className="bottom-row">
        <div className="foundations" aria-label={`${state.completed.length} of ${RUNS_TO_WIN} runs complete`}>
          {state.completed.length === 0 && <div className="mini slot-mini" />}
          {state.completed.map((suit, i) => {
            const red = suit === 1 || suit === 2;
            return (
              <div key={i} className={`mini card face ${red ? "red" : "black"}`}>
                <span className="corner">
                  K<span className="corner-suit">{SUIT_SYMBOL[suit]}</span>
                </span>
              </div>
            );
          })}
        </div>
        <button
          className={`stock ${hint?.kind === "deal" ? "hinted" : ""} ${canDeal(state) ? "" : "stock-blocked"}`}
          onClick={() => onAction({ type: "deal" })}
          disabled={dealsLeft === 0}
          aria-label={dealsLeft > 0 ? `Deal a row (${dealsLeft} left)` : "Stock empty"}
          title={dealsLeft > 0 ? `Deal a row (${dealsLeft} left)` : "Stock empty"}
        >
          {dealsLeft === 0 ? (
            <div className="mini slot-mini" />
          ) : (
            Array.from({ length: dealsLeft }, (_, i) => <div key={i} className="mini card back" />)
          )}
        </button>
      </div>
    </div>
  );
}
