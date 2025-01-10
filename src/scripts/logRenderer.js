const { ipcRenderer } = require("electron");

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
  notificationElement.style.fontSize = "12px";
  notificationElement.style.height = "60px";

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.textContent = "X";
  deleteButton.onclick = () => removeNotification(notificationElement);

  notificationElement.appendChild(deleteButton);
  logElement.appendChild(notificationElement);
}

ipcRenderer.on("log-purchase", (event, message) => addNotification(message, "purchase"));
ipcRenderer.on("log-sale", (event, message) => addNotification(message, "sale"));
ipcRenderer.on("check-close-log-window", () => checkAndCloseWindow());

// Ensure resizeWindow is globally accessible
window.resizeWindow = () => {};
