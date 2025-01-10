const { ipcRenderer, remote } = require("electron");

function checkAndCloseWindow() {
  const logElement = document.getElementById("log");
  if (logElement.children.length === 0) {
    ipcRenderer.send("decrement-notification-count");
    remote.getCurrentWindow().close();
  }
}

function removeNotification(element) {
  const logElement = document.getElementById("log");
  logElement.removeChild(element);
  ipcRenderer.send("decrement-notification-count");
  checkAndCloseWindow();
}

function addNotification(message, type) {
  const logElement = document.getElementById("log");
  const notificationElement = document.createElement("div");
  notificationElement.className = `notification ${type}`;
  notificationElement.textContent = message;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.textContent = "X";
  deleteButton.onclick = () => removeNotification(notificationElement);

  notificationElement.appendChild(deleteButton);
  logElement.appendChild(notificationElement);
  resizeWindow();
}

ipcRenderer.on("log-purchase", (event, message) => addNotification(message, "purchase"));
ipcRenderer.on("log-sale", (event, message) => addNotification(message, "sale"));
ipcRenderer.on("check-close-log-window", () => checkAndCloseWindow());

function resizeWindow() {
  const logElement = document.getElementById("log");
  const height = logElement.children.length * 50 + 100; // Adjust height based on number of notifications
  remote.getCurrentWindow().setSize(remote.getCurrentWindow().getBounds().width, height);
}
