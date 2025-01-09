const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const path = require("path");

let mainWindow;
let logWindow;
let tray;
let notificationCount = 0;
let logWindowBounds = { width: 800, height: 600, x: 0, y: 0 };

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  tray = new Tray(path.join(__dirname, "react-logo.png"));
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => mainWindow.show() },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("File Monitor");
  tray.setContextMenu(contextMenu);
}

function createLogWindow() {
  logWindow = new BrowserWindow({
    width: logWindowBounds.width,
    height: logWindowBounds.height,
    x: logWindowBounds.x,
    y: logWindowBounds.y,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Trade Notifications",
    alwaysOnTop: true,
    focusable: false,
  });

  logWindow.loadFile("log.html");

  logWindow.on("close", (event) => {
    event.preventDefault();
    logWindowBounds = logWindow.getBounds();
    logWindow.hide();
  });
}

function handleNotification(event, message, type) {
  if (!logWindow || notificationCount === 0) {
    createLogWindow();
  }
  notificationCount++;
  console.log(`Notification Count: ${notificationCount}`);
  logWindow.webContents.send(type, message);
  logWindow.showInactive();
  logWindow.show();
}

app.on("ready", createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.on("log-purchase", (event, message) => handleNotification(event, message, "log-purchase"));
ipcMain.on("log-sale", (event, message) => handleNotification(event, message, "log-sale"));

ipcMain.on("check-close-log-window", () => {
  if (logWindow && logWindow.webContents) {
    logWindow.webContents.send("check-close-log-window");
  }
});

ipcMain.on("minimize-main-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("decrement-notification-count", () => {
  if (notificationCount > 0) {
    notificationCount--;
  }
  console.log(`Notification Count: ${notificationCount}`);
  if (notificationCount <= 0 && logWindow) {
    logWindow.hide();
  } else if (logWindow) {
    logWindow.webContents
      .executeJavaScript('document.getElementById("log")')
      .then((element) => {
        if (element && element.children) {
          const height = element.children.length * 50 + 100; // Adjust height based on number of notifications
          logWindow.setSize(logWindowBounds.width, height);
        }
      })
      .catch((error) => {
        console.error("Error resizing log window:", error);
      });
  }
});
