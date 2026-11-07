/** Keep the selected flying-icon color unchanged while choosing darker accent text
 *  for the white cards and buttons. This matters when someone selects a pale icon. */
function parseHex(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
}
function hex(rgb: number[]): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}
function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function darkerForWhite(bg: string, contrast: number): string {
  const color = parseHex(bg);
  for (let percent = 0; percent <= 100; percent++) {
    const ratio = 1 - percent / 100;
    const shade = color.map((component) => component * ratio);
    if (1.05 / (luminance(shade) + 0.05) >= contrast) return hex(shade);
  }
  return "#000000";
}
export function themeStyle(backgroundColor: string, flyingColor: string): Record<"--user-bg" | "--accent" | "--accent-text" | "--accent-button" | "--accent-muted", string> {
  return {
    "--user-bg": backgroundColor,
    "--accent": flyingColor,
    "--accent-text": darkerForWhite(flyingColor, 5.1),
    "--accent-button": darkerForWhite(flyingColor, 4.7),
    "--accent-muted": darkerForWhite(flyingColor, 4.5),
  };
}
