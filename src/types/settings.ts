export type ShareUnit = "minutes" | "hours" | "days";
export type LocalUnit = "days" | "weeks" | "months";
export type FlyingIconName = "heart" | "star" | "flower" | "sparkles" | "moon" | "cloud" | "gift" | "butterfly";
export const FLYING_ICONS: FlyingIconName[] = ["heart", "star", "flower", "sparkles", "moon", "cloud", "gift", "butterfly"];

export type AppSettings = {
  localRetention: { mode: "never" | "after"; value: number; unit: LocalUnit };
  shareRetention: { value: number; unit: ShareUnit };
  typingSpeedMs: number;
  backgroundColor: string;
  flyingIcon: FlyingIconName;
  flyingColor: string;
};
export type SharedAppearance = Pick<AppSettings, "typingSpeedMs" | "backgroundColor" | "flyingIcon" | "flyingColor">;
