import { itemAmount, use } from "kolmafia";
import { $effect, $item, ensureEffect, get, have } from "libram";

import { args } from "./args.js";
import { Task } from "./engine.js";
import * as Mining from "./mining.js";
import { Mine } from "./mining.js";
import { resolvePrice } from "./pricing.js";
import { type Decision, type ResourceType, StrategyController } from "./strategy.js";
import { assureHotResistance, explain, mineCoordinate, prepareToMine } from "./utils.js";

const gold = $item`1,970 carat gold`;
const velvet = $item`unsmoothed velvet`;
const crystal = $item`New Age healing crystal`;
const dynamite = $item`minin' dynamite`;

function minedResource(before: Record<ResourceType, number>): ResourceType | null {
  if (itemAmount(gold) > before.gold) return "gold";
  if (itemAmount(velvet) > before.ore) return "ore";
  if (itemAmount(crystal) > before.crystal) return "crystal";
  return null;
}

export function buildMiningTasks(controller: StrategyController): Task[] {
  const dynamitePrice = resolvePrice(args.dynamitePrice, dynamite);
  controller.setDynamitePrice(dynamitePrice);
  const miningOutfit = {
    equip: [$item`high-temperature mining drill`, $item`hippy medical kit`],
    modifier: "Hot Resistance",
  };
  let pendingDecision: Decision | null = null;

  const selectDecision = () => {
    controller.update(
      Mining.getState(Mine.VOLCANO),
      Mining.hasObjectDetection(Mine.VOLCANO),
    );
    pendingDecision = controller.decide();
    return pendingDecision;
  };

  const resetCavern = () => {
    if (pendingDecision) explain(pendingDecision.reason);
    Mining.findNewCavern(Mine.VOLCANO);
    controller.reset();
    pendingDecision = null;
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
      name: "Move to a new cavern having struck gold in this cavern",
      after: ["Acquire mining drill", "Acquire hippy medical kit"],
      noCombat: true,
      outfit: miningOutfit,
      ready: () =>
        controller.shouldResetAfterGold() && get("mineLayout6").includes("goldnugget"),
      prepare: () => assureHotResistance(),
      do: () => {
        explain("Resetting after finding gold.");
        pendingDecision = null;
        resetCavern();
      },
      completed: () => false,
    },
    {
      name: "Maintain Object Detection",
      after: ["Acquire mining drill"],
      noCombat: true,
      ready: () =>
        args.visibility === "high" && !Mining.hasObjectDetection(Mine.VOLCANO),
      do: () => ensureEffect($effect`Object Detection`),
      completed: () => false,
    },
    {
      name: "Move to a new cavern when the strategy has no worthwhile target",
      after: ["Acquire mining drill", "Acquire hippy medical kit"],
      noCombat: true,
      outfit: miningOutfit,
      ready: () => selectDecision().action === "reset",
      prepare: () => assureHotResistance(),
      do: () => resetCavern(),
      completed: () => false,
    },
    {
      name: "Mine the strategy's selected coordinate",
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
      ready: () => selectDecision().action === "mine",
      prepare: () => prepareToMine(),
      do: () => {
        const decision = pendingDecision;
        if (!decision || decision.action !== "mine") {
          throw new Error("Mining task ran without a selected coordinate.");
        }
        explain(decision.reason);

        const before = {
          ore: itemAmount(velvet),
          gold: itemAmount(gold),
          crystal: itemAmount(crystal),
          cave: 0,
        };
        mineCoordinate(decision.coordinate);
        controller.recordMine(decision.coordinate, minedResource(before));
        pendingDecision = null;
      },
      completed: () => false,
    },
  ];
}
