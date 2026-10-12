/** localStorage key holding "light" | "dark" (absent = follow the system). */
export const THEME_KEY = "theme";

/** Inlined in <head> so the right theme is applied before first paint (no light flash). */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light";}catch(_){}})();`;
