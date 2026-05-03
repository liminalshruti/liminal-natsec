// SignalDropZone — invisible-by-default overlay covering the stage panel
// that lights up when a Liminal signal is being dragged. On drop, calls
// toggleAttach in the useDraftCase store and emits a window event B-2's
// ghost-ship renderer listens for.
//
// Mounted inside StageViewport at z-index 60 so it sits above the map
// chrome but below the topbar elements. Pointer-events: none until a drag
// is in progress, so it doesn't interfere with normal map interaction.
//
// Visual register: when active, the stage shows a soft decision-blue
// border-glow + center-positioned label "DROP TO ATTACH SIGNAL" in
// instrument-grade mono. On drop, a quick flash + ripple at the drop
// location, then fades.

import { useEffect, useRef, useState } from "react";
import { useDraftCase } from "../lib/useDraftCase.ts";
import {
  LIMINAL_SIGNAL_DRAG_TYPE,
  SIGNAL_ATTACHED_EVENT,
  type SignalAttachedDetail
} from "../lib/signalDragTypes.ts";

interface DropFlash {
  id: number;
  x: number;
  y: number;
}

export function SignalDropZone() {
  const { toggleAttach, draft } = useDraftCase();
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState(false);
  const [flashes, setFlashes] = useState<DropFlash[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const flashIdRef = useRef(0);

  // Watch the global drag flag so the zone activates only while a Liminal
  // signal is being dragged anywhere on the page. Cheaper than dragenter
  // counting and works whether the drag started in the working panel or
  // came in from elsewhere.
  useEffect(() => {
    function check() {
      setActive(document.body.classList.contains("liminal-dragging-signal"));
    }
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    check();
    return () => observer.disconnect();
  }, []);

  // Ignore drops if no draft signals exist or all are already attached.
  const hasDroppableSignals = draft.candidateSignals.some((s) => !s.attached);
  if (!hasDroppableSignals && draft.status === "promoted") return null;

  return (
    <div
      ref={ref}
      className={[
        "signal-drop-zone",
        active ? "signal-drop-zone--active" : "",
        hover ? "signal-drop-zone--hover" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!active}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes(LIMINAL_SIGNAL_DRAG_TYPE)) return;
        e.preventDefault();
        setHover(true);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(LIMINAL_SIGNAL_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "link";
      }}
      onDragLeave={(e) => {
        // Only clear hover if we've truly left the zone (not just crossed
        // a child boundary inside it).
        if (e.currentTarget === e.target) setHover(false);
      }}
      onDrop={(e) => {
        const signalId = e.dataTransfer.getData(LIMINAL_SIGNAL_DRAG_TYPE);
        if (!signalId) return;
        e.preventDefault();
        setHover(false);

        const rect = ref.current?.getBoundingClientRect();
        const x = rect ? e.clientX - rect.left : 0;
        const y = rect ? e.clientY - rect.top : 0;

        // Toggle attach in the store. Idempotent; calling twice would
        // detach, but the dragstart handler disables drag for already-
        // attached signals so this is safe.
        toggleAttach(signalId);

        // Emit a window event B-2's ghost-ship renderer listens for.
        const detail: SignalAttachedDetail = {
          signalId,
          stageX: x,
          stageY: y
        };
        window.dispatchEvent(
          new CustomEvent(SIGNAL_ATTACHED_EVENT, { detail })
        );

        // Add a drop flash at the cursor location.
        const id = ++flashIdRef.current;
        setFlashes((f) => [...f, { id, x, y }]);
        setTimeout(() => {
          setFlashes((f) => f.filter((flash) => flash.id !== id));
        }, 900);
      }}
    >
      <div className="signal-drop-zone__label">
        <span className="signal-drop-zone__label-icon" aria-hidden="true">⇣</span>
        <span>DROP TO ATTACH SIGNAL</span>
      </div>
      {flashes.map((f) => (
        <span
          key={f.id}
          className="signal-drop-zone__flash"
          style={{ left: `${f.x}px`, top: `${f.y}px` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
