import { isDarkMode, print } from "kolmafia";

export const State = {
  page: "",
};

export function printHighlight(message: string): void {
  const color = isDarkMode() ? "yellow" : "blue";
  print(message, color);
}

export function printError(message: string): void {
  const color = "red";
  print(message, color);
}
