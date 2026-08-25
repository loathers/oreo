export const STRATEGIES = ["pjb", "oreo", "ev", "ev-cluster"] as const;
export const VISIBILITIES = ["low", "auto", "high"] as const;

export type StrategyName = (typeof STRATEGIES)[number];
export type VisibilityMode = (typeof VISIBILITIES)[number];
export type MiningCoordinate = [column: number, row: number];
export type ResourceType = "ore" | "gold" | "crystal" | "cave";
export type StrategyValues = Record<ResourceType, number>;

export type Decision =
  | { action: "mine"; coordinate: MiningCoordinate; reason: string }
  | { action: "reset"; reason: string };

export const DEFAULT_VALUES: StrategyValues = {
  ore: 25,
  gold: 20000,
  crystal: 69,
  cave: 0,
};
const TARGETS_PER_MINE = 15;
const ROW_ORE_WEIGHT = [0, 0, 0.1868, 0.4698, 0.6209, 0.67];
const CLUSTER_ROW_WEIGHT = [0, 0, 0.46, 0.46, 0.46, 1];
const CENTER = 3;

const rowOf = (index: number) => Math.floor(index / 6);
const colOf = (index: number) => index % 6;
const neighbors = Array.from({ length: 36 }, (_, index) => {
  const row = rowOf(index);
  const col = colOf(index);
  const result: number[] = [];
  if (row > 0) result.push(index - 6);
  if (row < 5) result.push(index + 6);
  if (col > 0) result.push(index - 1);
  if (col < 5) result.push(index + 1);
  return result;
});

export function coordinateToIndex([column, row]: MiningCoordinate): number {
  return (6 - row) * 6 + column - 1;
}

export function indexToCoordinate(index: number): MiningCoordinate {
  return [colOf(index) + 1, 6 - rowOf(index)];
}

function statePositionToIndex(position: number): number {
  const gameRow = Math.floor(position / 6);
  return (5 - gameRow) * 6 + (position % 6);
}

export function isLegal(index: number, opened: Set<number>): boolean {
  return (
    !opened.has(index) &&
    (rowOf(index) === 0 || neighbors[index].some((neighbor) => opened.has(neighbor)))
  );
}

type Cluster = { tiles: number[]; weight: number };

const ORE_CLUSTERS: Cluster[] = (() => {
  const region = Array.from({ length: 36 }, (_, index) => index).filter(
    (index) => rowOf(index) >= 2,
  );
  const inRegion = new Set(region);
  const seen = new Set<string>();
  const clusters: number[][] = [];

  const grow = (tiles: number[]) => {
    const key = [...tiles].sort((a, b) => a - b).join(",");
    if (seen.has(key)) return;
    seen.add(key);
    if (tiles.length === 6) {
      clusters.push([...tiles]);
      return;
    }
    const present = new Set(tiles);
    for (const tile of tiles) {
      for (const neighbor of neighbors[tile]) {
        if (inRegion.has(neighbor) && !present.has(neighbor)) grow([...tiles, neighbor]);
      }
    }
  };

  for (const start of region) grow([start]);
  return clusters.map((tiles) => ({
    tiles,
    weight: tiles.reduce((weight, tile) => weight * CLUSTER_ROW_WEIGHT[rowOf(tile)], 1),
  }));
})();

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCalibrationBoards(
  count: number,
  seed: number,
  secondGoldChance: number,
): string[] {
  const random = mulberry32(seed);
  const clusterWeight = ORE_CLUSTERS.reduce((sum, cluster) => sum + cluster.weight, 0);
  const boards: string[] = [];

  for (let boardIndex = 0; boardIndex < count; boardIndex++) {
    let pick = random() * clusterWeight;
    let cluster = ORE_CLUSTERS[ORE_CLUSTERS.length - 1];
    for (const candidate of ORE_CLUSTERS) {
      pick -= candidate.weight;
      if (pick <= 0) {
        cluster = candidate;
        break;
      }
    }

    const ore = new Set(cluster.tiles);
    const goldCount = random() < secondGoldChance ? 2 : 1;
    const caveCount = 6 - goldCount;
    const available = Array.from({ length: 36 }, (_, index) => index).filter(
      (index) => !ore.has(index),
    );
    for (let index = 0; index < 9; index++) {
      const selected = index + Math.floor(random() * (available.length - index));
      [available[index], available[selected]] = [available[selected], available[index]];
    }
    const board = Array(36).fill("e");
    for (const index of ore) board[index] = "o";
    for (const index of available.slice(0, goldCount)) board[index] = "g";
    for (const index of available.slice(goldCount, goldCount + 3)) board[index] = "r";
    for (const index of available.slice(goldCount + 3, goldCount + 3 + caveCount)) {
      board[index] = "c";
    }
    boards.push(board.join(""));
  }
  return boards;
}

