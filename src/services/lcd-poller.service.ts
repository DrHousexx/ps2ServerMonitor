import { config } from "../config.js";
import { isLcdReady, writeLines } from "./lcd.service.js";
import { buildPage, PAGE_COUNT } from "./lcd-content.service.js";

let tick = 0;
let timer: NodeJS.Timeout | null = null;

async function refresh(): Promise<void> {
  if (!isLcdReady()) return;

  try {
    const page = await buildPage(tick % PAGE_COUNT);
    await writeLines(page);
  } catch (e) {
    console.error("[LCD poller] Fallo al refrescar:", (e as Error).message);
  } finally {
    tick += 1;
  }
}

export function startLcdPoller(): void {
  if (!config.lcd.enabled) return;

  timer = setInterval(refresh, config.lcd.refreshIntervalMs);
  refresh();
}

export function stopLcdPoller(): void {
  if (timer) clearInterval(timer);
}
