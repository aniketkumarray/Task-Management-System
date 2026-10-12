"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_KEY as KEY } from "@/lib/theme-script";

export type ThemePref = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const listeners = new Set<() => void>();
const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref: ThemePref): Resolved {
  return pref === "system" ? (systemQuery().matches ? "dark" : "light") : pref;
}

function apply() {
  const r = resolve(readPref());
  const el = document.documentElement;
  el.classList.toggle("dark", r === "dark");
  el.style.colorScheme = r;
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {}
  apply();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = systemQuery();
  const onSystem = () => {
    apply();
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onSystem(); // another tab changed the theme
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  const p = readPref();
  return `${p}:${resolve(p)}`;
};
const getServerSnapshot = () => "";

export function useTheme(): { pref: ThemePref | null; resolved: Resolved | null } {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!snap) return { pref: null, resolved: null };
  const [pref, resolved] = snap.split(":") as [ThemePref, Resolved];
  return { pref, resolved };
}

/** One-click light ⇄ dark switch. Icon is chosen by CSS so it is correct on first paint. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setThemePref(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      className={cn("btn-ghost btn-sm", className)}
      aria-label="Toggle dark mode"
      aria-pressed={resolved ? resolved === "dark" : undefined}
      title="Switch light / dark mode"
    >
      <Moon size={15} className="dark:hidden" />
      <Sun size={15} className="hidden dark:block" />
    </button>
  );
}

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System picker (Profile page). */
export function ThemeSelect() {
  const { pref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-gray-300 bg-surface p-1">
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setThemePref(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            <o.icon size={14} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}
