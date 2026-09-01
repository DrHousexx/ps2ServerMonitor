import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

function pickLocalIPv4(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function getBasicSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsedPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const [load1, load5, load15] = os.loadavg();
  const cpuCount = os.cpus().length;

  return {
    ip: pickLocalIPv4(),
    hostname: os.hostname(),
    uptime: formatUptime(os.uptime()),
    memUsedPct,
    load1: Number(load1.toFixed(1)),
    load5: Number(load5.toFixed(1)),
    load15: Number(load15.toFixed(1)),
    cpuCount,
    // Load average normalizado a % de capacidad total (load1 de 4.0 en una maquina
    // de 4 nucleos = 100%, no 400%).
    loadPct: Math.min(999, Math.round((load1 / cpuCount) * 100)),
  };
}

function cpuTimesSnapshot() {
  return os.cpus().map((core) => {
    const t = core.times;
    return {
      idle: t.idle,
      total: t.user + t.nice + t.sys + t.idle + t.irq,
    };
  });
}

/**
 * % de uso instantaneo por nucleo, comparando dos snapshots de os.cpus()
 * separados por sampleMs. Mas preciso que el load average para un momento puntual.
 */
export async function getPerCoreUsage(sampleMs = 200): Promise<number[]> {
  const start = cpuTimesSnapshot();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const end = cpuTimesSnapshot();

  return start.map((s, i) => {
    const e = end[i];
    const idleDelta = e.idle - s.idle;
    const totalDelta = e.total - s.total;
    if (totalDelta <= 0) return 0;
    return Math.round((1 - idleDelta / totalDelta) * 100);
  });
}

/**
 * Uso de disco del filesystem raiz DEL HOST, no del contenedor.
 * Requiere que docker-compose.yml monte "/" del host en config.hostRootPath (ver .env HOST_ROOT_PATH).
 * Sin ese mount, esto reportaria el uso del filesystem interno del contenedor, que no sirve de nada.
 */
export async function getDiskUsedPct(): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("df", ["-P", config.hostRootPath], { timeout: 5000 });
    const dataLine = stdout.trim().split("\n")[1];
    const match = dataLine?.match(/(\d+)%/);
    return match ? Number(match[1]) : null;
  } catch (e) {
    console.error("[system] No se pudo leer uso de disco:", (e as Error).message);
    return null;
  }
}
