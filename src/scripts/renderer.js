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
    // Verifica si ya se está monitoreando el archivo
    if (this.watching) {
      this.log("Ya se está monitoreando el archivo");
      return;
    }

    // Verifica si el archivo existe
    if (!fs.existsSync(this.filePath)) {
      this.log(`El archivo ${this.filePath} no existe`);
      return;
    }

    this.lastSize = fs.statSync(this.filePath).size;
    this.watching = true;

    // Inicia el monitoreo del archivo
    this.intervalId = setInterval(() => this.checkNewLines(), 200);
  }

  checkNewLines() {
    const stats = fs.statSync(this.filePath);
    const currentSize = stats.size;

    // Verifica si hay nuevas líneas en el archivo
    if (currentSize > this.lastSize) {
      const buffer = Buffer.alloc(currentSize - this.lastSize);
      const fileDescriptor = fs.openSync(this.filePath, "r");

      fs.readSync(fileDescriptor, buffer, 0, currentSize - this.lastSize, this.lastSize);
      fs.closeSync(fileDescriptor);

      const newContent = buffer.toString();
      const lines = newContent.split("\n");

      // Procesa cada línea nueva
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

    // Si la línea coincide con el formato esperado, procesa la información
    if (match) {
      const [, , name, item, quantity, orb, position] = match;
      const translatedItem = translations[item] || item;
      const message = `${action} ${name} ${translatedItem.replace(/.*?your /, "")} ${quantity} ${orb} ${position}`;
      this.log(message, action);
      console.log(message); // Log the message to the terminal
    }
  }

  stop() {
    // Detiene el monitoreo del archivo
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.watching = false;
      this.log("Monitoreo detenido");
    }
  }

  log(message, action) {
    // Envía el mensaje al proceso principal
    ipcRenderer.send(action === "COMPRA" ? "log-purchase" : "log-sale", message);
  }
}

function saveConfig(filePath) {
  // Guarda la configuración en un archivo JSON
  const config = { filePath };
  fs.writeFileSync(configPath, JSON.stringify(config));
}

function loadConfig() {
  // Carga la configuración desde un archivo JSON
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath));
    return config.filePath;
  }
  return "";
}

function setupEventListeners() {
  // Configura los event listeners para los botones y eventos de IPC
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
  // Añade una entrada de log en la interfaz de usuario
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
