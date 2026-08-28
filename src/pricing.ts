import { abort, getProperty, Item, mallPrice, toItem } from "kolmafia";

import { parsePrice } from "./args.js";
import { detectionPotionId } from "./bang-potion.js";

export function resolvePrice(value: string, item: Item): number {
  const setting = parsePrice(value);
  if (setting === null) abort(`Invalid value "${value}" for ${item}. Use a number or "mall".`);
  if (setting !== "mall") return setting;
  const price = mallPrice(item);
  if (price <= 0) abort(`Could not determine a Mall price for ${item}.`);
  return price;
}

export function objectDetectionPotion(): Item {
  const itemId = detectionPotionId(getProperty);
  if (itemId === null) abort("Identify the potion of detection before using high visibility.");
  return toItem(itemId);
}

export function resolveObjectDetectionPrice(value: string): number {
  const setting = parsePrice(value);
  if (setting === null) {
    abort(`Invalid objectDetectionPrice "${value}". Use a number or "mall".`);
  }
  return setting === "mall" ? resolvePrice(value, objectDetectionPotion()) : setting;
}
