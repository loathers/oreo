import { itemAmount, use } from "kolmafia";
import { $item, get, have } from "libram";

import { args } from "./args.js";
import { Task } from "./engine.js";
import * as Mining from "./mining.js";
import { Mine } from "./mining.js";
import { resolvePrice } from "./pricing.js";
import { ResourceType, StrategyController } from "./strategy.js";
import { assureHotResistance, explain, mineCoordinate, prepareToMine } from "./utils.js";

const gold = $item`1,970 carat gold`;
const velvet = $item`unsmoothed velvet`;
const crystal = $item`New Age healing crystal`;
const detectionPotion = $item`potion of detection`;
const dynamite = $item`minin' dynamite`;

function minedResource(before: Record<ResourceType, number>): ResourceType | null {
  if (itemAmount(gold) > before.gold) return "gold";
  if (itemAmount(velvet) > before.ore) return "ore";
  if (itemAmount(crystal) > before.crystal) return "crystal";
  return null;
}

export function buildMiningTasks(controller: StrategyController): Task[] {
  const objectDetectionPrice =
    args.visibility === "high" ? resolvePrice(args.objectDetectionPrice, detectionPotion) : 0;
  const dynamitePrice = resolvePrice(args.dynamitePrice, dynamite);
  controller.setDynamitePrice(dynamitePrice);
  const miningOutfit = {
    equip: [$item`high-temperature mining drill`, $item`hippy medical kit`],
    modifier: "Hot Resistance",
  };

  return [
    {
      name: "Acquire mining drill",
      noCombat: true,
      limit: { tries: 1 },
      acquire: [
        { item: $item`heat-resistant sheet metal` },
        { item: $item`broken high-temperature mining drill` },
      ],
      do: () => use(1, $item`broken high-temperature mining drill`),
      completed: () => have($item`high-temperature mining drill`),
    },
    {
      name: "Acquire hippy medical kit",
      noCombat: true,
      limit: { tries: 1 },
      acquire: [{ item: $item`hippy medical kit` }],
      do: () => {},
      completed: () => have($item`hippy medical kit`),
    },
    {
      name: "Maintain Object Detection",
      after: ["Acquire mining drill"],
      noCombat: true,
      ready: () =>
        args.visibility === "high" && !Mining.hasObjectDetection(Mine.VOLCANO),
      acquire: [{ item: detectionPotion, price: objectDetectionPrice }],
      do: () => use(1, detectionPotion),
      completed: () => false,
    },
    {
      name: "Choose and execute mining move",
      after: ["Acquire mining drill", "Acquire hippy medical kit"],
      noCombat: true,
      outfit: () => ({
        ...miningOutfit,
        equip: [
          ...miningOutfit.equip,
          ...(have($item`Xiblaxian holo-wrist-puter`) && !get("_holoWristCrystal")
            ? [$item`Xiblaxian holo-wrist-puter`]
            : []),
        ],
      }),
      acquire: controller.shouldUseDynamite()
        ? [{ item: dynamite, price: dynamitePrice, optional: true }]
        : [],
      ready: () => true,
      prepare: () => prepareToMine(),
      do: () => {
        if (get("mineLayout6").includes("goldnugget") && controller.shouldResetAfterGold()) {
          explain("Resetting after finding gold.");
          Mining.findNewCavern(Mine.VOLCANO);
          controller.reset();
          return;
        }

        controller.update(
          Mining.getState(Mine.VOLCANO),
          Mining.hasObjectDetection(Mine.VOLCANO),
        );
        const decision = controller.decide();
        explain(decision.reason);
        if (decision.action === "reset") {
          Mining.findNewCavern(Mine.VOLCANO);
          controller.reset();
          return;
        }

        const before = {
          ore: itemAmount(velvet),
          gold: itemAmount(gold),
          crystal: itemAmount(crystal),
          cave: 0,
        };
        mineCoordinate(decision.coordinate);
        controller.recordMine(decision.coordinate, minedResource(before));
      },
      completed: () => false,
    },
  ];
}
