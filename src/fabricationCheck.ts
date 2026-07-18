import type { FabricationFlag, FabricationResult, ParsedResponse } from "./types.js";

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000
};

function normalizedNumber(value: string): string {
  const cleaned = value.toLowerCase().replace(/[$,]/g, "").replace(/(am|pm)$/i, "").trim();
  if (cleaned === "noon") return "12";
  const clock = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (clock && clock[2] === "00") return String(Number(clock[1]));
  if (/^\d+(?:\.\d+)?$/.test(cleaned)) return String(Number(cleaned));
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length && parts.every((part) => part in NUMBER_WORDS)) {
    let total = 0;
    let current = 0;
    for (const part of parts) {
      const number = NUMBER_WORDS[part];
      if (number === 100 || number === 1000) current = Math.max(1, current) * number;
      else current += number;
    }
    total += current;
    return String(total);
  }
  return cleaned;
}

function tokens(text: string): string[] {
  return text.match(/\$?\d+(?:[,:.]\d+)*(?:\s?(?:am|pm))?|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand))?\b/gi) ?? [];
}

export function checkFabrication(parsed: ParsedResponse, rawInput: string): FabricationResult {
  const sourceTokens = new Set(tokens(rawInput).map(normalizedNumber));
  const flags: FabricationFlag[] = [];
  for (const [block, content] of parsed.blocks) {
    // Script timestamps are production formatting required by Appendix A, not business facts.
    // Keep any numbers in the visual or voiceover columns subject to the normal audit.
    const auditableContent = block === "SCRIPT_STUDIO"
      ? content.split("\n").map((line) => line.startsWith("|") ? line.replace(/^\|[^|]*\|/, "|") : line).join("\n")
      : content;
    for (const token of tokens(auditableContent)) {
      if (!sourceTokens.has(normalizedNumber(token))) flags.push({ token, block });
    }
  }
  return { status: flags.length ? "flagged" : "passed", flags };
}
