import { readFile } from "node:fs/promises";
import { MODULES, type FabricationResult, type ModuleId, type ParsedResponse, type RunRequest } from "../types.js";

const LABELS: Record<string, string> = {
  SEO_BLOG: "SEO Blog Post", SCRIPT_STUDIO: "Script Studio", SMART_NEWSLETTER: "Email / Newsletter Message",
  flyer: "Print Flyer + QR", sms: "SMS / WhatsApp Blast", reviews: "Review Reply Kit", hashtags: "Hashtag + Geo-Tag Set",
  headlines: "Headline A/B Pair", calendar: "7-Day Posting Calendar", languagePack: "Language Pack", feedback: "Feedback Loop", eventPage: "Event Page"
};
const CORE_FILES: Record<string, string> = {
  SEO_BLOG: "blog-post.md",
  SCRIPT_STUDIO: "script-studio.md",
  SMART_NEWSLETTER: "newsletter.md"
};

export async function renderDashboard(request: RunRequest, parsed: ParsedResponse, fabrication: FabricationResult): Promise<string> {
  const template = await readFile(new URL("./template.html", import.meta.url), "utf8");
  const data = {
    type: request.type, location: request.location, timestamp: new Date().toLocaleString(),
    sourceInput: request.input,
    core: ["SEO_BLOG", "SCRIPT_STUDIO", "SMART_NEWSLETTER"].map((block) => ({ label: LABELS[block], content: parsed.blocks.get(block as never) ?? "", file: CORE_FILES[block] })),
    extras: (Object.keys(MODULES) as ModuleId[])
      .filter((module) => module !== "eventPage" && request.modules.includes(module) && parsed.blocks.has(MODULES[module].block))
      .map((module) => ({ label: LABELS[module], content: parsed.blocks.get(MODULES[module].block) ?? "", file: `modules/${module === "languagePack" ? MODULES[module].file.replace("<lang>", request.language ?? "") : MODULES[module].file}`, qrFile: module === "flyer" ? "modules/flyer-qr.png" : "" })),
    campaignPlan: request.modules.includes("eventPage") ? [
      { timing: "Now", action: "Publish the event page", note: "Share the full event details and reservation call to action." },
      { timing: "3 days before", action: "Send the direct message", note: "Use the generated SMS / WhatsApp copy with the relevant local audience." },
      { timing: "1 day before", action: "Post a reminder", note: "Reuse the flyer and hashtag set to create a concise social reminder." },
      { timing: "Event day", action: "Share final details", note: "Direct attendees to the event page for timings, entry, and sign-up information." }
    ] : [],
    fabricationFlagged: fabrication.status === "flagged",
    eventPageUrl: parsed.blocks.has("EVENT_PAGE") ? "modules/event-page.html" : ""
  };
  return template.replace("__RUN_DATA__", JSON.stringify(data).replace(/</g, "\\u003c"));
}
