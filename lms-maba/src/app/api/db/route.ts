import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface DbUserRow {
  id: string;
  email: string;
  nama_ksatria: string;
  nim: string;
  prodi: string;
  divisi: string;
  faksi: string;
  password?: string;
  role: "maba" | "admin";
  created_at: string;
}

export interface DbSessionRow {
  id: string;
  rune_code: string;
  is_active: boolean;
  created_at: string;
}

export interface DbLogRow {
  id: string;
  session_id: string;
  maba_id: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPHA";
  qr_code?: string;
  created_at: string;
}

export interface DbQuizRow {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  created_at: string;
}

export interface DbGradeRow {
  id: string;
  maba_id: string;
  kehadiran_pertemuan: boolean[];
  keaktifan_pertemuan: number[];
  tugas_detail: number[];
  kehadiran: number;
  keaktifan: number;
  tugas: number;
  ujian: number;
  nilai_akhir: number;
  updated_at?: string;
}

export interface SharedDatabaseSchema {
  users: DbUserRow[];
  sessions: DbSessionRow[];
  logs: DbLogRow[];
  quizzes: DbQuizRow[];
  grades: DbGradeRow[];
  reset_at?: string;
}

const EMPTY_DB: SharedDatabaseSchema = {
  users: [],
  sessions: [],
  logs: [],
  quizzes: [],
  grades: [],
  reset_at: "",
};

function getDbFilePath(): string {
  if (process.env.SHARED_DB_PATH) {
    return process.env.SHARED_DB_PATH;
  }
  return path.resolve(process.cwd(), "../data/db.json");
}

function readDb(): SharedDatabaseSchema {
  const filePath = getDbFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(EMPTY_DB, null, 2), "utf-8");
      return structuredClone(EMPTY_DB);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SharedDatabaseSchema>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      grades: Array.isArray(parsed.grades) ? parsed.grades : [],
      reset_at: typeof parsed.reset_at === "string" ? parsed.reset_at : "",
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function writeDb(db: SharedDatabaseSchema): void {
  const filePath = getDbFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf-8");
}

function computeGradeScores(grade: {
  kehadiran_pertemuan: boolean[];
  keaktifan_pertemuan: number[];
  tugas_detail: number[];
  ujian: number;
}) {
  const hadirCount = grade.kehadiran_pertemuan.slice(0, 8).filter(Boolean).length;
  const kehadiran = Math.round((hadirCount / 8) * 100 * 100) / 100;

  const keaktifanItems = grade.keaktifan_pertemuan.slice(0, 8);
  const keaktifan =
    keaktifanItems.length > 0
      ? Math.round(
          (keaktifanItems.reduce((acc, v) => acc + Number(v || 0), 0) / 8) * 100,
        ) / 100
      : 0;

  const tugasItems = grade.tugas_detail.slice(0, 3);
  const tugas =
    tugasItems.length > 0
      ? Math.round(
          (tugasItems.reduce((acc, v) => acc + Number(v || 0), 0) / 3) * 100,
        ) / 100
      : 0;

  const ujian = Math.max(0, Math.min(100, Number(grade.ujian || 0)));
  const nilai_akhir =
    Math.round((kehadiran * 0.2 + keaktifan * 0.2 + tugas * 0.3 + ujian * 0.3) * 100) /
    100;

  return { kehadiran, keaktifan, tugas, ujian, nilai_akhir };
}

function formatFaksi(prodi: string, divisi: string, fallbackFaksi?: string): string {
  const p = prodi.trim();
  const d = divisi.trim();
  if (p && d) {
    return d.toLowerCase().startsWith("divisi") ? `${p} - ${d}` : `${p} - Divisi ${d}`;
  }
  if (fallbackFaksi?.trim()) return fallbackFaksi.trim();
  if (p) return p;
  if (d) return `Divisi ${d}`;
  return "Belum Ditentukan";
}

