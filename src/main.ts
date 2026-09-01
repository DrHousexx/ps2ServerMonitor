import express from "express";
import { config } from "./config.js";
import { statusRouter } from "./routes/status.routes.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "ps2-monitor", timestamp: new Date().toISOString() })
);

app.use("/api/v1", statusRouter);

app.listen(config.port, "0.0.0.0", () =>
  console.log(`PS2 Monitor listening on :${config.port}`)
);
