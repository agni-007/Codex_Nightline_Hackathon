import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";
import { generateRun } from "../runPipeline.js";

const MAX_BODY_BYTES = 64 * 1024;

function send(response: http.ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(body);
}

function safeRunFile(outDir: string, requestPath: string): string | undefined {
  const relativePath = requestPath.replace(/^\/runs\//, "");
  const file = path.resolve(outDir, relativePath);
  return file.startsWith(`${path.resolve(outDir)}${path.sep}`) ? file : undefined;
}

async function jsonBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error("Input is too large.");
  }
  return JSON.parse(body) as Record<string, unknown>;
}

export async function startDashboardServer(options: { port: number; outDir: string }): Promise<void> {
  const outDir = path.resolve(options.outDir);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    try {
      if (request.method === "POST" && url.pathname === "/api/run") {
        const body = await jsonBody(request);
        const message = typeof body.message === "string" ? body.message : "";
        const config = await loadConfig();
        const result = await generateRun({
          rawInput: message,
          type: config.type || "Local Business",
          location: config.location,
          modules: config.defaultModules,
          outDir,
          onNotice: (notice) => console.warn(notice)
        });
        send(response, 201, JSON.stringify({ runId: result.written.runId, dashboardUrl: `/runs/${encodeURIComponent(result.written.runId)}/dashboard.html` }), "application/json; charset=utf-8");
        return;
      }
      if (request.method === "GET" && url.pathname.startsWith("/runs/")) {
        const file = safeRunFile(outDir, decodeURIComponent(url.pathname));
        if (!file) return send(response, 403, "Forbidden");
        const extension = path.extname(file).toLowerCase();
        const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".md": "text/markdown; charset=utf-8", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
        try { return send(response, 200, await readFile(file, extension === ".png" ? undefined : "utf8") as string, types[extension] ?? "application/octet-stream"); }
        catch { return send(response, 404, "Run file not found."); }
      }
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard.html")) {
        return send(response, 200, await readFile(new URL("./template.html", import.meta.url), "utf8").then((template) => template.replace("__RUN_DATA__", JSON.stringify({ type: "HyperLocal Echo", location: "", timestamp: "Awaiting input", core: [], modules: [], activeCount: 0, fabricationFlagged: false }))), "text/html; charset=utf-8");
      }
      send(response, 404, "Not found.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate content.";
      send(response, 400, JSON.stringify({ error: message }), "application/json; charset=utf-8");
    }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(options.port, "127.0.0.1", resolve); });
  console.log(`HyperLocal Echo dashboard is live at http://localhost:${options.port}`);
}
