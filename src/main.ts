import { Args, getTasks, Quest } from "grimoire-kolmafia";
import {
  canAdventure,
  inebrietyLimit,
  myAdventures,
  myInebriety,
  totalTurnsPlayed,
} from "kolmafia";
import { $location, sinceKolmafiaRevision } from "libram";

import { args } from "./args";
import { MiningEngine, Task } from "./engine";
import { countFreeMines, Mine, visit } from "./mining";
import { MINING_TASKS } from "./tasks";

export default function main(argstring = "") {
  sinceKolmafiaRevision(28420);

  Args.fill(args, argstring);

  if (args.help) {
    Args.showHelp(args);
    return;
  }

  const stopAtTurn = totalTurnsPlayed() + args.turns;

  // Make sure the mine state is up to date
  visit(Mine.VOLCANO);

  const quest: Quest<Task> = {
    name: "Oreo",
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
