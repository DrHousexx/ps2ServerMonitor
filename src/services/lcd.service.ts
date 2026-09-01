import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { config } from "../config.js";

const LCD_WIDTH = 16;
const RECONNECT_DELAY_MS = 5000;
// Muchas placas Arduino se resetean al abrirse el puerto serial (toggle de DTR)
// y tardan un par de segundos en volver a estar listas para recibir datos.
const BOOT_DELAY_MS = 2000;

type LineIndex = 1 | 2 | 3 | 4;

let port: SerialPort | null = null;
let ready = false;
let writeQueue: Promise<void> = Promise.resolve();

function truncate(text: string): string {
  return text.length > LCD_WIDTH ? text.slice(0, LCD_WIDTH) : text;
}

function rawWrite(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!port || !ready) {
      reject(new Error("LCD serial port not ready"));
      return;
    }
    port.write(`${command}\n`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      port!.drain((drainErr) => (drainErr ? reject(drainErr) : resolve()));
    });
  });
}

function enqueue(command: string): Promise<void> {
  writeQueue = writeQueue.then(
    () => rawWrite(command),
    () => rawWrite(command) // si el comando anterior falló, igual intentamos el siguiente
  );
  return writeQueue;
}

export function isLcdReady(): boolean {
  return ready;
}

export async function writeLine(lineIndex: LineIndex, text: string): Promise<void> {
  await enqueue(`L${lineIndex}:${truncate(text)}`);
}

export async function writeLines(lines: [string, string, string, string]): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    await writeLine((i + 1) as LineIndex, lines[i] ?? "");
  }
}

function connect(): void {
  if (!config.lcd.enabled) {
    console.log("[LCD] Deshabilitado por config (LCD_ENABLED=false).");
    return;
  }

  console.log(`[LCD] Conectando a ${config.lcd.port} @ ${config.lcd.baudRate} baud...`);

  port = new SerialPort({
    path: config.lcd.port,
    baudRate: config.lcd.baudRate,
    autoOpen: true,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  parser.on("data", (line: string) => {
    console.log(`[LCD] <- ${line.trim()}`);
  });

  port.on("open", () => {
    console.log("[LCD] Puerto serial abierto. Esperando boot del Arduino...");
    setTimeout(() => {
      ready = true;
      console.log("[LCD] Listo. Enviando mensaje de prueba.");
      writeLines(["PS2 MONITOR", "SERVER ONLINE", new Date().toLocaleTimeString(), "LINK OK"]).catch((err) =>
        console.error("[LCD] Fallo el mensaje de prueba:", (err as Error).message)
      );
    }, BOOT_DELAY_MS);
  });

  port.on("error", (err) => {
    console.error("[LCD] Error de puerto serial:", err.message);
  });

  port.on("close", () => {
    ready = false;
    console.warn(`[LCD] Puerto serial cerrado. Reintentando en ${RECONNECT_DELAY_MS / 1000}s...`);
    setTimeout(connect, RECONNECT_DELAY_MS);
  });
}

export function initLcd(): void {
  connect();
}
