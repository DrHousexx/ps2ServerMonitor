import express from "express";
import { config } from "./config.js";
import { statusRouter } from "./routes/status.routes.js";
import { lcdRouter } from "./routes/lcd.routes.js";
import { initLcd } from "./services/lcd.service.js";
import { startLcdPoller } from "./services/lcd-poller.service.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "ps2-monitor", timestamp: new Date().toISOString() })
);

app.use("/api/v1", statusRouter);
app.use("/api/v1", lcdRouter);

initLcd();
startLcdPoller();

app.listen(config.port, "0.0.0.0", () =>
  console.log(`PS2 Monitor listening on :${config.port}`)
);
