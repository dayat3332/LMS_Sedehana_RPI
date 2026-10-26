"use client";

import { motion, type Transition } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";

import type {
  FinalResultsProps,
  LeaderboardPlayer,
  PodiumPlayer,
  PodiumRank,
} from "@/types/player";

/* -------------------------------------------------------------------------- */
/*                                Asset Paths                                 */
/* -------------------------------------------------------------------------- */

const LOBBY_BG_SRC = "/public/assets/background lobby/castle bg full 1000x740px.png";
const PODIUM_1_SRC = "/public/assets/podium/podium-1.png";
const PODIUM_2_SRC = "/public/assets/podium/podium-2.png";
const PODIUM_3_SRC = "/public/assets/podium/podium-3.png";
const UI_SCROLL_BANNER_SHEET = "/public/assets/asset/20251029darkDwellersButtonD1-Sheet.png";
const UI_HEADER_PURPLE = "/public/assets/asset/20251117darkDwellersHeaderA.png";
const UI_HEADER_GOTHIC_SLATE = "/public/assets/asset/20251117darkDwellersHeaderC.png";
const UI_HEADER_GOTHIC_GOLD = "/public/assets/asset/20251117darkDwellersHeaderD.png";
const UI_HEADER_GOTHIC_CRIMSON = "/public/assets/asset/20251117darkDwellersHeaderE.png";
const UI_PORTRAIT_ARCH = "/public/assets/asset/20251125portraitFrameC.png";
const UI_PANEL_9SLICE = "/public/assets/asset/20251029darkDwellers9SlicesE.png";

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

/** Seconds each podium column takes to rise. */
const RISE_DURATION = 0.8;
/** Seconds between each podium column starting its rise. */
const RISE_STAGGER = 0.7;
/** Seconds before the first column (3rd place) starts rising. */
const RISE_START_DELAY = 0.6;

/** Entry sequence: 3rd place first, then 2nd, then 1st. */
const ENTRY_ORDER: Readonly<Record<PodiumRank, number>> = { 3: 0, 2: 1, 1: 2 };

/** Left-to-right visual order on the podium. */
const DISPLAY_ORDER: readonly PodiumRank[] = [2, 1, 3];

/** Retro "back-out" easing for a chunky little overshoot when blocks land. */
const RISE_EASE: Transition["ease"] = [0.34, 1.56, 0.64, 1];

const CONFETTI_COLORS: string[] = [
  "#facc15", // yellow
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#a3e635", // lime
  "#fb923c", // orange
  "#a78bfa", // violet
  "#ffffff",
];

interface PodiumTheme {
  /** Rank text shown on the floating label. */
  readonly label: string;
  /** Extracted pixel-art podium block image from `/public/assets/podium/`. */
  readonly blockSrc: string;
  /** Width/sizing classes for the podium block image. */
  readonly blockSize: string;
  /** Colour of the floating rank text. */
  readonly rankText: string;
  /** Desyncs the idle animation between characters. */
  readonly idleDelay: string;
}

const PODIUM_THEME: Readonly<Record<PodiumRank, PodiumTheme>> = {
  1: {
    label: "1ST",
    blockSrc: PODIUM_1_SRC,
    blockSize: "w-32 sm:w-40 md:w-48",
    rankText: "text-yellow-300",
    idleDelay: "[animation-delay:0s]",
  },
  2: {
    label: "2ND",
    blockSrc: PODIUM_2_SRC,
    blockSize: "w-28 sm:w-36 md:w-44",
    rankText: "text-slate-200",
    idleDelay: "[animation-delay:-0.25s]",
  },
  3: {
    label: "3RD",
    blockSrc: PODIUM_3_SRC,
    blockSize: "w-28 sm:w-36 md:w-44",
    rankText: "text-amber-400",
    idleDelay: "[animation-delay:-0.5s]",
  },
};

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const formatPoints = (points: number): string => `${points.toLocaleString("en-US")} PTS`;

/**
 * Normalizes asset paths (stripping a leading `/public` if provided) and
 * URL-encodes spaces in directory/file names.
 */
