import {
  abort,
  equippedAmount,
  isDarkMode,
  myHp,
  numericModifier,
  print,
  printHtml,
  restoreHp,
} from "kolmafia";
import { $item, $modifier, Mining } from "libram";

import { args } from "./args.js";
import type { MiningCoordinate } from "./strategy.js";

export function printHighlight(message: string): void {
  const color = isDarkMode() ? "yellow" : "blue";
  print(message, color);
}

export function printError(message: string): void {
  print(message, "red");
}

export function explain(message: string): void {
  if (!args.explain) return;
  printHtml(`<pre color="green">[EXPLAIN] ${message}</pre>`);
}

export function assureHotResistance() {
  if (numericModifier($modifier`Hot Resistance`) < 15) {
    abort(
      `More hot resistance needed (you have ${numericModifier($modifier`Hot Resistance`)}, you need 15).`,
    );
  }
}

function assureDrill() {
  if (!args.useMiningOutfit && equippedAmount($item`high-temperature mining drill`) === 0) {
    abort("The current outfit must include a high-temperature mining drill.");
  }
}

function assureMineState() {
  if (Mining.getState(Mining.Mine.VOLCANO).length !== 36) {
    abort("Could not read the Velvet / Gold Mine.");
  }
}

export function visitMine() {
  assureDrill();
  Mining.visit(Mining.Mine.VOLCANO);
  assureMineState();
}

export function findNewCavern() {
  assureDrill();
  Mining.findNewCavern(Mining.Mine.VOLCANO);
  assureMineState();
}

export function prepareToMine() {
  assureDrill();
  assureHotResistance();

  const minHp = Mining.caveInCost(Mining.Mine.VOLCANO);
  if (args.survive && myHp() < minHp) {
    const hpRestore = 2 * minHp + myHp();
    if (!restoreHp(hpRestore)) abort("Could not restore enough HP to survive the cave-in.");
  }

  if (myHp() === 0) abort("You must have at least 1HP to mine.");
}

export function mineCoordinate(coords: MiningCoordinate) {
  explain(
    `\n${Mining.getAsMatrix(Mining.Mine.VOLCANO)
      .map((row) => row.join(""))
      .join("\n")}\nPicked (${coords.join(",")})`,
  );

  if (!Mining.isValidCoordinate(coords)) {
    throw new Error(`Invalid mining coordinate: ${coords.join(",")}`);
  }
  return Mining.mineCoordinate(Mining.Mine.VOLCANO, coords);
}
