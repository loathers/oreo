import { Task as BaseTask, CombatResources, CombatStrategy, Engine } from "grimoire-kolmafia";
import { type Item, myMeat } from "kolmafia";
import { Session } from "libram";

import { calculateMiningValue } from "./accounting.js";
import { printHighlight } from "./utils.js";

export interface Task extends BaseTask {
  /** No combats can take place here */
  noCombat: boolean;
}

export type MiningAccounting = {
  values: Map<Item, number>;
  costs: Map<Item, number>;
  used: Map<Item, number>;
  actualMeatSpent: number;
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
      ([item, quantity]) => quantity > 0 && this.accounting.values.has(item),
    );
    const expectedInputs = new Map(this.accounting.used);
    for (const [item, quantity] of diff.items) {
      if (quantity > 0 && this.accounting.costs.has(item)) {
        expectedInputs.set(item, (expectedInputs.get(item) ?? 0) + quantity);
      }
    }
    printHighlight(`oreo has run ${diff.totalTurns} turns.`);
    printHighlight("Items collected:");
    for (const [item, quantity] of collected) {
      const value = (this.accounting.values.get(item) ?? 0) * quantity;
      printHighlight(` ${item}: ${quantity}${value > 0 ? ` (${value} Meat)` : ""}`);
    }
    if (collected.length === 0) printHighlight(" none");

    printHighlight("Items used:");
    for (const [item, quantity] of this.accounting.used) {
      const cost = (this.accounting.costs.get(item) ?? 0) * quantity;
      printHighlight(` ${item}: ${quantity} (${cost} Meat)`);
    }
    if (this.accounting.used.size === 0) printHighlight(" none");

    const summary = calculateMiningValue(
      collected,
      expectedInputs,
      this.accounting.values,
      this.accounting.costs,
      diff.totalTurns,
      this.accounting.actualMeatSpent,
    );
    printHighlight(`Gross collected value: ${summary.grossValue} Meat`);
    printHighlight(`Expected item cost: ${summary.expectedCost} Meat`);
    printHighlight(`Actual Meat spent on purchases: ${summary.actualMeatSpent} Meat`);
    printHighlight(`Total value achieved: ${summary.netValue} Meat`);
    printHighlight(
      summary.valuePerAdventure !== null
        ? `Session value: ${summary.valuePerAdventure.toFixed(1)} Meat/Adventure`
        : "Session value: N/A (no adventures spent)",
    );
  }

  execute(task: Task): void {
    const meatBefore = myMeat();
    try {
      super.execute(task);
    } finally {
      this.accounting.actualMeatSpent += Math.max(0, meatBefore - myMeat());
    }
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
