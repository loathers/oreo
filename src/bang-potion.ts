export function detectionPotionId(getPreference: (name: string) => string): number | null {
  for (let itemId = 819; itemId <= 827; itemId++) {
    if (getPreference(`lastBangPotion${itemId}`) === "detection") return itemId;
  }
  return null;
}
