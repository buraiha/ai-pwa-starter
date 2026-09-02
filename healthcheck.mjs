import http from "node:http";

const request = http.get({ hostname: "127.0.0.1", port: Number(process.env.PORT ?? 8080), path: "/health", timeout: 2500 }, (response) => {
  response.resume();
  process.exit(response.statusCode === 200 ? 0 : 1);
});
request.on("timeout", () => request.destroy(new Error("timeout")));
request.on("error", () => process.exit(1));
