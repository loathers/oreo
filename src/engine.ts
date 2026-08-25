import { Task as BaseTask, CombatResources, CombatStrategy, Engine } from "grimoire-kolmafia";
import { type Item } from "kolmafia";
import { Session } from "libram";

import { printHighlight } from "./utils.js";

export interface Task extends BaseTask {
  /** No combats can take place here */
  noCombat: boolean;
}

export type MiningAccounting = {
  values: Map<Item, number>;
  costs: Map<Item, number>;
  used: Map<Item, number>;
};

export function recordItemUse(accounting: MiningAccounting, item: Item, quantity = 1): void {
  accounting.used.set(item, (accounting.used.get(item) ?? 0) + quantity);
}

export class MiningEngine extends Engine<never, Task> {
  session: Session;
  accounting: MiningAccounting;

  static defaultSettings = {
    ...Engine.defaultSettings,
    logPreferenceChangeFilter: `${Engine.defaultSettings.logPreferenceChangeFilter},mineLayout6,mineState6,lastAdventure`,
  };

  constructor(tasks: Task[], accounting: MiningAccounting) {
    super(tasks);
    this.session = Session.current();
    this.accounting = accounting;
  }

  destruct() {
    super.destruct();

    const diff = Session.current().diff(this.session);
    const collected = [...diff.items].filter(
      ([item, quantity]) => quantity > 0 && !this.accounting.costs.has(item),
    );
    let grossValue = 0;
    printHighlight(`goldmine has run ${diff.totalTurns} turns.`);
    printHighlight("Items collected:");
    for (const [item, quantity] of collected) {
      const value = (this.accounting.values.get(item) ?? 0) * quantity;
      grossValue += value;
      printHighlight(` ${item}: ${quantity}${value > 0 ? ` (${value} Meat)` : ""}`);
    }
    if (collected.length === 0) printHighlight(" none");

    let consumableCost = 0;
    printHighlight("Items used:");
    for (const [item, quantity] of this.accounting.used) {
      const cost = (this.accounting.costs.get(item) ?? 0) * quantity;
      consumableCost += cost;
      printHighlight(` ${item}: ${quantity} (${cost} Meat)`);
    }
    if (this.accounting.used.size === 0) printHighlight(" none");

    printHighlight(`Gross collected value: ${grossValue} Meat`);
    printHighlight(`Consumable cost: ${consumableCost} Meat`);
    const netValue = grossValue - consumableCost;
    printHighlight(`Total value achieved: ${netValue} Meat`);
    printHighlight(
      diff.totalTurns > 0
        ? `Session value: ${(netValue / diff.totalTurns).toFixed(1)} Meat/Adventure`
        : "Session value: N/A (no adventures spent)",
    );
  }

  setCombat(
    task: Task,
    taskCombat: CombatStrategy<never>,
    taskResources: CombatResources<never>,
  ): void {
    // If no combats can take place here, don't bother with CCS or autoattack
    if (task.noCombat) return;
    super.setCombat(task, taskCombat, taskResources);
  }
}
