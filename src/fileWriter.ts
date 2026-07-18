import { mkdir, rename, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { MODULES, type FabricationResult, type ModuleId, type ParsedResponse, type RunRequest } from "./types.js";

export interface WrittenRun {
  runId: string;
  directory: string;
  dashboardPath: string;
}

function slugFirstFiveWords(input: string): string {
  const words = input.match(/[\p{L}\p{N}]+/gu)?.slice(0, 5) ?? ["run"];
  return words.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80) || "run";
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

async function availablePath(outDir: string, baseName: string): Promise<{ runId: string; directory: string }> {
  for (let suffix = 1; ; suffix += 1) {
    const runId = suffix === 1 ? baseName : `${baseName}-${suffix}`;
    const directory = path.join(outDir, runId);
    try {
      await access(directory, constants.F_OK);
    } catch {
      return { runId, directory };
    }
  }
}

async function writeUtf8(file: string, content: string): Promise<void> {
  await writeFile(file, content.replace(/\r\n?/g, "\n"), { encoding: "utf8" });
}

export async function writeRun(options: {
  request: RunRequest;
  parsed: ParsedResponse;
  fabrication: FabricationResult;
  rawInputVerbatim: string;
  dashboardHtml: string;
}): Promise<WrittenRun> {
  const outDir = path.resolve(options.request.outDir);
  await mkdir(outDir, { recursive: true });
  const baseName = `${timestamp()}_${slugFirstFiveWords(options.request.input)}`;
  const target = await availablePath(outDir, baseName);
  const tempDirectory = path.join(outDir, `.hyperlocal-echo-${process.pid}-${Date.now()}`);
  const modulesDirectory = path.join(tempDirectory, "modules");

  try {
    await mkdir(modulesDirectory, { recursive: true });
    const files: Record<string, string> = {
      "SEO_BLOG": "blog-post.md",
      "SCRIPT_STUDIO": "script-studio.md",
      "SMART_NEWSLETTER": "newsletter.md"
    };
    for (const [block, filename] of Object.entries(files)) {
      await writeUtf8(path.join(tempDirectory, filename), options.parsed.blocks.get(block as never) ?? "");
    }
    for (const module of options.request.modules) {
      const block = MODULES[module].block;
      const content = options.parsed.blocks.get(block);
      if (!content) continue;
      const filename = module === "languagePack"
        ? MODULES[module].file.replace("<lang>", options.request.language ?? "")
        : MODULES[module].file;
      await writeUtf8(path.join(modulesDirectory, filename), content);
    }
    if (options.request.modules.includes("flyer") && options.parsed.blocks.has("FLYER")) {
      await QRCode.toFile(path.join(modulesDirectory, "flyer-qr.png"), options.request.ctaLink || "mailto:", { margin: 1, width: 360 });
    }
    await writeUtf8(path.join(tempDirectory, "dashboard.html"), options.dashboardHtml);
    const manifest = {
      timestamp: new Date().toISOString(),
      business_type: options.request.type,
      location: options.request.location ?? "",
      input_asset: options.rawInputVerbatim,
      active_modules: options.request.modules,
      model: options.request.model,
      fabrication_check: options.fabrication.status,
      flagged_strings: options.fabrication.flags
    };
    await writeUtf8(path.join(tempDirectory, "run-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(tempDirectory, target.directory);
    return { runId: target.runId, directory: target.directory, dashboardPath: path.join(target.directory, "dashboard.html") };
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(tempDirectory, { recursive: true, force: true });
    throw error;
  }
}
