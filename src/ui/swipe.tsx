import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const THRESHOLD = 90;
/** Fly-off and snap-back time. The next card is already rendered underneath, so this is all the wait there is. */
const MS = 180;

/**
 * Drag-to-decide for a card: drag right past the threshold for "yes", left for "no",
 * or call `decide()` from a button or key. The card flies off before `onDecide` fires.
 *
 * The hook's state belongs to the deck, not to one card, so callers must give each card
 * a React `key`. Without it the element that just flew off is reused for the next card
 * and slides back in from the side with the new dish on it.
 */
export function useSwipe(onDecide: (yes: boolean) => void) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const decide = (yes: boolean) => {
    if (leaving) return;
    setLeaving(yes ? 'right' : 'left');
    window.setTimeout(() => {
      setLeaving(null);
      setDrag(null);
      onDecide(yes);
    }, MS);
  };

  const dx = drag?.x ?? 0;
  const style: CSSProperties = {
    transform: leaving
      ? `translateX(${leaving === 'right' ? 130 : -130}vw) rotate(${leaving === 'right' ? 28 : -28}deg)`
      : drag
        ? `translate(${dx}px, ${drag.y * 0.25}px) rotate(${dx / 16}deg)`
        : 'none',
    // filter too: the card underneath is dimmed, and brightens as it moves up.
    transition: drag && !leaving ? 'none' : `transform ${MS}ms ease-out, filter ${MS}ms ease-out`,
  };

  const bind = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY };
      setDrag({ x: 0, y: 0 });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (start.current) setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
    },
    // The system can take the pointer away mid-drag (a notification shade, a gesture); treat it as letting go.
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
    onPointerUp: () => {
      start.current = null;
      if (dx > THRESHOLD) decide(true);
      else if (dx < -THRESHOLD) decide(false);
      else setDrag(null);
    },
  };

  return {
    bind,
    style,
    decide,
    yes: Math.max(0, Math.min(1, dx / THRESHOLD)),
    no: Math.max(0, Math.min(1, -dx / THRESHOLD)),
    busy: !!leaving,
  };
}

export function Stamps({ yes, no, yesLabel, noLabel }: { yes: number; no: number; yesLabel: string; noLabel: string }) {
  return (
    <>
      <span className="stamp yes" style={{ opacity: yes }}>
        {yesLabel}
      </span>
      <span className="stamp no" style={{ opacity: no }}>
        {noLabel}
      </span>
    </>
  );
}
