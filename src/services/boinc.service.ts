import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

async function boinccmd(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(
    "docker",
    ["exec", config.boincContainer, "boinccmd", ...args],
    { timeout: 10_000, maxBuffer: 2 * 1024 * 1024 }
  );
  return stdout;
}

function field(block: string, name: string): string | undefined {
  const line = block.split("\n").find(
    l => l.trimStart().startsWith(`${name}:`)
  );
  return line?.split(":").slice(1).join(":").trim();
}

function parseTasks(raw: string) {
  return raw
    .split(/(?=^\d+\) -----------$)/m)
    .filter(Boolean)
    .map(block => ({
      name: field(block, "name"),
      workUnit: field(block, "WU name"),
      state: field(block, "state"),
      schedulerState: field(block, "scheduler state"),
      activeState: field(block, "active_task_state"),
      resources: field(block, "resources"),
      estimatedCpuSecondsRemaining: Number(field(block, "estimated CPU time remaining") ?? 0),
      elapsedTaskSeconds: Number(field(block, "elapsed task time") ?? 0),
      fractionDone: Number(field(block, "fraction done") ?? 0),
      slot: Number(field(block, "slot") ?? -1),
      pid: Number(field(block, "PID") ?? -1),
      workingSetMb: Number((field(block, "working set size") ?? "0").replace(" MB", ""))
    }))
    .filter(t => t.name);
}

export async function getTasks() {
  const tasks = parseTasks(await boinccmd(["--get_tasks"]));
  const active = tasks.filter(t => t.activeState === "EXECUTING");
  const averageProgress = active.length
    ? active.reduce((s, t) => s + t.fractionDone, 0) / active.length
    : 0;

  return {
    active: active.length,
    total: tasks.length,
    averageProgress: Number((averageProgress * 100).toFixed(2)),
    tasks
  };
}

export async function getClientStatus() {
  const raw = await boinccmd(["--get_cc_status"]);
  return {
    cpuSuspended: /CPU status\s+\n\s+not suspended/.test(raw) === false,
    gpuSuspended: /GPU status\s+\n\s+not suspended/.test(raw) === false,
    networkSuspended: /Network status\s+\n\s+not suspended/.test(raw) === false
  };
}

export async function getProjectStatus() {
  const raw = await boinccmd(["--get_project_status"]);
  return {
    project: raw.match(/name:\s*(.+)/)?.[1]?.trim() ?? null,
    user: raw.match(/user_name:\s*(.+)/)?.[1]?.trim() ?? null,
    userTotalCredit: Number(raw.match(/user_total_credit:\s*([0-9.]+)/)?.[1] ?? 0),
    userRac: Number(raw.match(/user_expavg_credit:\s*([0-9.]+)/)?.[1] ?? 0)
  };
}

export async function getStatus() {
  const [tasks, boinc, project] = await Promise.all([
    getTasks(),
    getClientStatus(),
    getProjectStatus()
  ]);

  return {
    timestamp: new Date().toISOString(),
    project: project.project,
    tasks: {
      active: tasks.active,
      total: tasks.total,
      averageProgress: tasks.averageProgress
    },
    boinc,
    account: project
  };
}
