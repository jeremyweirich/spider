import type { Column } from "./types";

/**
 * Vertical position of each card in a column. Starts from comfortable spacing and squeezes
 * face-up gaps first, then face-down gaps, so a tall column still fits in `availH` where possible.
 */
export function columnOffsets(col: Column, cardH: number, availH: number): number[] {
  let up = cardH * 0.28;
  let down = cardH * 0.12;
  const minUp = cardH * 0.17;
  const minDown = cardH * 0.04;

  let ups = 0;
  let downs = 0;
  for (let i = 0; i < col.length - 1; i++) col[i].faceUp ? ups++ : downs++;

  const room = availH - cardH;
  if (ups * up + downs * down > room) {
    if (ups > 0) up = Math.max(minUp, (room - downs * down) / ups);
    if (ups * up + downs * down > room && downs > 0) down = Math.max(minDown, (room - ups * up) / downs);
  }

  const out: number[] = [];
  let y = 0;
  for (const card of col) {
    out.push(y);
    y += card.faceUp ? up : down;
  }
  return out;
}
