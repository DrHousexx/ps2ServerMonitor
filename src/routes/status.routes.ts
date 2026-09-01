import { Router } from "express";
import { getClientStatus, getProjectStatus, getStatus, getTasks } from "../services/boinc.service.js";

export const statusRouter = Router();

statusRouter.get("/status", async (_req, res) => {
  try { res.json(await getStatus()); }
  catch (e) {
    console.error(e);
    res.status(503).json({ error: "BOINC_UNAVAILABLE", message: "Could not read BOINC status" });
  }
});

statusRouter.get("/tasks", async (_req, res) => {
  try { res.json({ timestamp: new Date().toISOString(), ...(await getTasks()) }); }
  catch (e) {
    console.error(e);
    res.status(503).json({ error: "BOINC_UNAVAILABLE", message: "Could not read BOINC tasks" });
  }
});

statusRouter.get("/boinc/status", async (_req, res) => {
  try { res.json(await getClientStatus()); }
  catch (e) {
    console.error(e);
    res.status(503).json({ error: "BOINC_UNAVAILABLE", message: "Could not read BOINC client status" });
  }
});

statusRouter.get("/boinc/project", async (_req, res) => {
  try { res.json(await getProjectStatus()); }
  catch (e) {
    console.error(e);
    res.status(503).json({ error: "BOINC_UNAVAILABLE", message: "Could not read BOINC project status" });
  }
});
