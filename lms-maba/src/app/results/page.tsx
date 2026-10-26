"use client";

import { useEffect, useState } from "react";
import FinalResults from "@/components/results/FinalResults";
import { loadUserProfile } from "@/lib/user-storage";
import { DEFAULT_CHARACTERS } from "@/types/lobby";
import type { LeaderboardPlayer, PodiumPlayer, PodiumRank } from "@/types/player";

const CHECKBOX_ICON =
  "/public/assets/DEMO_Cozy_UI_Pack_doboui/Checkboxes/Checkbox2_checked.png";

const EMPTY_PODIUM: readonly [PodiumPlayer, PodiumPlayer, PodiumPlayer] = [
  {
    id: "empty-1",
    rank: 1,
    username: "-",
    points: 0,
    spriteSrc: DEFAULT_CHARACTERS[0]!.spriteSrc,
  },
  {
    id: "empty-2",
    rank: 2,
    username: "-",
    points: 0,
    spriteSrc: DEFAULT_CHARACTERS[1]!.spriteSrc,
  },
  {
    id: "empty-3",
    rank: 3,
    username: "-",
    points: 0,
    spriteSrc: DEFAULT_CHARACTERS[2]!.spriteSrc,
  },
];

export default function ResultsPage() {
  const [podium, setPodium] =
    useState<readonly [PodiumPlayer, PodiumPlayer, PodiumPlayer]>(EMPTY_PODIUM);
  const [leaderboard, setLeaderboard] = useState<readonly LeaderboardPlayer[]>([]);

  useEffect(() => {
    const profile = loadUserProfile();

    void fetch("/api/db", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (db: {
          users?: Array<{
            id: string;
            nama_ksatria: string;
            role: string;
          }>;
          grades?: Array<{
            maba_id: string;
            nilai_akhir: number;
          }>;
        }) => {
          const mabaUsers = (db.users ?? []).filter((u) => u.role === "maba");
          const grades = db.grades ?? [];

          const roster = mabaUsers.map((u, idx) => {
            const g = grades.find((gr) => gr.maba_id === u.id);
            const pts = Math.round(Number(g?.nilai_akhir ?? 0) * 10);
            const isSelf =
              u.id === profile.id ||
              u.nama_ksatria.toLowerCase() === profile.name.toLowerCase();
            return {
              id: isSelf ? "player-self" : u.id,
              username: u.nama_ksatria,
              points: pts,
              spriteSrc: isSelf
                ? profile.character.spriteSrc
                : DEFAULT_CHARACTERS[idx % DEFAULT_CHARACTERS.length]!.spriteSrc,
              avatarSrc: CHECKBOX_ICON,
            };
          });

          roster.sort((a, b) => b.points - a.points);

          const nextPodium: [PodiumPlayer, PodiumPlayer, PodiumPlayer] = [
            roster[0]
              ? {
                  id: roster[0].id,
                  rank: 1 as PodiumRank,
                  username: roster[0].username,
                  points: roster[0].points,
                  spriteSrc: roster[0].spriteSrc,
                }
              : EMPTY_PODIUM[0],
            roster[1]
              ? {
                  id: roster[1].id,
                  rank: 2 as PodiumRank,
                  username: roster[1].username,
                  points: roster[1].points,
                  spriteSrc: roster[1].spriteSrc,
                }
              : EMPTY_PODIUM[1],
            roster[2]
              ? {
                  id: roster[2].id,
                  rank: 3 as PodiumRank,
                  username: roster[2].username,
                  points: roster[2].points,
                  spriteSrc: roster[2].spriteSrc,
                }
              : EMPTY_PODIUM[2],
          ];

          const nextLeaderboard: LeaderboardPlayer[] = roster
            .slice(3, 8)
            .map((entry, idx) => ({
              id: entry.id,
              rank: idx + 4,
              username: entry.username,
              points: entry.points,
              avatarSrc: entry.avatarSrc,
              spriteSrc: entry.spriteSrc,
            }));

          setPodium(nextPodium);
          setLeaderboard(nextLeaderboard);
        },
      )
      .catch(() => {
        // ignore
      });
  }, []);

  return <FinalResults podium={podium} leaderboard={leaderboard} />;
}
