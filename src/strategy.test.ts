import assert from "node:assert/strict";

import { calculateMiningValue } from "./accounting.ts";
import { parseMineLayout } from "./mine-layout.ts";
import {
  coordinateToIndex,
  indexToCoordinate,
  makeCalibrationBoards,
  minimumCostPaths,
  StrategyController,
} from "./strategy.ts";

const calibrationBoards = makeCalibrationBoards(10, 12345, 0.496);
assert.deepEqual(
  calculateMiningValue<string>(
    [["gold", 2]],
    [
      ["dynamite", 3],
      ["potion", 1],
    ],
    new Map([["gold", 21000]]),
    new Map([
      ["dynamite", 5000],
      ["potion", 120],
    ]),
    10,
  ),
  {
    grossValue: 42000,
    consumableCost: 15120,
    netValue: 26880,
    valuePerAdventure: 2688,
  },
);
assert.deepEqual(
  calculateMiningValue([["gold", 1]], [], new Map([["gold", 21000]]), new Map(), 0),
  {
    grossValue: 21000,
    consumableCost: 0,
    netValue: 21000,
    valuePerAdventure: null,
  },
);
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
    '#50<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/goldnugget.gif" ' +
      'width=30 height=30 alt="1,970 carat gold" title="1,970 carat gold">' +
      '#51<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/rawvelvet.gif">' +
      '#42<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/nacrystal1.gif">' +
      '#41<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/hp.gif">',
  ),
  [
    [[2, 6], "gold"],
    [[3, 6], "ore"],
    [[2, 5], "crystal"],
    [[1, 5], "cave"],
  ],
);
assert.deepEqual(
  parseMineLayout(
    '#0<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/goldnugget.gif">' +
      '#50<img src="https://d2uyhvukfffg5a.cloudfront.net/itemimages/unknown.gif">',
  ),
  [],
);

function mineState(entries: Array<[position: number, value: string]>): string {
  const state = Array(36).fill(".");
  for (const [position, value] of entries) state[position] = value;
  return state.join("");
}

assert.deepEqual(indexToCoordinate(coordinateToIndex([1, 6])), [1, 6]);
assert.deepEqual(indexToCoordinate(coordinateToIndex([6, 1])), [6, 1]);
assert.deepEqual(
  minimumCostPaths(new Set(), [0], (index) =>
    [0, 6, 7, 8].includes(index) ? 1 : [1, 2].includes(index) ? 10 : 100,
  ).get(2),
  { cost: 14, path: [0, 6, 7, 8, 2] },
);

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

const oneGoldState = mineState([
  [30, "o"],
  [24, "*"],
]);
const exhaustedGold = new StrategyController(
  "ev",
  "high",
  1,
  { ore: 0, gold: 10000, crystal: 0, cave: 0 },
  0,
);
exhaustedGold.update(oneGoldState, true, [[[1, 6], "gold"]]);
assert.equal(exhaustedGold.decide().action, "reset");
const remainingGold = new StrategyController(
  "ev",
  "high",
  1,
  { ore: 0, gold: 10000, crystal: 0, cave: 0 },
  1,
);
remainingGold.update(oneGoldState, true, [[[1, 6], "gold"]]);
assert.equal(remainingGold.decide().action, "mine");
assert.throws(() => new StrategyController("ev", "low", 0, undefined, 1.01));

for (const [resource, count] of [
  ["ore", 6],
  ["crystal", 3],
] as const) {
  const controller = new StrategyController("ev", "high", 1, {
    ore: resource === "ore" ? 10000 : 0,
    gold: 0,
    crystal: resource === "crystal" ? 10000 : 0,
    cave: 0,
  });
  const observations = Array.from(
    { length: count },
    (_, index) => [indexToCoordinate(index), resource] as const,
  );
  controller.update(
    mineState([
      ...Array.from({ length: count }, (_, index) => [30 + index, "o"] as [number, string]),
      [24, "*"],
    ]),
    true,
    observations,
  );
  assert.equal(controller.decide().action, "reset");
}

const resumedCaveState = mineState([
  [30, "o"],
  [31, "*"],
]);
const withoutCave = new StrategyController("ev", "low", 1750, {
  ore: 0,
  gold: 10000,
  crystal: 0,
  cave: 0,
});
withoutCave.update(resumedCaveState, false);
assert.equal(withoutCave.decide().action, "reset");
const withCave = new StrategyController("ev", "low", 1750, {
  ore: 0,
  gold: 10000,
  crystal: 0,
  cave: 0,
});
withCave.update(resumedCaveState, false, [[[1, 6], "cave"]]);
assert.equal(withCave.decide().action, "mine");

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

const deepSparkle = mineState([[0, "*"]]);
const lowVisibility = new StrategyController("ev", "low");
lowVisibility.update(deepSparkle, true);
assert.deepEqual((lowVisibility.decide() as { coordinate: [number, number] }).coordinate, [4, 6]);
const highVisibility = new StrategyController("ev", "high");
highVisibility.update(deepSparkle, true);
assert.deepEqual((highVisibility.decide() as { coordinate: [number, number] }).coordinate, [1, 6]);
const automaticVisibility = new StrategyController("ev", "auto");
automaticVisibility.update(deepSparkle, false);
assert.deepEqual(
  (automaticVisibility.decide() as { coordinate: [number, number] }).coordinate,
  [4, 6],
);
automaticVisibility.update(deepSparkle, true);
assert.deepEqual(
  (automaticVisibility.decide() as { coordinate: [number, number] }).coordinate,
  [1, 6],
);

assert.throws(
  () => new StrategyController("ev", "low").update("short", false),
  /Expected 36 mine-state cells/,
);

console.log("strategy checks passed");
