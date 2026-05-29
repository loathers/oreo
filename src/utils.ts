import { abort, isDarkMode, myHp, numericModifier, print, printHtml } from "kolmafia";
import { $modifier } from "libram";

import { args } from "./args.js";
import * as Mining from "./mining.js";
import { Mine, type MiningCoordinate } from "./mining.js";

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

export function assureHpRegen() {
  if (myHp() > 0) return;
  if (numericModifier($modifier`HP Regen Min`) < 1) {
    abort(
      "Couldn't equip any HP regen - pick up a hippy medical kit (or any other HP-regen source) and try again.",
    );
  }
  abort("You must have at least 1HP to mine.");
}

// Require at least 1 HP Regen Min from any source (passive skill, effect, or equipment) and cap its scoring at 1 so the maximizer doesn't trade away Hot Resistance to chase more.
export const MINING_MODIFIER = "Hot Resistance, HP Regen Min 1 min, HP Regen Min 1 max";

export function prepareToMine() {
  assureHotResistance();
  assureHpRegen();
}

export function mineCoordinate(coords: MiningCoordinate) {
  explain(
    `\n${Mining.getAsMatrix(Mine.VOLCANO)
      .map((row) => row.join(""))
      .join("\n")}\nPicked (${coords.join(",")})`,
  );

  Mining.mineCoordinate(Mine.VOLCANO, coords);
}

export function getAccessibleSparkles() {
  return Mining.getAccessibleSparkles(Mine.VOLCANO).filter(([, y]) => [5, 6].includes(y));
}

export function findStartOfLongestVein(layout: string) {
  return (
    Array(layout.length)
      .fill(0)
      .map((_, i) => i)
      .filter((i) => layout[i] === "*")
      .map((i) => ({ i, size: layout.slice(i).match(/^(\*+)/)?.[1].length ?? 0 }))
      .sort((a, b) => b.size - a.size)[0]?.i ?? -1
  );
}
