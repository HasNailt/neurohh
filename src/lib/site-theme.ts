export const THEME_KEY = "adoptai-theme";

export const themeBoot = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.classList.add("light")}catch(e){}})();`;

function emit() {
  window.dispatchEvent(new Event("adoptai-theme"));
}

export function siteThemeSnapshot(): "light" | "dark" {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function subscribeSiteTheme(onChange: () => void) {
  window.addEventListener("adoptai-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("adoptai-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function toggleSiteTheme() {
  const next = !document.documentElement.classList.contains("light");
  document.documentElement.classList.toggle("light", next);
  try {
    localStorage.setItem(THEME_KEY, next ? "light" : "dark");
  } catch {
    /* private mode */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#eceae6" : "#131211");
  emit();
}
