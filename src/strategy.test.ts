import assert from "node:assert/strict";

import {
  coordinateToIndex,
  indexToCoordinate,
  makeCalibrationBoards,
  parseMineLayout,
  StrategyController,
} from "./strategy.ts";

const calibrationBoards = makeCalibrationBoards(10, 12345, 0.496);
assert.equal(calibrationBoards.length, 10);
assert.equal(
  calibrationBoards.every((board) => board.length === 36),
  true,
);
assert.equal(calibrationBoards[0], makeCalibrationBoards(1, 12345, 0.496)[0]);
for (const board of calibrationBoards) {
  assert.equal([...board].filter((tile) => tile === "o").length, 6);
  assert.equal([...board].filter((tile) => tile === "r").length, 3);
  assert.equal([...board].filter((tile) => tile !== "e").length, 15);
}
assert.equal([...makeCalibrationBoards(1, 1, 0)[0]].filter((tile) => tile === "g").length, 1);
assert.equal([...makeCalibrationBoards(1, 1, 1)[0]].filter((tile) => tile === "g").length, 2);
assert.deepEqual(
  parseMineLayout(
    '#50<img src="https://example/itemimages/goldnugget.gif">' +
      '#51<img src="https://example/itemimages/rawvelvet.gif">' +
      '#42<img src="https://example/itemimages/nacrystal1.gif">' +
      '#41<img src="https://example/itemimages/hp.gif">',
  ),
  [
    [[2, 6], "gold"],
    [[3, 6], "ore"],
    [[2, 5], "crystal"],
    [[1, 5], "cave"],
  ],
);

function mineState(entries: Array<[position: number, value: string]>): string {
  const state = Array(36).fill(".");
  for (const [position, value] of entries) state[position] = value;
  return state.join("");
}

assert.deepEqual(indexToCoordinate(coordinateToIndex([1, 6])), [1, 6]);
assert.deepEqual(indexToCoordinate(coordinateToIndex([6, 1])), [6, 1]);

const resumed = new StrategyController("ev", "high", 1, {
  ore: 0,
  gold: 10000,
  crystal: 0,
  cave: 0,
});
resumed.update(
  mineState([
    [30, "o"],
    [31, "o"],
    [24, "*"],
  ]),
  true,
  [
    [[1, 6], "gold"],
    [[2, 6], "gold"],
  ],
);
assert.equal(resumed.decide().action, "reset");

const pjb = new StrategyController("pjb", "low");
pjb.update(mineState([[30, "*"]]), false);
assert.deepEqual(pjb.decide(), {
  action: "mine",
  coordinate: [1, 6],
  reason: "mining the first accessible front-two-row sparkle",
});

const legalPjb = new StrategyController("pjb", "high");
legalPjb.update(mineState([[24, "*"]]), true);
assert.deepEqual(legalPjb.decide().action, "mine");
assert.deepEqual((legalPjb.decide() as { coordinate: [number, number] }).coordinate, [4, 6]);

const oreo = new StrategyController("oreo", "high");
oreo.update(
  mineState([
    [25, "*"],
    [26, "*"],
    [28, "*"],
  ]),
  true,
);
assert.deepEqual((oreo.decide() as { coordinate: [number, number] }).coordinate, [2, 6]);

const lowEv = new StrategyController("ev-cluster", "low");
lowEv.update(mineState([[0, "*"]]), false);
assert.deepEqual((lowEv.decide() as { coordinate: [number, number] }).coordinate, [4, 6]);
lowEv.setDynamitePrice(5500);
assert.equal(lowEv.shouldUseDynamite(), false);
lowEv.setDynamitePrice(3500);
assert.equal(lowEv.shouldUseDynamite(), true);

const overriddenEv = new StrategyController("ev", "low", 6000);
overriddenEv.setDynamitePrice(5500);
assert.equal(overriddenEv.shouldUseDynamite(), true);

const pricedRoute = mineState([
  [24, "*"],
  [33, "o"],
]);
const noDynamite = new StrategyController("ev", "high");
noDynamite.update(pricedRoute, true);
assert.equal(noDynamite.decide().action, "reset");
const freeDynamite = new StrategyController("ev", "high");
freeDynamite.setDynamitePrice(0);
freeDynamite.update(pricedRoute, true);
assert.equal(freeDynamite.decide().action, "mine");

const remembered = new StrategyController("ev-cluster", "auto");
remembered.update(mineState([[0, "*"]]), true);
const first = remembered.decide();
assert.equal(first.action, "mine");
assert.deepEqual(first.coordinate, [1, 6]);
remembered.recordMine(first.coordinate, null);
remembered.update(mineState([[30, "o"]]), false);
const second = remembered.decide();
assert.equal(second.action, "mine");
assert.deepEqual(second.coordinate, [1, 5]);

assert.throws(
  () => new StrategyController("ev", "low").update("short", false),
  /Expected 36 mine-state cells/,
);

console.log("strategy checks passed");
