import { CORE_BLOCKS, MODULES, type BlockName, type ModuleId, type ParsedResponse } from "./types.js";

export class IncompleteResponseError extends Error {}

export function parseModelResponse(raw: string, activeModules: ModuleId[]): ParsedResponse {
  const blocks = new Map<BlockName, string>();
  const segments = raw.split(/\s*---BLOCK---\s*/);

  for (const segment of segments) {
    const match = segment.match(/^\s*===BLOCK:\s*([A-Z_]+)\s*===\s*([\s\S]*?)\s*$/);
    if (!match || !match[2]) continue;
    blocks.set(match[1] as BlockName, match[2]);
  }

  for (const core of CORE_BLOCKS) {
    if (!blocks.has(core)) {
      throw new IncompleteResponseError(`ERROR: model response incomplete — missing ${core}.`);
    }
  }

  const missingModules = activeModules.filter((module) => !blocks.has(MODULES[module].block));
  return { blocks, missingModules };
}
