export type FormationId = "3-1-2" | "2-3-1";
export type Position = { id: string; label: string; x: number; y: number };
export type DreamTeam = {
  formation: FormationId;
  players: Record<string, string>;
  updatedAt: string;
};
export type PopularDreamTeam = {
  dreamTeam: DreamTeam;
  votes: number;
};

export const formations: Record<FormationId, Position[]> = {
  "3-1-2": [
    { id: "ST_L", label: "ST trái", x: 30, y: 17 },
    { id: "ST_R", label: "ST phải", x: 70, y: 17 },
    { id: "CM", label: "CM", x: 50, y: 41 },
    { id: "LB", label: "LB", x: 20, y: 63 },
    { id: "CB", label: "CB", x: 50, y: 65 },
    { id: "RB", label: "RB", x: 80, y: 63 },
    { id: "GK", label: "GK", x: 50, y: 87 },
  ],
  "2-3-1": [
    { id: "ST", label: "ST", x: 50, y: 15 },
    { id: "LM", label: "LM", x: 20, y: 43 },
    { id: "CM", label: "CM", x: 50, y: 41 },
    { id: "RM", label: "RM", x: 80, y: 43 },
    { id: "CB_L", label: "CB trái", x: 30, y: 65 },
    { id: "CB_R", label: "CB phải", x: 70, y: 65 },
    { id: "GK", label: "GK", x: 50, y: 87 },
  ],
};

export function isFormation(value: unknown): value is FormationId {
  return value === "3-1-2" || value === "2-3-1";
}

export function popularDreamTeam(
  members: Array<{ dreamTeam?: DreamTeam }>,
): PopularDreamTeam | null {
  const saved = members.flatMap((member) =>
    member.dreamTeam && isFormation(member.dreamTeam.formation)
      ? [member.dreamTeam]
      : [],
  );
  if (!saved.length) return null;
  const formationVotes = new Map<FormationId, number>();
  for (const dreamTeam of saved)
    formationVotes.set(
      dreamTeam.formation,
      (formationVotes.get(dreamTeam.formation) ?? 0) + 1,
    );
  const formation = (Object.keys(formations) as FormationId[]).reduce(
    (best, candidate) =>
      (formationVotes.get(candidate) ?? 0) > (formationVotes.get(best) ?? 0)
        ? candidate
        : best,
    "3-1-2" as FormationId,
  );
  const players: Record<string, string> = {};
  const used = new Set<string>();
  for (const position of formations[formation]) {
    const votes = new Map<string, number>();
    for (const dreamTeam of saved) {
      if (dreamTeam.formation !== formation) continue;
      const memberId = dreamTeam.players[position.id];
      if (memberId) votes.set(memberId, (votes.get(memberId) ?? 0) + 1);
    }
    const winner = [...votes.entries()]
      .filter(([memberId]) => !used.has(memberId))
      .sort(
        ([idA, countA], [idB, countB]) =>
          countB - countA || idA.localeCompare(idB),
      )[0]?.[0];
    if (winner) {
      players[position.id] = winner;
      used.add(winner);
    }
  }
  return {
    dreamTeam: {
      formation,
      players,
      updatedAt: new Date().toISOString(),
    },
    votes: formationVotes.get(formation) ?? 0,
  };
}

// Move an existing player instead of duplicating them; swap if both slots are filled.
export function placePlayer(
  players: Record<string, string>,
  position: string,
  memberId: string,
) {
  const next = { ...players };
  const previous = Object.keys(next).find((key) => next[key] === memberId);
  const displaced = next[position];
  if (previous) delete next[previous];
  if (previous && previous !== position && displaced)
    next[previous] = displaced;
  next[position] = memberId;
  return next;
}
