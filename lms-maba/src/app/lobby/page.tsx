import WaitingLobby from "@/components/lobby/WaitingLobby";
import { DEFAULT_CHARACTERS, type SessionInfo, type StudentProfile } from "@/types/lobby";

const initialStudent: StudentProfile = {
  id: "",
  name: "KSATRIA BARU",
  nim: "-",
  level: 1,
  character: DEFAULT_CHARACTERS[0]!,
  kehadiran: { current: 0, max: 8 },
  tugas: { current: 0, max: 3 },
};

const initialSession: SessionInfo = {
  statusText: "Misi: Menunggu Sesi Dimulai",
  courseName: "Riset Robotika",
  sessionCode: "RPI",
  playersOnline: 0,
};

export default function LobbyPage() {
  return <WaitingLobby initialStudent={initialStudent} session={initialSession} />;
}