function clusterOrePosterior(
  knownOre: Set<number>,
  knownNonOre: Set<number>,
  sparkleSubset: Set<number> | null,
): number[] {
  const mass = Array(36).fill(0) as number[];
  let total = 0;
  for (const cluster of ORE_CLUSTERS) {
    if ([...knownOre].some((tile) => !cluster.tiles.includes(tile))) continue;
    if (cluster.tiles.some((tile) => knownNonOre.has(tile))) continue;
    if (sparkleSubset && cluster.tiles.some((tile) => !sparkleSubset.has(tile))) continue;
    total += cluster.weight;
    for (const tile of cluster.tiles) mass[tile] += cluster.weight;
  }
  if (total > 0) {
    for (let index = 0; index < mass.length; index++) mass[index] /= total;
  }
  return mass;
}

export class StrategyController {
  private knownSparkles = new Set<number>();
  private knownDull = new Set<number>();
  private observed = new Map<number, ResourceType>();
  private opened = new Set<number>();
  private plannedPath: number[] = [];
  private fullMineSeen = false;
  private dynamitePrice = Infinity;
  readonly strategy: StrategyName;
  readonly visibility: VisibilityMode;
  readonly lambdaOverride: number;
  readonly values: StrategyValues;

  constructor(
    strategy: StrategyName,
    visibility: VisibilityMode,
    lambdaOverride = 0,
    values: StrategyValues = DEFAULT_VALUES,
  ) {
    this.strategy = strategy;
    this.visibility = visibility;
    this.lambdaOverride = lambdaOverride;
    this.values = values;
  }

  reset(): void {
    this.knownSparkles.clear();
    this.knownDull.clear();
    this.observed.clear();
    this.opened.clear();
    this.plannedPath = [];
    this.fullMineSeen = false;
  }

  update(rawState: string, hasObjectDetection: boolean): void {
    if (rawState.length !== 36) {
      throw new Error(`Expected 36 mine-state cells, received ${rawState.length}`);
    }

    this.opened = new Set<number>();
    for (let position = 0; position < rawState.length; position++) {
      if (rawState[position] === "o") this.opened.add(statePositionToIndex(position));
    }

    const fullVisibility = this.visibility !== "low" && hasObjectDetection;
    if (fullVisibility) this.fullMineSeen = true;

    for (let position = 0; position < rawState.length; position++) {
      const index = statePositionToIndex(position);
      if (this.opened.has(index) || (!fullVisibility && !isLegal(index, this.opened))) continue;
      if (rawState[position] === "*") {
        this.knownSparkles.add(index);
        this.knownDull.delete(index);
      } else {
        this.knownDull.add(index);
        this.knownSparkles.delete(index);
      }
    }
    for (const index of this.opened) this.knownSparkles.delete(index);
    this.plannedPath = this.plannedPath.filter((index) => !this.opened.has(index));
  }

  recordMine(coordinate: MiningCoordinate, resource: ResourceType | null): void {
    const index = coordinateToIndex(coordinate);
    const wasSparkle = this.knownSparkles.has(index);
    this.knownSparkles.delete(index);
    this.opened.add(index);
    if (resource) this.observed.set(index, resource);
    else if (wasSparkle) this.observed.set(index, "cave");
  }

  shouldResetAfterGold(): boolean {
    return this.strategy === "pjb" || this.strategy === "oreo";
  }

  setDynamitePrice(price: number): void {
    if (!Number.isFinite(price) || price < 0)
      throw new Error("Dynamite price must be non-negative.");
    this.dynamitePrice = price;
  }

  shouldUseDynamite(): boolean {
    return this.dynamitePrice < this.turnValue();
  }

