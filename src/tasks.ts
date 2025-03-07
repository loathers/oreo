import {
  abort,
  myHp,
  numericModifier,
  restoreHp,
  retrieveItem,
  retrievePrice,
  use,
} from "kolmafia";
import { $item, $modifier, get, have, tuple } from "libram";

import { args } from "./args";
import { Task } from "./engine";
import * as Mining from "./mining";
import { Mine } from "./mining";
import { printExplanation } from "./utils";

export const MINING_TASKS: Task[] = [
  {
    name: "Acquire mining drill",
    noCombat: true,
    completed: () => have($item`high-temperature mining drill`),
    limit: { tries: 1 },
    acquire: [
      { item: $item`heat-resistant sheet metal` },
      { item: $item`broken high-temperature mining drill` },
    ],
    do: () => {
      use(1, $item`broken high-temperature mining drill`);
    },
  },
  {
    after: ["Acquire mining drill"],
    noCombat: true,
    name: "Mine",
    completed: () => false,
    outfit: {
      equip: [$item`high-temperature mining drill`],
      modifier: args.survive || myHp() >= 75 ? "Hot Resistance" : "15Hot Resistance, hp regen",
    },
    prepare: () => {
      if (numericModifier($modifier`Hot Resistance`) < 15) {
        abort(
          `More hot resistance needed (you have ${numericModifier($modifier`Hot Resistance`)}, you need 15).`,
        );
      }

      const minHp = Mining.caveInCost(6);
      if (args.survive && myHp() < minHp) {
        const hpRestore = 2 * minHp + myHp();
        if (!restoreHp(hpRestore)) abort("Could not restore enough HP to survive the cave-in.");
      }

      if (myHp() === 0) abort("You must have at least 1HP to mine.");
    },
    do: () => {
      const mined = Mining.minedSpots(Mine.VOLCANO);
      const sparkles = Mining.getAccessibleSparkles(Mine.VOLCANO);

      // If we have mined two spots, we want to move on immediately
      if (mined >= 2) {
        if (args.explain) printExplanation("Two o, moving on");
        Mining.findNewCavern(Mine.VOLCANO);
        return;
      }

      // If we have a sparkly target in the first two rows, pick the deepest one accessible
      let coords = sparkles
        .filter(([, y]) => [5, 6].includes(y))
        .sort(([, y1], [, y2]) => y1 - y2)[0];

      // If we have mined at least once and have no sparkly targets, move on.
      if (!coords && mined >= 1) {
        printExplanation("One o but no *, moving on");
        Mining.findNewCavern(Mine.VOLCANO);
        return;
      }

      // Otherwise, try a random spot from the middle of the front row
      if (!coords) {
        // Grab a minin' dynamite if it would save us compared to the value of an adventure here
        if (retrievePrice($item`minin' dynamite`) < get("valueOfAdventure"))
          retrieveItem($item`minin' dynamite`);

        // Find a shiny spot in the second row we can aim for
        const column = Mining.getState(Mine.VOLCANO).slice(-12, -6).indexOf("*");

        if (column >= 0) {
          printExplanation(`No * in row 6, saw * at (${column + 1},5), so aiming for that`);
        } else {
          printExplanation(`No * in row 6, picking random spot between (2,6) and (5,6)`);
        }

        // Either use that column or pick a random spot in the middle of the front row
        coords = tuple(column >= 0 ? column + 1 : 2 + Math.floor(Math.random() * 4), 6);
      }

      printExplanation(
        `\n${Mining.getAsMatrix(Mine.VOLCANO)
          .map((row) => row.join(""))
          .join("\n")}\nPicked (${coords.join(",")})`,
      );

      const results = Mining.mineCoordinate(Mine.VOLCANO, coords);

      // If we found a prize, move on to the next cavern
      if (results.has($item`1,970 carat gold`)) {
        printExplanation("Found prize, moving on");
        Mining.findNewCavern(Mine.VOLCANO);
      }
    },
  },
];
