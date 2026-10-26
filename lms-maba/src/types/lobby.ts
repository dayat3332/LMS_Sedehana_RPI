/** A selectable pixel-art character sprite from `/public/assets/72 Character Free/`. */
export interface CharacterOption {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  /**
   * Path to the character sprite sheet (e.g.
   * `/public/assets/72 Character Free/Char 1/Character 1.png`).
   */
  readonly spriteSrc: string;
}

/** Value pair for RPG HP/MP-style progress bars. */
export interface StatBarValue {
  readonly current: number;
  readonly max: number;
}

/** Student profile and academic RPG stats displayed in the lobby & HUD. */
export interface StudentProfile {
  readonly id: string;
  readonly name: string;
  readonly nim?: string;
  readonly level?: number;
  readonly character: CharacterOption;
  /** Red HP-style bar ("Kehadiran"). */
  readonly kehadiran: StatBarValue;
  /** Blue MP-style bar ("Tugas"). */
  readonly tugas: StatBarValue;
}

/** Active quiz/class session metadata shown in the top-right dialog box. */
export interface SessionInfo {
  /** Status text, e.g. "Misi: Menunggu Sesi Dimulai". */
  readonly statusText: string;
  readonly courseName?: string;
  readonly sessionCode?: string;
  readonly playersOnline?: number;
}

/** Horizontal facing direction of a sprite in the interactive lobby arena. */
export type PlayerDirection = "left" | "right";

/** Another student waiting inside the interactive multiplayer lobby arena. */
export interface LobbyPeer {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly character: CharacterOption;
  /** Horizontal position in the arena (percentage `10` to `90`). */
  readonly x: number;
  /** Vertical position on the castle floor (percentage `20` to `86`). */
  readonly y: number;
  readonly direction: PlayerDirection;
  readonly isMoving?: boolean;
  /** Latest chat message shown in an overhead speech bubble. */
  readonly bubbleText?: string;
}

/** Chat message exchanged between students while waiting for the quiz to begin. */
export interface LobbyChatMessage {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly text: string;
  readonly timestamp: string;
  readonly isSelf?: boolean;
}

/**
 * Props for the `<WaitingLobby />` component.
 * Action callbacks can be connected directly to Next.js state, router, or Supabase Realtime/Auth.
 */
export interface WaitingLobbyProps {
  readonly initialStudent: StudentProfile;
  readonly session?: SessionInfo;
  readonly availableCharacters?: readonly CharacterOption[];
  /** Initial classmates in the interactive arena after clicking "Gabung". */
  readonly initialPeers?: readonly LobbyPeer[];
  /** If true, starts directly in the interactive multiplayer arena state. */
  readonly joinedByDefault?: boolean;
  /** Triggered when "Masukan Kode / Scan" is clicked. */
  readonly onOpenCodeModal?: () => void;
  /** Triggered when a PIN/QR code is submitted from the modal (e.g. Supabase channel join). */
  readonly onSubmitSessionCode?: (code: string) => void | Promise<void>;
  /** Triggered when "Ganti Karakter" is clicked. */
  readonly onOpenCharacterModal?: () => void;
  /** Triggered when a new character is selected (e.g. Supabase profile update). */
  readonly onSelectCharacter?: (character: CharacterOption) => void | Promise<void>;
  /** Triggered when the player moves in the arena (e.g. Supabase Realtime Presence/Broadcast). */
  readonly onPlayerMove?: (position: {
    readonly x: number;
    readonly y: number;
    readonly direction: PlayerDirection;
  }) => void;
  /** Triggered when the player sends a chat message in the lobby. */
  readonly onSendMessage?: (text: string) => void | Promise<void>;
  /** Triggered when "Keluar" is clicked (e.g. Supabase signOut / router.push). */
  readonly onExit?: () => void | Promise<void>;
}

const CHAR_BASE = "/public/assets/72 Character Free";

/** Default character roster pointing to `/public/assets/72 Character Free/`. */
export const DEFAULT_CHARACTERS: readonly CharacterOption[] = [
  {
    id: "char-1",
    name: "SATRIA",
    role: "Paladin Koding",
    spriteSrc: `${CHAR_BASE}/Char 1/Character 1.png`,
  },
  {
    id: "char-2",
    name: "RANGGA",
    role: "Penyihir Algoritma",
    spriteSrc: `${CHAR_BASE}/Char 2/Character 5.png`,
  },
  {
    id: "char-3",
    name: "BIMA",
    role: "Penjaga Jaringan",
    spriteSrc: `${CHAR_BASE}/Char 3/Character 9.png`,
  },
  {
    id: "char-4",
    name: "KIRANA",
    role: "Pemanah Data",
    spriteSrc: `${CHAR_BASE}/Char 4/Character 1.png`,
  },
  {
    id: "char-5",
    name: "ARKA",
    role: "Ksatria Siber",
    spriteSrc: `${CHAR_BASE}/Char 5/Character 5.png`,
  },
  {
    id: "char-6",
    name: "CITRA",
    role: "Alkemis Basisdata",
    spriteSrc: `${CHAR_BASE}/Char 6/Character 9.png`,
  },
  {
    id: "char-7",
    name: "DAFFA",
    role: "Pengelana Cloud",
    spriteSrc: `${CHAR_BASE}/Char 7/Character 1.png`,
  },
  {
    id: "char-8",
    name: "NAYLA",
    role: "Ahli Logika",
    spriteSrc: `${CHAR_BASE}/Char 8/Character 5.png`,
  },
];

/** Default classmates waiting inside the lobby arena (dinolkan / tanpa bot palsu). */
export const DEFAULT_PEERS: readonly LobbyPeer[] = [];
