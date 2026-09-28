import type { Team } from "./team";
import { formations, type FormationId } from "./dream-team";

// Fictional, deterministic fixture. Never written to Redis or Firebase.
const names = ["An Minh", "Bình Khang", "Chi Bảo", "Duy Phong", "Gia Huy", "Hải Nam", "Hữu Đạt", "Khôi Nguyên", "Lan Anh", "Long Vũ", "Minh Quân", "Ngọc Hà", "Phúc An", "Quang Lâm", "Sơn Tùng", "Thảo Vy", "Tuấn Kiệt", "Việt Anh", "Yến Nhi"];
const jerseys = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
const members = names.map((name, index) => {
  const formation: FormationId = index % 2 ? "2-3-1" : "3-1-2";
  const positions = formations[formation].map(position => position.id);
  const others = Array.from({ length: 19 }, (_, offset) => `demo-${(index + offset + 1) % 19}`);
  return {
    id: `demo-${index}`, name, jerseyNumber: jerseys[index],
    slots: Array.from({ length: 21 }, (_, slot) => slot).filter(slot => (slot + index) % 4 !== 0 && (slot + index * 2) % 7 !== 0),
    updatedAt: "2026-09-01T00:00:00.000Z",
    dreamTeam: {
      formation,
      players: Object.fromEntries(positions.map((position, pos) => [position, others[pos]])),
      support: { medical: [others[7]], water: [others[8]], superSub: [others[9], others[10]] },
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  };
});
export const demoTeam: Team = {
  slug: "demo-fixture", name: "Đội mẫu Sân Cỏ", createdAt: Date.UTC(2026,8,1), expiresAt: Date.UTC(2027,8,1),
  captainMemberId: "demo-0", members,
};
