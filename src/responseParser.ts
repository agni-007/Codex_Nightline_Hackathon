import { CORE_BLOCKS, MODULES, type BlockName, type ModuleId, type ParsedResponse } from "./types.js";

export class IncompleteResponseError extends Error {}

export function parseModelResponse(raw: string, activeModules: ModuleId[]): ParsedResponse {
  const blocks = new Map<BlockName, string>();
  const pattern = /===BLOCK:\s*([A-Z_]+)\s*===\s*([\s\S]*?)(?=\s*(?:---BLOCK---\s*)?===BLOCK:|\s*---BLOCK---\s*$|$)/g;

  for (const match of raw.matchAll(pattern)) {
    const content = match[2].trim();
    if (content) blocks.set(match[1] as BlockName, content);
  }

  for (const core of CORE_BLOCKS) {
    if (!blocks.has(core)) {
      throw new IncompleteResponseError(`ERROR: model response incomplete — missing ${core}.`);
    }
  }

  const missingModules = activeModules.filter((module) => !blocks.has(MODULES[module].block));
  return { blocks, missingModules };
}
