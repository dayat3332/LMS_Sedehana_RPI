"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import RpgPageBackground from "@/components/shared/RpgPageBackground";
import { RpgPortraitArch } from "@/components/shared/RpgSpriteAvatar";
import WonderTitleLogo from "@/components/shared/WonderTitleLogo";
import {
  resolveAssetSrc,
  UI_BUTTON_SHEET,
  UI_CURSOR_HORIZ_SHEET,
  UI_HEADER_GOTHIC_SLATE,
  UI_HEADER_PURPLE,
} from "@/lib/assets";
import {
  loadUserProfile,
  syncActiveUserWithServer,
} from "@/lib/user-storage";
import { DEFAULT_USER_PROFILE, type UserAccountProfile } from "@/types/auth";

interface HomeMenuItem {
  readonly id: "absensi" | "kuis" | "keluar";
  readonly label: string;
  readonly subtitle: string;
  readonly href: string;
  readonly variant?: "default" | "danger";
}

const HOME_MENU_ITEMS: readonly HomeMenuItem[] = [
  {
    id: "absensi",
    label: "ABSENSI",
    subtitle: "Presensi & Scan QR",
    href: "/absensi",
    variant: "default",
  },
  {
    id: "kuis",
    label: "KUIS",
    subtitle: "Lobi & Arena Battle",
    href: "/lobby",
    variant: "default",
  },
  {
    id: "keluar",
    label: "KELUAR",
    subtitle: "Ganti Akun Login",
    href: "/login",
    variant: "danger",
  },
];

/**
 * Halaman Home (`HomeView`):
 * - Tata letak mengikuti layar judul referensi (Wonder Boy): menu di sisi kiri, ilustrasi ksatria di sisi kanan.
 * - Desain visual menggunakan elemen 2D Pixel RPG yang sama dengan halaman Kuis & Lobi
 *   (font pixel, tombol pedang/berlian Dark Dwellers, kursor belati emas animasi, dan potret karakter).
 */
export default function HomeView() {
  const router = useRouter();
  const [user, setUser] = useState<UserAccountProfile>(DEFAULT_USER_PROFILE);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    setUser(loadUserProfile());
    void syncActiveUserWithServer().then((synced) => {
      setUser(synced);
    });
  }, []);

  const handleSelectMenu = useCallback(
    (item: HomeMenuItem): void => {
      router.push(item.href);
    },
    [router],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + HOME_MENU_ITEMS.length) % HOME_MENU_ITEMS.length,
        );
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % HOME_MENU_ITEMS.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const chosen = HOME_MENU_ITEMS[activeIndex];
        if (chosen) {
          handleSelectMenu(chosen);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, handleSelectMenu]);

  return (
    <RpgPageBackground>
      <div className="flex min-h-screen w-full flex-col justify-between px-5 py-7 font-pixel sm:px-12 sm:py-10 md:w-[54%] lg:w-[48%] lg:pl-16">
        {/* 1. Kiri Atas: Logo Judul 2D RPG */}
        <header className="pt-2">
          <WonderTitleLogo
            title="LMS RPI"
            subtitle="THE RESEARCH QUEST"
          />
        </header>

        {/* 2. Kiri Tengah: Daftar Menu 2D RPG (Absensi & Kuis) seperti gaya menu di layar judul */}
        <nav
          aria-label="Menu Utama Home 2D RPG"
          className="my-auto flex flex-col items-start gap-3.5 py-6"
        >
          <div className="relative mb-1 flex h-8 items-center justify-center px-6 drop-shadow-[3px_3px_0_#000]">
            <img
              src={resolveAssetSrc(UI_HEADER_PURPLE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[8px] text-amber-200 text-stroke-pixel sm:text-[9px]">
              PILIH MISI UTAMA:
            </span>
          </div>

          {HOME_MENU_ITEMS.map((item, index) => {
            const isActive = activeIndex === index;
            const isDanger = item.variant === "danger";

            return (
              <div
                key={item.id}
                className={`flex items-center transition-transform duration-150 ${
                  isActive ? "translate-x-3 sm:translate-x-4" : "translate-x-0"
                }`}
              >
                {/* Kursor Belati Emas 2D RPG pada menu yang dipilih (sama seperti di Kuis & Lobi) */}
                <div
                  aria-hidden
                  className={`mr-2 h-8 w-13 shrink-0 overflow-hidden drop-shadow-[3px_3px_0_#000] transition-all sm:h-10 sm:w-16 ${
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

                {/* Tombol 2D RPG Diamond-Tipped */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => handleSelectMenu(item)}
                  className="group relative flex h-15 w-72 cursor-pointer flex-col items-center justify-center px-8 text-center drop-shadow-[5px_5px_0_#000] transition-transform active:translate-x-1 active:translate-y-1 sm:h-17 sm:w-84"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                  >
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

                  <span
                    className={`relative z-10 text-xs tracking-wider text-stroke-pixel sm:text-sm ${
                      isActive ? "text-yellow-300" : "text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="relative z-10 mt-0.5 text-[7px] text-cyan-200 text-stroke-pixel sm:text-[8px]">
                    {item.subtitle}
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* 3. Kiri Bawah: Badge Profil Ksatria Aktif 2D RPG */}
        <footer className="flex items-center gap-3 self-start drop-shadow-[4px_4px_0_#000]">
          <RpgPortraitArch
            spriteSrc={user.character.spriteSrc}
            alt={user.name}
            level={user.level}
          />

          <div className="relative flex min-h-14 flex-col justify-center px-7 py-2.5">
            <img
              src={resolveAssetSrc(UI_HEADER_GOTHIC_SLATE)}
              alt=""
              aria-hidden
              draggable={false}
              className="pixelated pointer-events-none absolute inset-0 h-full w-full select-none"
            />
            <span className="relative z-10 text-[9px] text-yellow-300 text-stroke-pixel sm:text-[10px]">
              {user.name}
            </span>
            <span className="relative z-10 mt-0.5 text-[7px] text-lime-300 text-stroke-pixel sm:text-[8px]">
              {user.prodi} • {user.divisiRiset}
            </span>
          </div>
        </footer>
      </div>
    </RpgPageBackground>
  );
}
