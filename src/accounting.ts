export function calculateMiningValue<T>(
  collected: Iterable<readonly [T, number]>,
  used: Iterable<readonly [T, number]>,
  values: ReadonlyMap<T, number>,
  costs: ReadonlyMap<T, number>,
  turns: number,
) {
  const total = (entries: Iterable<readonly [T, number]>, prices: ReadonlyMap<T, number>) => {
    let value = 0;
    for (const [item, quantity] of entries) value += (prices.get(item) ?? 0) * quantity;
    return value;
  };
  const grossValue = total(collected, values);
  const consumableCost = total(used, costs);
  const netValue = grossValue - consumableCost;
  return {
    grossValue,
    consumableCost,
    netValue,
    valuePerAdventure: turns > 0 ? netValue / turns : null,
  };
}
