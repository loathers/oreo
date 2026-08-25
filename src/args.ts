import { Args } from "grimoire-kolmafia";

export const args = Args.create(
  "goldmine",
  "Selectable strategies for the Velvet / Gold Mine",
  {
    turns: Args.number({
      help: "The number of turns to spend mining",
      default: Infinity,
    }),
    survive: Args.boolean({
      help: "Whether to avoid hitting zero HP while mining",
      default: false,
    }),
    explain: Args.boolean({
      help: "Whether to print explanations for decisions",
      default: false,
    }),
    useMiningOutfit: Args.boolean({
      help: "Whether to equip the mining drill, medical kit, and optional wrist-puter",
      default: true,
    }),
    strategy: Args.string({
      help: "Mining strategy: pjb, oreo, ev, or ev-cluster",
      default: "ev-cluster",
    }),
    visibility: Args.string({
      help: "Visibility mode: low, auto, or high (high maintains Object Detection)",
      default: "auto",
    }),
    lambda: Args.number({
      help: "EV opportunity cost per turn; 0 uses the calibrated strategy default",
      default: 0,
    }),
    objectDetectionPrice: Args.string({
      help: 'Potion of detection price, or "mall" to query the identified potion',
      default: "mall",
    }),
    dynamitePrice: Args.string({
      help: 'Minin\' dynamite price, or "mall" to query the current Mall price',
      default: "mall",
    }),
    oreValue: Args.string({
      help: 'Unsmoothed velvet value, or "mall" to query the current Mall price',
      default: "25",
    }),
    goldValue: Args.string({
      help: '1,970 carat gold value, or "mall" to query the current Mall price',
      default: "20000",
    }),
    crystalValue: Args.string({
      help: 'New Age healing crystal value, or "mall" to query the current Mall price',
      default: "69",
    }),
    calibrationMin: Args.number({
      help: "Minimum lambda for `goldmine calibrate`",
      default: 500,
    }),
    calibrationMax: Args.number({
      help: "Maximum lambda for `goldmine calibrate`",
      default: 9000,
    }),
    calibrationStep: Args.number({
      help: "Coarse lambda step for `goldmine calibrate`",
      default: 500,
    }),
    calibrationFineSteps: Args.number({
      help: "Fine points between the neighboring coarse lambdas",
      default: 6,
    }),
    calibrationBoards: Args.number({
      help: "Number of deterministic synthetic mines to calibrate against",
      default: 1000,
    }),
    calibrationSeed: Args.number({
      help: "Synthetic calibration board seed",
      default: 12345,
    }),
    calibrationSecondGoldChance: Args.number({
      help: "Probability that a generated mine contains a second gold",
      default: 0.496,
    }),
  },
  {
    positionalArgs: ["turns"],
  },
);

export function parsePrice(value: string): number | "mall" | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "mall") return "mall";
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
