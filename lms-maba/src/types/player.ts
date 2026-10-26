/** Ranks that are rendered on the podium. */
export type PodiumRank = 1 | 2 | 3;

/** Shared fields for every player in the final results. */
export interface BasePlayer {
  /** Stable unique identifier (used as React key). */
  readonly id: string;
  /** Final placement, 1-based. */
  readonly rank: number;
  readonly username: string;
  readonly points: number;
}

/** A top-3 player standing on the podium. */
export interface PodiumPlayer extends BasePlayer {
  readonly rank: PodiumRank;
  /**
   * Path (relative to /public) of a character sprite sheet from
   * `/assets/72 Character Free/`. Sheets are a grid of 64x64 frames;
   * the first row holds the 4-frame idle animation.
   */
  readonly spriteSrc: string;
}

/** A player listed on the side leaderboard (rank 4 and below). */
export interface LeaderboardPlayer extends BasePlayer {
  /** Path (relative to /public) of an avatar icon from `/assets/DEMO_Cozy_UI_Pack_doboui/`. */
  readonly avatarSrc: string;
  /** Optional character sprite sheet from `/assets/72 Character Free/` for RPG portrait rendering. */
  readonly spriteSrc?: string;
}

export interface FinalResultsProps {
  /** Exactly the top three players, in any order. */
  readonly podium: readonly [PodiumPlayer, PodiumPlayer, PodiumPlayer];
  /** Players ranked #4 to #8 (extra entries are ignored). */
  readonly leaderboard: readonly LeaderboardPlayer[];
  readonly title?: string;
}
