import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["server.mjs"], { stdio: "inherit", env: { ...process.env, HOST: "127.0.0.1" } }),
  spawn("pnpm", ["exec", "vite"], { stdio: "inherit", env: process.env })
];

let stopping = false;
const stop = (signal = "SIGTERM") => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill(signal);
};

for (const child of children) child.on("exit", (code) => { if (!stopping) { stop(); process.exitCode = code ?? 1; } });
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
