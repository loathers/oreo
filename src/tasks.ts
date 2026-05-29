import { use } from "kolmafia";
import { $item, get, have, tuple } from "libram";

import { Task } from "./engine.js";
import * as Mining from "./mining.js";
import { Mine } from "./mining.js";
import {
  assureHotResistance,
  explain,
  findStartOfLongestVein,
  getAccessibleSparkles,
  MINING_MODIFIER,
  mineCoordinate,
  prepareToMine,
} from "./utils.js";

export const MINING_TASKS: Task[] = [
  {
    name: "Acquire mining drill",
    noCombat: true,
    limit: { tries: 1 },
    acquire: [
      { item: $item`heat-resistant sheet metal` },
      { item: $item`broken high-temperature mining drill` },
    ],
    do: () => {
      use(1, $item`broken high-temperature mining drill`);
    },
    completed: () => have($item`high-temperature mining drill`),
  },
  {
    name: "Move to a new cavern having struck gold in this cavern",
    after: ["Acquire mining drill"],
    noCombat: true,
    outfit: {
      equip: [$item`high-temperature mining drill`],
      modifier: MINING_MODIFIER,
    },
    ready: () => get("mineLayout6").includes("goldnugget"),
    prepare: () => assureHotResistance(),
    do: () => Mining.findNewCavern(Mine.VOLCANO),
    completed: () => false,
  },
  {
    name: "Move to new cavern having mined once with no sparkly targets",
    after: ["Acquire mining drill"],
    noCombat: true,
    outfit: {
      equip: [$item`high-temperature mining drill`],
      modifier: MINING_MODIFIER,
    },
    ready: () => Mining.minedSpots(Mine.VOLCANO) >= 1 && getAccessibleSparkles().length === 0,
    prepare: () => assureHotResistance(),
    do: () => Mining.findNewCavern(Mine.VOLCANO),
    completed: () => false,
  },
  {
    name: "Mine a sparkly spot",
    after: ["Acquire mining drill"],
    noCombat: true,
    outfit: {
      equip: [$item`high-temperature mining drill`],
      modifier: MINING_MODIFIER,
    },
    ready: () => getAccessibleSparkles().length > 0,
    prepare: () => prepareToMine(),
    do: () => {
      // Mine a sparkly coordinate. We will mine all of these until we strike gold, so we might as well pick the first one.
      mineCoordinate(getAccessibleSparkles()[0]);
    },
    completed: () => false,
  },
  {
    name: "Mine a regular spot",
    after: ["Acquire mining drill"],
    noCombat: true,
    outfit: () => ({
      equip: [
        $item`high-temperature mining drill`,
        ...(have($item`Xiblaxian holo-wrist-puter`) && !get("_holoWristCrystal")
          ? [$item`Xiblaxian holo-wrist-puter`]
          : []),
      ],
      modifier: MINING_MODIFIER,
    }),
    acquire: [
      // Grab a minin' dynamite if it would save us compared to the value of an adventure here
      { item: $item`minin' dynamite`, price: 3400, optional: true },
    ],
    ready: () => Mining.minedSpots(Mine.VOLCANO) === 0 && getAccessibleSparkles().length === 0,
    prepare: () => prepareToMine(),
    do: () => {
      // Find a shiny spot in the second row we can aim for
      const column = findStartOfLongestVein(Mining.getState(Mine.VOLCANO).slice(-12, -6));

      // Either use that column or pick a random spot in the middle of the front row
      // By picking a spot in the middle, an uncovered sparkly spot would itself
      // provide the chance of finding two more spots
      const coords = tuple(column >= 0 ? column + 1 : 2 + Math.floor(Math.random() * 4), 6);

      if (column >= 0) {
        explain(`No * in r6, longest vein of * starts at (${column + 1},5), aiming for that`);
      } else {
        explain(`No * in r6, picking random spot between (2,6) and (5,6)`);
      }

      mineCoordinate(coords);
    },
    completed: () => false,
  },
];
