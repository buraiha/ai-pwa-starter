import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { listNotes, openDatabase, saveNote } from "./server/store.mjs";

const appDirectory = dirname(fileURLToPath(import.meta.url));
const staticRoot = resolve(appDirectory, "dist");
const database = openDatabase(resolve(process.env.APP_DB_PATH ?? resolve(appDirectory, "data/app.sqlite")));
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "127.0.0.1";
const maxRequestBytes = 256 * 1024;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"], [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"], [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

const sendJson = (response, status, value) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
};

const readJson = (request) => new Promise((resolveBody, reject) => {
  let size = 0;
  const chunks = [];
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > maxRequestBytes) reject(Object.assign(new Error("リクエストが大きすぎます"), { status: 413 }));
    else chunks.push(chunk);
  });
  request.on("end", () => {
    try { resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
    catch { reject(Object.assign(new Error("JSONが正しくありません"), { status: 400 })); }
  });
  request.on("error", reject);
});

const serveStatic = (request, response, pathname) => {
  const candidate = resolve(staticRoot, `.${pathname === "/" ? "/index.html" : pathname}`);
  const safePath = candidate === staticRoot || candidate.startsWith(`${staticRoot}${sep}`);
  const filePath = safePath && existsSync(candidate) ? candidate : resolve(staticRoot, "index.html");
  if (!safePath || !existsSync(filePath)) return sendJson(response, 404, { error: "not_found" });
  response.writeHead(200, { "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream" });
  if (request.method === "HEAD") return response.end();
  createReadStream(filePath).pipe(response);
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
    if (request.method === "GET" && url.pathname === "/api/notes") return sendJson(response, 200, listNotes(database));
    if (request.method === "POST" && url.pathname === "/api/notes/sync") {
      const result = saveNote(database, await readJson(request));
      if (result.status === "conflict") return sendJson(response, 409, { error: "version_conflict", current: result.current });
      return sendJson(response, 200, result.note);
    }
    if ((request.method === "GET" || request.method === "HEAD") && !url.pathname.startsWith("/api/")) return serveStatic(request, response, decodeURIComponent(url.pathname));
    return sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    const status = Number(error?.status) || (error instanceof TypeError ? 400 : 500);
    sendJson(response, status, { error: status === 500 ? "internal_error" : error.message });
  }
});

const close = () => server.close(() => { database.close(); process.exit(0); });
process.on("SIGINT", close);
process.on("SIGTERM", close);
server.listen(port, host, () => console.log(`AI PWA Starter: http://${host}:${port}`));
