// SeaForge desktop shell.
// Loads the Vite dev server in dev mode; loads the built bundle in production.
// Shruti owns the visual surface inside the BrowserWindow; this file is the chrome only.

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const isDev = !app.isPackaged;
const DEV_URL = process.env.SEAFORGE_DEV_URL || "http://localhost:5173";
const PROD_INDEX = path.join(__dirname, "..", "app", "dist", "index.html");

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    title: "SeaForge",
    backgroundColor: "#0a0d12",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  win.once("ready-to-show", () => win.show());

  // External links open in default browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    if (process.env.SEAFORGE_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    win.loadFile(PROD_INDEX);
  }
}

// Minimal app menu — preserves Cmd+Q, Cmd+W, copy/paste, Ctrl+Shift+R reset.
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [{
          label: "SeaForge",
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forcereload" },
        { role: "toggledevtools" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
