import type { AppSettings, ShareUnit } from "@/types/settings";

export const SETTINGS_KEY = "dearplume.settings.v1";
export const DEFAULT_SETTINGS: AppSettings = {
  localRetention: { mode: "never", value: 30, unit: "days" },
  shareRetention: { value: 24, unit: "hours" },
  typingSpeedMs: 44,
  backgroundColor: "#fff4f7",
  flyingIcon: "heart",
  flyingColor: "#e889aa",
  messagePlacement: "right",
  musicPlacement: "top-right",
};
export function durationMs(value: number, unit: ShareUnit | "weeks" | "months"): number {
  const multiplier = { minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000, months: 2_592_000_000 }[unit];
  return value * multiplier;
}
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
    const localRetention = raw.localRetention || {};
    const shareRetention = raw.shareRetention || {};
    const validLocalUnit = ["days", "weeks", "months"].includes(localRetention.unit);
    const validShareUnit = ["minutes", "hours", "days"].includes(shareRetention.unit);
    const validIcon = ["heart", "star", "flower", "sparkles", "moon", "cloud", "gift", "butterfly"].includes(raw.flyingIcon);
    return {
      localRetention: {
        mode: localRetention.mode === "after" ? "after" : "never",
        value: Number.isInteger(localRetention.value) && localRetention.value > 0 && localRetention.value <= 365 ? localRetention.value : 30,
        unit: validLocalUnit ? localRetention.unit : "days",
      },
      shareRetention: {
        value: Number.isInteger(shareRetention.value) && shareRetention.value > 0 && shareRetention.value <= 365 ? shareRetention.value : 24,
        unit: validShareUnit ? shareRetention.unit : "hours",
      },
      typingSpeedMs: Number.isInteger(raw.typingSpeedMs) && raw.typingSpeedMs >= 10 && raw.typingSpeedMs <= 150 ? raw.typingSpeedMs : 44,
      backgroundColor: isHexColor(raw.backgroundColor) ? raw.backgroundColor : DEFAULT_SETTINGS.backgroundColor,
      flyingIcon: validIcon ? raw.flyingIcon : "heart",
      flyingColor: isHexColor(raw.flyingColor) ? raw.flyingColor : DEFAULT_SETTINGS.flyingColor,
      messagePlacement: raw.messagePlacement === "below" || raw.messagePlacement === "right" ? raw.messagePlacement : DEFAULT_SETTINGS.messagePlacement,
      musicPlacement: raw.musicPlacement === "below" || raw.musicPlacement === "top-right" ? raw.musicPlacement : DEFAULT_SETTINGS.musicPlacement,
    };
  } catch { return DEFAULT_SETTINGS; }
}
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(timestamp);
}
