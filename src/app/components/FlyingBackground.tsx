"use client";

import { Cloud, Flower2, Gift, Heart, Moon, Sparkles, Star, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { SharedAppearance } from "@/types/settings";

// Lucide doesn't export a Butterfly icon in the version used by Dearplume.
// Render our own small outline SVG so the saved "butterfly" setting keeps working.
function ButterflyIcon({ size = 24, strokeWidth = 2, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 11c-2-4-6-7-9-6-3 2-1 7 4 8-4 1-5 5-2 6 3 1 6-2 7-6" />
      <path d="M12 11c2-4 6-7 9-6 3 2 1 7-4 8 4 1 5 5 2 6-3 1-6-2-7-6" />
      <path d="M12 10v7m-2-8 2 2 2-2" />
    </svg>
  );
}

export const DECORATIONS: Record<SharedAppearance["flyingIcon"], ComponentType<LucideProps>> = {
  heart: Heart,
  star: Star,
  flower: Flower2,
  sparkles: Sparkles,
  moon: Moon,
  cloud: Cloud,
  gift: Gift,
  butterfly: ButterflyIcon,
};

export default function FlyingBackground({ appearance }: { appearance: SharedAppearance }) {
  const Decoration = DECORATIONS[appearance.flyingIcon] || Heart;
  return (
    <div className="flying-layer" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          className="flying-object"
          style={{
            color: appearance.flyingColor,
            right: `${(index % 5) * 16 - 6}px`,
            bottom: `${(index % 4) * 18 - 26}px`,
            animationDuration: `${12 + (index % 6) * 2.5}s`,
            animationDelay: `${-index * 2.8}s`,
            opacity: 0.2 + (index % 3) * 0.1,
          }}
        >
          <Decoration size={13 + (index % 4) * 8} strokeWidth={1.6} fill={appearance.flyingIcon === "heart" ? "currentColor" : "none"} />
        </span>
      ))}
    </div>
  );
}
