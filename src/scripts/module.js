const fs = require("fs");
const path = require("path");

class FileMonitor {
  constructor(filePath) {
    this.filePath = filePath;
    this.lastSize = 0;
    this.watching = false;
    this.intervalId = null;
  }

  start() {
    if (this.watching) {
      console.log("Ya se está monitoreando el archivo");
      return;
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(this.filePath)) {
      console.error(`El archivo ${this.filePath} no existe`);
      return;
    }

    this.lastSize = fs.statSync(this.filePath).size;
    this.watching = true;

    // Configurar el polling cada 2 segundos
    this.intervalId = setInterval(() => {
      this.checkNewLines();
    }, 200);

    console.log(`Monitoreando cambios en ${this.filePath}...`);
  }

  checkNewLines() {
    const stats = fs.statSync(this.filePath);
    const currentSize = stats.size;

    if (currentSize > this.lastSize) {
      // Leer solo las nuevas líneas
      const buffer = Buffer.alloc(currentSize - this.lastSize);
      const fileDescriptor = fs.openSync(this.filePath, "r");

      fs.readSync(fileDescriptor, buffer, 0, currentSize - this.lastSize, this.lastSize);
      fs.closeSync(fileDescriptor);

      const newContent = buffer.toString();
      const lines = newContent.split("\n");

      // Mostrar las nuevas líneas que contienen '@To' o '@From'
      lines.forEach((line) => {
        if (line.trim()) {
          if (line.includes("@From")) {
            console.log("COMPRA");
          } else if (line.includes("@To")) {
            console.log("VENTA");
          }
        }
      });
    }
    this.lastSize = currentSize;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.watching = false;
      console.log("Monitoreo detenido");
    }
  }
}

// Ejemplo de uso
const archivo = process.argv[2];
if (!archivo) {
  console.error("Por favor, proporciona la ruta del archivo a monitorear");
  console.error("Uso: node monitor.js <ruta-del-archivo>");
  process.exit(1);
}

const monitor = new FileMonitor(archivo);
console.log("Iniciando monitoreo del archivo:", archivo); // Log adicional
monitor.start();

// Manejar la terminación del programa
process.on("SIGINT", () => {
  monitor.stop();
  process.exit(0);
});
