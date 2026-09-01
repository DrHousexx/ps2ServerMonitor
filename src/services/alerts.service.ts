import { config } from "../config.js";
import { getStatus } from "./boinc.service.js";
import { getBasicSystemInfo, getDiskUsedPct } from "./system.service.js";

export interface AlertResult {
  title: string;
  detail: string;
}

// Se mantiene entre llamadas para saber hace cuanto viene sostenida la CPU alta.
let highCpuSinceMs: number | null = null;

export async function checkAlerts(): Promise<AlertResult | null> {
  let status: Awaited<ReturnType<typeof getStatus>>;

  try {
    status = await getStatus();
  } catch {
    return { title: "BOINC NO RESPONDE", detail: "Reintentando..." };
  }

  if (status.boinc.networkSuspended) {
    return { title: "RED SUSPENDIDA", detail: "Chequear BOINC" };
  }

  const diskPct = await getDiskUsedPct();
  if (diskPct !== null && diskPct > config.alerts.diskUsedPctThreshold) {
    return { title: `DISCO AL ${diskPct}%`, detail: "Revisar espacio" };
  }

  const sys = getBasicSystemInfo();
  if (sys.loadPct >= config.alerts.cpuPctThreshold) {
    if (highCpuSinceMs === null) highCpuSinceMs = Date.now();

    const sustainedMs = Date.now() - highCpuSinceMs;
    if (sustainedMs >= config.alerts.cpuSustainedMs) {
      const minutes = Math.round(sustainedMs / 60000);
      return { title: "CPU AL 100%", detail: `Sostenido ${minutes} min` };
    }
  } else {
    highCpuSinceMs = null;
  }

  return null;
}
