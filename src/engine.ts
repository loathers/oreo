import { Engine, Task } from "grimoire-kolmafia";
import { Session } from "libram";

import { printHighlight } from "./utils";

export class MiningEngine extends Engine<never, Task> {
  session: Session;

  static defaultSettings = {
    ...Engine.defaultSettings,
    logPreferenceChangeFilter: `${Engine.defaultSettings.logPreferenceChangeFilter},mineLayout6,mineState6,lastAdventure`,
  };

  constructor(tasks: Task[]) {
    super(tasks);
    this.session = Session.current();
  }

  destruct() {
    super.destruct();

    const diff = Session.current().diff(this.session);
    printHighlight(`oreo has run ${diff.totalTurns} turns, and produced the following items:`);
    for (const [item, quantity] of diff.items) {
      printHighlight(` ${item}: ${quantity}`);
    }
  }
}
