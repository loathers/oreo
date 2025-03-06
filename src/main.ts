import { Args, getTasks, Quest, Task } from "grimoire-kolmafia";
import {
  abort,
  canAdventure,
  inebrietyLimit,
  myAdventures,
  myInebriety,
  totalTurnsPlayed,
} from "kolmafia";
import { $location } from "libram";

import { args } from "./args";
import { MiningEngine } from "./engine";
import { countFreeMines, hasObjectDetection, Mine, visit } from "./mining";
import { MINING_TASKS } from "./tasks";
import { State } from "./utils";

export default function main(argstring = "") {
  Args.fill(args, argstring);

  if (args.help) {
    Args.showHelp(args);
    return;
  }

  if (hasObjectDetection()) {
    abort("Object detection is not currently supported by this script.");
  }

  const stopAtTurn = totalTurnsPlayed() + args.turns;

  State.page = visit(Mine.VOLCANO);

  const quest: Quest<Task> = {
    name: "Going ham at the Velvet / Gold Mine!",
    ready: () =>
      // Indicative of access to the 70s Volcano
      canAdventure($location`The SMOOCH Army HQ`) &&
      myInebriety() <= inebrietyLimit() &&
      myAdventures() > 0,
    completed: () => totalTurnsPlayed() >= stopAtTurn && countFreeMines() === 0,
    tasks: [...MINING_TASKS],
  };

  const engine = new MiningEngine(getTasks([quest]));

  try {
    engine.run();
  } finally {
    engine.destruct();
  }
}
