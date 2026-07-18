import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkFabrication } from "../src/fabricationCheck.js";
import { writeRun } from "../src/fileWriter.js";
import { buildSystemPrompt } from "../src/promptBuilder.js";
import { IncompleteResponseError, parseModelResponse } from "../src/responseParser.js";
import { MODULES, type ParsedResponse, type RunRequest } from "../src/types.js";
import { describesEvent } from "../src/runPipeline.js";
import { INSUFFICIENT_INPUT_MESSAGE, validateInput } from "../src/validate.js";

const sample = "Hey so this Saturday we're doing a sourdough workshop, 10am to noon, twelve spots, twenty five bucks, includes your own starter jar to take home.";
const cleanup: string[] = [];
const coreResponse = `===BLOCK: SEO_BLOG===\nBlog copy about the workshop at 10am.\n---BLOCK---\n===BLOCK: SCRIPT_STUDIO===\n| Timestamp | Visual B-Roll Description | Voiceover Audio |\n| 10am | Starter jar | Workshop begins |\n---BLOCK---\n===BLOCK: SMART_NEWSLETTER===\nSubject Line: Sourdough workshop\nPreview Text: Saturday workshop\nBody: [Customer Name], join us at 10am.\nCTA: [Reserve Your Spot ->]`;

function request(outDir: string, modules: RunRequest["modules"] = []): RunRequest {
  return { type: "Artisan Bakery", input: sample, location: "Fort Kochi", modules, outDir, model: "test-model", ctaLink: "https://example.com", language: "es" };
}

describe("SRS §4 core pipeline", () => {
  afterEach(async () => { await Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

  it("rejects insufficient input before an API call can be attempted", () => {
    expect(() => validateInput("too short")).toThrow(INSUFFICIENT_INPUT_MESSAGE);
  });

  it("strips HTML and limits oversized input", () => {
    const result = validateInput(`<script>ignore()</script>${Array.from({ length: 4_010 }, () => "detail").join(" ")}`);
    expect(result.sanitizedInput).not.toContain("script");
    expect(result.sanitizedInput.split(/\s+/)).toHaveLength(4_000);
    expect(result.warnings).toHaveLength(1);
  });

  it("includes only active module contracts in the finalized prompt", () => {
    const prompt = buildSystemPrompt({ businessType: "Artisan Bakery", rawInput: sample, location: "Fort Kochi", activeModules: ["flyer", "sms"] });
    expect(prompt).toContain("===BLOCK: SEO_BLOG===");
    expect(prompt).toContain("===BLOCK: FLYER===");
    expect(prompt).toContain("===BLOCK: SMS_BLAST===");
    expect(prompt).not.toContain("===BLOCK: HASHTAGS===");
  });

  it("detects event-oriented plain-English input for an Event Page", () => {
    expect(describesEvent("We are hosting a pottery workshop this Sunday.")).toBe(true);
    expect(describesEvent("Fresh bread is available today.")).toBe(false);
  });

  it("fails loudly when a core block is missing", () => {
    expect(() => parseModelResponse("===BLOCK: SEO_BLOG===\nOnly one block", [])).toThrow(IncompleteResponseError);
    expect(() => parseModelResponse("===BLOCK: SEO_BLOG===\nOnly one block", [])).toThrow("missing SCRIPT_STUDIO");
  });

  it("tolerates whitespace delimiters and warns only for absent modules", () => {
    const parsed = parseModelResponse(`${coreResponse}\n  ---BLOCK---\n ===BLOCK: FLYER===\nFlyer\n`, ["flyer", "sms"]);
    expect(parsed.blocks.get("FLYER")).toBe("Flyer");
    expect(parsed.missingModules).toEqual(["sms"]);
  });

  it("parses valid blocks even when a model adds a harmless Markdown fence or preamble", () => {
    const parsed = parseModelResponse(`Here is your content:\n\n\`\`\`markdown\n${coreResponse}\n\`\`\``, []);
    expect(parsed.blocks.get("SEO_BLOG")).toContain("Blog copy");
    expect(parsed.blocks.get("SMART_NEWSLETTER")).toContain("Subject Line");
  });

  it("accepts equivalent Markdown headings from a non-compliant model response", () => {
    const markdownHeaders = coreResponse
      .replace("===BLOCK: SEO_BLOG===", "## SEO_BLOG")
      .replace("===BLOCK: SCRIPT_STUDIO===", "## SCRIPT_STUDIO")
      .replace("===BLOCK: SMART_NEWSLETTER===", "## SMART_NEWSLETTER");
    expect(parseModelResponse(markdownHeaders, []).blocks.size).toBe(3);
  });

  it("flags an untraced generated numeric fact", () => {
    const parsed = parseModelResponse(coreResponse.replace("10am.", "99 dollars."), []);
    expect(checkFabrication(parsed, sample)).toMatchObject({ status: "flagged" });
  });

  it("does not treat required script timeline formatting as a fabricated business fact", () => {
    const response = coreResponse.replace("| 10am |", "| 0:00 |").replace("Blog copy about the workshop at 10am.", "Blog copy about the workshop at 10:00.");
    expect(checkFabrication(parseModelResponse(response, []), sample).status).toBe("passed");
  });

  it("writes every module atomically and suffixes a colliding run folder", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "hyperlocal-echo-")); cleanup.push(outDir);
    const modules = Object.keys(MODULES) as RunRequest["modules"];
    const response = `${coreResponse}\n---BLOCK---\n${modules.map((module) => `===BLOCK: ${MODULES[module].block}===\n${MODULES[module].block} output`).join("\n---BLOCK---\n")}`;
    const parsed = parseModelResponse(response, modules);
    const fabricated = checkFabrication(parsed, sample);
    const dashboard = "<!doctype html><title>test</title>";
    const first = await writeRun({ request: request(outDir, modules), parsed, fabrication: fabricated, rawInputVerbatim: sample, dashboardHtml: dashboard });
    const second = await writeRun({ request: request(outDir, modules), parsed, fabrication: fabricated, rawInputVerbatim: sample, dashboardHtml: dashboard });
    expect(second.runId).toBe(`${first.runId}-2`);
    expect(await readFile(path.join(first.directory, "blog-post.md"), "utf8")).toContain("Blog copy");
    expect(await readFile(path.join(first.directory, "modules", "flyer-qr.png"))).toBeInstanceOf(Buffer);
    expect(await readFile(path.join(first.directory, "modules", "language-pack-es.md"), "utf8")).toContain("LANGUAGE_PACK");
    const manifest = await readFile(path.join(first.directory, "run-manifest.json"), "utf8");
    expect(manifest).not.toContain("OPENAI_API_KEY");
  });
});
