import { Router } from "express";
import { isLcdReady, writeLine, writeLines } from "../services/lcd.service.js";

export const lcdRouter = Router();

lcdRouter.get("/lcd/status", (_req, res) => {
  res.json({ ready: isLcdReady() });
});

// Body: { "lines": ["L1", "L2", "L3", "L4"] }  (1 a 4 elementos)
lcdRouter.post("/lcd/lines", async (req, res) => {
  const { lines } = req.body ?? {};

  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 4) {
    res.status(400).json({ error: "INVALID_BODY", message: "Se espera { lines: string[] } con 1 a 4 elementos" });
    return;
  }

  const padded = [lines[0], lines[1], lines[2], lines[3]].map((l) =>
    typeof l === "string" ? l : ""
  ) as [string, string, string, string];

  try {
    await writeLines(padded);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: "LCD_UNAVAILABLE", message: (e as Error).message });
  }
});

// Body: { "text": "algo" }
lcdRouter.post("/lcd/line/:index", async (req, res) => {
  const index = Number(req.params.index);
  const { text } = req.body ?? {};

  if (![1, 2, 3, 4].includes(index) || typeof text !== "string") {
    res.status(400).json({ error: "INVALID_BODY", message: "index debe ser 1-4 y text debe ser string" });
    return;
  }

  try {
    await writeLine(index as 1 | 2 | 3 | 4, text);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: "LCD_UNAVAILABLE", message: (e as Error).message });
  }
});
