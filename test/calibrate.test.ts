import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.endsWith(".js") ? `${specifier.slice(0, -3)}.ts` : specifier,
      context,
    );
  },
});

const { calibrate, evaluateCalibration } = await import("../src/calibrate.ts");
const { makeCalibrationBoards } = await import("../src/strategy.ts");
const options = {
  strategy: "ev" as const,
  visibility: "low" as const,
  values: { ore: 25, gold: 20000, crystal: 69, cave: 0 },
  dynamitePrice: 5000,
  objectDetectionPrice: 0,
  min: 500,
  max: 1000,
  step: 500,
  fineSteps: 2,
  boardCount: 10,
  seed: 12345,
  secondGoldChance: 0.496,
};
const progress: Array<[number, number]> = [];
const result = calibrate({
  ...options,
  onProgress: (completed, total) => progress.push([completed, total]),
});
assert.equal(Number.isFinite(result.rate), true);
assert.deepEqual(result, calibrate(options));
assert.deepEqual(progress[progress.length - 1], [4, 4]);
assert.throws(() => calibrate({ ...options, boardCount: 0 }), /positive integer boards/);
assert.throws(() => calibrate({ ...options, min: 0 }), /0 < min/);
assert.throws(
  () =>
    calibrate({
      ...options,
      values: { ore: 0, gold: 0, crystal: 0, cave: 0 },
      dynamitePrice: 0,
      fineSteps: 0,
      boardCount: 1,
      seed: 10,
      secondGoldChance: 0,
    }),
  /no adventure-spending mining decisions/,
);

const visibilityMetrics = evaluateCalibration(
  100,
  "ev-cluster",
  "high",
  { ore: 100000, gold: 100000, crystal: 100000, cave: 0 },
  10000,
  100,
  makeCalibrationBoards(1, 12345, 0.496),
  0.496,
);
assert.equal(visibilityMetrics.totalTurns > 10, true);
assert.equal(visibilityMetrics.objectDetectionUses, 1);

console.log("calibration checks passed");
