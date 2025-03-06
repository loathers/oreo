import { Task } from "grimoire-kolmafia";
import {
  abort,
  myHp,
  numericModifier,
  restoreHp,
  retrieveItem,
  retrievePrice,
  use,
} from "kolmafia";
import { $item, $modifier, extractItems, get, have, tuple } from "libram";

import { args } from "./args";
import { caveInCost, findNewCavern, getCavernInfo, Mine, mineAtSpot } from "./mining";
import { State } from "./utils";

export const MINING_TASKS: Task[] = [
  {
    name: "Acquire mining drill",
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
    name: "Mine!",
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

      const minHp = caveInCost(6);
      if (args.survive && myHp() < minHp) {
        const hpRestore = 2 * minHp + myHp();
        if (!restoreHp(hpRestore)) abort("Could not restore enough HP to survive the cave-in.");
      }

      if (myHp() === 0) abort("You must have at least 1HP to mine.");
    },
    do: () => {
      const { mined, sparkles } = getCavernInfo(State.page);

      // If we have a sparkly target, mine the deepest one visible
      // @TODO support object detection and pick the good spot. This will need the ability to determine which sparkly spots are accessible.
      let coords = sparkles
        .filter(([, y]) => [5, 6].includes(y))
        .sort(([, y1], [, y2]) => y2 - y1)[0];

      // If we have mined at least once and have no sparkly targets, move on.
      if (!coords && mined) {
        State.page = findNewCavern(Mine.VOLCANO);
        return;
      }

      // Otherwise, try a random spot from the middle of the front row
      if (!coords) {
        // Grab a minin' dynamite if it would save us compared to the value of an adventure here
        if (retrievePrice($item`minin' dynamite`) < get("valueOfAdventure"))
          retrieveItem($item`minin' dynamite`);
        coords = tuple(2 + Math.floor(Math.random() * 4), 6);
      }

      State.page = mineAtSpot(Mine.VOLCANO, ...coords);

      // If we found a prize, move on to the next cavern
      if (extractItems(State.page).has($item`1,970 carat gold`)) {
        State.page = findNewCavern(Mine.VOLCANO);
      }
    },
  },
];
