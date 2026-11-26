import type { CSSProperties, PointerEvent } from "react";
import type { Card, Suit } from "../game/types";

// U+FE0E asks for the text glyph, so iOS doesn't swap in emoji suits.
export const SUIT_SYMBOL: Record<Suit, string> = { 0: "♠︎", 1: "♥︎", 2: "♦︎", 3: "♣︎" };
export const SUIT_NAME: Record<Suit, string> = { 0: "spades", 1: "hearts", 2: "diamonds", 3: "clubs" };
const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_NAME = ["", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];

interface Props {
  card: Card;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
}

export function CardView({ card, className = "", style, onPointerDown }: Props) {
  if (!card.faceUp) {
    return <div className={`card back ${className}`} style={style} aria-label="Face-down card" />;
  }
  const red = card.suit === 1 || card.suit === 2;
  return (
    <div
      className={`card face ${red ? "red" : "black"} ${className}`}
      style={style}
      onPointerDown={onPointerDown}
      aria-label={`${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`}
    >
      <span className="corner">
        {RANK_LABEL[card.rank]}
        <span className="corner-suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>
      <span className="pip">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}
