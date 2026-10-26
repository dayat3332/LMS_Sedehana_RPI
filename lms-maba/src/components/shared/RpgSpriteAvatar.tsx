"use client";

import { resolveAssetSrc, UI_PORTRAIT_ARCH } from "@/lib/assets";
import type { PlayerDirection } from "@/types/lobby";

export interface RpgSpriteAvatarProps {
  readonly src: string;
  readonly alt: string;
  readonly size?: "sm" | "md" | "arena" | "lg";
  readonly isMoving?: boolean;
  readonly direction?: PlayerDirection;
}

/**
 * Menampilkan animasi sprite sheet karakter 2D RPG dari `/public/assets/72 Character Free/`.
 */
export function RpgSpriteAvatar({
  src,
  alt,
  size = "lg",
  isMoving = false,
  direction = "right",
}: RpgSpriteAvatarProps) {
  const dimensions =
    size === "sm"
      ? { box: "h-12 w-16", sheet: "w-[768px]", walkTop: "-top-32" }
      : size === "md"
        ? { box: "h-20 w-28", sheet: "w-[1344px]", walkTop: "-top-56" }
        : size === "arena"
          ? { box: "h-24 w-32", sheet: "w-[1536px]", walkTop: "-top-64" }
          : {
              box: "h-36 w-48 sm:h-44 sm:w-56",
              sheet: "w-[2304px] sm:w-[2688px]",
              walkTop: "-top-96 sm:-top-112",
            };

  return (
    <div
      className={`relative overflow-hidden transition-transform duration-75 ${dimensions.box} ${
        direction === "left" ? "-scale-x-100" : "scale-x-100"
      }`}
    >
      <img
        src={resolveAssetSrc(src)}
        alt={alt}
        draggable={false}
        className={`pixelated absolute left-0 h-auto max-w-none select-none ${dimensions.sheet} ${
          isMoving
            ? `${dimensions.walkTop} animate-sprite-walk`
            : "top-0 animate-sprite-idle"
        }`}
      />
    </div>
  );
}

interface RpgPortraitArchProps {
  readonly spriteSrc: string;
  readonly alt: string;
  readonly level?: number;
}

/**
 * Bingkai potret lengkung gothic bertengkorak (`20251125portraitFrameC.png`).
 */
export function RpgPortraitArch({ spriteSrc, alt, level }: RpgPortraitArchProps) {
  return (
    <div className="relative flex h-24 w-22 shrink-0 items-end justify-center pb-2 drop-shadow-[4px_4px_0_#000] sm:h-28 sm:w-25">
      <div className="absolute inset-x-3.5 top-4 bottom-2 rounded-t-full bg-[#1e1233]" />
      <div className="relative z-10">
        <RpgSpriteAvatar src={spriteSrc} alt={alt} size="md" />
      </div>
      <img
        src={resolveAssetSrc(UI_PORTRAIT_ARCH)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 z-20 h-full w-full select-none"
      />
      {level !== undefined && (
        <span className="absolute -bottom-1.5 z-30 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
          LV.{level}
        </span>
      )}
    </div>
  );
}
