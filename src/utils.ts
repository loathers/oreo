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
    [...Array(layout.length).fill(0)]
      .map((_, i) => i)
      .filter((i) => layout[i] === "*")
      .map((i) => ({ i, size: layout.slice(i).match(/^(\*+)/)?.[1].length ?? 0 }))
      .sort((a, b) => b.size - a.size)[0]?.i ?? -1
  );
}