const assetUrl = (path: string): string =>
  encodeURI(path.replace(/^\/public(?=\/)/, ""));

interface WindowSize {
  readonly width: number;
  readonly height: number;
}

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({ width: 0, height: 0 });

  useEffect(() => {
    const update = (): void => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

/** Draws sharp square confetti particles (`this` is the react-confetti particle). */
function drawSquare(this: { w: number }, ctx: CanvasRenderingContext2D): void {
  const size = Math.max(8, Math.round(this.w));
  ctx.fillRect(-size / 2, -size / 2, size, size);
}

/* -------------------------------------------------------------------------- */
/*                                Sub-components                              */
/* -------------------------------------------------------------------------- */

interface CharacterSpriteProps {
  readonly src: string;
  readonly alt: string;
  readonly idleDelay: string;
}

/**
 * Shows the idle animation from a 64x64-frame sprite sheet.
 * The viewport is 64 x 48 source pixels (the bottom 16px of every frame are
 * empty), scaled 2x on mobile and 3x from `md`, so feet sit flush on the block.
 */
function CharacterSprite({ src, alt, idleDelay }: CharacterSpriteProps) {
  return (
    <div className="relative h-25 w-32 overflow-hidden md:h-37 md:w-48">
      <img
        src={assetUrl(src)}
        alt={alt}
        draggable={false}
        className={`pixelated absolute top-0 left-0 h-auto w-[1536px] max-w-none animate-sprite-idle select-none md:w-[2304px] ${idleDelay}`}
      />
    </div>
  );
}

interface PodiumLabelProps {
  readonly player: PodiumPlayer;
  readonly theme: PodiumTheme;
}

function PodiumLabel({ player, theme }: PodiumLabelProps) {
  const headerBanner =
    player.rank === 1 ? UI_HEADER_GOTHIC_GOLD : UI_HEADER_GOTHIC_SLATE;

  return (
    <div className="pointer-events-none absolute inset-x-0 -top-2 z-20 flex -translate-y-full animate-bob flex-col items-center gap-1 text-center drop-shadow-[4px_4px_0_#000]">
      <span
        className={`text-xl leading-none text-stroke-pixel sm:text-2xl md:text-3xl ${theme.rankText}`}
      >
        {theme.label}
      </span>

      {/* Ornate Gothic Nameplate Banner */}
      <div className="relative flex h-8 min-w-32 items-center justify-center px-5 sm:h-9 sm:min-w-40">
        <img
          src={assetUrl(headerBanner)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated absolute inset-0 h-full w-full select-none"
        />
        <span className="relative z-10 max-w-28 truncate text-[8px] leading-none text-white text-stroke-pixel sm:max-w-34 sm:text-[9px] md:text-[10px]">
          {player.username}
        </span>
      </div>

      {/* Ornate Scroll Points Badge */}
      <div className="relative -mt-1 flex h-7 min-w-28 items-center justify-center px-5 sm:h-8 sm:min-w-34">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={assetUrl(UI_SCROLL_BANNER_SHEET)}
            alt=""
            draggable={false}
            className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
          />
        </div>
        <span className="relative z-10 text-[8px] leading-none text-lime-300 text-stroke-pixel sm:text-[9px] md:text-[10px]">
          {formatPoints(player.points)}
        </span>
      </div>
    </div>
  );
}

interface PodiumBlockProps {
  readonly theme: PodiumTheme;
}

function PodiumBlock({ theme }: PodiumBlockProps) {
  return (
    <div className={`relative z-10 select-none drop-shadow-[0_10px_0_rgba(0,0,0,0.65)] ${theme.blockSize}`}>
      <img
        src={assetUrl(theme.blockSrc)}
        alt={`Podium ${theme.label}`}
        draggable={false}
        className="pixelated h-auto w-full select-none"
      />
    </div>
  );
}

interface PodiumColumnProps {
  readonly player: PodiumPlayer;
  /** Called once the column's rise animation completes. */
  readonly onLanded?: () => void;
}

function PodiumColumn({ player, onLanded }: PodiumColumnProps) {
  const theme = PODIUM_THEME[player.rank];

  return (
    <motion.div
      className={`relative -mx-1 flex flex-col items-center sm:-mx-1.5 ${
        player.rank === 1 ? "z-20" : "z-10"
      }`}
      initial={{ y: 300, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: RISE_DURATION,
        delay: RISE_START_DELAY + ENTRY_ORDER[player.rank] * RISE_STAGGER,
        ease: RISE_EASE,
      }}
      onAnimationComplete={onLanded}
    >
      {/* z-30 keeps the character and feet rendered in front of the z-10 podium block */}
      <div className="relative z-30 -mx-4 -mb-5 sm:mx-0 sm:-mb-7 md:-mx-2 md:-mb-9">
        <PodiumLabel player={player} theme={theme} />
        <CharacterSprite
          src={player.spriteSrc}
          alt={`${player.username} (${theme.label})`}
          idleDelay={theme.idleDelay}
        />
      </div>
      <PodiumBlock theme={theme} />
    </motion.div>
  );
}

interface LeaderboardAvatarProps {
  readonly player: LeaderboardPlayer;
}

/**
 * Renders the leaderboard player's mini portrait inside the gothic double-skull arch
 * frame (`20251125portraitFrameC.png`). Uses `player.spriteSrc` (from `72 Character Free`)
 * if available, or falls back to `player.avatarSrc`.
 */
function LeaderboardAvatar({ player }: LeaderboardAvatarProps) {
  return (
    <div className="relative flex h-11 w-10 shrink-0 items-end justify-center pb-1 drop-shadow-[2px_2px_0_#000]">
      <div className="absolute inset-x-1.5 top-1.5 bottom-1 rounded-t-full bg-[#1e1233]" />
      {player.spriteSrc ? (
        <div className="relative z-10 h-8 w-10 overflow-hidden">
          <img
            src={assetUrl(player.spriteSrc)}
            alt={player.username}
            draggable={false}
            className="pixelated absolute top-0 left-0 h-auto w-[480px] max-w-none animate-sprite-idle select-none"
          />
        </div>
      ) : (
        <img
          src={assetUrl(player.avatarSrc)}
          alt={player.username}
          draggable={false}
          className="pixelated relative z-10 size-6 select-none"
        />
      )}
      <img
        src={assetUrl(UI_PORTRAIT_ARCH)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 z-20 h-full w-full select-none"
      />
    </div>
  );
}

interface LeaderboardPanelProps {
  readonly players: readonly LeaderboardPlayer[];
}

/**
 * Ornate Dark Dwellers Leaderboard Panel:
 * - Outer panel uses the cut-corner gothic 9-slice asset (`20251029darkDwellers9SlicesE.png`).
 * - Title banner uses the spiked gold gothic header (`20251117darkDwellersHeaderD.png`).
 * - Each rank row (#4–#8) uses the ornate winged gothic banner (`20251117darkDwellersHeaderC.png` / `HeaderE.png`)
 *   and skull-arch portrait frame (`20251125portraitFrameC.png`).
 */
function LeaderboardPanel({ players }: LeaderboardPanelProps) {
  return (
    <motion.aside
      className="relative w-full p-6 drop-shadow-[8px_8px_0_#000] sm:p-7"
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      aria-label="Leaderboard"
    >
      {/* Ornate Cut-Corner Gothic Panel Frame (`20251029darkDwellers9SlicesE.png`) */}
      <img
        src={assetUrl(UI_PANEL_9SLICE)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Ornate Spiked Gothic Title Banner (`20251117darkDwellersHeaderD.png`) */}
        <div className="relative mb-3 flex h-12 w-full items-center justify-center px-10 drop-shadow-[4px_4px_0_#000]">
          <img
            src={assetUrl(UI_HEADER_GOTHIC_GOLD)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <h2 className="relative z-10 text-center text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
            LEADERBOARD
          </h2>
        </div>

        {/* Ranks #4 to #8 inside Ornate Winged Gothic Banners */}
        <ol className="flex w-full flex-col gap-2">
          {players.map((player, index) => {
            const isHighlighted = player.id === "player-self";
            const rowBanner = isHighlighted
              ? UI_HEADER_GOTHIC_CRIMSON
              : index % 2 === 0
                ? UI_HEADER_PURPLE
                : UI_HEADER_GOTHIC_SLATE;

            return (
              <motion.li
                key={player.id}
                className="relative flex min-h-14 w-full items-center gap-2.5 px-7 py-2 drop-shadow-[4px_4px_0_#000]"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.12, ease: "easeOut" }}
              >
                <img
                  src={assetUrl(rowBanner)}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                />

                <span className="relative z-10 w-7 shrink-0 text-[10px] text-yellow-300 text-stroke-pixel sm:text-xs">
                  #{player.rank}
                </span>

                <div className="relative z-10">
                  <LeaderboardAvatar player={player} />
                </div>

                <span className="relative z-10 min-w-0 flex-1 truncate text-[9px] text-[#ffe4b5] text-stroke-pixel sm:text-[10px]">
                  {player.username}
                </span>

                <span className="relative z-10 shrink-0 text-[9px] text-lime-300 text-stroke-pixel sm:text-[10px]">
                  {formatPoints(player.points)}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </motion.aside>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Main component                              */
/* -------------------------------------------------------------------------- */

export default function FinalResults({
  podium,
  leaderboard,
  title = "FINAL RESULTS",
}: FinalResultsProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const podiumByRank = useMemo(() => {
    const map = new Map<PodiumRank, PodiumPlayer>();
    podium.forEach((player) => map.set(player.rank, player));
    return map;
  }, [podium]);

  const leaderboardRows = useMemo(
    () =>
      [...leaderboard]
        .filter((player) => player.rank >= 4 && player.rank <= 8)
        .sort((a, b) => a.rank - b.rank),
    [leaderboard],
  );

  /** Fired when the 1st place column finishes rising. */
  const handleFirstPlaceLanded = useCallback((): void => {
    setShowConfetti(true);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0e2e] font-pixel text-white">
      {/* Castle Lobby Background from `/public/assets/background lobby/` */}
      <img
        src={assetUrl(LOBBY_BG_SRC)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
      />

      {/* Atmospheric purple/magenta castle tint matching the lobby */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#2e1065]/50 via-[#4c1d95]/30 to-[#1e1b4b]/75"
      />

      {showConfetti && width > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <Confetti
            width={width}
            height={height}
            numberOfPieces={400}
            tweenDuration={2500}
            recycle={false}
            gravity={0.25}
            initialVelocityX={{ min: -6, max: 6 }}
            initialVelocityY={{ min: 6, max: 16 }}
            colors={CONFETTI_COLORS}
            drawShape={drawSquare}
          />
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-4 py-5 md:px-8 md:py-6">
        {/* Top Header Framed by Ornate Gothic Banner (`20251117darkDwellersHeaderA.png`) */}
        <motion.div
          className="relative mx-auto flex min-h-18 w-full max-w-lg items-center justify-center px-12 py-3 drop-shadow-[6px_6px_0_#000] sm:min-h-22"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: RISE_EASE }}
        >
          <img
            src={assetUrl(UI_HEADER_PURPLE)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <h1 className="relative z-10 text-center text-xl leading-tight text-yellow-300 text-stroke-pixel sm:text-2xl md:text-3xl">
            {title}
          </h1>
        </motion.div>

        <div className="mt-4 grid flex-1 grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_25rem] lg:gap-8">
          {/* Podium (center-left on the castle carpet) */}
          <section aria-label="Podium" className="flex flex-col justify-end pb-2 pt-32 lg:order-1">
            <div className="flex items-end justify-center">
              {DISPLAY_ORDER.map((rank) => {
                const player = podiumByRank.get(rank);
                if (!player) return null;
                return (
                  <PodiumColumn
                    key={player.id}
                    player={player}
                    onLanded={rank === 1 ? handleFirstPlaceLanded : undefined}
                  />
                );
              })}
            </div>
          </section>

          {/* Leaderboard (right side) */}
          <div className="lg:order-2 lg:self-center">
            <LeaderboardPanel players={leaderboardRows} />
          </div>
        </div>
      </div>
    </main>
  );
}
