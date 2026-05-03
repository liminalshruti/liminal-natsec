// Drag-and-drop type vocabulary for the AI draft case promotion flow (B-1).
//
// Liminal-domain MIME type used in DataTransfer so the drop zone can
// validate that what's being dropped is actually a Liminal signal and
// not arbitrary text/file. The signal id rides in the same dataTransfer
// entry as the value.
//
// Custom event name `liminal:signal-attached-to-stage` fires on drop so
// downstream surfaces (B-2 ghost ships on map, B-3 reverse-flow animation)
// can listen for the moment the operator confirmed an attach.

/** MIME type for signal id payload in DataTransfer. */
export const LIMINAL_SIGNAL_DRAG_TYPE = "application/liminal-signal";

/** Window event fired when a signal is dropped onto the stage. */
export const SIGNAL_ATTACHED_EVENT = "liminal:signal-attached-to-stage";

export interface SignalAttachedDetail {
  signalId: string;
  /** Mouse coordinates at drop, relative to the stage panel. Used by
   *  B-2 to render the ghost ship at the drop location. */
  stageX: number;
  stageY: number;
}
