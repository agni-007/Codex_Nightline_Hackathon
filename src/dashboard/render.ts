import { readFile } from "node:fs/promises";
import { MODULES, type FabricationResult, type ModuleId, type ParsedResponse, type RunRequest } from "../types.js";

const LABELS: Record<string, string> = {
  SEO_BLOG: "SEO Blog Post", SCRIPT_STUDIO: "Script Studio", SMART_NEWSLETTER: "Smart Newsletter",
  flyer: "Print Flyer + QR", sms: "SMS / WhatsApp Blast", reviews: "Review Reply Kit", hashtags: "Hashtag + Geo-Tag Set",
  headlines: "Headline A/B Pair", calendar: "7-Day Posting Calendar", languagePack: "Language Pack", feedback: "Feedback Loop", eventPage: "Event Page"
};

export async function renderDashboard(request: RunRequest, parsed: ParsedResponse, fabrication: FabricationResult): Promise<string> {
  const template = await readFile(new URL("./template.html", import.meta.url), "utf8");
  const data = {
    type: request.type, location: request.location, timestamp: new Date().toLocaleString(),
    core: ["SEO_BLOG", "SCRIPT_STUDIO", "SMART_NEWSLETTER"].map((block) => ({ label: LABELS[block], content: parsed.blocks.get(block as never) ?? "" })),
    modules: (Object.keys(MODULES) as ModuleId[]).map((module) => ({ label: LABELS[module], active: request.modules.includes(module) && parsed.blocks.has(MODULES[module].block) })),
    activeCount: request.modules.length - parsed.missingModules.length,
    fabricationFlagged: fabrication.status === "flagged"
  };
  return template.replace("__RUN_DATA__", JSON.stringify(data).replace(/</g, "\\u003c"));
}