function parseProdiDivisiFromFaksi(faksi: string): { prodi: string; divisi: string } {
  const parts = faksi.split(/\s*-\s*/);
  if (parts.length >= 2) {
    const prodi = parts[0]!.trim();
    const rawDiv = parts.slice(1).join(" - ").replace(/^divisi\s+/i, "").trim();
    return { prodi, divisi: rawDiv || "Program" };
  }
  return { prodi: faksi.trim(), divisi: "Program" };
}

function ensureGradeForUser(db: SharedDatabaseSchema, mabaId: string): DbGradeRow {
  let existing = db.grades.find((g) => g.maba_id === mabaId);
  if (!existing) {
    existing = {
      id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      maba_id: mabaId,
      kehadiran_pertemuan: [false, false, false, false, false, false, false, false],
      keaktifan_pertemuan: [0, 0, 0, 0, 0, 0, 0, 0],
      tugas_detail: [0, 0, 0],
      kehadiran: 0,
      keaktifan: 0,
      tugas: 0,
      ujian: 0,
      nilai_akhir: 0,
      updated_at: new Date().toISOString(),
    };
    db.grades.push(existing);
  }
  return existing;
}

export async function GET() {
  const db = readDb();
  return NextResponse.json(db);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: string;
    payload?: Record<string, unknown>;
  };
  const db = readDb();
  const payload = body.payload ?? {};

  switch (body.action) {
    case "reset_all": {
      const resetDb: SharedDatabaseSchema = {
        ...structuredClone(EMPTY_DB),
        reset_at: new Date().toISOString(),
      };
      writeDb(resetDb);
      return NextResponse.json(resetDb);
    }

    case "register_maba":
    case "create_maba": {
      const nim = String(payload.nim ?? "").trim();
      const nama_ksatria = String(payload.nama_ksatria ?? payload.name ?? "")
        .trim()
        .toUpperCase();
      const email = String(payload.email ?? "").trim().toLowerCase();
      const rawFaksi = String(payload.faksi ?? "").trim();
      const parsedFromFaksi = parseProdiDivisiFromFaksi(rawFaksi);
      const prodi = String(payload.prodi ?? parsedFromFaksi.prodi ?? "").trim();
      const divisi = String(
        payload.divisi ?? payload.divisiRiset ?? parsedFromFaksi.divisi ?? "",
      ).trim();
      const faksi = formatFaksi(prodi, divisi, rawFaksi);
      const password = payload.password ? String(payload.password) : undefined;

      const existingIdx = db.users.findIndex(
        (u) =>
          u.role === "maba" &&
          ((nim && nim !== "-" && u.nim.toLowerCase() === nim.toLowerCase()) ||
            (email && email !== "-" && u.email.toLowerCase() === email.toLowerCase())),
      );

      let savedUser: DbUserRow;
      if (existingIdx >= 0) {
        const prev = db.users[existingIdx]!;
        savedUser = {
          ...prev,
          nim: nim || prev.nim,
          nama_ksatria: nama_ksatria || prev.nama_ksatria,
          email: email || prev.email,
          prodi: prodi || prev.prodi,
          divisi: divisi || prev.divisi,
          faksi,
          password: password ?? prev.password,
        };
        db.users[existingIdx] = savedUser;
      } else {
        savedUser = {
          id: String(payload.id ?? `u-maba-${Date.now()}`),
          nim,
          nama_ksatria,
          email,
          prodi,
          divisi,
          faksi,
          password,
          role: "maba",
          created_at: new Date().toISOString(),
        };
        db.users.unshift(savedUser);
      }

      ensureGradeForUser(db, savedUser.id);
      writeDb(db);
      return NextResponse.json({ user: savedUser, db });
    }

    case "login_maba": {
      const identifier = String(payload.identifier ?? "").trim().toLowerCase();
      const password = String(payload.password ?? "").trim();

      const matched = db.users.find(
        (u) =>
          u.role === "maba" &&
          (u.nim.toLowerCase() === identifier ||
            u.email.toLowerCase() === identifier ||
            u.nama_ksatria.toLowerCase() === identifier),
      );

      if (!matched) {
        return NextResponse.json(
          {
            found: false,
            error:
              "PERINGATAN: Akun belum terdaftar di database! Silakan klik REGISTER terlebih dahulu.",
          },
          { status: 404 },
        );
      }

      if (matched.password && password && matched.password !== password) {
        return NextResponse.json(
          {
            found: false,
            error: "PERINGATAN: Password yang dimasukkan salah!",
          },
          { status: 401 },
        );
      }

      const userLogs = db.logs.filter((l) => l.maba_id === matched.id);
      const userGrade = ensureGradeForUser(db, matched.id);
      writeDb(db);

      return NextResponse.json({
        found: true,
        user: matched,
        logs: userLogs,
        grade: userGrade,
        db,
      });
    }

    case "create_session": {
      const rune_code = String(payload.rune_code ?? "")
        .trim()
        .toUpperCase();
      const existingIdx = db.sessions.findIndex(
        (s) => s.rune_code.toUpperCase() === rune_code,
      );
      db.sessions = db.sessions.map((s) => ({ ...s, is_active: false }));
      if (existingIdx >= 0) {
        const target = { ...db.sessions[existingIdx]!, is_active: true };
        db.sessions.splice(existingIdx, 1);
        db.sessions.unshift(target);
      } else {
        const newSession: DbSessionRow = {
          id: `ses-${Date.now()}`,
          rune_code,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.sessions.unshift(newSession);
      }
      writeDb(db);
      return NextResponse.json(db);
    }

    case "record_log":
    case "record_maba_attendance": {
      const status = String(payload.status ?? "HADIR").toUpperCase() as
        | "HADIR"
        | "IZIN"
        | "SAKIT"
        | "ALPHA";
      const qrCode = payload.qr_code
        ? String(payload.qr_code).trim().toUpperCase()
        : undefined;

      // Pastikan user maba ditemukan (berdasarkan maba_id, nim, email, atau nama_ksatria)
      let mabaId = String(payload.maba_id ?? "");
      const nim = String(payload.nim ?? "").trim();
      const rawNama = String(payload.nama_ksatria ?? "")
        .trim()
        .toUpperCase();
      const nama_ksatria =
        rawNama && rawNama !== "BELUM TERDAFTAR" ? rawNama : "";
      const email = String(payload.email ?? "").trim().toLowerCase();
      const prodi = String(payload.prodi ?? "").trim();
      const divisi = String(payload.divisi ?? "").trim();

      let user = db.users.find(
        (u) =>
          u.role === "maba" &&
          ((mabaId && mabaId !== "u-maba-unregistered" && u.id === mabaId) ||
            (nim && nim !== "-" && u.nim.toLowerCase() === nim.toLowerCase()) ||
            (email && email !== "-" && u.email.toLowerCase() === email.toLowerCase()) ||
            (nama_ksatria && u.nama_ksatria.toUpperCase() === nama_ksatria)),
      );

      // Jika scan dilakukan dari perangkat berbeda (misal HP) yang belum login lokal,
      // gunakan akun maba terbaru yang sudah terdaftar di database
      if (!user && (!nim || nim === "-") && !nama_ksatria) {
        user = db.users.find((u) => u.role === "maba");
      }

      if (!user && ((nim && nim !== "-") || nama_ksatria)) {
        user = {
          id:
            mabaId && mabaId !== "u-maba-unregistered"
              ? mabaId
              : `u-maba-${Date.now()}`,
          nim: nim && nim !== "-" ? nim : "-",
          nama_ksatria: nama_ksatria || "KSATRIA MABA",
          email: email && email !== "-" ? email : "-",
          prodi: prodi && prodi !== "-" ? prodi : "-",
          divisi: divisi || "Hardware",
          faksi: formatFaksi(
            prodi && prodi !== "-" ? prodi : "",
            divisi || "Hardware",
          ),
          role: "maba",
          created_at: new Date().toISOString(),
        };
        db.users.unshift(user);
      } else if (user && nama_ksatria) {
        user.nama_ksatria = nama_ksatria;
      }

      if (user) {
        mabaId = user.id;
      }

      // Tentukan session_id: utamakan sesi aktif atau sesi yang cocok dengan kode QR
      let sessionId = String(payload.session_id ?? "");
      if (!sessionId) {
        let session =
          qrCode && qrCode !== "FORM-KIRIM"
            ? db.sessions.find((s) => s.rune_code.toUpperCase() === qrCode)
            : undefined;

        if (session) {
          db.sessions = db.sessions.map((s) => ({
            ...s,
            is_active: s.id === session!.id,
          }));
        } else {
          session = db.sessions.find((s) => s.is_active) ?? db.sessions[0];
          if (session && !session.is_active) {
            session.is_active = true;
          }
        }

        if (!session) {
          session = {
            id: `ses-${Date.now()}`,
            rune_code:
              qrCode && qrCode !== "FORM-KIRIM" ? qrCode : "RPI-ABSEN-2026",
            is_active: true,
            created_at: new Date().toISOString(),
          };
          db.sessions.unshift(session);
        }
        sessionId = session.id;
      }

      if (mabaId && mabaId !== "u-maba-unregistered") {
        const existingIdx = db.logs.findIndex(
          (l) => l.session_id === sessionId && l.maba_id === mabaId,
        );

        if (existingIdx >= 0) {
          db.logs[existingIdx] = {
            ...db.logs[existingIdx]!,
            status,
            qr_code: qrCode ?? db.logs[existingIdx]!.qr_code,
            created_at: new Date().toISOString(),
          };
        } else {
          db.logs.unshift({
            id: `log-${Date.now()}`,
            session_id: sessionId,
            maba_id: mabaId,
            status,
            qr_code: qrCode,
            created_at: new Date().toISOString(),
          });
        }

        // Sinkronkan jumlah kehadiran HADIR ke tabel grades
        const grade = ensureGradeForUser(db, mabaId);
        const hadirLogsCount = db.logs.filter(
          (l) => l.maba_id === mabaId && l.status === "HADIR",
        ).length;
        const currentTrueCount = grade.kehadiran_pertemuan.filter(Boolean).length;
        const targetCount = Math.min(8, Math.max(currentTrueCount, hadirLogsCount));
        grade.kehadiran_pertemuan = Array.from(
          { length: 8 },
          (_, idx) => idx < targetCount,
        );
        const scores = computeGradeScores(grade);
        grade.kehadiran = scores.kehadiran;
        grade.keaktifan = scores.keaktifan;
        grade.tugas = scores.tugas;
        grade.ujian = scores.ujian;
        grade.nilai_akhir = scores.nilai_akhir;
        grade.updated_at = new Date().toISOString();
      }

      writeDb(db);
      return NextResponse.json(db);
    }

    case "upsert_grade": {
      const maba_id = String(payload.maba_id ?? "");
      const kehadiran_pertemuan = Array.isArray(payload.kehadiran_pertemuan)
        ? (payload.kehadiran_pertemuan as boolean[])
        : [false, false, false, false, false, false, false, false];
      const keaktifan_pertemuan = Array.isArray(payload.keaktifan_pertemuan)
        ? (payload.keaktifan_pertemuan as number[])
        : [0, 0, 0, 0, 0, 0, 0, 0];
      const tugas_detail = Array.isArray(payload.tugas_detail)
        ? (payload.tugas_detail as number[])
        : [0, 0, 0];
      const ujian = Number(payload.ujian ?? 0);

      const scores = computeGradeScores({
        kehadiran_pertemuan,
        keaktifan_pertemuan,
        tugas_detail,
        ujian,
      });

      const existing = ensureGradeForUser(db, maba_id);
      existing.kehadiran_pertemuan = kehadiran_pertemuan;
      existing.keaktifan_pertemuan = keaktifan_pertemuan;
      existing.tugas_detail = tugas_detail;
      existing.kehadiran = scores.kehadiran;
      existing.keaktifan = scores.keaktifan;
      existing.tugas = scores.tugas;
      existing.ujian = scores.ujian;
      existing.nilai_akhir = scores.nilai_akhir;
      existing.updated_at = new Date().toISOString();

      writeDb(db);
      return NextResponse.json(db);
    }

    default:
      return NextResponse.json(db);
  }
}
