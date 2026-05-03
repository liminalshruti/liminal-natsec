// useDraggable — minimal pointer-event drag for panes and stage widgets.
//
// The main panes and smaller stage widgets can occlude map or case content
// during a demo. This hook lets each surface be repositioned by dragging
// its header.
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
  /** True while a pointer drag is active. Useful for z-index/cursor styling. */
  isDragging: boolean;
  /** Spread onto the drag-handle element (typically a header bar). */
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    style: CSSProperties;
  };
}

export function useDraggable(): UseDraggableResult {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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
      setIsDragging(true);

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
        setIsDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [offset.x, offset.y]
  );

  return {
    style: {
      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
    },
    isDragging,
    handleProps: {
      onPointerDown,
      style: { cursor: "grab", touchAction: "none" }
    }
  };
}
