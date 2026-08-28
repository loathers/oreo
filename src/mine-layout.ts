import type { MiningCoordinate, ResourceType } from "./strategy.js";

const MINE_RESULT_IMAGES: Record<string, ResourceType> = {
  rawvelvet: "ore",
  goldnugget: "gold",
  nacrystal1: "crystal",
  hp: "cave",
};

export function parseMineLayout(
  layout: string,
): Array<[coordinate: MiningCoordinate, resource: ResourceType]> {
  const results: Array<[MiningCoordinate, ResourceType]> = [];
  const pattern = /#(\d+)<img[^>]*\/(rawvelvet|goldnugget|nacrystal1|hp)\.gif/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(layout)) !== null) {
    const which = Number(match[1]);
    const coordinate: MiningCoordinate = [which % 8, Math.floor(which / 8)];
    if (coordinate.every((value) => value >= 1 && value <= 6)) {
      results.push([coordinate, MINE_RESULT_IMAGES[match[2]]]);
    }
  }
  return results;
}
