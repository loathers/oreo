import { abort, isDarkMode, numericModifier, print, printHtml } from "kolmafia";
import { $modifier } from "libram";

import { args } from "./args";
import * as Mining from "./mining";
import { Mine, type MiningCoordinate } from "./mining";

export function printHighlight(message: string): void {
  const color = isDarkMode() ? "yellow" : "blue";
  print(message, color);
}

export function printError(message: string): void {
  print(message, "red");
}

export function printExplanation(message: string): void {
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

export function mineCoordinate(coords: MiningCoordinate) {
  printExplanation(
    `\n${Mining.getAsMatrix(Mine.VOLCANO)
      .map((row) => row.join(""))
      .join("\n")}\nPicked (${coords.join(",")})`,
  );

  Mining.mineCoordinate(Mine.VOLCANO, coords);
}

export function getAccessibleSparkles() {
  return Mining.getAccessibleSparkles(Mine.VOLCANO).filter(([, y]) => [5, 6].includes(y));
}
