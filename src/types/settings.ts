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
  /** Where the recipient sees the message relative to the photo. */
  messagePlacement: "below" | "right";
  /** Where the soundtrack controls appear in the recipient view. */
  musicPlacement: "below" | "top-left" | "top-right"; // top-right accepted for legacy shares
};
/** Older encrypted links do not carry the optional layout fields. */
export type SharedAppearance = Pick<AppSettings, "typingSpeedMs" | "backgroundColor" | "flyingIcon" | "flyingColor"> &
  Partial<Pick<AppSettings, "messagePlacement" | "musicPlacement">>;
