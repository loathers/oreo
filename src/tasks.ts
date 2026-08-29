import { abort, itemAmount, use } from "kolmafia";
import { $item, get, have, Mining } from "libram";

import { args } from "./args.js";
import { type MiningAccounting, recordItemUse, Task } from "./engine.js";
import { parseMineLayout } from "./mine-layout.js";
import { objectDetectionPotion, resolveObjectDetectionPrice, resolvePrice } from "./pricing.js";
import { type Decision, type ResourceType, StrategyController } from "./strategy.js";
import {
  assureHotResistance,
  explain,
  findNewCavern,
  mineCoordinate,
  prepareToMine,
  visitMine,
} from "./utils.js";

const gold = $item`1,970 carat gold`;
const velvet = $item`unsmoothed velvet`;
const crystal = $item`New Age healing crystal`;
const dynamite = $item`minin' dynamite`;
const sheetMetal = $item`heat-resistant sheet metal`;
const brokenDrill = $item`broken high-temperature mining drill`;
const miningDrill = $item`high-temperature mining drill`;
const medicalKit = $item`hippy medical kit`;

function minedResource(before: Record<ResourceType, number>): ResourceType | null {
  if (itemAmount(gold) > before.gold) return "gold";
  if (itemAmount(velvet) > before.ore) return "ore";
  if (itemAmount(crystal) > before.crystal) return "crystal";
  return null;
}

export function buildMiningTasks(
  controller: StrategyController,
  accounting: MiningAccounting,
): Task[] {
  const dynamitePrice = resolvePrice(args.dynamitePrice, dynamite);
  accounting.costs.set(dynamite, dynamitePrice);
  if (!have(miningDrill)) {
    accounting.costs.set(sheetMetal, resolvePrice("mall", sheetMetal));
    accounting.costs.set(brokenDrill, resolvePrice("mall", brokenDrill));
  }
  if (!have(medicalKit)) accounting.costs.set(medicalKit, resolvePrice("mall", medicalKit));
  const detectionPotion = args.visibility === "high" ? objectDetectionPotion() : null;
  if (detectionPotion) {
    accounting.costs.set(detectionPotion, resolveObjectDetectionPrice(args.objectDetectionPrice));
  }
  controller.setDynamitePrice(dynamitePrice);
  const miningOutfit = {
    equip: [miningDrill, medicalKit],
    modifier: "Hot Resistance",
  };
  const taskOutfit = args.useMiningOutfit ? miningOutfit : undefined;
  let pendingDecision: Decision | null = null;
  let mineVisited = false;

  const selectDecision = () => {
    if (pendingDecision) return pendingDecision;
    controller.setDynamiteAvailable(
      Math.max(itemAmount(dynamite), controller.shouldUseDynamite() ? 1 : 0),
    );
    controller.update(
      Mining.getState(Mining.Mine.VOLCANO),
      Mining.hasObjectDetection(Mining.Mine.VOLCANO),
      parseMineLayout(get("mineLayout6")),
    );
    pendingDecision = controller.decide();
    return pendingDecision;
  };

  const resetCavern = () => {
    if (pendingDecision) explain(pendingDecision.reason);
    findNewCavern();
    controller.reset();
    pendingDecision = null;
  };

  return [
    {
      name: "Acquire mining drill",
      noCombat: true,
      limit: { tries: 1 },
      acquire: [{ item: sheetMetal }, { item: brokenDrill }],
      do: () => {
        const drillBefore = itemAmount(miningDrill);
        use(1, brokenDrill);
        if (itemAmount(miningDrill) > drillBefore) {
          recordItemUse(accounting, sheetMetal);
          recordItemUse(accounting, brokenDrill);
        }
      },
      completed: () => have(miningDrill),
    },
    {
      name: "Acquire hippy medical kit",
      noCombat: true,
      limit: { tries: 1 },
      acquire: [{ item: medicalKit }],
      do: () => {},
      completed: () => have(medicalKit),
    },
    {
      name: "Visit the mine",
      after: ["Acquire mining drill", "Acquire hippy medical kit"],
      noCombat: true,
      outfit: taskOutfit,
      prepare: assureHotResistance,
      do: () => {
        visitMine();
        mineVisited = true;
      },
      completed: () => mineVisited,
    },
    {
      name: "Move to a new cavern having struck gold in this cavern",
      after: ["Visit the mine"],
      noCombat: true,
      outfit: taskOutfit,
      ready: () => controller.shouldResetAfterGold() && get("mineLayout6").includes("goldnugget"),
      prepare: assureHotResistance,
      do: () => {
        explain("Resetting after finding gold.");
        pendingDecision = null;
        resetCavern();
      },
      completed: () => false,
    },
    ...(detectionPotion
      ? [
          {
            name: "Maintain Object Detection",
            after: ["Visit the mine"],
            noCombat: true,
            outfit: taskOutfit,
            ready: () =>
              controller.needsObjectDetection() && !Mining.hasObjectDetection(Mining.Mine.VOLCANO),
            acquire: [{ item: detectionPotion, price: accounting.costs.get(detectionPotion) }],
            do: () => {
              use(1, detectionPotion);
              if (!Mining.hasObjectDetection(Mining.Mine.VOLCANO)) {
                abort(`Using ${detectionPotion} did not grant Object Detection.`);
              }
              recordItemUse(accounting, detectionPotion);
              visitMine();
            },
            completed: () => false,
          },
        ]
      : []),
    {
      name: "Move to a new cavern when the strategy has no worthwhile target",
      after: ["Visit the mine"],
      noCombat: true,
      outfit: taskOutfit,
      ready: () => selectDecision().action === "reset",
      prepare: assureHotResistance,
      do: resetCavern,
      completed: () => false,
    },
    {
      name: "Mine the strategy's selected coordinate",
      after: ["Visit the mine"],
      noCombat: true,
      outfit: args.useMiningOutfit
        ? () => ({
            ...miningOutfit,
            equip: [
              ...miningOutfit.equip,
              ...(have($item`Xiblaxian holo-wrist-puter`) && !get("_holoWristCrystal")
                ? [$item`Xiblaxian holo-wrist-puter`]
                : []),
            ],
          })
        : undefined,
      acquire: () =>
        controller.shouldUseDynamite() ? [{ item: dynamite, price: dynamitePrice }] : [],
      ready: () => selectDecision().action === "mine",
      prepare: prepareToMine,
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
        const dynamiteBefore = itemAmount(dynamite);
        mineCoordinate(decision.coordinate);
        const dynamiteUsed = dynamiteBefore - itemAmount(dynamite);
        if (dynamiteUsed > 0) recordItemUse(accounting, dynamite, dynamiteUsed);
        controller.recordMine(decision.coordinate, minedResource(before));
        pendingDecision = null;
      },
      completed: () => false,
    },
  ];
}
