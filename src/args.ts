import { Args } from "grimoire-kolmafia";

export const args = Args.create(
  "oreo",
  "A 70's volcano mining script for you",
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
  },
  {
    positionalArgs: ["turns"],
  },
);
