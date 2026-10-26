"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { loadUserProfile, saveUserProfile } from "@/lib/user-storage";

import {
  DEFAULT_CHARACTERS,
  DEFAULT_PEERS,
  type CharacterOption,
  type LobbyChatMessage,
  type LobbyPeer,
  type PlayerDirection,
  type SessionInfo,
  type StatBarValue,
  type StudentProfile,
  type WaitingLobbyProps,
} from "@/types/lobby";

/* -------------------------------------------------------------------------- */
/*                                Asset Paths                                 */
/* -------------------------------------------------------------------------- */

const LOBBY_BG_SRC = "/public/assets/background lobby/castle bg full 1000x740px.png";
const UI_BUTTON_SHEET = "/public/assets/asset/20251029darkDwellersButtonB1-Sheet.png";
const UI_SCROLL_BANNER_SHEET = "/public/assets/asset/20251029darkDwellersButtonD1-Sheet.png";
const UI_HEADER_PURPLE = "/public/assets/asset/20251117darkDwellersHeaderA.png";
const UI_HEADER_GOTHIC_SLATE = "/public/assets/asset/20251117darkDwellersHeaderC.png";
const UI_HEADER_GOTHIC_GOLD = "/public/assets/asset/20251117darkDwellersHeaderD.png";
const UI_HEADER_GOTHIC_CRIMSON = "/public/assets/asset/20251117darkDwellersHeaderE.png";
const UI_SKULL_BAR = "/public/assets/asset/20251118darkDwellersBarE.png";
const UI_PORTRAIT_ARCH = "/public/assets/asset/20251125portraitFrameC.png";
const UI_PANEL_9SLICE = "/public/assets/asset/20251029darkDwellers9SlicesE.png";
const UI_CLOSE_BTN_SHEET = "/public/assets/asset/20251125closeButton1-Sheet.png";
const UI_TARGET_FRAME_SHEET = "/public/assets/asset/20251118darkDwellersCursourA1-Sheet.png";
const UI_CURSOR_HORIZ_SHEET =
  "/public/assets/asset/20251118darkDwellersHorizontalCursourD1-Sheet.png";
const UI_CURSOR_VERT_SHEET =
  "/public/assets/asset/20251118darkDwellersVerticalCursourD1-Sheet.png";

/* -------------------------------------------------------------------------- */
/*                              Arena Constants                               */
/* -------------------------------------------------------------------------- */

const ARENA_BOUNDS = {
  minX: 12,
  maxX: 88,
  minY: 24,
  maxY: 84,
} as const;

const INTERACT_DISTANCE = 19;

const PEER_REPLIES: readonly string[] = [
  "Halo juga! Siap banget nih!",
  "Semangat! Semoga dapat nilai 100!",
  "Ayo masuk podium 3 besar nanti!",
  "Mantap, sebentar lagi kuisnya mulai!",
  "Jangan lupa baca soal teliti ya!",
];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/**
 * Resolves `/public/assets/...` or `/assets/...` to a browser-ready URL
 * with spaces encoded.
 */
const resolveAssetSrc = (src: string): string =>
  encodeURI(src.replace(/^\/public(?=\/)/, ""));

const calcPercentage = ({ current, max }: StatBarValue): number => {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / max) * 100)));
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const formatTimeNow = (): string => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

/* -------------------------------------------------------------------------- */
/*                               Sub-components                               */
/* -------------------------------------------------------------------------- */

interface SpriteAvatarProps {
  readonly src: string;
  readonly alt: string;
  readonly size?: "sm" | "md" | "arena" | "lg";
  readonly isMoving?: boolean;
  readonly direction?: PlayerDirection;
}

/**
 * Renders the character sprite sheet from `/public/assets/72 Character Free/`.
 * - Row 0 (`top-0`): 4-frame idle animation (`animate-sprite-idle`).
 * - Row 2 (`walkTop`): 6-frame walking animation (`animate-sprite-walk`).
 * - Flips horizontally when `direction === "left"`.
 */
