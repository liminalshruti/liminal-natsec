/**
 * WorkflowStrip — four-pane workflow tab strip in the topbar.
 *
 * Active pane is hardcoded to "03 WORKING" for demo. The brief calls for
 * future wiring to mouse focus or selected-case state; not implemented now.
 */
const PANES: ReadonlyArray<{ num: string; label: string }> = [
  { num: "01", label: "SUBSTRATE" },
  { num: "02", label: "STAGE" },
  { num: "03", label: "WORKING" },
  { num: "04", label: "COMMAND" }
];

const ACTIVE_NUM = "03";

export function WorkflowStrip() {
  return (
    <nav className="workflow-strip" aria-label="Workflow">
      {PANES.map((pane, i) => {
        const active = pane.num === ACTIVE_NUM;
        return (
          <span
            key={pane.num}
            className={
              "workflow-strip__pane" +
              (active ? " workflow-strip__pane--active" : "")
            }
          >
            <span className="workflow-strip__num">{pane.num}</span>
            <span className="workflow-strip__label">{pane.label}</span>
            {i < PANES.length - 1 && (
              <span className="workflow-strip__sep" aria-hidden>
                ──▸
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
