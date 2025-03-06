import { haveEffect, isWearingOutfit, myBuffedstat, visitUrl } from "kolmafia";
import { $effect, $element, $skill, $stat, damageTakenByElement, get, have, tuple } from "libram";

export enum Mine {
  ITZNOTYERZITZ = 1,
  KNOB = 2,
  ANEMONE = 3,
  GUMMI = 4,
  CRIMBONIUM = 5,
  VOLCANO = 6,
}

export function hasObjectDetection(mine = 1): boolean {
  if (mine === Mine.CRIMBONIUM && have($effect`Crimbonar`)) return true;
  return haveEffect($effect`Object Detection`) !== 0 || isWearingOutfit("Dwarvish War Uniform");
}

export function caveInCost(mine: number) {
  switch (mine) {
    case Mine.ITZNOTYERZITZ:
    case Mine.GUMMI:
    case Mine.CRIMBONIUM:
      return myBuffedstat($stat`muscle`) * 1.5;
    case Mine.KNOB:
      return myBuffedstat($stat`muscle`) * 0.5;
    case Mine.ANEMONE:
      return myBuffedstat($stat`muscle`) * 2.5;
    case Mine.VOLCANO:
      return damageTakenByElement(75, $element`hot`);
    default:
      return 0;
  }
}

export function findSparklyCoordinates(page: string) {
  return [...page.matchAll(/Promising Chunk of Wall \((\d),(\d)\)/g)].map(([, x, y]) =>
    tuple(Number(x), Number(y)),
  );
}

export function getCavernInfo(page: string) {
  return {
    mined: /Open Cavern \(\d,6\)/.test(page),
    sparkles: findSparklyCoordinates(page),
  };
}

export function findNewCavern(mine: number) {
  return visitUrl(`mining.php?mine=${mine}&reset=1&pwd`, true);
}

export function mineAtSpot(mine: number, col: number, row: number) {
  return visitUrl(`mining.php?mine=${mine}&which=${col + 8 * row}&pwd`, true);
}

export function visit(mine: number) {
  return visitUrl(`mining.php?mine=${mine}`);
}

export function countFreeMines() {
  return (
    (have($skill`Unaccompanied Miner`) ? 5 - get("_unaccompaniedMinerUsed") : 0) +
    haveEffect($effect`Loded`)
  );
}
