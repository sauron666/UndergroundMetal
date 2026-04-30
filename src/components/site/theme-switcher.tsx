"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

/**
 * Toggle the .light class on <html>. The default theme is dark; toggling
 * persists the override via cookie + localStorage so the next request renders
 * server-side without a flash. The cookie is read by the root layout (set by
 * a separate small init script in <head>) — we apply the class directly here
 * for the immediate client paint.
 */
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("um.theme") as Theme | null) ?? null;
    const initial = stored ?? "dark";
    apply(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    try {
      localStorage.setItem("um.theme", next);
      // Mirror to cookie for SSR future use
      document.cookie = `um.theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      // ignore quota / privacy mode
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="inline-flex items-center justify-center h-9 w-9 hover:bg-secondary rounded-sm transition-colors"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}

function apply(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") html.classList.add("light");
  else html.classList.remove("light");
}
