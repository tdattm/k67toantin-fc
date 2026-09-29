import type { DreamTeam } from "./dream-team";

export type Member = {
  id: string;
  uid?: string;
  name: string;
  jerseyNumber?: number;
  slots: number[];
  updatedAt: string | null;
  dreamTeam?: DreamTeam;
};
export type Team = {
  slug: string;
  kind?: "legacy" | "account";
  creatorUid?: string;
  captainUid?: string;
  joinPinHash?: string;
  name: string;
  createdAt?: number;
  expiresAt: number;
  members: Member[];
  captainMemberId?: string;
  /** Historical legacy field; ignored and removed when a legacy team is loaded. */
  captainTokenHash?: string;
  accessPinHash?: string;
  hasPin?: boolean;
};
export type TeamSummary = Pick<Team, "slug" | "name" | "expiresAt"> & {
  memberCount: number;
  requiresPin: boolean;
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
