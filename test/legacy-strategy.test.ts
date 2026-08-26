import assert from "node:assert/strict";

import { StrategyController } from "../src/strategy.ts";

function mineState(entries: Array<[position: number, value: string]>): string {
  const state = Array(36).fill(".");
  for (const [position, value] of entries) state[position] = value;
  return state.join("");
}

for (const strategy of ["pjb", "oreo"] as const) {
  const fresh = new StrategyController(strategy, "high");
  fresh.update(mineState([]), true);
  assert.deepEqual(fresh.decide(), {
    action: "mine",
    coordinate: [4, 6],
    reason: "probing the center of the front row",
  });

  const dry = new StrategyController(strategy, "low");
  dry.update(mineState([[30, "o"]]), false);
  assert.equal(dry.decide().action, "reset");

  const foundGold = new StrategyController(strategy, "low");
  foundGold.update(mineState([[30, "*"]]), false);
  foundGold.recordMine([1, 6], "gold");
  foundGold.update(mineState([[30, "o"]]), false);
  assert.equal(foundGold.shouldResetAfterGold(), true);
  assert.equal(foundGold.decide().action, "reset");
}

const secondRowVein = mineState([
  [25, "*"],
  [26, "*"],
  [28, "*"],
]);
const pjb = new StrategyController("pjb", "high");
pjb.update(secondRowVein, true);
assert.deepEqual((pjb.decide() as { coordinate: [number, number] }).coordinate, [4, 6]);
const hiddenOreo = new StrategyController("oreo", "high");
hiddenOreo.update(secondRowVein, false);
assert.deepEqual((hiddenOreo.decide() as { coordinate: [number, number] }).coordinate, [4, 6]);
const visibleOreo = new StrategyController("oreo", "high");
visibleOreo.update(secondRowVein, true);
assert.deepEqual((visibleOreo.decide() as { coordinate: [number, number] }).coordinate, [2, 6]);

const tiedVeins = new StrategyController("oreo", "high");
tiedVeins.update(
  mineState([
    [24, "*"],
    [25, "*"],
    [28, "*"],
    [29, "*"],
  ]),
  true,
);
assert.deepEqual((tiedVeins.decide() as { coordinate: [number, number] }).coordinate, [1, 6]);

console.log("legacy strategy checks passed");
