import { generateContent } from "./apiClient.js";
import { renderDashboard } from "./dashboard/render.js";
import { checkFabrication } from "./fabricationCheck.js";
import { writeRun, type WrittenRun } from "./fileWriter.js";
import { buildSystemPrompt, buildUserMessage } from "./promptBuilder.js";
import { parseModelResponse } from "./responseParser.js";
import type { ModuleId, RunRequest } from "./types.js";
import { validateInput } from "./validate.js";

export const DEFAULT_MODEL = "gpt-5.4-mini";

export interface GenerationOptions {
  rawInput: string;
  type: string;
  location?: string;
  modules: ModuleId[];
  language?: string;
  feedback?: string;
  ctaLink?: string;
  outDir: string;
  model?: string;
  onNotice?: (message: string) => void;
}

export interface GenerationResult {
  written: WrittenRun;
  request: RunRequest;
  missingModules: ModuleId[];
}

/** Runs the one-request generation pipeline for both the CLI and localhost dashboard. */
export async function generateRun(options: GenerationOptions): Promise<GenerationResult> {
  const validation = validateInput(options.rawInput);
  validation.warnings.forEach((warning) => options.onNotice?.(warning));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("ERROR: OPENAI_API_KEY is missing. Add it to your environment or local .env file, then try again.");

  const request: RunRequest = {
    type: options.type || "Local Business",
    input: validation.sanitizedInput,
    location: options.location,
    modules: options.modules,
    language: options.language,
    feedback: options.feedback,
    ctaLink: options.ctaLink,
    outDir: options.outDir,
    model: options.model ?? DEFAULT_MODEL
  };
  const rawResponse = await generateContent({
    apiKey,
    model: request.model,
    system: buildSystemPrompt({ businessType: request.type, rawInput: request.input, location: request.location, activeModules: request.modules, language: request.language, feedback: request.feedback }),
    userMessage: buildUserMessage(request.feedback)
  });
  const parsed = parseModelResponse(rawResponse, request.modules);
  if (parsed.missingModules.length) options.onNotice?.(`WARNING: model response omitted module(s): ${parsed.missingModules.join(", ")}. Core files were still written.`);
  const fabrication = checkFabrication(parsed, request.input);
  fabrication.flags.forEach((flag) => options.onNotice?.(`⚠ WARNING: possible fabricated detail — "${flag.token}" in ${flag.block}. Review before publishing.`));
  const dashboardHtml = await renderDashboard(request, parsed, fabrication);
  const written = await writeRun({ request, parsed, fabrication, rawInputVerbatim: options.rawInput, dashboardHtml });
  return { written, request, missingModules: parsed.missingModules };
}
