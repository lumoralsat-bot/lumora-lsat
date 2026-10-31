// Readable type scale. Every small size is raised to a readable minimum and multiplied by the
// user's text-size setting (A+ / A-), which App.jsx publishes on each render.
export function setFontScale(s) { globalThis.__LUMORA_FONT_SCALE__ = s || 1; }
export function fz(n) {
  const s = globalThis.__LUMORA_FONT_SCALE__ || 1;
  const base = n <= 10 ? 12 : n <= 12 ? n + 2 : n <= 14 ? n + 1 : n; // 9-10→12, 11→13, 12→14, 13→14, 14→15
  return Math.round(base * s);
}
