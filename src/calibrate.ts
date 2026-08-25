import {
  coordinateToIndex,
  isLegal,
  makeCalibrationBoards,
  ResourceType,
  StrategyController,
  StrategyName,
  StrategyValues,
  VisibilityMode,
} from "./strategy.js";

const TYPE: Record<string, ResourceType | null> = {
  e: null,
  o: "ore",
  g: "gold",
  r: "crystal",
  c: "cave",
};

function mineState(board: string, opened: Set<number>, fullVisibility: boolean): string {
  const state = Array(36).fill(".");
  for (let index = 0; index < 36; index++) {
    const row = Math.floor(index / 6);
    const position = (5 - row) * 6 + (index % 6);
    if (opened.has(index)) state[position] = "o";
    else if (board[index] !== "e" && (fullVisibility || isLegal(index, opened))) {
      state[position] = "*";
    }
  }
  return state.join("");
}

function evaluate(
  lambda: number,
  strategy: StrategyName,
  visibility: VisibilityMode,
  values: StrategyValues,
  dynamitePrice: number,
  objectDetectionPrice: number,
  boards: string[],
): number {
  const fullVisibility = visibility === "high";
  let effectTurns = 0;
  let totalValue = 0;
  let totalTurns = 0;

  for (const board of boards) {
    if (fullVisibility && effectTurns <= 0) {
      totalValue -= objectDetectionPrice;
      effectTurns = 10;
    }
    const controller = new StrategyController(strategy, visibility, lambda, values);
    controller.setDynamitePrice(dynamitePrice);
    const opened = new Set<number>();

    for (let actions = 0; actions < 36; actions++) {
      controller.update(mineState(board, opened, fullVisibility), fullVisibility);
      const decision = controller.decide();
      if (decision.action === "reset") break;

      const index = coordinateToIndex(decision.coordinate);
      const code = board[index];
      const resource = TYPE[code];
      const dynamite = code === "e" && dynamitePrice < lambda;
      opened.add(index);
      if (dynamite) totalValue -= dynamitePrice;
      else {
        totalTurns++;
        if (fullVisibility) effectTurns--;
      }
      if (resource) totalValue += values[resource];
      controller.recordMine(decision.coordinate, resource === "cave" ? null : resource);
    }
  }
  return totalValue / totalTurns;
}

export type CalibrationOptions = {
  strategy: StrategyName;
  visibility: VisibilityMode;
  values: StrategyValues;
  dynamitePrice: number;
  objectDetectionPrice: number;
  min: number;
  max: number;
  step: number;
  fineSteps: number;
  boardCount: number;
  seed: number;
  secondGoldChance: number;
  onProgress?: (completed: number, total: number, lambda: number) => void;
};

export function calibrate(options: CalibrationOptions) {
  const {
    strategy,
    visibility,
    values,
    dynamitePrice,
    objectDetectionPrice,
    min,
    max,
    step,
    fineSteps,
    boardCount,
    seed,
    secondGoldChance,
    onProgress,
  } = options;
  if (strategy !== "ev" && strategy !== "ev-cluster") {
    throw new Error("Calibration is only available for EV strategies.");
  }
  if (min < 0 || max <= min || step <= 0 || fineSteps < 0) {
    throw new Error("Calibration requires 0 <= min < max, step > 0, and fineSteps >= 0.");
  }
  if (
    !Number.isInteger(boardCount) ||
    boardCount <= 0 ||
    !Number.isFinite(seed) ||
    secondGoldChance < 0 ||
    secondGoldChance > 1
  ) {
    throw new Error(
      "Calibration requires positive integer boards, a seed, and 0 <= P(2 gold) <= 1.",
    );
  }
  const boards = makeCalibrationBoards(boardCount, seed, secondGoldChance);

  const coarse: number[] = [];
  for (let lambda = min; lambda <= max; lambda += step) {
    coarse.push(lambda);
  }
  if (coarse[coarse.length - 1] !== max) coarse.push(max);

  const rates = new Map<number, number>();
  const rate = (lambda: number) => {
    const cached = rates.get(lambda);
    if (cached !== undefined) return cached;
    const result = evaluate(
      lambda,
      strategy,
      visibility,
      values,
      dynamitePrice,
      objectDetectionPrice,
      boards,
    );
    rates.set(lambda, result);
    return result;
  };
  const total = coarse.length + fineSteps;
  let completed = 0;
  let best = coarse[0];
  for (const lambda of coarse) {
    if (rate(lambda) > rate(best)) best = lambda;
    onProgress?.(++completed, total, lambda);
  }
  const bestIndex = coarse.indexOf(best);
  const low = coarse[Math.max(0, bestIndex - 1)];
  const high = coarse[Math.min(coarse.length - 1, bestIndex + 1)];
  for (let point = 1; point <= fineSteps; point++) {
    const lambda = Math.round(low + ((high - low) * point) / (fineSteps + 1));
    if (rate(lambda) > rate(best)) best = lambda;
    onProgress?.(++completed, total, lambda);
  }
  return { lambda: best, rate: rate(best), sampleSize: boards.length };
}
