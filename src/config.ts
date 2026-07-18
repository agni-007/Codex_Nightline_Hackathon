import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MODULES, type BusinessProfile, type ModuleId } from "./types.js";

const DEFAULT_MODULES: ModuleId[] = ["flyer", "sms", "reviews", "hashtags"];

export function configPath(): string {
  return path.join(os.homedir(), ".hyperlocal-echo", "config.json");
}

export function defaultProfile(): BusinessProfile {
  return { defaultModules: [...DEFAULT_MODULES] };
}

export async function loadConfig(): Promise<BusinessProfile> {
  try {
    const raw = JSON.parse(await readFile(configPath(), "utf8")) as Partial<BusinessProfile>;
    const modules = Array.isArray(raw.defaultModules)
      ? raw.defaultModules.filter((module): module is ModuleId => typeof module === "string" && module in MODULES)
      : DEFAULT_MODULES;
    return { name: raw.name, type: raw.type, location: raw.location, tone: raw.tone, defaultModules: modules };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultProfile();
    throw new Error("ERROR: saved configuration could not be read. Fix ~/.hyperlocal-echo/config.json and try again.");
  }
}

export async function saveConfig(profile: BusinessProfile): Promise<void> {
  const destination = configPath();
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
}

export function parseModules(value: string): ModuleId[] {
  const aliases: Record<string, ModuleId> = {
    flyer: "flyer", sms: "sms", reviews: "reviews", "review-replies": "reviews", hashtags: "hashtags",
    headlines: "headlines", "headline-ab": "headlines", calendar: "calendar", "posting-calendar": "calendar",
    language: "languagePack", "language-pack": "languagePack", feedback: "feedback"
  };
  const modules = value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).map((item) => aliases[item]);
  if (modules.length !== value.split(",").map((item) => item.trim()).filter(Boolean).length || new Set(modules).size !== modules.length) {
    throw new Error(`ERROR: invalid module list. Use: ${Object.keys(MODULES).join(", ")}.`);
  }
  return modules;
}