  decide(): Decision {
    if (this.plannedPath.length > 0) {
      const next = this.plannedPath[0];
      if (isLegal(next, this.opened)) {
        return {
          action: "mine",
          coordinate: indexToCoordinate(next),
          reason: "continuing the selected EV route",
        };
      }
      this.plannedPath = [];
    }

    if (this.strategy === "pjb" || this.strategy === "oreo") {
      return this.communityDecision();
    }
    return this.evDecision(this.strategy === "ev-cluster");
  }

  private communityDecision(): Decision {
    const candidates = [...this.knownSparkles]
      .filter((index) => rowOf(index) <= 1 && isLegal(index, this.opened))
      .sort((a, b) => a - b);
    if (candidates.length > 0) {
      return {
        action: "mine",
        coordinate: indexToCoordinate(candidates[0]),
        reason: "mining the first accessible front-two-row sparkle",
      };
    }

    if (this.opened.size > 0) {
      return { action: "reset", reason: "no accessible front-two-row sparkle remains" };
    }

    let column = CENTER;
    if (this.strategy === "oreo" && this.fullMineSeen) {
      let bestStart = -1;
      let bestLength = 0;
      for (let start = 0; start < 6; ) {
        if (!this.knownSparkles.has(6 + start)) {
          start++;
          continue;
        }
        let end = start;
        while (end < 6 && this.knownSparkles.has(6 + end)) end++;
        if (end - start > bestLength) {
          bestStart = start;
          bestLength = end - start;
        }
        start = end;
      }
      if (bestStart >= 0) column = bestStart;
    }
    return {
      action: "mine",
      coordinate: indexToCoordinate(column),
      reason:
        column === CENTER
          ? "probing the center of the front row"
          : "probing above the longest second-row sparkle vein",
    };
  }

  private evDecision(cluster: boolean): Decision {
    const ev = this.expectedValues(cluster);
    const starts = new Set<number>();
    for (let index = 0; index < 6; index++) {
      if (!this.opened.has(index)) starts.add(index);
    }
    for (const opened of this.opened) {
      for (const neighbor of neighbors[opened]) {
        if (!this.opened.has(neighbor)) starts.add(neighbor);
      }
    }

    let best: { path: number[]; score: number; reward: number } | null = null;
    const lambda = this.turnValue();
    for (const target of this.knownSparkles) {
      const path = this.shortestPath(starts, target);
      if (!path) continue;
      const reward = ev[target];
      const routeCost = path.reduce(
        (cost, index) =>
          cost +
          (this.knownDull.has(index) && this.shouldUseDynamite() ? this.dynamitePrice : lambda),
        0,
      );
      const score = reward - routeCost;
      if (!best || score > best.score || (score === best.score && reward > best.reward)) {
        best = { path, score, reward };
      }
    }

    if (!best) {
      return this.opened.size === 0
        ? {
            action: "mine",
            coordinate: indexToCoordinate(CENTER),
            reason: "probing the center because no sparkle is visible",
          }
        : { action: "reset", reason: "no visible sparkle remains" };
    }
    if (this.opened.size > 0 && best.score < 0) {
      return {
        action: "reset",
        reason: `best route EV ${best.reward.toFixed(0)} is below its turn/dynamite cost`,
      };
    }

    this.plannedPath = best.path;
    return {
      action: "mine",
      coordinate: indexToCoordinate(best.path[0]),
      reason: `best route has EV ${best.reward.toFixed(0)}, ${best.path.length} step(s), λ=${lambda}`,
    };
  }

  private turnValue(): number {
    if (this.lambdaOverride > 0) return this.lambdaOverride;
    if (this.strategy === "ev-cluster") return this.fullMineSeen ? 3500 : 3714;
    if (this.strategy === "ev") return 3571;
    return 3500;
  }

  private expectedValues(cluster: boolean): number[] {
    return cluster ? this.clusterExpectedValues() : this.perTileExpectedValues();
  }

