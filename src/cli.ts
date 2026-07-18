#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";
import path from "node:path";
import { Command } from "commander";
import { defaultProfile, loadConfig, parseModules, saveConfig } from "./config.js";
import { startDashboardServer } from "./dashboard/server.js";
import { generateRun } from "./runPipeline.js";
import { MODULES, type BusinessProfile } from "./types.js";

type RunOptions = { type?: string; input?: string; stdin?: boolean; location?: string; modules?: string; lang?: string; feedback?: string; ctaLink?: string; out?: string; debug?: boolean };

async function ask(question: string): Promise<string> { const rl = createInterface({ input, output }); try { return (await rl.question(question)).trim(); } finally { rl.close(); } }
async function multilinePrompt(): Promise<string> {
  const rl = createInterface({ input, output }); const lines: string[] = [];
  output.write("Paste or type your business update. Submit a blank line when finished.\n");
  for await (const line of rl) { if (!line.trim()) break; lines.push(line); }
  rl.close(); return lines.join("\n");
}
async function inputValue(value?: string, stdinRequested?: boolean): Promise<string> {
  if (value) { if (existsSync(value)) return readFile(value, "utf8"); return value; }
  if (stdinRequested || !input.isTTY) { let data = ""; for await (const chunk of input) data += chunk; return data; }
  return multilinePrompt();
}
async function getProfile(options: RunOptions): Promise<{ profile: BusinessProfile; type: string; location?: string }> {
  const profile = await loadConfig();
  const type = options.type ?? profile.type ?? await ask("Business type: ");
  if (!type) throw new Error("ERROR: business type is required. Supply --type or save one with hyperlocal-echo init.");
  return { profile, type, location: options.location ?? profile.location };
}
async function runCommand(options: RunOptions): Promise<void> {
  const { profile, type, location } = await getProfile(options);
  let modules = options.modules === undefined ? profile.defaultModules : parseModules(options.modules);
  if (modules.includes("languagePack") && !options.lang) throw new Error("ERROR: --lang is required when the language-pack module is active.");
  if (modules.includes("feedback") && !options.feedback) { modules = modules.filter((module) => module !== "feedback"); console.log("NOTE: Feedback Loop skipped because --feedback was not supplied."); }
  const rawInput = await inputValue(options.input, options.stdin);
  const result = await generateRun({ rawInput, type, location, modules, language: options.lang, feedback: options.feedback, ctaLink: options.ctaLink, outDir: options.out ?? "./output", onNotice: (notice) => console.warn(notice) });
  const written = result.written;
  console.log(`\nHyperLocal Echo complete: ${written.directory}`); console.log(`Dashboard: ${written.dashboardPath}`); console.log(`Open it with: hyperlocal-echo open ${written.runId}`);
}
async function profilePrompt(existing = defaultProfile()): Promise<BusinessProfile> {
  const name = await ask(`Business name${existing.name ? ` [${existing.name}]` : ""}: `);
  const type = await ask(`Business type${existing.type ? ` [${existing.type}]` : ""}: `);
  const location = await ask(`Location${existing.location ? ` [${existing.location}]` : ""}: `);
  const tone = await ask(`Tone${existing.tone ? ` [${existing.tone}]` : ""}: `);
  const moduleText = await ask(`Default modules, comma separated [${existing.defaultModules.join(",")}]: `);
  return { name: name || existing.name, type: type || existing.type, location: location || existing.location, tone: tone || existing.tone, defaultModules: moduleText ? parseModules(moduleText) : existing.defaultModules };
}
async function openDashboard(runId: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("ERROR: run id contains invalid characters. Copy the run id printed after a successful run.");
  const dashboard = path.resolve("output", runId, "dashboard.html"); if (!existsSync(dashboard)) throw new Error("ERROR: dashboard not found. Check the run id and output directory, then try again.");
  const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", dashboard] : [dashboard];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
  console.log(`Opening ${dashboard}`);
}
const program = new Command().name("hyperlocal-echo").description("Turn one local business update into a multi-channel content matrix.").showSuggestionAfterError();
program.command("run").description("Generate a content matrix").option("--type <type>", "business type").option("--input <path-or-text>", "input text file, or inline text").option("--stdin", "read input from stdin").option("--location <location>", "business location").option("--modules <modules>", "comma-separated module list").option("--lang <code>", "ISO 639-1 language code").option("--feedback <metrics>", "prior performance metrics").option("--cta-link <url>", "URL encoded in flyer QR").option("--out <directory>", "output directory").option("--debug", "show raw technical errors").action(async (options: RunOptions) => { try { await runCommand(options); } catch (error) { if (options.debug) console.error(error); else console.error(error instanceof Error ? error.message : "ERROR: unexpected failure. Try again with --debug."); process.exitCode = 1; } });
program.command("init").description("Create your saved business profile").action(async () => { const profile = await profilePrompt(); await saveConfig(profile); console.log("Saved HyperLocal Echo configuration."); });
program.command("config").description("View or edit saved business profile").action(async () => { const profile = await loadConfig(); console.log(JSON.stringify(profile, null, 2)); if (input.isTTY && (await ask("Edit this profile? [y/N]: ")).toLowerCase() === "y") { await saveConfig(await profilePrompt(profile)); console.log("Configuration updated."); } });
program.command("open <run-id>").description("Open a run dashboard in your default browser").action(async (runId) => { try { await openDashboard(runId); } catch (error) { console.error(error instanceof Error ? error.message : "ERROR: unable to open dashboard."); process.exitCode = 1; } });
program.command("serve").description("Run the local dashboard input server").option("--port <port>", "localhost port", "4173").option("--out <directory>", "output directory", "./output").action(async (options: { port: string; out: string }) => { try { const port = Number(options.port); if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("ERROR: --port must be a number between 1024 and 65535."); await startDashboardServer({ port, outDir: options.out }); } catch (error) { console.error(error instanceof Error ? error.message : "ERROR: unable to start dashboard server."); process.exitCode = 1; } });
program.parseAsync().catch((error) => { console.error(error instanceof Error ? error.message : "ERROR: command failed."); process.exitCode = 1; });
