import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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

let memoryDb: SharedDatabaseSchema = structuredClone(EMPTY_DB);

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function getDbFilePath(): string {
  if (process.env.SHARED_DB_PATH) {
    return process.env.SHARED_DB_PATH;
  }
  // Pada platform serverless seperti Vercel / AWS Lambda, filesystem /var/task bersifat read-only.
  // Hanya folder os.tmpdir() yang diizinkan untuk penulisan file.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "lms_db.json");
  }
  const defaultLocalPath = path.resolve(process.cwd(), "../data/db.json");
  try {
    const dir = path.dirname(defaultLocalPath);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    return defaultLocalPath;
  } catch {
    return path.join(os.tmpdir(), "lms_db.json");
  }
}

function readDb(): SharedDatabaseSchema {
  const filePath = getDbFilePath();
  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
          fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
        }
        fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(EMPTY_DB, null, 2), "utf-8");
      } catch {
        // Fallback jika tidak bisa menulis ke disk
      }
      return structuredClone(memoryDb);
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SharedDatabaseSchema>;
    memoryDb = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      quizzes: Array.isArray(parsed.quizzes) ? parsed.quizzes : [],
      grades: Array.isArray(parsed.grades) ? parsed.grades : [],
      reset_at: typeof parsed.reset_at === "string" ? parsed.reset_at : "",
    };
    return memoryDb;
  } catch {
    return structuredClone(memoryDb);
  }
}

function writeDb(db: SharedDatabaseSchema): void {
  memoryDb = structuredClone(db);
  try {
    const filePath = getDbFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.warn("Peringatan: Gagal menyimpan data ke disk lokal, disimpan di memory cache:", err);
  }
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
      id: crypto.randomUUID(),
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

// ============================================================================
// SUPABASE DATABASE OPERATIONS
// ============================================================================

async function fetchSupabaseDb(supabase: SupabaseClient): Promise<SharedDatabaseSchema> {
  const [
    { data: users = [] },
    { data: sessions = [] },
    { data: logs = [] },
    { data: quizzes = [] },
    { data: grades = [] },
  ] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase.from("absensi_sessions").select("*").order("created_at", { ascending: false }),
    supabase.from("absensi_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
    supabase.from("grades").select("*").order("nilai_akhir", { ascending: false }),
  ]);

  let reset_at = "";
  try {
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "reset_at")
      .maybeSingle();
    if (setting?.value) reset_at = String(setting.value);
  } catch {
    // Abaikan jika tabel system_settings belum dibuat
  }

  const mappedUsers: DbUserRow[] = (users ?? []).map((u: any) => {
    const parsed = parseProdiDivisiFromFaksi(u.faksi || "");
    return {
      id: String(u.id),
      email: String(u.email || ""),
      nama_ksatria: String(u.nama_ksatria || ""),
      nim: String(u.nim || ""),
      prodi: u.prodi || parsed.prodi || "",
      divisi: u.divisi || parsed.divisi || "Hardware",
      faksi: u.faksi || formatFaksi(parsed.prodi, parsed.divisi),
      password: u.password ? String(u.password) : undefined,
      role: (u.role === "admin" ? "admin" : "maba") as "maba" | "admin",
      created_at: String(u.created_at || new Date().toISOString()),
    };
  });

  const mappedSessions: DbSessionRow[] = (sessions ?? []).map((s: any) => ({
    id: String(s.id),
    rune_code: String(s.rune_code || ""),
    is_active: Boolean(s.is_active),
    created_at: String(s.created_at || new Date().toISOString()),
  }));

  const mappedLogs: DbLogRow[] = (logs ?? []).map((l: any) => ({
    id: String(l.id),
    session_id: String(l.session_id),
    maba_id: String(l.maba_id),
    status: (l.status || "HADIR") as "HADIR" | "IZIN" | "SAKIT" | "ALPHA",
    qr_code: l.qr_code ? String(l.qr_code) : undefined,
    created_at: String(l.created_at || new Date().toISOString()),
  }));

  const mappedQuizzes: DbQuizRow[] = (quizzes ?? []).map((q: any) => ({
    id: String(q.id),
    question: String(q.question || ""),
    options: (q.options as { A: string; B: string; C: string; D: string }) || {
      A: "",
      B: "",
      C: "",
      D: "",
    },
    correct_answer: (q.correct_answer || "A") as "A" | "B" | "C" | "D",
    created_at: String(q.created_at || new Date().toISOString()),
  }));

  const mappedGrades: DbGradeRow[] = (grades ?? []).map((g: any) => ({
    id: String(g.id),
    maba_id: String(g.maba_id),
    kehadiran_pertemuan: Array.isArray(g.kehadiran_pertemuan)
      ? (g.kehadiran_pertemuan as boolean[])
      : [false, false, false, false, false, false, false, false],
    keaktifan_pertemuan: Array.isArray(g.keaktifan_pertemuan)
      ? (g.keaktifan_pertemuan as number[])
      : [0, 0, 0, 0, 0, 0, 0, 0],
    tugas_detail: Array.isArray(g.tugas_detail)
      ? (g.tugas_detail as number[])
      : [0, 0, 0],
    kehadiran: Number(g.kehadiran || 0),
    keaktifan: Number(g.keaktifan || 0),
    tugas: Number(g.tugas || 0),
    ujian: Number(g.ujian || 0),
    nilai_akhir: Number(g.nilai_akhir || 0),
    updated_at: g.updated_at ? String(g.updated_at) : undefined,
  }));

  return {
    users: mappedUsers,
    sessions: mappedSessions,
    logs: mappedLogs,
    quizzes: mappedQuizzes,
    grades: mappedGrades,
    reset_at,
  };
}

