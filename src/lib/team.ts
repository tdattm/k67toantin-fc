export type Member = {
  id: string;
  name: string;
  jerseyNumber?: number;
  slots: number[];
  updatedAt: string | null;
};
export type Team = {
  slug: string;
  name: string;
  expiresAt: number;
  members: Member[];
};
export function memberLabel(member: Member) {
  return member.jerseyNumber === undefined
    ? member.name
    : `${member.name} - ${member.jerseyNumber}`;
}
export const days = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];
export const sessions = [
  { name: "Sáng", time: "6–9h", icon: "☀" },
  { name: "Chiều", time: "14–17h", icon: "◐" },
  { name: "Tối", time: "19–22h", icon: "☾" },
];
export function rankSlots(team: Team) {
  return Array.from({ length: 21 }, (_, slot) => ({
    slot,
    absent: team.members.filter((m) => !m.slots.includes(slot)),
    available: team.members.filter((m) => m.slots.includes(slot)).length,
  }))
    .sort((a, b) => a.absent.length - b.absent.length || a.slot - b.slot)
    .slice(0, 5);
}
