import { getStatus } from "./boinc.service.js";
import { getSystemInfo } from "./system.service.js";

type Page = [string, string, string, string];

const LCD_WIDTH = 16;

function pad(text: string): string {
  return text.length > LCD_WIDTH ? text.slice(0, LCD_WIDTH) : text;
}

function timeNow(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

async function buildBoincPage(): Promise<Page> {
  const status = await getStatus();

  const suspended: string[] = [];
  if (status.boinc.cpuSuspended) suspended.push("CPU");
  if (status.boinc.gpuSuspended) suspended.push("GPU");
  if (status.boinc.networkSuspended) suspended.push("NET");
  const statusLine = suspended.length ? `SUSP: ${suspended.join(",")}` : "ALL SYSTEMS OK";

  return [
    pad(status.project ?? "PS2 MONITOR"),
    pad(`TASKS ${status.tasks.active}/${status.tasks.total} ${Math.round(status.tasks.averageProgress)}%`),
    pad(statusLine),
    pad(`UPD ${timeNow()}`),
  ];
}

function buildSystemPage(): Page {
  const sys = getSystemInfo();
  return [
    "IP ADDRESS",
    pad(sys.ip ?? "SIN CONEXION"),
    pad(`UPTIME ${sys.uptime}`),
    pad(`LD:${sys.load1} MEM:${sys.memUsedPct}%`),
  ];
}

export const PAGE_COUNT = 2;

export async function buildPage(index: number): Promise<Page> {
  try {
    if (index % PAGE_COUNT === 0) return await buildBoincPage();
    return buildSystemPage();
  } catch (e) {
    console.error("[LCD content] Error armando la pagina:", e);
    return ["PS2 MONITOR", "ERROR BOINC", "REINTENTANDO", pad(`UPD ${timeNow()}`)];
  }
}
