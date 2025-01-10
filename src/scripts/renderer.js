const fs = require("fs");
const path = require("path");
const { ipcRenderer, remote } = require("electron");

const configPath = path.join(__dirname, "/files/config.json");
const translationsPath = path.join(__dirname, "/files/translations.json");

class FileMonitor {
  constructor(filePath) {
    this.filePath = filePath;
    this.lastSize = 0;
    this.watching = false;
    this.intervalId = null;
  }

  start() {
    if (this.watching) {
      this.log("Ya se está monitoreando el archivo");
      return;
    }

    if (!fs.existsSync(this.filePath)) {
      this.log(`El archivo ${this.filePath} no existe`);
      return;
    }

    this.lastSize = fs.statSync(this.filePath).size;
    this.watching = true;

    this.intervalId = setInterval(() => this.checkNewLines(), 200);
  }

  checkNewLines() {
    const stats = fs.statSync(this.filePath);
    const currentSize = stats.size;

    if (currentSize > this.lastSize) {
      const buffer = Buffer.alloc(currentSize - this.lastSize);
      const fileDescriptor = fs.openSync(this.filePath, "r");

      fs.readSync(fileDescriptor, buffer, 0, currentSize - this.lastSize, this.lastSize);
      fs.closeSync(fileDescriptor);

      const newContent = buffer.toString();
      const lines = newContent.split("\n");

      lines.forEach((line) => {
        if (line.trim()) {
          if (line.includes("@From")) {
            this.processLine(line, "COMPRA");
          } else if (line.includes("@To")) {
            this.processLine(line, "VENTA");
          }
        }
      });
    }
    this.lastSize = currentSize;
  }

  processLine(line, action) {
    const translations = JSON.parse(fs.readFileSync(translationsPath));
    const regex = /@(To|From) (\w+): (.+) listed for (\d+) (\w+) in Standard \(stash tab ".*"; position: (.+)\)/;
    const match = line.match(regex);

    if (match) {
      const [, , name, item, quantity, orb, position] = match;
      const translatedItem = translations[item] || item;
      const message = `${action} ${name} ${translatedItem.replace(/.*?your /, "")} ${quantity} ${orb} ${position}`;
      this.log(message, action);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.watching = false;
      this.log("Monitoreo detenido");
    }
  }

  log(message, action) {
    ipcRenderer.send(action === "COMPRA" ? "log-purchase" : "log-sale", message);
  }
}

function saveConfig(filePath) {
  const config = { filePath };
  fs.writeFileSync(configPath, JSON.stringify(config));
}

function loadConfig() {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    return config.filePath;
  }
  return "";
}

function setupEventListeners() {
  document.getElementById("startButton").addEventListener("click", () => {
    const filePath = document.getElementById("filePath").value;
    if (filePath) {
      saveConfig(filePath);
      const monitor = new FileMonitor(filePath);
      monitor.start();

      ipcRenderer.send("minimize-main-window");
      ipcRenderer.send("open-log-window");

      window.addEventListener("beforeunload", () => monitor.stop());
    } else {
      alert("Por favor, proporciona la ruta del archivo a monitorear");
    }
  });

  ipcRenderer.on("log-purchase", (event, message) => {
    addLogEntry(message, "purchase");
  });

  ipcRenderer.on("log-sale", (event, message) => {
    addLogEntry(message, "sale");
  });
}

function addLogEntry(message, type) {
  const logElement = document.getElementById("log");
  const entryElement = document.createElement("div");
  entryElement.className = type;
  entryElement.textContent = message;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.textContent = "X";
  deleteButton.onclick = () => logElement.removeChild(entryElement);

  entryElement.appendChild(deleteButton);
  logElement.appendChild(entryElement);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("filePath").value = loadConfig();
  setupEventListeners();
});
