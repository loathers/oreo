import { abort, Item, mallPrice } from "kolmafia";

import { parsePrice } from "./args.js";

export function resolvePrice(value: string, item: Item): number {
  const setting = parsePrice(value);
  if (setting === null) abort(`Invalid value "${value}" for ${item}. Use a number or "mall".`);
  if (setting !== "mall") return setting;
  const price = mallPrice(item);
  if (price <= 0) abort(`Could not determine a Mall price for ${item}.`);
  return price;
}