  private remainingCounts(targetCount: number) {
    let ore = 0;
    let crystal = 0;
    let gold = 0;
    for (const type of this.observed.values()) {
      if (type === "ore") ore++;
      else if (type === "crystal") crystal++;
      else if (type === "gold") gold++;
    }
    const oreRemaining = Math.max(0, 6 - ore);
    const crystalRemaining = Math.max(0, 3 - crystal);
    const goldRemaining = Math.max(0, 1.496 - gold);
    return {
      oreRemaining,
      crystalRemaining,
      goldRemaining,
      caveRemaining: Math.max(0, targetCount - oreRemaining - crystalRemaining - goldRemaining),
    };
  }

  private perTileExpectedValues(): number[] {
    const result = Array(36).fill(0) as number[];
    const targets = [...this.knownSparkles];
    const targetCount = this.fullMineSeen ? targets.length : TARGETS_PER_MINE - this.observed.size;
    const counts = this.remainingCounts(targetCount);
    const oreProbability = new Map<number, number>();

    if (this.fullMineSeen) {
      const eligible = targets.filter(
        (index) =>
          rowOf(index) >= 2 &&
          neighbors[index].some(
            (neighbor) => this.observed.get(neighbor) === "ore" || this.knownSparkles.has(neighbor),
          ),
      );
      const weightTotal = eligible.reduce((sum, index) => sum + ROW_ORE_WEIGHT[rowOf(index)], 0);
      for (const index of eligible) {
        oreProbability.set(
          index,
          weightTotal > 0
            ? Math.min(1, (counts.oreRemaining * ROW_ORE_WEIGHT[rowOf(index)]) / weightTotal)
            : 0,
        );
      }
    }

    for (const index of targets) {
      let pOre = oreProbability.get(index) ?? 0;
      if (!this.fullMineSeen && rowOf(index) >= 2 && counts.oreRemaining > 0) {
        const adjacentPossibleOre = neighbors[index].some(
          (neighbor) =>
            this.observed.get(neighbor) === "ore" ||
            (!this.opened.has(neighbor) && rowOf(neighbor) >= 2),
        );
        pOre = Math.min(1, ROW_ORE_WEIGHT[rowOf(index)] * (adjacentPossibleOre ? 1 : 0.3));
      }
      result[index] = this.nonOreAdjustedValue(pOre, counts);
    }
    return result;
  }

  private clusterExpectedValues(): number[] {
    const knownOre = new Set<number>();
    const knownNonOre = new Set<number>();
    for (const [index, type] of this.observed) {
      if (type === "ore") knownOre.add(index);
      else knownNonOre.add(index);
    }
    for (const index of this.knownDull) knownNonOre.add(index);
    for (const index of this.opened) {
      if (!knownOre.has(index)) knownNonOre.add(index);
    }
    const subset = this.fullMineSeen ? new Set([...this.knownSparkles, ...knownOre]) : null;
    const pOre = clusterOrePosterior(knownOre, knownNonOre, subset);
    const targetCount = this.fullMineSeen
      ? this.knownSparkles.size
      : TARGETS_PER_MINE - this.observed.size;
    const counts = this.remainingCounts(targetCount);
    const result = Array(36).fill(0) as number[];
    for (const index of this.knownSparkles) {
      result[index] = this.nonOreAdjustedValue(counts.oreRemaining > 0 ? pOre[index] : 0, counts);
    }
    return result;
  }

  private nonOreAdjustedValue(
    pOre: number,
    counts: ReturnType<StrategyController["remainingCounts"]>,
  ): number {
    const nonOreTotal = counts.goldRemaining + counts.crystalRemaining + counts.caveRemaining;
    const pNonOre = 1 - pOre;
    const pGold = nonOreTotal > 0 ? (pNonOre * counts.goldRemaining) / nonOreTotal : 0;
    const pCrystal = nonOreTotal > 0 ? (pNonOre * counts.crystalRemaining) / nonOreTotal : 0;
    return pOre * this.values.ore + pGold * this.values.gold + pCrystal * this.values.crystal;
  }

  private shortestPath(starts: Set<number>, target: number): number[] | null {
    const queue = [...starts];
    const parent = new Map<number, number | null>();
    for (const start of starts) parent.set(start, null);

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current === target) {
        const path: number[] = [];
        for (let node: number | null = current; node !== null; node = parent.get(node) ?? null) {
          path.unshift(node);
        }
        return path;
      }
      for (const neighbor of neighbors[current]) {
        if (this.opened.has(neighbor) || parent.has(neighbor)) continue;
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
    return null;
  }
}