function SpriteAvatar({
  src,
  alt,
  size = "lg",
  isMoving = false,
  direction = "right",
}: SpriteAvatarProps) {
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
              walkTop: "-top-96",
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

interface ActionMenuProps {
  readonly isJoined: boolean;
  readonly onClickCode: () => void;
  readonly onClickCharacter: () => void;
  readonly onClickExit: () => void;
}

/**
 * 1. Left Panel (Action Menu):
 * Uses `20251029darkDwellersButtonB1-Sheet.png` (diamond-tipped buttons) and
 * `20251118darkDwellersHorizontalCursourD1-Sheet.png` (golden cross-dagger cursor).
 * When `isJoined` is true, only displays the single "Keluar" button.
 */
function ActionMenu({
  isJoined,
  onClickCode,
  onClickCharacter,
  onClickExit,
}: ActionMenuProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const actions = isJoined
    ? [
        {
          id: "exit",
          label: "Keluar",
          onClick: onClickExit,
          variant: "danger" as const,
        },
      ]
    : [
        {
          id: "code",
          label: "Masukan Kode / Scan",
          onClick: onClickCode,
          variant: "default" as const,
        },
        {
          id: "character",
          label: "Ganti Karakter",
          onClick: onClickCharacter,
          variant: "default" as const,
        },
        {
          id: "exit",
          label: "Keluar",
          onClick: onClickExit,
          variant: "danger" as const,
        },
      ];

  return (
    <nav aria-label="Menu Aksi" className="flex flex-col items-start gap-2">
      {actions.map((action, index) => {
        const isActive = activeIndex === index || actions.length === 1;
        const isDanger = action.variant === "danger";

        return (
          <div
            key={action.id}
            className={`flex items-center transition-transform duration-150 ${
              isActive ? "translate-x-2 sm:translate-x-4" : "translate-x-0"
            }`}
          >
            {/* Golden Cross-Dagger Cursor on active/hovered item */}
            <div
              aria-hidden
              className={`mr-1.5 h-7 w-12 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-opacity sm:h-9 sm:w-15 ${
                isActive ? "opacity-100" : "mr-0 w-0 opacity-0"
              }`}
            >
              <img
                src={resolveAssetSrc(UI_CURSOR_HORIZ_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
              />
            </div>

            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={action.onClick}
              className="group relative flex h-12 w-64 cursor-pointer items-center justify-center px-7 text-center drop-shadow-[4px_4px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:h-14 sm:w-76"
            >
              {/* Dark Dwellers diamond-tipped button sprite (transparent outer corners) */}
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                <img
                  src={resolveAssetSrc(UI_BUTTON_SHEET)}
                  alt=""
                  draggable={false}
                  className={`pixelated h-full w-[400%] max-w-none select-none ${
                    isDanger
                      ? "-translate-x-1/4 hue-rotate-[-18deg] saturate-150"
                      : isActive
                        ? "-translate-x-1/4"
                        : "translate-x-0"
                  }`}
                />
              </div>

              <span className="relative z-10 text-[10px] leading-snug text-white text-stroke-pixel sm:text-xs">
                {action.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

interface SessionInfoBoxProps {
  readonly session: SessionInfo;
  readonly isJoined: boolean;
}

/**
 * 4. Top Right (Session Info):
 * Uses the non-rectangular diamond-winged banner `20251117darkDwellersHeaderA.png`
 * and ornate gothic fleur-de-lis scroll `20251029darkDwellersButtonD1-Sheet.png` from `/asset`.
 */
function SessionInfoBox({ session, isJoined }: SessionInfoBoxProps) {
  return (
    <aside
      aria-label="Informasi Sesi"
      className="flex w-full max-w-md flex-col items-center gap-1.5 drop-shadow-[5px_5px_0_#000]"
    >
      {/* Main Diamond-Winged Gothic Banner (HeaderA.png) */}
      <div className="relative flex min-h-20 w-full items-center justify-center px-12 py-3 sm:min-h-22 sm:px-14">
        <img
          src={resolveAssetSrc(UI_HEADER_PURPLE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        <p className="relative z-10 text-center text-[11px] leading-relaxed text-[#ffe4b5] text-stroke-pixel sm:text-xs">
          {session.statusText}
        </p>
      </div>

      {/* Sub-banner using Ornate Gothic Scroll (`20251029darkDwellersButtonD1-Sheet.png`) */}
      {(session.courseName || session.sessionCode || session.playersOnline !== undefined) && (
        <div className="relative flex h-10 w-11/12 items-center justify-center px-10">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={resolveAssetSrc(UI_SCROLL_BANNER_SHEET)}
              alt=""
              draggable={false}
              className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
            />
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 text-[9px] text-amber-200 text-stroke-pixel sm:text-[10px]">
            {session.sessionCode && (
              <span className="text-lime-300">KODE: {session.sessionCode}</span>
            )}
            {session.playersOnline !== undefined && (
              <span className="text-cyan-300">{session.playersOnline} ONLINE</span>
            )}
            {isJoined && <span className="text-yellow-300">● LOBI AKTIF</span>}
          </div>
        </div>
      )}

      {isJoined && (
        <Link
          href="/quiz"
          className="relative flex h-11 w-56 items-center justify-center px-6 transition-transform hover:scale-105 active:scale-95"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={resolveAssetSrc(UI_BUTTON_SHEET)}
              alt=""
              draggable={false}
              className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
            />
          </div>
          <span className="relative z-10 text-[10px] text-lime-300 text-stroke-pixel sm:text-xs">
            ▶ Mulai Kuis
          </span>
        </Link>
      )}
    </aside>
  );
}

interface SoloPlayerStageProps {
  readonly student: StudentProfile;
  readonly onQuickJoin: () => void;
}

/**
 * 2A. Center Arena before joining a room (Solo Spotlight Stage):
 * Character stands on the castle carpet inside `20251118darkDwellersCursourA1-Sheet.png`,
 * with ornate gothic winged nameplate banners and a quick button to enter the interactive room.
 */
function SoloPlayerStage({ student, onQuickJoin }: SoloPlayerStageProps) {
  const { character, name, level = 1 } = student;

  return (
    <section
      aria-label="Arena Karakter"
      className="relative flex flex-1 flex-col items-center justify-center py-1"
    >
      {/* Floating Golden Cross-Dagger Cursor above the player */}
      <div
        aria-hidden
        className="mb-1 h-12 w-7 animate-bob overflow-hidden drop-shadow-[3px_3px_0_#000] sm:h-14 sm:w-8"
      >
        <img
          src={resolveAssetSrc(UI_CURSOR_VERT_SHEET)}
          alt=""
          draggable={false}
          className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
        />
      </div>

      {/* Character inside the animated Golden Skull Target Frame */}
      <div className="relative flex items-center justify-center p-5 sm:p-6">
        {/* Pink/magenta oval spotlight on the castle floor under the character */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 -bottom-2 h-14 rounded-full bg-[#f472b6]/40 shadow-[0_0_24px_rgba(244,114,182,0.55)] sm:h-16"
        />

        {/* Animated 5-frame Golden Skull Target Frame */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden drop-shadow-[4px_4px_0_#000]"
        >
          <img
            src={resolveAssetSrc(UI_TARGET_FRAME_SHEET)}
            alt=""
            draggable={false}
            className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
          />
        </div>

        {/* Selected Student Sprite (from /public/assets/72 Character Free/) */}
        <div className="relative z-10">
          <SpriteAvatar
            src={character.spriteSrc}
            alt={`${name} - ${character.name}`}
            size="lg"
          />
        </div>
      </div>

      {/* Ornate Spiked Gothic Nameplate (`HeaderD.png`) + Scroll Subtitle (`ButtonD1-Sheet.png`) */}
      <div className="mt-2 flex flex-col items-center drop-shadow-[4px_4px_0_#000]">
        <div className="relative flex h-12 min-w-72 items-center justify-center px-12 sm:h-14 sm:min-w-84">
          <img
            src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          <span className="relative z-10 text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
            {name} <span className="text-cyan-300">LV.{level}</span>
          </span>
        </div>

        <div className="relative -mt-1 flex h-9 min-w-60 items-center justify-center px-9">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={resolveAssetSrc(UI_SCROLL_BANNER_SHEET)}
              alt=""
              draggable={false}
              className="pixelated h-full w-[400%] max-w-none translate-x-0 select-none"
            />
          </div>
          <span className="relative z-10 text-[9px] text-pink-200 text-stroke-pixel sm:text-[10px]">
            {character.name} • {character.role ?? "Adventurer"}
          </span>
        </div>

        {/* Quick Join Prompt so user can also enter interactive multiplayer mode in 1 click */}
        <button
          type="button"
          onClick={onQuickJoin}
          className="relative mt-2 flex h-11 w-64 cursor-pointer items-center justify-center px-6 transition-transform hover:scale-105 active:scale-95"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src={resolveAssetSrc(UI_BUTTON_SHEET)}
              alt=""
              draggable={false}
              className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
            />
          </div>
          <span className="relative z-10 text-[9px] text-lime-300 text-stroke-pixel sm:text-[10px]">
            ▶ Gabung Arena Lobi
          </span>
        </button>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*         2B. Interactive Multiplayer Arena (After Clicking "Gabung")        */
/* -------------------------------------------------------------------------- */

interface SpeechBubbleProps {
  readonly text: string;
}

/**
 * Ornate pixel speech bubble rendered above the player's character when they chat.
 */
function SpeechBubble({ text }: SpeechBubbleProps) {
  return (
    <div
      role="status"
      className="pointer-events-none relative mb-1 flex max-w-52 min-w-36 flex-col items-center drop-shadow-[3px_3px_0_#000] sm:max-w-60"
    >
      <div className="relative flex min-h-12 w-full items-center justify-center px-6 py-2.5">
        <img
          src={resolveAssetSrc(UI_HEADER_PURPLE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated absolute inset-0 h-full w-full brightness-115 select-none"
        />
        <p className="relative z-10 text-center text-[8px] leading-snug text-lime-200 text-stroke-pixel sm:text-[9px]">
          {text}
        </p>
      </div>
      <div
        aria-hidden
        className="h-0 w-0 border-t-8 border-r-6 border-l-6 border-t-[#3b215d] border-r-transparent border-l-transparent"
      />
    </div>
  );
}

interface InteractiveArenaProps {
  readonly student: StudentProfile;
  readonly playerX: number;
  readonly playerY: number;
  readonly playerDirection: PlayerDirection;
  readonly isPlayerMoving: boolean;
  readonly playerBubble: string | null;
  readonly peers: readonly LobbyPeer[];
  readonly nearestPeer: LobbyPeer | null;
  readonly chatMessages: readonly LobbyChatMessage[];
  readonly onStepMove: (dx: number, dy: number) => void;
  readonly onGreetPeer: (peer: LobbyPeer) => void;
  readonly onSendChat: (text: string) => void;
}

/**
 * Interactive 2D Castle Lobby Arena:
 * - Move with Keyboard (`WASD` / `ArrowKeys`) or on-screen D-Pad (Maju, Mundur, Kiri, Kanan).
 * - Walk up to other players waiting in the lobby (no floating text above NPCs).
 * - Chat ("Ngobrol") via the ornate chat input bar and collapsible chat log.
 */
function InteractiveArena({
  student,
  playerX,
  playerY,
  playerDirection,
  isPlayerMoving,
  playerBubble,
  peers,
  nearestPeer,
  chatMessages,
  onStepMove,
  onGreetPeer,
  onSendChat,
}: InteractiveArenaProps) {
  const [chatText, setChatText] = useState<string>("");
  const [isChatLogOpen, setIsChatLogOpen] = useState<boolean>(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleChatSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = chatText.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setChatText("");
    chatInputRef.current?.blur();
  };

  return (
    <section
      aria-label="Arena Interaktif Lobi"
      className="relative flex flex-1 flex-col items-center justify-between gap-2 py-1"
    >
      {/* Walkable 2.5D Castle Floor Stage */}
      <div className="relative min-h-80 w-full max-w-5xl flex-1 select-none sm:min-h-96">
        {/* Other Players (NPCs) Waiting in the Lobby — no text above their heads */}
        {peers.map((peer) => {
          const isNearest = nearestPeer?.id === peer.id;

          return (
            <div
              key={peer.id}
              style={{
                left: `${peer.x}%`,
                top: `${peer.y}%`,
                zIndex: Math.round(peer.y),
              }}
              onClick={() => onGreetPeer(peer)}
              title={`Klik untuk menyapa ${peer.name}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
            >
              <div className="flex flex-col items-center">
                {/* Character Sprite + Optional Proximity Target Frame */}
                <div className="relative flex items-center justify-center p-2">
                  {/* Floor shadow oval */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-4 bottom-0 h-6 rounded-full transition-colors ${
                      isNearest
                        ? "bg-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.7)]"
                        : "bg-black/45"
                    }`}
                  />

                  {/* Golden Skull Target Frame when in interaction range */}
                  {isNearest && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-20 overflow-hidden drop-shadow-[3px_3px_0_#000]"
                    >
                      <img
                        src={resolveAssetSrc(UI_TARGET_FRAME_SHEET)}
                        alt=""
                        draggable={false}
                        className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
                      />
                    </div>
                  )}

                  <div className="relative z-10">
                    <SpriteAvatar
                      src={peer.character.spriteSrc}
                      alt={peer.name}
                      size="arena"
                      isMoving={peer.isMoving}
                      direction={peer.direction}
                    />
                  </div>
                </div>

                {/* Peer Gothic Nameplate (`20251117darkDwellersHeaderC.png`) below character */}
                <div className="relative -mt-1 flex h-8 min-w-36 items-center justify-center px-6 drop-shadow-[3px_3px_0_#000]">
                  <img
                    src={resolveAssetSrc(UI_HEADER_GOTHIC_SLATE)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
                  />
                  <span className="relative z-10 text-[8px] text-white text-stroke-pixel sm:text-[9px]">
                    {peer.name} <span className="text-amber-300">LV.{peer.level}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Local Controllable Student Character */}
        <div
          style={{
            left: `${playerX}%`,
            top: `${playerY}%`,
            zIndex: Math.round(playerY) + 1,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          <div className="flex flex-col items-center">
            {/* Player Overhead Speech Bubble when sending chat */}
            {playerBubble && <SpeechBubble text={playerBubble} />}

            {/* Floating Golden Cross-Dagger Cursor above local player */}
            <div
              aria-hidden
              className="mb-0.5 h-9 w-5 animate-bob overflow-hidden drop-shadow-[3px_3px_0_#000]"
            >
              <img
                src={resolveAssetSrc(UI_CURSOR_VERT_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[500%] max-w-none animate-sprite-5 select-none"
              />
            </div>

            {/* Player Sprite with Magenta Spotlight */}
            <div className="relative flex items-center justify-center p-2">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 bottom-0 h-7 rounded-full bg-[#f472b6]/55 shadow-[0_0_20px_rgba(244,114,182,0.75)]"
              />

              <div className="relative z-10">
                <SpriteAvatar
                  src={student.character.spriteSrc}
                  alt={student.name}
                  size="arena"
                  isMoving={isPlayerMoving}
                  direction={playerDirection}
                />
              </div>
            </div>

            {/* Local Player Spiked Gold Nameplate (`20251117darkDwellersHeaderD.png`) */}
            <div className="relative -mt-1 flex h-9 min-w-44 items-center justify-center px-7 drop-shadow-[3px_3px_0_#000]">
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
                {student.name} <span className="text-lime-300">(KAMU)</span>
              </span>
            </div>
          </div>
        </div>

        {/* On-Screen Retro D-Pad Controls (Bottom-Left of Arena for Mouse/Touch) */}
        <div
          aria-label="Kontrol Arah Karakter"
          className="absolute bottom-2 left-2 z-40 grid grid-cols-3 gap-1 drop-shadow-[3px_3px_0_#000] sm:bottom-3 sm:left-4"
        >
          <div />
          <button
            type="button"
            aria-label="Maju"
            onClick={() => onStepMove(0, -5)}
            className="relative flex size-9 cursor-pointer items-center justify-center active:translate-y-0.5 sm:size-10"
          >
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel">▲</span>
          </button>
          <div />
          <button
            type="button"
            aria-label="Kiri"
            onClick={() => onStepMove(-6, 0)}
            className="relative flex size-9 cursor-pointer items-center justify-center active:translate-y-0.5 sm:size-10"
          >
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel">◀</span>
          </button>
          <button
            type="button"
            aria-label="Mundur"
            onClick={() => onStepMove(0, 5)}
            className="relative flex size-9 cursor-pointer items-center justify-center active:translate-y-0.5 sm:size-10"
          >
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel">▼</span>
          </button>
          <button
            type="button"
            aria-label="Kanan"
            onClick={() => onStepMove(6, 0)}
            className="relative flex size-9 cursor-pointer items-center justify-center active:translate-y-0.5 sm:size-10"
          >
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[10px] text-yellow-300 text-stroke-pixel">▶</span>
          </button>
        </div>

        {/* Collapsible Ornate Chat History Log (Bottom-Right of Arena) */}
        {isChatLogOpen && (
          <div className="absolute right-2 bottom-2 z-40 flex w-72 flex-col p-5 drop-shadow-[6px_6px_0_#000] sm:right-4 sm:w-84">
            <img
              src={resolveAssetSrc(UI_PANEL_9SLICE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b-2 border-white/15 pb-1.5">
                <span className="text-[9px] text-yellow-300 text-stroke-pixel">
                  RUANG OBROLAN LOBI
                </span>
                <button
                  type="button"
                  onClick={() => setIsChatLogOpen(false)}
                  className="cursor-pointer text-[9px] text-rose-300 text-stroke-pixel"
                >
                  [TUTUP]
                </button>
              </div>
              <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-[8px] leading-relaxed sm:text-[9px]">
                    <span className="text-slate-400">[{msg.timestamp}] </span>
                    <span
                      className={`text-stroke-pixel ${
                        msg.isSelf ? "text-lime-300" : "text-amber-300"
                      }`}
                    >
                      {msg.senderName}:{" "}
                    </span>
                    <span className="text-white text-shadow-pixel">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ornate Chat Input Form Framed by Gothic Banner (`HeaderA.png`) */}
      <div className="relative z-30 flex w-full max-w-3xl flex-col items-center">
        <form
          onSubmit={handleChatSubmit}
          className="relative flex w-full max-w-2xl items-center gap-2 px-8 py-2.5 drop-shadow-[4px_4px_0_#000] sm:px-12"
        >
          <img
            src={resolveAssetSrc(UI_HEADER_PURPLE)}
            alt=""
            aria-hidden
            draggable={false}
            className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
          />

          <input
            ref={chatInputRef}
            data-lobby-chat-input="true"
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
            placeholder={
              nearestPeer
                ? `Ngobrol dengan ${nearestPeer.name} atau semua...`
                : "Ketik pesan ngobrol ke teman lobi..."
            }
            maxLength={80}
            className="relative z-10 flex-1 bg-[#140c24]/90 px-3 py-2 text-[9px] text-lime-200 placeholder:text-slate-400 focus:outline-2 focus:outline-amber-400 sm:text-[10px]"
          />

          <button
            type="submit"
            className="relative z-10 flex h-9 w-22 shrink-0 cursor-pointer items-center justify-center active:translate-y-0.5 sm:w-26"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <img
                src={resolveAssetSrc(UI_BUTTON_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
              />
            </div>
            <span className="relative z-10 text-[9px] text-white text-stroke-pixel sm:text-[10px]">
              Kirim
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatLogOpen((prev) => !prev)}
            className="relative z-10 flex h-9 w-22 shrink-0 cursor-pointer items-center justify-center active:translate-y-0.5 sm:w-24"
          >
            <img
              src={resolveAssetSrc(UI_HEADER_GOTHIC_CRIMSON)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[8px] text-cyan-200 text-stroke-pixel sm:text-[9px]">
              Log ({chatMessages.length})
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                     3. Bottom Panel (Status HUD)                           */
/* -------------------------------------------------------------------------- */

interface SkullStatBarProps {
  readonly label: string;
  readonly stat: StatBarValue;
  readonly colorTheme: "red" | "blue";
  readonly indent?: boolean;
}

/**
 * Renders an HP/MP bar in the exact style of the reference image:
 * Skull-tipped Dark Dwellers bar frame (`20251118darkDwellersBarE.png`),
 * red fill for "Kehadiran" / blue fill for "Tugas", and large pixel numbers on the left.
 */
function SkullStatBar({ label, stat, colorTheme, indent = false }: SkullStatBarProps) {
  const pct = calcPercentage(stat);

  const fillClasses =
    colorTheme === "red"
      ? "bg-linear-to-b from-[#ff3b6b] via-[#e01e50] to-[#9e1136]"
      : "bg-linear-to-b from-[#38bdf8] via-[#2576e8] to-[#17469e]";

  const labelColor = colorTheme === "red" ? "text-red-300" : "text-sky-300";

  return (
    <div className={`flex flex-col gap-0.5 ${indent ? "pl-6 sm:pl-10" : ""}`}>
      <div className="flex items-center justify-between px-2">
        <span className={`text-[9px] uppercase text-stroke-pixel sm:text-[11px] ${labelColor}`}>
          {label}
        </span>
        <span className="text-[9px] text-[#ffe4b5] text-stroke-pixel sm:text-[11px]">
          {stat.current}/{stat.max}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={stat.current}
        aria-valuemin={0}
        aria-valuemax={stat.max}
        className="relative h-11 w-full select-none drop-shadow-[4px_4px_0_#000] sm:h-13"
      >
        {/* Dark empty bar cavity aligned with BarE.png inner window */}
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] bg-[#201733]" />

        {/* Colored fill (Red for Kehadiran / Blue for Tugas) */}
        <div className="absolute top-[23.5%] right-[21%] bottom-[23.5%] left-[8.4%] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${fillClasses}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Skull-tipped Dark Dwellers Bar Frame */}
        <img
          src={resolveAssetSrc(UI_SKULL_BAR)}
          alt=""
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Large overlapping numeric value on the left (just like 225 / 24 in the reference image) */}
        <span className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-base leading-none text-[#ffe4b5] text-stroke-pixel sm:left-5 sm:text-xl">
          {pct}%
        </span>
      </div>
    </div>
  );
}

interface StatusHudProps {
  readonly student: StudentProfile;
}

/**
 * 3. Bottom Panel (Status HUD):
 * No plain rectangular box — uses the gothic double-skull arch portrait frame
 * (`20251125portraitFrameC.png`), gothic winged header (`20251117darkDwellersHeaderE.png`),
 * and stacked skull-tipped Red ("Kehadiran") & Blue ("Tugas") bars (`20251118darkDwellersBarE.png`)
 * floating directly over the castle carpet just like the reference image.
 */
function StatusHud({ student }: StatusHudProps) {
  return (
    <footer
      aria-label="Status HUD Mahasiswa"
      className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row sm:items-end sm:gap-5"
    >
      {/* Gothic Double-Skull Arch Portrait (`20251125portraitFrameC.png`) */}
      <div className="relative flex h-26 w-24 shrink-0 items-end justify-center pb-2 drop-shadow-[5px_5px_0_#000] sm:h-30 sm:w-27">
        <div className="absolute inset-x-4 top-5 bottom-2 rounded-t-full bg-[#1e1233]" />
        <div className="relative z-10">
          <SpriteAvatar src={student.character.spriteSrc} alt={student.name} size="md" />
        </div>
        <img
          src={resolveAssetSrc(UI_PORTRAIT_ARCH)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 z-20 h-full w-full select-none"
        />
        <span className="absolute -bottom-2 z-30 text-[10px] text-yellow-300 text-stroke-pixel">
          LV.{student.level ?? 1}
        </span>
      </div>

      {/* Floating Name + Stacked Skull Bars (matching "monster killer" bottom HUD in reference) */}
      <div className="flex w-full max-w-xl flex-col gap-1">
        {/* Ornate Gothic Winged Name Banner (`20251117darkDwellersHeaderE.png`) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="text-sm text-[#ffe4b5] text-stroke-pixel sm:text-lg">
            {student.name}
          </h2>
          {student.nim && (
            <div className="relative flex h-8 items-center justify-center px-7 drop-shadow-[3px_3px_0_#000]">
              <img
                src={resolveAssetSrc(UI_HEADER_GOTHIC_CRIMSON)}
                alt=""
                aria-hidden
                draggable={false}
                className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
              />
              <span className="relative z-10 text-[9px] text-cyan-300 text-stroke-pixel sm:text-[10px]">
                NIM: {student.nim}
              </span>
            </div>
          )}
        </div>

        {/* Stacked Red "Kehadiran" Bar & Indented Blue "Tugas" Bar */}
        <div className="flex flex-col gap-1">
          <SkullStatBar
            label="Kehadiran"
            stat={student.kehadiran}
            colorTheme="red"
          />
          <SkullStatBar
            label="Tugas"
            stat={student.tugas}
            colorTheme="blue"
            indent
          />
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Modular Modals (PIN/QR & Avatar)                     */
/* -------------------------------------------------------------------------- */

interface CodeModalProps {
  readonly initialCode?: string;
  readonly onClose: () => void;
  readonly onSubmit: (code: string) => void;
}

function CodeModal({ initialCode = "COBA", onClose, onSubmit }: CodeModalProps) {
  const [code, setCode] = useState<string>(initialCode);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase() || "COBA";
    onSubmit(cleaned);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="code-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
    >
      <div className="relative w-full max-w-md p-8 drop-shadow-[8px_8px_0_#000]">
        {/* Ornate Cut-Corner Gothic Frame (`20251029darkDwellers9SlicesE.png`) */}
        <img
          src={resolveAssetSrc(UI_PANEL_9SLICE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between pb-2">
            <h2 id="code-modal-title" className="text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
              MASUKAN KODE / SCAN
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="relative size-8 cursor-pointer overflow-hidden"
            >
              <img
                src={resolveAssetSrc(UI_CLOSE_BTN_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none select-none"
              />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-[10px] text-slate-200 text-stroke-pixel">
              PIN SESI KELAS / KUIS:
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CONTOH: COBA"
                maxLength={10}
                className="border-4 border-black bg-[#19102c] px-3 py-3 text-sm text-lime-300 uppercase outline-none"
              />
            </label>

            <div className="flex flex-col items-center gap-2 border-4 border-dashed border-amber-400 bg-black/50 p-4 text-center">
              <span className="text-[10px] text-amber-300">KAMERA QR SCANNER</span>
              <button
                type="button"
                onClick={() => onSubmit("COBA")}
                className="cursor-pointer border-2 border-black bg-amber-400 px-3 py-1.5 text-[10px] text-black hover:bg-amber-300"
              >
                Simulasi Scan QR
              </button>
            </div>

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="relative flex h-12 flex-1 cursor-pointer items-center justify-center"
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  <img
                    src={resolveAssetSrc(UI_BUTTON_SHEET)}
                    alt=""
                    draggable={false}
                    className="pixelated h-full w-[400%] max-w-none -translate-x-3/4 select-none"
                  />
                </div>
                <span className="relative z-10 text-xs text-white text-stroke-pixel">Batal</span>
              </button>
              <button
                type="submit"
                className="relative flex h-12 flex-1 cursor-pointer items-center justify-center"
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  <img
                    src={resolveAssetSrc(UI_BUTTON_SHEET)}
                    alt=""
                    draggable={false}
                    className="pixelated h-full w-[400%] max-w-none -translate-x-1/4 select-none"
                  />
                </div>
                <span className="relative z-10 text-xs text-white text-stroke-pixel">Gabung</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface CharacterModalProps {
  readonly characters: readonly CharacterOption[];
  readonly selectedId: string;
  readonly onClose: () => void;
  readonly onSelect: (character: CharacterOption) => void;
}

function CharacterModal({
  characters,
  selectedId,
  onClose,
  onSelect,
}: CharacterModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-modal-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
    >
      <div className="relative w-full max-w-2xl p-9 drop-shadow-[8px_8px_0_#000]">
        {/* Ornate Cut-Corner Gothic Frame (`20251029darkDwellers9SlicesE.png`) */}
        <img
          src={resolveAssetSrc(UI_PANEL_9SLICE)}
          alt=""
          aria-hidden
          draggable={false}
          className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
        />

        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between pb-2">
            <h2 id="char-modal-title" className="text-xs text-yellow-300 text-stroke-pixel sm:text-sm">
              PILIH KARAKTER
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="relative size-8 cursor-pointer overflow-hidden"
            >
              <img
                src={resolveAssetSrc(UI_CLOSE_BTN_SHEET)}
                alt=""
                draggable={false}
                className="pixelated h-full w-[400%] max-w-none select-none"
              />
            </button>
          </div>

          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto p-1 sm:grid-cols-4">
            {characters.map((char) => {
              const isSelected = char.id === selectedId;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => onSelect(char)}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 p-4 text-center transition-transform hover:-translate-y-1"
                >
                  <img
                    src={resolveAssetSrc(UI_PANEL_9SLICE)}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className={`pixelated pointer-events-none absolute inset-0 h-full w-full select-none ${
                      isSelected ? "brightness-125 hue-rotate-[-30deg]" : "opacity-90"
                    }`}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <SpriteAvatar src={char.spriteSrc} alt={char.name} size="sm" />
                    <span className="text-[10px] leading-tight text-yellow-300 text-stroke-pixel">
                      {char.name}
                    </span>
                    {char.role && (
                      <span className="text-[8px] leading-tight text-slate-200 text-shadow-pixel">
                        {char.role}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function WaitingLobby({
  initialStudent,
  session = {
    statusText: "Misi: Menunggu Sesi Dimulai",
    courseName: "Riset Robotika",
    sessionCode: "RPI",
    playersOnline: 0,
  },
  availableCharacters = DEFAULT_CHARACTERS,
  initialPeers = DEFAULT_PEERS,
  joinedByDefault = false,
  onOpenCodeModal,
  onSubmitSessionCode,
  onOpenCharacterModal,
  onSelectCharacter,
  onPlayerMove,
  onSendMessage,
  onExit,
}: WaitingLobbyProps) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [currentSession, setCurrentSession] = useState<SessionInfo>(session);
  const [isJoined, setIsJoined] = useState<boolean>(joinedByDefault);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isCharModalOpen, setIsCharModalOpen] = useState<boolean>(false);
  const [exitBanner, setExitBanner] = useState<boolean>(false);

  /* ---- Interactive Multiplayer Arena State ---- */
  const [playerX, setPlayerX] = useState<number>(50);
  const [playerY, setPlayerY] = useState<number>(60);
  const [playerDirection, setPlayerDirection] = useState<PlayerDirection>("right");
  const [isPlayerMoving, setIsPlayerMoving] = useState<boolean>(false);
  const [playerBubble, setPlayerBubble] = useState<string | null>(null);
  const [peers, setPeers] = useState<readonly LobbyPeer[]>(initialPeers);
  const [chatMessages, setChatMessages] = useState<readonly LobbyChatMessage[]>([]);

  useEffect(() => {
    const saved = loadUserProfile();
    setStudent((prev) => ({
      ...prev,
      id: saved.id || prev.id,
      name: saved.name || prev.name,
      nim: saved.nim || prev.nim,
      level: saved.level || prev.level,
      character: saved.character || prev.character,
      kehadiran: saved.kehadiran || prev.kehadiran,
      tugas: saved.tugas || prev.tugas,
    }));

    void fetch("/api/db", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (db: {
          users?: Array<{
            id: string;
            nim: string;
            nama_ksatria: string;
            role: string;
          }>;
          grades?: Array<{
            maba_id: string;
            kehadiran_pertemuan?: boolean[];
            tugas_detail?: number[];
          }>;
          sessions?: Array<{
            rune_code: string;
            is_active: boolean;
          }>;
        }) => {
          const mabaUsers = (db.users ?? []).filter((u) => u.role === "maba");
          const activeSes =
            (db.sessions ?? []).find((s) => s.is_active) ?? db.sessions?.[0];

          setCurrentSession((prev) => ({
            ...prev,
            sessionCode: activeSes?.rune_code ?? prev.sessionCode,
            playersOnline: mabaUsers.length,
          }));

          // Sinkronkan kehadiran & tugas maba aktif dari database
          const myUser = mabaUsers.find(
            (u) =>
              u.id === saved.id ||
              (saved.nim && u.nim.toLowerCase() === saved.nim.toLowerCase()),
          );
          if (myUser) {
            const myGrade = (db.grades ?? []).find((g) => g.maba_id === myUser.id);
            const hadirCount = myGrade?.kehadiran_pertemuan
              ? myGrade.kehadiran_pertemuan.filter(Boolean).length
              : saved.kehadiran.current;
            const tugasCount = myGrade?.tugas_detail
              ? myGrade.tugas_detail.filter((t) => Number(t) > 0).length
              : saved.tugas.current;

            setStudent((prev) => ({
              ...prev,
              id: myUser.id,
              name: myUser.nama_ksatria,
              nim: myUser.nim,
              level: 1 + hadirCount,
              kehadiran: { current: hadirCount, max: 8 },
              tugas: { current: tugasCount, max: 3 },
            }));
          }

          // Tampilkan hanya peserta maba asli lain yang terdaftar di database (tanpa bot palsu)
          const otherMaba = mabaUsers.filter(
            (u) =>
              u.id !== (myUser?.id ?? saved.id) &&
              u.nim.toLowerCase() !== saved.nim.toLowerCase(),
          );
          const positions = [
            { x: 24, y: 48, dir: "right" as const },
            { x: 76, y: 44, dir: "left" as const },
            { x: 32, y: 74, dir: "right" as const },
            { x: 72, y: 72, dir: "left" as const },
          ];
          setPeers(
            otherMaba.map((u, idx) => {
              const pos = positions[idx % positions.length]!;
              const char =
                DEFAULT_CHARACTERS[(idx + 1) % DEFAULT_CHARACTERS.length]!;
              return {
                id: u.id,
                name: u.nama_ksatria,
                level: 1,
                character: char,
                x: pos.x,
                y: pos.y,
                direction: pos.dir,
                isMoving: false,
              };
            }),
          );
        },
      )
      .catch(() => {
        // ignore
      });
  }, []);

  const pressedKeysRef = useRef<Set<string>>(new Set());
  const playerPosRef = useRef<{ x: number; y: number; direction: PlayerDirection }>({
    x: 50,
    y: 60,
    direction: "right",
  });
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyCounterRef = useRef<number>(0);

  /* ---- Compute Nearest Peer for Proximity Interaction ---- */
  const nearestPeer = useMemo((): LobbyPeer | null => {
    if (!isJoined) return null;
    let closest: LobbyPeer | null = null;
    let minDistance = INTERACT_DISTANCE;

    for (const peer of peers) {
      const dist = Math.hypot(peer.x - playerX, peer.y - playerY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = peer;
      }
    }
    return closest;
  }, [isJoined, peers, playerX, playerY]);

  /* ---- Show temporary overhead speech bubble for local player ---- */
  const showPlayerSpeechBubble = useCallback((text: string): void => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    setPlayerBubble(text);
    bubbleTimerRef.current = setTimeout(() => {
      setPlayerBubble(null);
    }, 4500);
  }, []);

  /* ---- Send Chat Message & Trigger Contextual Peer Reply ---- */
  const handleSendChat = useCallback(
    (text: string, targetPeer?: LobbyPeer): void => {
      const cleaned = text.trim();
      if (!cleaned) return;

      onSendMessage?.(cleaned);
      showPlayerSpeechBubble(cleaned);

      const newMsg: LobbyChatMessage = {
        id: `msg-${Date.now()}-self`,
        senderId: student.id,
        senderName: student.name,
        text: cleaned,
        timestamp: formatTimeNow(),
        isSelf: true,
      };
      setChatMessages((prev) => [...prev.slice(-19), newMsg]);

      const responder =
        targetPeer ??
        nearestPeer ??
        peers[replyCounterRef.current % Math.max(1, peers.length)];

      if (responder) {
        const replyIndex = replyCounterRef.current % PEER_REPLIES.length;
        replyCounterRef.current += 1;
        const replyText = PEER_REPLIES[replyIndex] ?? "Halo! Semangat kuisnya!";

        setTimeout(() => {
          setPeers((prev) =>
            prev.map((p) =>
              p.id === responder.id
                ? {
                    ...p,
                    direction: playerPosRef.current.x < p.x ? "left" : "right",
                  }
                : p,
            ),
          );
          setChatMessages((prev) => [
            ...prev.slice(-19),
            {
              id: `msg-${Date.now()}-${responder.id}`,
              senderId: responder.id,
              senderName: responder.name,
              text: replyText,
              timestamp: formatTimeNow(),
            },
          ]);
        }, 850);
      }
    },
    [nearestPeer, onSendMessage, peers, showPlayerSpeechBubble, student.id, student.name],
  );

  /* ---- Greet a specific peer (`[E]` key or clicking the peer) ---- */
  const handleGreetPeer = useCallback(
    (peer: LobbyPeer): void => {
      const nextDir: PlayerDirection = peer.x < playerPosRef.current.x ? "left" : "right";
      setPlayerDirection(nextDir);
      playerPosRef.current.direction = nextDir;

      handleSendChat(`Halo ${peer.name}, siap kuis belum?`, peer);
    },
    [handleSendChat],
  );

  /* ---- Step Move (for On-Screen D-Pad buttons) ---- */
  const handleStepMove = useCallback(
    (dx: number, dy: number): void => {
      const nextX = clamp(
        playerPosRef.current.x + dx,
        ARENA_BOUNDS.minX,
        ARENA_BOUNDS.maxX,
      );
      const nextY = clamp(
        playerPosRef.current.y + dy,
        ARENA_BOUNDS.minY,
        ARENA_BOUNDS.maxY,
      );
      const nextDir: PlayerDirection =
        dx < 0 ? "left" : dx > 0 ? "right" : playerPosRef.current.direction;

      playerPosRef.current = { x: nextX, y: nextY, direction: nextDir };
      setPlayerX(nextX);
      setPlayerY(nextY);
      setPlayerDirection(nextDir);
      setIsPlayerMoving(true);
      onPlayerMove?.({ x: nextX, y: nextY, direction: nextDir });

      if (stepMoveTimerRef.current) {
        clearTimeout(stepMoveTimerRef.current);
      }
      stepMoveTimerRef.current = setTimeout(() => {
        setIsPlayerMoving(false);
      }, 280);
    },
    [onPlayerMove],
  );

  /* ---- Keyboard Movement Loop (WASD & Arrow Keys + [E] Interact + [Enter] Chat) ---- */
  useEffect(() => {
    if (!isJoined || isCodeModalOpen || isCharModalOpen) {
      pressedKeysRef.current.clear();
      setIsPlayerMoving(false);
      return;
    }

    const isTypingInInput = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
    };

    const MOVEMENT_KEYS = new Set([
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "w",
      "a",
      "s",
      "d",
    ]);

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (isTypingInInput(e.target)) return;

      const key = e.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
        pressedKeysRef.current.add(key);
        return;
      }

      if (key === "e" && nearestPeer) {
        e.preventDefault();
        handleGreetPeer(nearestPeer);
        return;
      }

      if (key === "enter") {
        const input = document.querySelector<HTMLInputElement>(
          'input[data-lobby-chat-input="true"]',
        );
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      const key = e.key.toLowerCase();
      pressedKeysRef.current.delete(key);
      if (pressedKeysRef.current.size === 0) {
        setIsPlayerMoving(false);
      }
    };

    const handleWindowBlur = (): void => {
      pressedKeysRef.current.clear();
      setIsPlayerMoving(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    let animFrameId = 0;
    let lastTime = performance.now();

    const tick = (now: number): void => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const keys = pressedKeysRef.current;
      let dx = 0;
      let dy = 0;

      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;
      if (keys.has("arrowup") || keys.has("w")) dy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        const speed = 28; // arena % per second
        const moveX = (dx / length) * speed * dt;
        const moveY = (dy / length) * speed * dt;

        const nextX = clamp(
          playerPosRef.current.x + moveX,
          ARENA_BOUNDS.minX,
          ARENA_BOUNDS.maxX,
        );
        const nextY = clamp(
          playerPosRef.current.y + moveY,
          ARENA_BOUNDS.minY,
          ARENA_BOUNDS.maxY,
        );
        const nextDir: PlayerDirection =
          dx < 0 ? "left" : dx > 0 ? "right" : playerPosRef.current.direction;

        playerPosRef.current = { x: nextX, y: nextY, direction: nextDir };
        setPlayerX(nextX);
        setPlayerY(nextY);
        setPlayerDirection(nextDir);
        setIsPlayerMoving(true);
        onPlayerMove?.({ x: nextX, y: nextY, direction: nextDir });
      }

      animFrameId = window.requestAnimationFrame(tick);
    };

    animFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      window.cancelAnimationFrame(animFrameId);
    };
  }, [
    handleGreetPeer,
    isCharModalOpen,
    isCodeModalOpen,
    isJoined,
    nearestPeer,
    onPlayerMove,
  ]);

  /* ---- Gentle Autonomous Peer Strolling inside the Waiting Room ---- */
  useEffect(() => {
    if (!isJoined) return;

    const interval = setInterval(() => {
      setPeers((prev) =>
        prev.map((peer) => {
          if (Math.random() > 0.45) {
            return { ...peer, isMoving: false };
          }
          const deltaX = (Math.random() - 0.5) * 8;
          const deltaY = (Math.random() - 0.5) * 6;
          const nextX = clamp(peer.x + deltaX, ARENA_BOUNDS.minX + 4, ARENA_BOUNDS.maxX - 4);
          const nextY = clamp(peer.y + deltaY, ARENA_BOUNDS.minY + 4, ARENA_BOUNDS.maxY - 4);
          const nextDir: PlayerDirection =
            deltaX < -0.5 ? "left" : deltaX > 0.5 ? "right" : peer.direction;

          return {
            ...peer,
            x: nextX,
            y: nextY,
            direction: nextDir,
            isMoving: Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1,
          };
        }),
      );
    }, 2200);

    return () => clearInterval(interval);
  }, [isJoined]);

  /* ---- Handlers for Menu Actions ---- */
  const handleOpenCode = useCallback((): void => {
    onOpenCodeModal?.();
    setIsCodeModalOpen(true);
  }, [onOpenCodeModal]);

  const handleCodeSubmit = useCallback(
    (code: string): void => {
      onSubmitSessionCode?.(code);
      setCurrentSession((prev) => ({
        ...prev,
        sessionCode: code,
        statusText: `Misi: Sesi [${code}] — Menunggu Kuis Mulai`,
        playersOnline: peers.length + 1,
      }));
      setIsJoined(true);
      setIsCodeModalOpen(false);
    },
    [onSubmitSessionCode, peers.length],
  );

  const handleOpenCharacter = useCallback((): void => {
    onOpenCharacterModal?.();
    setIsCharModalOpen(true);
  }, [onOpenCharacterModal]);

  const handleSelectCharacter = useCallback(
    (character: CharacterOption): void => {
      setStudent((prev) => ({ ...prev, character }));
      const saved = loadUserProfile();
      saveUserProfile({ ...saved, character });
      onSelectCharacter?.(character);
      setIsCharModalOpen(false);
    },
    [onSelectCharacter],
  );

  const handleExit = useCallback((): void => {
    if (isJoined) {
      setIsJoined(false);
      setCurrentSession((prev) => ({
        ...prev,
        statusText: "Misi: Menunggu Sesi Dimulai",
      }));
      return;
    }
    if (onExit) {
      onExit();
      return;
    }
    setExitBanner(true);
    setTimeout(() => {
      router.push("/home");
    }, 450);
  }, [isJoined, onExit, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0e2e] font-pixel text-white">
      {/* Castle Lobby Background from /public/assets/background lobby/ */}
      <img
        src={resolveAssetSrc(LOBBY_BG_SRC)}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
      />

      {/* Atmospheric purple/magenta dungeon tint matching the reference image */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#2e1065]/45 via-[#4c1d95]/25 to-[#1e1b4b]/65"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
        {/* Top Row: 1. Left Panel (Action Menu) + 4. Top Right (Session Info) */}
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
          <ActionMenu
            isJoined={isJoined}
            onClickCode={handleOpenCode}
            onClickCharacter={handleOpenCharacter}
            onClickExit={handleExit}
          />

          <SessionInfoBox session={currentSession} isJoined={isJoined} />
        </div>

        {exitBanner && (
          <div
            role="status"
            className="relative mx-auto flex h-13 items-center justify-center px-12 drop-shadow-[4px_4px_0_#000]"
          >
            <img
              src={resolveAssetSrc(UI_HEADER_GOTHIC_GOLD)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-xs text-white text-stroke-pixel">
              Keluar dari sesi lobi...
            </span>
          </div>
        )}

        {/* Middle Row: 2. Center Arena (Solo Stage before joining, Interactive Multiplayer Arena after "Gabung") */}
        {isJoined ? (
          <InteractiveArena
            student={student}
            playerX={playerX}
            playerY={playerY}
            playerDirection={playerDirection}
            isPlayerMoving={isPlayerMoving}
            playerBubble={playerBubble}
            peers={peers}
            nearestPeer={nearestPeer}
            chatMessages={chatMessages}
            onStepMove={handleStepMove}
            onGreetPeer={handleGreetPeer}
            onSendChat={(text) => handleSendChat(text)}
          />
        ) : (
          <SoloPlayerStage
            student={student}
            onQuickJoin={() => handleCodeSubmit(currentSession.sessionCode ?? "COBA")}
          />
        )}

        {/* Bottom Row: 3. Bottom Panel (Hidden after clicking "Gabung" so arena has full floor space) */}
        {!isJoined && <StatusHud student={student} />}
      </div>

      {/* Modular PIN / QR Code Modal */}
      {isCodeModalOpen && (
        <CodeModal
          initialCode={currentSession.sessionCode}
          onClose={() => setIsCodeModalOpen(false)}
          onSubmit={handleCodeSubmit}
        />
      )}

      {/* Modular Character Selection Grid Modal */}
      {isCharModalOpen && (
        <CharacterModal
          characters={availableCharacters}
          selectedId={student.character.id}
          onClose={() => setIsCharModalOpen(false)}
          onSelect={handleSelectCharacter}
        />
      )}
    </main>
  );
}
