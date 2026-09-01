import { config } from "../config.js";
import { isLcdReady, writeLines } from "./lcd.service.js";
import { buildPages, buildAlertPage, type PageDescriptor } from "./lcd-content.service.js";
import { checkAlerts } from "./alerts.service.js";

const TICK_MS = 1000;
const ALERT_CHECK_MS = 5000;

let pages: PageDescriptor[] = [];
let pageIndex = 0;
let elapsedInPage = 0;
let elapsedSinceRefresh = 0;
let elapsedSinceAlertCheck = 0;
let inAlert = false;
let timer: NodeJS.Timeout | null = null;

async function showCurrentPage(): Promise<void> {
  const page = pages[pageIndex];
  try {
    const content = await page.build();
    await writeLines(content);
  } catch (e) {
    console.error(`[LCD poller] Error en pagina "${page.id}":`, (e as Error).message);
  }
}

async function tick(): Promise<void> {
  if (!isLcdReady()) return;

  elapsedSinceAlertCheck += TICK_MS;
  if (elapsedSinceAlertCheck >= ALERT_CHECK_MS) {
    elapsedSinceAlertCheck = 0;
    const alert = await checkAlerts().catch(() => null);

    if (alert) {
      inAlert = true;
      await writeLines(buildAlertPage(alert.title, alert.detail));
      return; // mientras hay alerta activa, la rotacion normal queda pausada
    }

    if (inAlert) {
      // la alerta se resolvio: volvemos a la rotacion normal desde donde estaba
      inAlert = false;
      elapsedInPage = 0;
      elapsedSinceRefresh = 0;
      await showCurrentPage();
      return;
    }
  }

  if (inAlert) return;

  const page = pages[pageIndex];
  elapsedInPage += TICK_MS;
  elapsedSinceRefresh += TICK_MS;

  if (elapsedInPage >= page.durationMs) {
    pageIndex = (pageIndex + 1) % pages.length;
    elapsedInPage = 0;
    elapsedSinceRefresh = 0;
    await showCurrentPage();
    return;
  }

  if (elapsedSinceRefresh >= page.refreshMs) {
    elapsedSinceRefresh = 0;
    await showCurrentPage();
  }
}

export function startLcdPoller(): void {
  if (!config.lcd.enabled) return;

  pages = buildPages(config.lcd);
  timer = setInterval(() => {
    tick().catch((e) => console.error("[LCD poller] tick fallo:", e));
  }, TICK_MS);

  showCurrentPage();
}

export function stopLcdPoller(): void {
  if (timer) clearInterval(timer);
}
