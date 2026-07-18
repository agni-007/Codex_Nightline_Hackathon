import { CORE_BLOCKS, MODULES, type BlockName, type ModuleId, type ParsedResponse } from "./types.js";

export class IncompleteResponseError extends Error {}

export function parseModelResponse(raw: string, activeModules: ModuleId[]): ParsedResponse {
  const blocks = new Map<BlockName, string>();
  const knownBlocks = new Set<string>([...CORE_BLOCKS, ...Object.values(MODULES).map((module) => module.block)]);
  // Models occasionally use a Markdown heading or bold header despite the prompt.
  // Match only known block names on their own line, then preserve all body text.
  const pattern = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2}\s*)?(?:===\s*BLOCK:\s*)?([A-Z][A-Z_]+)(?:\s*===)?(?:\s*\*{1,2})?\s*(?:\n|$)/g;
  const headers = [...raw.matchAll(pattern)].filter((match) => knownBlocks.has(match[1]));

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const nextHeader = headers[index + 1];
    const contentStart = (header.index ?? 0) + header[0].length;
    const contentEnd = nextHeader?.index ?? raw.length;
    const content = raw.slice(contentStart, contentEnd).replace(/\s*---BLOCK---\s*$/g, "").trim();
    if (content) blocks.set(header[1] as BlockName, content);
  }

  for (const core of CORE_BLOCKS) {
    if (!blocks.has(core)) {
      throw new IncompleteResponseError(`ERROR: model response incomplete — missing ${core}.`);
    }
  }

  const missingModules = activeModules.filter((module) => !blocks.has(MODULES[module].block));
  return { blocks, missingModules };
}
