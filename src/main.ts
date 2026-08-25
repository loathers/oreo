import { Args, getTasks, Quest } from "grimoire-kolmafia";
import {
  abort,
  canAdventure,
  inebrietyLimit,
  myAdventures,
  myInebriety,
  print,
  totalTurnsPlayed,
} from "kolmafia";
import { $item, $location, sinceKolmafiaRevision } from "libram";

import { args, parsePrice } from "./args.js";
import { calibrate } from "./calibrate.js";
import { MiningEngine, Task } from "./engine.js";
import { countFreeMines, Mine, visit } from "./mining.js";
import { resolvePrice } from "./pricing.js";
import {
  STRATEGIES,
  StrategyController,
  StrategyName,
  StrategyValues,
  VISIBILITIES,
  VisibilityMode,
} from "./strategy.js";
import { buildMiningTasks } from "./tasks.js";

export function main(argstring = "") {
  sinceKolmafiaRevision(28420);

  const [command, ...rest] = argstring.trim().split(/\s+/);
  const calibrating = command.toLowerCase() === "calibrate";
  Args.fill(args, calibrating ? rest.join(" ") : argstring);

  if (args.help) {
    Args.showHelp(args);
    return;
  }
  if (!STRATEGIES.includes(args.strategy as StrategyName)) {
    abort(`Unknown strategy "${args.strategy}". Choose: ${STRATEGIES.join(", ")}.`);
  }
  if (!VISIBILITIES.includes(args.visibility as VisibilityMode)) {
    abort(`Unknown visibility "${args.visibility}". Choose: ${VISIBILITIES.join(", ")}.`);
  }
  if (args.lambda < 0) abort("lambda must be zero (automatic) or positive.");
  if (parsePrice(args.objectDetectionPrice) === null) {
    abort('objectDetectionPrice must be non-negative or "mall".');
  }
  if (parsePrice(args.dynamitePrice) === null) {
    abort('dynamitePrice must be non-negative or "mall".');
  }
  for (const [name, value] of [
    ["oreValue", args.oreValue],
    ["goldValue", args.goldValue],
    ["crystalValue", args.crystalValue],
  ]) {
    if (parsePrice(value) === null) abort(`${name} must be non-negative or "mall".`);
  }

  const values: StrategyValues = {
    ore: resolvePrice(args.oreValue, $item`unsmoothed velvet`),
    gold: resolvePrice(args.goldValue, $item`1,970 carat gold`),
    crystal: resolvePrice(args.crystalValue, $item`New Age healing crystal`),
    cave: 0,
  };
  if (calibrating) {
    if (args.strategy !== "ev" && args.strategy !== "ev-cluster") {
      abort("Calibration is only available for the ev and ev-cluster strategies.");
    }
    if (args.calibrationMin < 0 ||
        args.calibrationMax <= args.calibrationMin ||
        args.calibrationStep <= 0 ||
        args.calibrationFineSteps < 0 ||
        !Number.isInteger(args.calibrationBoards) ||
        args.calibrationBoards <= 0 ||
        args.calibrationSecondGoldChance < 0 ||
        args.calibrationSecondGoldChance > 1) {
      abort(
        "Calibration requires 0 <= min < max, step > 0, fineSteps >= 0, " +
        "positive integer boards, and 0 <= P(2 gold) <= 1.",
      );
    }
    const result = calibrate({
      strategy: args.strategy,
      visibility: args.visibility as VisibilityMode,
      values,
      dynamitePrice: resolvePrice(args.dynamitePrice, $item`minin' dynamite`),
      objectDetectionPrice: args.visibility === "high"
        ? resolvePrice(args.objectDetectionPrice, $item`potion of detection`)
        : 0,
      min: args.calibrationMin,
      max: args.calibrationMax,
      step: args.calibrationStep,
      fineSteps: args.calibrationFineSteps,
      boardCount: args.calibrationBoards,
      seed: args.calibrationSeed,
      secondGoldChance: args.calibrationSecondGoldChance,
    });
    print(
      `Calibrated ${args.strategy}/${args.visibility} on ${result.sampleSize} synthetic mines: ` +
      `lambda=${result.lambda}, rate=${result.rate.toFixed(1)}`,
      "blue",
    );
    print(
      `Use: goldmine strategy=${args.strategy} visibility=${args.visibility} ` +
      `lambda=${result.lambda}`,
      "blue",
    );
    return;
  }

  const stopAtTurn = totalTurnsPlayed() + args.turns;

  // Make sure the mine state is up to date
  visit(Mine.VOLCANO);

  const quest: Quest<Task> = {
    name: "Goldmine",
    ready: () =>
      // Indicative of access to the 70s Volcano
      canAdventure($location`The SMOOCH Army HQ`) &&
      myInebriety() <= inebrietyLimit() &&
      (myAdventures() > 0 || countFreeMines() > 0),
    completed: () => totalTurnsPlayed() >= stopAtTurn && countFreeMines() === 0,
    tasks: buildMiningTasks(
      new StrategyController(
        args.strategy as StrategyName,
        args.visibility as VisibilityMode,
        args.lambda,
        values,
      ),
    ),
  };

  const engine = new MiningEngine(getTasks([quest]));

  try {
    engine.run();
  } finally {
    engine.destruct();
  }
}
