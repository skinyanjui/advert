export const themeStorageKey = "africa-classifieds-theme"

export const themeChoices = ["light", "dark", "system"] as const

export type ThemeChoice = (typeof themeChoices)[number]

export function isThemeChoice(value: string | null | undefined): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system"
}

export function themeLabel(choice: ThemeChoice): string {
  switch (choice) {
    case "light":
      return "Light"
    case "dark":
      return "Dark"
    case "system":
      return "System"
    default: {
      const unreachable: never = choice
      return unreachable
    }
  }
}

/** Runs before paint so a saved dark theme does not flash white. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`
