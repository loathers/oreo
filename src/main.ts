import {
  canAdventure,
  elementalResistance,
  equip,
  extractItems,
  haveEffect,
  haveEquipped,
  inebrietyLimit,
  isDarkMode,
  isWearingOutfit,
  maximize,
  myAdventures,
  myHp,
  myInebriety,
  numericModifier,
  print,
  restoreHp,
  retrieveItem,
  totalTurnsPlayed,
  use,
  visitUrl,
} from "kolmafia";
import { $effect, $element, $item, $location, $modifier, Session, tuple } from "libram";

export function printHighlight(message: string): void {
  const color = isDarkMode() ? "yellow" : "blue";
  print(message, color);
}

export function printError(message: string): void {
  const color = "red";
  print(message, color);
}

function hasObjectDetection(): boolean {
  return haveEffect($effect`Object Detection`) !== 0 || isWearingOutfit("Dwarvish War Uniform");
}

function minimumHpRequired() {
  return (1 - (elementalResistance($element`hot`) / 100)) * 75;
}

function prepareMiningDrill(): boolean {
  if (haveEquipped($item`high-temperature mining drill`)) {
    return true;
  }

  if (retrieveItem($item`high-temperature mining drill`)) {
    return equip($item`high-temperature mining drill`);
  }

  if (!retrieveItem($item`heat-resistant sheet metal`)) {
    printError("Need more heat-resistant sheet metal.");
    return false;
  }

  if (!retrieveItem($item`broken high-temperature mining drill`)) {
    printError("Need a broken high-temperature mining drill.");
    return false;
  }

  use(1, $item`broken high-temperature mining drill`);

  if (!equip($item`high-temperature mining drill`)) {
    printError("drill cannot be equipped.");
    return false;
  }

  return true;
}

function canMine(survive: boolean): boolean {
  if (!canAdventure($location`The Velvet / Gold Mine (Mining)`)) {
    printError("You can't even go there. What are you doing?");
    return false;
  }

  if (myInebriety() > inebrietyLimit()) {
    printError("You're too drunk to mine.");
    return false;
  }

  if (myAdventures() === 0) {
    printError("No adventures.");
    return false;
  }

  const minHp = minimumHpRequired();
  if (survive && myHp() < minHp) {
    printError(`Insufficient hp. You need at least ${minHp} hp to mine safely.`);
    const hpRestore = 2 * minHp + myHp();
    print(`Attempting to restore hp to ${hpRestore}`, "gray");
    if (!restoreHp(hpRestore)) {
      printError("Unable to restore!");
      return false;
    }
  }

  if (myHp() === 0) {
    printError("Insufficient hp. You need at least 1 hp to mine.");
    return false;
  }

  if (!prepareMiningDrill()) {
    return false;
  }

  if (numericModifier($modifier`Hot Resistance`) < 15) {
    maximize(`${(survive || myHp() >= 75) ? "Hot Resistance": "15Hot Resistance, hp regen"} -1weapon -1offhand -1familiar`, false);
    if (numericModifier($modifier`Hot Resistance`) < 15) {
      printError(`More hot resistance needed (you have ${numericModifier($modifier`Hot Resistance`)}, you need 15).`);
      return false;
    }
  }

  if (hasObjectDetection()) {
    printError(
      "Object detection is not currently supported by this script.",
    );
    return false;
  }

  return true;
}

function getCavernInfo(page: string) {
  const sparkle = page.match(/Promising Chunk of Wall \((\d),([56])\)/);

  return {
    mined: /Open Cavern \(\d,6\)/.test(page),
    target: sparkle ? tuple(Number(sparkle[1]), Number(sparkle[2])) : null,
  };
}

function findNewCavern() {
  print("Resetting mine.", "gray");
  return visitUrl(`mining.php?mine=6&reset=1&pwd`, true);
}

function mineAtSpot(col: number, row: number) {
  print(`Mining at square (${col}, ${row})`, "gray");
  const page = visitUrl(`mining.php?mine=6&which=${col + 8 * row}&pwd`, true);

  if (![...Object.keys(extractItems(page))].includes($item`1,970 carat gold`.name)) {
    return page;
  }

  print("Found gold, moving to next cavern", "blue");
  return findNewCavern();
}

function miningTurn(page: string, survive: boolean) {
  if (!canMine(survive)) return null;

  const { mined, target } = getCavernInfo(page);

  // If we have a specific sparkly target, mine it
  if (target) {
    print(`Sparkly found at (${target[0]}, ${target[1]}).`, "gray");
    return mineAtSpot(target[0], target[1]);
  }

  // If we haven't mined at all yet, try a random spot in the front row
  // @TODO support object detection and pick the good spot
  if (!mined) {
    print("Trying a spot.", "gray");
    return mineAtSpot(2 + Math.floor(Math.random() * 4), 6);
  }

  // Otherwise move on
  print("No more sparklies here.", "gray");
  return findNewCavern();
}

export default function main(turns: number, survive = false) {
  if (!canMine(survive)) return;

  const session = Session.current();

  let page: string | null = visitUrl("mining.php?mine=6");
  while (page !== null && (totalTurnsPlayed() - session.totalTurns) < turns) {
    page = miningTurn(page, survive);
  }

  if (page === null) {
    printError("Something went wrong! Check the output above to see what.");
  }

  const diff = Session.current().diff(session);
  printHighlight(`oreo has run ${diff.totalTurns} turns, and produced the following items:`);
  for (const [item, quantity] of diff.items) {
    printHighlight(` ${item}: ${quantity}`);
  }
}
