/** Accessible colors for both the page background and the cream letter paper. */
function rgb(value: string): [number, number, number] {
  const match = /^#([a-f\d]{6})$/i.exec(value);
  const safe = match ? match[1] : "513a48";
  return [0, 2, 4].map((i) => parseInt(safe.slice(i, i + 2), 16)) as [number, number, number];
}
function hex(color: number[]): string {
  return `#${color.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}
function luminance(color: number[]): number {
  const v = color.map((c) => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  return .2126 * v[0] + .7152 * v[1] + .0722 * v[2];
}
export function contrastRatio(first: string, second: string): number {
  const a = luminance(rgb(first)); const b = luminance(rgb(second));
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
/** Preserve the chosen hue when possible, shifting its brightness only as needed. */
export function readableText(foreground: string, background: string, minimum = 4.5): string {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const original = rgb(foreground);
  const destination = luminance(rgb(background)) >= .179 ? [0, 0, 0] : [255, 255, 255];
  let low = 0; let high = 1;
  for (let i = 0; i < 24; i++) {
    const amount = (low + high) / 2;
    const mixed = hex(original.map((c, j) => c * (1 - amount) + destination[j] * amount));
    if (contrastRatio(mixed, background) >= minimum) high = amount; else low = amount;
  }
  return hex(original.map((c, j) => c * (1 - high) + destination[j] * high));
}
export const COLOR_PRESETS = [
  { id: "rose", name: "Rose Letter", backgroundColor: "#fff4f7", flyingColor: "#e889aa", textColor: "#513a48" },
  { id: "lilac", name: "Moonlit Lilac", backgroundColor: "#eee9ff", flyingColor: "#9474d2", textColor: "#42345f" },
  { id: "sage", name: "Sage Garden", backgroundColor: "#edf5e8", flyingColor: "#65967c", textColor: "#314f3e" },
] as const;
export function themeStyle(backgroundColor: string, flyingColor: string, textColor = "#513a48"): Record<string, string> {
  const dark = luminance(rgb(backgroundColor)) < .179;
  return {
    "--user-bg": backgroundColor,
    "--accent": flyingColor,
    "--accent-text": readableText(flyingColor, "#fffdfa", 5.1),
    "--accent-button": readableText(flyingColor, "#ffffff", 4.7),
    "--accent-muted": readableText(flyingColor, "#ffffff", 4.5),
    "--page-text": readableText(textColor, backgroundColor, 4.5),
    "--page-accent": readableText(flyingColor, backgroundColor, 4.5),
    "--note-text": readableText(textColor, "#fffdfa", 4.5),
    "--page-glow": dark ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.65)",
    "--page-haze": dark ? "rgba(0,0,0,.1)" : "rgba(255,206,222,.14)",
  };
}
