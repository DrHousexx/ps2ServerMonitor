import { getStatus, getTasks } from "./boinc.service.js";
import { getBasicSystemInfo, getDiskUsedPct, getPerCoreUsage } from "./system.service.js";
import type { config } from "../config.js";

export type Page = [string, string, string, string];

export interface PageDescriptor {
  id: string;
  durationMs: number;
  refreshMs: number;
  build: () => Promise<Page> | Page;
}

const LCD_WIDTH = 16;

function pad(text: string): string {
  return text.length > LCD_WIDTH ? text.slice(0, LCD_WIDTH) : text;
}

function timeNow(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

async function buildNetworkPage(): Promise<Page> {
  const sys = getBasicSystemInfo();
  const diskPct = await getDiskUsedPct();

  return [
    pad(sys.hostname),
    pad(sys.ip ?? "SIN CONEXION"),
    pad(`UPTIME ${sys.uptime}`),
    pad(`DISK ${diskPct ?? "?"}% MEM ${sys.memUsedPct}%`),
  ];
}

function buildDateTimePage(): Page {
  const date = new Date().toLocaleDateString("es-AR");
  return ["PS2 SERVER LAB", pad(date), pad(timeNow()), "ALL SYSTEMS OK"];
}

async function buildActiveTaskPage(): Promise<Page> {
  const { tasks } = await getTasks();
  const active = tasks.filter((t) => t.activeState === "EXECUTING");

  if (active.length === 0) {
    return ["TAREA ACTIVA", "SIN TAREAS EN", "EJECUCION", pad(`UPD ${timeNow()}`)];
  }

  // Si hay varias, mostramos la primera. El resto se puede rotar en una futura mejora.
  const task = active[0];
  const perCore = await getPerCoreUsage();
  const coreIndex = task.slot >= 0 && perCore.length > 0 ? task.slot % perCore.length : -1;
  const cpuPct = coreIndex >= 0 ? perCore[coreIndex] : null;

  return [
    pad(task.name ?? "TAREA"),
    pad(`SLOT ${task.slot}  CPU:${cpuPct ?? "?"}%`),
    pad(`ELAPSED ${formatDuration(task.elapsedTaskSeconds)}`),
    pad(`${Math.round(task.fractionDone * 100)}% completado`),
  ];
}

async function buildCpuPage(): Promise<Page> {
  const sys = getBasicSystemInfo();
  const perCore = await getPerCoreUsage();

  const coreLines: string[] = [];
  for (let i = 0; i < perCore.length; i += 2) {
    const left = `C${i}:${perCore[i]}%`;
    const right = perCore[i + 1] !== undefined ? ` C${i + 1}:${perCore[i + 1]}%` : "";
    coreLines.push(pad(`${left}${right}`));
  }

  return [
    pad(`CPU (${sys.cpuCount} cores)`),
    pad(`TOTAL LOAD ${sys.loadPct}%`),
    coreLines[0] ?? "",
    coreLines[1] ?? "",
  ];
}

async function buildCreditsPage(): Promise<Page> {
  const status = await getStatus();
  const account = status.account as { userRac?: number; userTotalCredit?: number };

  return [
    "CREDITOS BOINC",
    pad(status.project ?? "SIN PROYECTO"),
    pad(`RAC ${Math.round(account.userRac ?? 0)} cr/dia`),
    pad(`TOTAL ${Math.round(account.userTotalCredit ?? 0)} cr`),
  ];
}

export function buildAlertPage(title: string, detail: string): Page {
  return ["!! ALERTA !!", pad(title), pad(detail), pad(`UPD ${timeNow()}`)];
}

export function buildPages(lcdConfig: (typeof config)["lcd"]): PageDescriptor[] {
  return [
    {
      id: "network",
      durationMs: lcdConfig.longPageDurationMs,
      refreshMs: lcdConfig.longPageDurationMs,
      build: buildNetworkPage,
    },
    {
      id: "datetime",
      durationMs: lcdConfig.pageDurationMs,
      refreshMs: 1000, // el reloj tickea mientras esta en pantalla
      build: buildDateTimePage,
    },
    {
      id: "activeTask",
      durationMs: lcdConfig.pageDurationMs,
      refreshMs: lcdConfig.pageDurationMs,
      build: buildActiveTaskPage,
    },
    {
      id: "cpu",
      durationMs: lcdConfig.pageDurationMs,
      refreshMs: lcdConfig.pageDurationMs,
      build: buildCpuPage,
    },
    {
      id: "credits",
      durationMs: lcdConfig.pageDurationMs,
      refreshMs: lcdConfig.pageDurationMs,
      build: buildCreditsPage,
    },
  ];
}