async function safeUpsertUser(
  supabase: SupabaseClient,
  user: DbUserRow,
): Promise<DbUserRow> {
  const fullPayload = {
    id: user.id,
    nim: user.nim,
    nama_ksatria: user.nama_ksatria,
    email: user.email,
    prodi: user.prodi,
    divisi: user.divisi,
    faksi: user.faksi,
    password: user.password,
    role: user.role,
    created_at: user.created_at,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(fullPayload, { onConflict: "id" })
    .select()
    .single();

  if (!error && data) return data as unknown as DbUserRow;

  // Jika kolom prodi/divisi/password belum dimigrasi di Supabase, fallback ke kolom dasar
  if (error && (error.code === "42703" || error.message.includes("column"))) {
    const basicPayload = {
      id: user.id,
      nim: user.nim,
      nama_ksatria: user.nama_ksatria,
      email: user.email,
      faksi: user.faksi,
      role: user.role,
      created_at: user.created_at,
    };
    const { data: bData, error: bError } = await supabase
      .from("users")
      .upsert(basicPayload, { onConflict: "id" })
      .select()
      .single();
    if (!bError && bData) return bData as unknown as DbUserRow;
  }

  if (error) {
    console.error("Gagal melakukan upsert user ke Supabase:", error);
    throw error;
  }
  return user;
}

// ============================================================================
// ROUTE HANDLERS (GET & POST)
// ============================================================================

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const db = await fetchSupabaseDb(supabase);
      return NextResponse.json(db);
    } catch (err) {
      console.error("Supabase GET error, fallback to local:", err);
    }
  }

  const db = readDb();
  return NextResponse.json(db);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: string;
    payload?: Record<string, unknown>;
  };
  const payload = body.payload ?? {};
  const supabase = getSupabaseServerClient();

  // --------------------------------------------------------------------------
  // JIKA TERHUBUNG KE SUPABASE CLOUD
  // --------------------------------------------------------------------------
  if (supabase) {
    try {
      switch (body.action) {
        case "reset_all": {
          await supabase.from("absensi_logs").delete().not("id", "is", null);
          await supabase.from("grades").delete().not("id", "is", null);
          await supabase.from("absensi_sessions").delete().not("id", "is", null);
          await supabase.from("quizzes").delete().not("id", "is", null);
          await supabase.from("users").delete().eq("role", "maba");

          const resetAt = new Date().toISOString();
          try {
            await supabase.from("system_settings").upsert({
              key: "reset_at",
              value: resetAt,
              updated_at: resetAt,
            });
          } catch {
            // ignore
          }

          const resetDb: SharedDatabaseSchema = {
            ...structuredClone(EMPTY_DB),
            reset_at: resetAt,
          };
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

          // Cari user yang sudah ada berdasarkan NIM atau Email
          let existingUser: any = null;
          if (nim || email) {
            const query = supabase
              .from("users")
              .select("*")
              .eq("role", "maba");
            if (nim && email) {
              const { data } = await query.or(`nim.ilike.${nim},email.ilike.${email}`);
              existingUser = data?.[0] ?? null;
            } else if (nim) {
              const { data } = await query.ilike("nim", nim);
              existingUser = data?.[0] ?? null;
            } else {
              const { data } = await query.ilike("email", email);
              existingUser = data?.[0] ?? null;
            }
          }

          let savedUser: DbUserRow;
          const targetId = existingUser?.id ?? (isValidUuid(String(payload.id ?? "")) ? String(payload.id) : crypto.randomUUID());

          savedUser = {
            id: targetId,
            nim: nim || existingUser?.nim || "-",
            nama_ksatria: nama_ksatria || existingUser?.nama_ksatria || "KSATRIA MABA",
            email: email || existingUser?.email || "-",
            prodi: prodi || existingUser?.prodi || "-",
            divisi: divisi || existingUser?.divisi || "Hardware",
            faksi,
            password: password ?? existingUser?.password,
            role: "maba",
            created_at: existingUser?.created_at || new Date().toISOString(),
          };

          await safeUpsertUser(supabase, savedUser);

          // Pastikan row grades tersedia untuk maba ini di Supabase
          const { data: existingGrade } = await supabase
            .from("grades")
            .select("id")
            .eq("maba_id", savedUser.id)
            .maybeSingle();

          if (!existingGrade) {
            await supabase.from("grades").insert({
              id: crypto.randomUUID(),
              maba_id: savedUser.id,
              kehadiran_pertemuan: [false, false, false, false, false, false, false, false],
              keaktifan_pertemuan: [0, 0, 0, 0, 0, 0, 0, 0],
              tugas_detail: [0, 0, 0],
              kehadiran: 0,
              keaktifan: 0,
              tugas: 0,
              ujian: 0,
              nilai_akhir: 0,
              updated_at: new Date().toISOString(),
            });
          }

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json({ user: savedUser, db });
        }

        case "login_maba": {
          const identifier = String(payload.identifier ?? "").trim().toLowerCase();
          const password = String(payload.password ?? "").trim();

          const { data: matchedUsers } = await supabase
            .from("users")
            .select("*")
            .eq("role", "maba");

          const matched = (matchedUsers ?? []).find(
            (u: any) =>
              String(u.nim || "").toLowerCase() === identifier ||
              String(u.email || "").toLowerCase() === identifier ||
              String(u.nama_ksatria || "").toLowerCase() === identifier,
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

          const { data: userLogs = [] } = await supabase
            .from("absensi_logs")
            .select("*")
            .eq("maba_id", matched.id);

          let { data: userGrade } = await supabase
            .from("grades")
            .select("*")
            .eq("maba_id", matched.id)
            .maybeSingle();

          if (!userGrade) {
            const newGrade = {
              id: crypto.randomUUID(),
              maba_id: matched.id,
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
            await supabase.from("grades").insert(newGrade);
            userGrade = newGrade;
          }

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json({
            found: true,
            user: matched,
            logs: userLogs ?? [],
            grade: userGrade,
            db,
          });
        }

        case "update_maba": {
          const id = String(payload.id ?? "");
          if (id) {
            const rawFaksi = payload.faksi ? String(payload.faksi).trim() : undefined;
            const parsed = rawFaksi ? parseProdiDivisiFromFaksi(rawFaksi) : undefined;
            const updates: Record<string, unknown> = {};

            if (payload.nama_ksatria) {
              updates.nama_ksatria = String(payload.nama_ksatria).trim().toUpperCase();
            }
            if (payload.nim) updates.nim = String(payload.nim).trim();
            if (payload.email) updates.email = String(payload.email).trim().toLowerCase();
            if (payload.prodi !== undefined) {
              updates.prodi = String(payload.prodi).trim();
            } else if (parsed?.prodi) {
              updates.prodi = parsed.prodi;
            }
            if (payload.divisi !== undefined) {
              updates.divisi = String(payload.divisi).trim();
            } else if (parsed?.divisi) {
              updates.divisi = parsed.divisi;
            }
            if (rawFaksi) updates.faksi = rawFaksi;

            await supabase.from("users").update(updates).eq("id", id);
          }
          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "delete_maba": {
          const id = String(payload.id ?? "");
          if (id) {
            await supabase.from("users").delete().eq("id", id);
            await supabase.from("grades").delete().eq("maba_id", id);
            await supabase.from("absensi_logs").delete().eq("maba_id", id);
          }
          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "create_session": {
          const rune_code = String(payload.rune_code ?? "").trim().toUpperCase();
          await supabase.from("absensi_sessions").update({ is_active: false }).not("id", "is", null);

          const { data: existing } = await supabase
            .from("absensi_sessions")
            .select("id")
            .ilike("rune_code", rune_code)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("absensi_sessions")
              .update({ is_active: true })
              .eq("id", existing.id);
          } else {
            await supabase.from("absensi_sessions").insert({
              id: crypto.randomUUID(),
              rune_code,
              is_active: true,
              created_at: new Date().toISOString(),
            });
          }

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "toggle_session": {
          const sessionId = String(payload.session_id ?? "");
          const isActive = Boolean(payload.is_active);

          if (isActive) {
            await supabase.from("absensi_sessions").update({ is_active: false }).not("id", "is", null);
          }
          if (sessionId) {
            await supabase
              .from("absensi_sessions")
              .update({ is_active: isActive })
              .eq("id", sessionId);
          }

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "record_log":
        case "record_maba_attendance": {
          const status = String(payload.status ?? "HADIR").toUpperCase() as
            | "HADIR"
            | "IZIN"
            | "SAKIT"
            | "ALPHA";
          const qrCode = payload.qr_code ? String(payload.qr_code).trim().toUpperCase() : undefined;

          let mabaId = String(payload.maba_id ?? "");
          const nim = String(payload.nim ?? "").trim();
          const rawNama = String(payload.nama_ksatria ?? "").trim().toUpperCase();
          const nama_ksatria = rawNama && rawNama !== "BELUM TERDAFTAR" ? rawNama : "";
          const email = String(payload.email ?? "").trim().toLowerCase();

          // 1. Temukan atau daftarkan maba di database Supabase
          const { data: allMaba } = await supabase.from("users").select("*").eq("role", "maba");
          let user = (allMaba ?? []).find(
            (u: any) =>
              (isValidUuid(mabaId) && u.id === mabaId) ||
              (nim && nim !== "-" && String(u.nim).toLowerCase() === nim.toLowerCase()) ||
              (email && email !== "-" && String(u.email).toLowerCase() === email.toLowerCase()) ||
              (nama_ksatria && String(u.nama_ksatria).toUpperCase() === nama_ksatria),
          );

          if (!user && (!nim || nim === "-") && !nama_ksatria) {
            user = allMaba?.[0];
          }

          if (!user) {
            const newId = isValidUuid(mabaId) ? mabaId : crypto.randomUUID();
            const newUser: DbUserRow = {
              id: newId,
              nim: nim && nim !== "-" ? nim : "-",
              nama_ksatria: nama_ksatria || "KSATRIA MABA",
              email: email && email !== "-" ? email : "-",
              prodi: "-",
              divisi: "Hardware",
              faksi: "Belum Ditentukan",
              role: "maba",
              created_at: new Date().toISOString(),
            };
            user = await safeUpsertUser(supabase, newUser);
          }

          const realMabaId = user.id;

          // 2. Tentukan sesi aktif di Supabase
          let sessionId = String(payload.session_id ?? "");
          if (!isValidUuid(sessionId)) {
            const { data: sessions = [] } = await supabase
              .from("absensi_sessions")
              .select("*")
              .order("created_at", { ascending: false });

            let session = qrCode && qrCode !== "FORM-KIRIM"
              ? sessions?.find((s: any) => String(s.rune_code).toUpperCase() === qrCode)
              : undefined;

            if (!session) {
              session = sessions?.find((s: any) => s.is_active) ?? sessions?.[0];
            }

            if (!session) {
              const newSesId = crypto.randomUUID();
              await supabase.from("absensi_sessions").insert({
                id: newSesId,
                rune_code: qrCode && qrCode !== "FORM-KIRIM" ? qrCode : "RPI-ABSEN-2026",
                is_active: true,
                created_at: new Date().toISOString(),
              });
              sessionId = newSesId;
            } else {
              sessionId = session.id;
            }
          }

          // 3. Catat / Update Log Absensi
          const { data: existingLog } = await supabase
            .from("absensi_logs")
            .select("id")
            .eq("session_id", sessionId)
            .eq("maba_id", realMabaId)
            .maybeSingle();

          if (existingLog) {
            const updatePayload: Record<string, unknown> = {
              status,
              created_at: new Date().toISOString(),
            };
            if (qrCode) updatePayload.qr_code = qrCode;
            await supabase.from("absensi_logs").update(updatePayload).eq("id", existingLog.id);
          } else {
            const insertPayload: Record<string, unknown> = {
              id: crypto.randomUUID(),
              session_id: sessionId,
              maba_id: realMabaId,
              status,
              created_at: new Date().toISOString(),
            };
            if (qrCode) insertPayload.qr_code = qrCode;
            try {
              await supabase.from("absensi_logs").insert(insertPayload);
            } catch {
              delete insertPayload.qr_code;
              await supabase.from("absensi_logs").insert(insertPayload);
            }
          }

          // 4. Sinkronisasi status kehadiran HADIR ke tabel grades
          const { data: userLogs = [] } = await supabase
            .from("absensi_logs")
            .select("status")
            .eq("maba_id", realMabaId);

          const hadirLogsCount = (userLogs ?? []).filter((l: any) => l.status === "HADIR").length;

          let { data: grade } = await supabase
            .from("grades")
            .select("*")
            .eq("maba_id", realMabaId)
            .maybeSingle();

          const currentKehadiran: boolean[] = Array.isArray(grade?.kehadiran_pertemuan)
            ? grade.kehadiran_pertemuan
            : [false, false, false, false, false, false, false, false];
          const currentTrueCount = currentKehadiran.filter(Boolean).length;
          const targetCount = Math.min(8, Math.max(currentTrueCount, hadirLogsCount));

          const updatedKehadiran = Array.from(
            { length: 8 },
            (_, idx) => idx < targetCount,
          );

          const scores = computeGradeScores({
            kehadiran_pertemuan: updatedKehadiran,
            keaktifan_pertemuan: Array.isArray(grade?.keaktifan_pertemuan) ? grade.keaktifan_pertemuan : [0,0,0,0,0,0,0,0],
            tugas_detail: Array.isArray(grade?.tugas_detail) ? grade.tugas_detail : [0,0,0],
            ujian: Number(grade?.ujian || 0),
          });

          await supabase.from("grades").upsert({
            id: grade?.id ?? crypto.randomUUID(),
            maba_id: realMabaId,
            kehadiran_pertemuan: updatedKehadiran,
            keaktifan_pertemuan: grade?.keaktifan_pertemuan ?? [0,0,0,0,0,0,0,0],
            tugas_detail: grade?.tugas_detail ?? [0,0,0],
            kehadiran: scores.kehadiran,
            keaktifan: scores.keaktifan,
            tugas: scores.tugas,
            ujian: scores.ujian,
            nilai_akhir: scores.nilai_akhir,
            updated_at: new Date().toISOString(),
          }, { onConflict: "maba_id" });

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "save_quiz": {
          const id = payload.id ? String(payload.id) : "";
          const question = String(payload.question ?? "").trim();
          const options = (payload.options as {
            A: string;
            B: string;
            C: string;
            D: string;
          }) ?? { A: "", B: "", C: "", D: "" };
          const correct_answer = (payload.correct_answer as "A" | "B" | "C" | "D") ?? "A";

          if (id && isValidUuid(id)) {
            await supabase
              .from("quizzes")
              .update({ question, options, correct_answer })
              .eq("id", id);
          } else {
            await supabase.from("quizzes").insert({
              id: crypto.randomUUID(),
              question,
              options,
              correct_answer,
              created_at: new Date().toISOString(),
            });
          }

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        case "delete_quiz": {
          const id = String(payload.id ?? "");
          if (id) {
            await supabase.from("quizzes").delete().eq("id", id);
          }
          const db = await fetchSupabaseDb(supabase);
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

          const { data: existing } = await supabase
            .from("grades")
            .select("id")
            .eq("maba_id", maba_id)
            .maybeSingle();

          await supabase.from("grades").upsert({
            id: existing?.id ?? crypto.randomUUID(),
            maba_id,
            kehadiran_pertemuan,
            keaktifan_pertemuan,
            tugas_detail,
            kehadiran: scores.kehadiran,
            keaktifan: scores.keaktifan,
            tugas: scores.tugas,
            ujian: scores.ujian,
            nilai_akhir: scores.nilai_akhir,
            updated_at: new Date().toISOString(),
          }, { onConflict: "maba_id" });

          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }

        default: {
          const db = await fetchSupabaseDb(supabase);
          return NextResponse.json(db);
        }
      }
    } catch (supabaseError) {
      console.error("Supabase action error, falling back to local handler:", supabaseError);
    }
  }

  // --------------------------------------------------------------------------
  // FALLBACK LOCAL / OFFLINE DISK STORAGE HANDLER
  // --------------------------------------------------------------------------
  const db = readDb();

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
          id: isValidUuid(String(payload.id ?? "")) ? String(payload.id) : crypto.randomUUID(),
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

    case "update_maba": {
      const id = String(payload.id ?? "");
      db.users = db.users.map((u) => {
        if (u.id !== id) return u;
        const nextNama = payload.nama_ksatria
          ? String(payload.nama_ksatria).trim().toUpperCase()
          : u.nama_ksatria;
        const nextNim = payload.nim ? String(payload.nim).trim() : u.nim;
        const nextEmail = payload.email
          ? String(payload.email).trim().toLowerCase()
          : u.email;
        const rawFaksi = payload.faksi ? String(payload.faksi).trim() : u.faksi;
        const parsed = parseProdiDivisiFromFaksi(rawFaksi);
        const nextProdi =
          payload.prodi !== undefined
            ? String(payload.prodi).trim()
            : parsed.prodi || u.prodi;
        const nextDivisi =
          payload.divisi !== undefined
            ? String(payload.divisi).trim()
            : parsed.divisi || u.divisi;
        const nextFaksi = formatFaksi(nextProdi, nextDivisi, rawFaksi);

        return {
          ...u,
          nama_ksatria: nextNama,
          nim: nextNim,
          email: nextEmail,
          prodi: nextProdi,
          divisi: nextDivisi,
          faksi: nextFaksi,
        };
      });
      writeDb(db);
      return NextResponse.json(db);
    }

    case "delete_maba": {
      const id = String(payload.id ?? "");
      db.users = db.users.filter((u) => u.id !== id);
      db.grades = db.grades.filter((g) => g.maba_id !== id);
      db.logs = db.logs.filter((l) => l.maba_id !== id);
      writeDb(db);
      return NextResponse.json(db);
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
          id: crypto.randomUUID(),
          rune_code,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        db.sessions.unshift(newSession);
      }
      writeDb(db);
      return NextResponse.json(db);
    }

    case "toggle_session": {
      const sessionId = String(payload.session_id ?? "");
      const isActive = Boolean(payload.is_active);
      db.sessions = db.sessions.map((s) => {
        if (s.id === sessionId) return { ...s, is_active: isActive };
        return isActive ? { ...s, is_active: false } : s;
      });
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

      if (!user && (!nim || nim === "-") && !nama_ksatria) {
        user = db.users.find((u) => u.role === "maba");
      }

      if (!user && ((nim && nim !== "-") || nama_ksatria)) {
        user = {
          id: isValidUuid(mabaId) ? mabaId : crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
            session_id: sessionId,
            maba_id: mabaId,
            status,
            qr_code: qrCode,
            created_at: new Date().toISOString(),
          });
        }

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

    case "save_quiz": {
      const id = payload.id ? String(payload.id) : "";
      const question = String(payload.question ?? "").trim();
      const options = (payload.options as {
        A: string;
        B: string;
        C: string;
        D: string;
      }) ?? { A: "", B: "", C: "", D: "" };
      const correct_answer = (payload.correct_answer as "A" | "B" | "C" | "D") ?? "A";

      if (id) {
        db.quizzes = db.quizzes.map((q) =>
          q.id === id ? { ...q, question, options, correct_answer } : q,
        );
      } else {
        db.quizzes.unshift({
          id: crypto.randomUUID(),
          question,
          options,
          correct_answer,
          created_at: new Date().toISOString(),
        });
      }
      writeDb(db);
      return NextResponse.json(db);
    }

    case "delete_quiz": {
      const id = String(payload.id ?? "");
      db.quizzes = db.quizzes.filter((q) => q.id !== id);
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
