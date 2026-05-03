// useDraggable — minimal pointer-event drag for stage widgets.
//
// The HUD, layer strip, and data-sources chips on the stage all sit in
// fixed corners and sometimes occlude map content the operator wants to
// see. This hook lets each widget be repositioned by dragging its header.
// Position is held in component state — session-only, resets on reload —
// because persisting widget positions across reloads would risk a
// stuck-off-screen widget on demo day.
//
// Usage:
//   const { style, handleProps } = useDraggable();
//   return (
//     <div className="map-telemetry-hud" style={style}>
//       <div className="map-telemetry-hud__header" {...handleProps}>…</div>
//       …
//     </div>
//   );

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";

interface DragStart {
  pointerX: number;
  pointerY: number;
  originX: number;
  originY: number;
}

export interface UseDraggableResult {
  /** Spread onto the widget root. Applies a translate3d transform. */
  style: CSSProperties;
  /** Spread onto the drag-handle element (typically a header bar). */
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    style: CSSProperties;
  };
}

export function useDraggable(): UseDraggableResult {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startRef = useRef<DragStart | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // Don't hijack clicks on interactive children (chip buttons, inputs).
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select")) return;
      event.preventDefault();

      startRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        originX: offset.x,
        originY: offset.y
      };

      function onMove(ev: PointerEvent) {
        const start = startRef.current;
        if (!start) return;
        setOffset({
          x: start.originX + (ev.clientX - start.pointerX),
          y: start.originY + (ev.clientY - start.pointerY)
        });
      }

      function onUp() {
        startRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [offset.x, offset.y]
  );

  return {
    style: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
    },
    handleProps: {
      onPointerDown,
      style: { cursor: "grab", touchAction: "none" }
    }
  };
}
