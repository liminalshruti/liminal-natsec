// Preload runs in an isolated context with access to a limited Node surface.
// Kept intentionally minimal for the hackathon. Extend only when the renderer
// needs explicit capabilities (file dialogs, native notifications, etc).

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("seaforge", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});
