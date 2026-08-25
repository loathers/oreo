import { haveEffect, isWearingOutfit, myBuffedstat, visitUrl } from "kolmafia";
import {
  $effect,
  $element,
  $skill,
  $stat,
  chunk,
  damageTakenByElement,
  extractItems,
  get,
  have,
} from "libram";

/**
 * Mines in the Kingdom of Loathing
 */
export const enum Mine {
  /** Inside of Itznotyerzitz Mine */
  ITZNOTYERZITZ = 1,
  /** Deep Inside the Knob Shaft */
  KNOB = 2,
  /** Anemone Mine */
  ANEMONE = 3,
  /** The Gummi Mine (Retired, Crimbo 2011) */
  GUMMI = 4,
  /** Crimbonium Mine (Retired, Crimbo 2014) */
  CRIMBONIUM = 5,
  /** The Velvet / Gold Mine */
  VOLCANO = 6,
}

/**
 * Coordinate system that the Kingdom of Loathing uses for mining.
 * The first row, first column and last column are all unbreakable.
 */
export type MiningCoordinate = [column: number, row: number];

/**
 * @param mine Which mine
 * @returns Whether twinkly squares will be visible even when when not accessible
 */
export function hasObjectDetection(mine = 1): boolean {
  if (mine === Mine.CRIMBONIUM && have($effect`Crimbonar`)) return true;
  return haveEffect($effect`Object Detection`) !== 0 || isWearingOutfit("Dwarvish War Uniform");
}

/**
 * @param mine Which mine
 * @returns The maximum damage the current player can expect to take from a cave-in
 */
export function caveInCost(mine: Mine) {
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

/**
 * Visit a new cavern if possible
 *
 * @param mine Which mine
 * @returns Page contents
 */
export function findNewCavern(mine: Mine) {
  return visitUrl(`mining.php?mine=${mine}&reset=1&pwd`, true);
}

/**
 * @param mine Which mine
 * @param coords Coordinates at which to mine (using the in-game coordinate system)
 * @returns Items acquired from mining that coordinate, if any.
 */
export function mineCoordinate(mine: Mine, [col, row]: MiningCoordinate) {
  const page = visitUrl(`mining.php?mine=${mine}&which=${col + 8 * row}&pwd`, true);
  return extractItems(page);
}

/**
 * Visit a mine
 *
 * @param mine Which mine
 * @returns Page contents
 */
export function visit(mine: Mine) {
  return visitUrl(`mining.php?mine=${mine}`);
}

/**
 * @param mine Which mine
 * @returns The state for the given mine
 */
export function getState(mine: Mine) {
  return get(`mineState${mine}`, "");
}

export function getAsMatrix(mine: Mine) {
  return chunk(getState(mine).split(""), 6);
}

/**
 * @returns Number of unconditionally free mines (minin' dynamite is not counted as it only works with non-sparkly spots)
 */
export function countFreeMines() {
  return (
    (have($skill`Unaccompanied Miner`) ? 5 - get("_unaccompaniedMinerUsed") : 0) +
    haveEffect($effect`Loded`)
  );
}
