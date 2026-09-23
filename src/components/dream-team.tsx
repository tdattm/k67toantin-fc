"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  formations,
  placePlayer,
  popularDreamTeam,
  type DreamTeam,
  type FormationId,
} from "@/lib/dream-team";
import { memberLabel, type Member, type Team } from "@/lib/team";

type Save = (body: object, message: string) => Promise<boolean>;
type Draft = { formation: FormationId; players: Record<string, string> };

function Shirt({
  number,
  empty = false,
}: {
  number?: number;
  empty?: boolean;
}) {
  return (
    <svg viewBox="0 0 100 90" aria-hidden="true" className="dream-shirt">
      <path
        d="M30 6 10 16 2 37 20 45 26 32 26 83 74 83 74 32 80 45 98 37 90 16 70 6 60 3Q50 13 40 3Z"
        fill={empty ? "#133a5599" : "#0066cc"}
        stroke={empty ? "#d4e9ef80" : "#71b9ff"}
        strokeWidth="2"
        strokeDasharray={empty ? "4 3" : undefined}
      />
      <path d="M40 4Q50 20 60 4" fill="none" stroke="#ffffff" strokeWidth="3" />
      {!empty && (
        <>
          <path d="M31 9 34 28M69 9 66 28" stroke="#ffffff40" strokeWidth="3" />
          <path d="M63 24h7v8h-7z" fill="#fff" />
          <path d="M63 24h2v8h-2z" fill="#4ade80" />
          <path d="M68 24h2v8h-2z" fill="#ef4444" />
        </>
      )}
      <text
        x="50"
        y="61"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontSize="32"
        fontWeight="900"
      >
        {empty ? "+" : (number ?? "–")}
      </text>
    </svg>
  );
}

export function DreamTeamSection({
  team,
  busy,
  onSave,
}: {
  team: Team;
  busy: boolean;
  onSave: Save;
}) {
  const popular = popularDreamTeam(team.members);
  const popularId = "__popular__";
  const [ownerId, setOwnerId] = useState(popularId);
  const [dirty, setDirty] = useState(false);
  const owner = team.members.find((m) => m.id === ownerId);
  useEffect(() => {
    if (!owner && ownerId !== popularId) {
      setOwnerId(popularId);
      setDirty(false);
    }
  }, [owner, ownerId]);

  return (
    <section
      className="panel mt-8 overflow-hidden p-5 sm:p-8"
      aria-labelledby="dream-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">ĐỘI HÌNH DO BẠN CHỌN / 03</p>
          <h2
            id="dream-heading"
            className="mt-3 text-2xl font-black sm:text-3xl"
          >
            Đội bóng trong mơ
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/60">
            Ai sẽ sát cánh trên sân? Mỗi thành viên có thể lưu đội hình yêu
            thích của riêng mình từ danh sách cầu thủ của đội.
          </p>
        </div>
        <span className="chip text-xs font-bold text-blue-200">
          AZZURRI · BLUE ITALIA
        </span>
      </div>
      <div className="mt-6 max-w-md">
        <label htmlFor="dream-owner" className="label">
          Đội hình của thành viên
        </label>
        <select
          id="dream-owner"
          className="input mt-2"
          value={owner?.id ?? popularId}
          disabled={busy || dirty}
          onChange={(e) => setOwnerId(e.target.value)}
        >
          <option value={popularId}>
            Đội hình được chọn nhiều nhất
            {popular ? ` · ${popular.votes} lượt` : ""}
          </option>
          {team.members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberLabel(m)}
              {m.dreamTeam ? " · Đã xếp đội" : ""}
            </option>
          ))}
        </select>
        {dirty && (
          <p className="mt-2 text-xs text-amber-200">
            Lưu hoặc huỷ thay đổi trước khi chọn thành viên khác.
          </p>
        )}
      </div>
      {owner ? (
        <DreamTeamEditor
          key={owner.id}
          owner={owner}
          members={team.members}
          busy={busy}
          onSave={onSave}
          onDirty={setDirty}
        />
      ) : popular ? (
        <PopularDreamTeamPreview
          dreamTeam={popular.dreamTeam}
          members={team.members}
          votes={popular.votes}
        />
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm leading-6 text-emerald-100/55">
          {team.members.length
            ? "Chưa có thành viên nào lưu đội hình. Bạn có thể chọn tên ở trên để bắt đầu xếp đội."
            : "Thêm thành viên vào đội hình ở trên để bắt đầu chọn đội bóng trong mơ."}
        </div>
      )}
    </section>
  );
}

function PopularDreamTeamPreview({
  dreamTeam,
  members,
  votes,
}: {
  dreamTeam: DreamTeam;
  members: Member[];
  votes: number;
}) {
  const positions = formations[dreamTeam.formation];
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-amber-200">
            Đội hình chung được bình chọn nhiều nhất
          </p>
          <p className="mt-1 text-xs text-emerald-100/55">
            Sơ đồ <strong className="text-white">{dreamTeam.formation}</strong>{" "}
            · tổng hợp từ {votes} đội hình đã lưu. Cầu thủ mỗi vị trí là lựa
            chọn phổ biến nhất.
          </p>
        </div>
        <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
          {Object.keys(dreamTeam.players).length}/{positions.length} vị trí
        </span>
      </div>
      <div
        className="dream-field mt-5"
        aria-label={`Đội hình được chọn nhiều nhất, sơ đồ ${dreamTeam.formation}`}
      >
        <svg
          viewBox="0 0 600 720"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          <g stroke="#efffe8" strokeOpacity=".6" strokeWidth="2" fill="none">
            <rect x="22" y="22" width="556" height="676" rx="3" />
            <path d="M22 360H578" />
            <circle cx="300" cy="360" r="70" />
            <circle cx="300" cy="360" r="3" fill="#efffe8" />
            <path d="M165 22V133H435V22M165 698V587H435V698M235 22V65H365V22M235 698V655H365V698M263 22V8H337V22M263 698V712H337V698M247 133Q300 190 353 133M247 587Q300 530 353 587" />
            <path d="M22 42Q42 42 42 22M558 22Q558 42 578 42M22 678Q42 678 42 698M558 698Q558 678 578 678" />
          </g>
        </svg>
        {positions.map((position) => {
          const player = members.find(
            (member) => member.id === dreamTeam.players[position.id],
          );
          return (
            <div
              key={position.id}
              className="dream-position"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
            >
              <span className="mb-1 rounded bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/90">
                {position.label}
              </span>
              <div className="dream-player">
                <Shirt number={player?.jerseyNumber} empty={!player} />
                <span className="dream-player-name">
                  {player?.name ?? "Chưa có lựa chọn"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-emerald-100/50">
        Đây là đội hình tổng hợp. Chọn tên thành viên ở trên để xem hoặc chỉnh
        đội hình cá nhân.
      </p>
    </div>
  );
}

function DreamTeamEditor({
  owner,
  members,
  busy,
  onSave,
  onDirty,
}: {
  owner: Member;
  members: Member[];
  busy: boolean;
  onSave: Save;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picked, setPicked] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hovered, setHovered] = useState("");
  const [ghost, setGhost] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const gesture = useRef<{
    id: string;
    x: number;
    y: number;
    dragging: boolean;
    pointerId: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const current: Draft = draft ??
    owner.dreamTeam ?? { formation: "3-1-2", players: {} };
  const positions = formations[current.formation];
  const players = Object.fromEntries(
    Object.entries(current.players).filter(
      ([position, id]) =>
        positions.some((p) => p.id === position) &&
        members.some((m) => m.id === id),
    ),
  );
  const dirty = draft !== null;
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: Draft) {
    setDraft(next);
    setFeedback("");
  }
  function assign(position: string, id: string) {
    if (busy || !members.some((m) => m.id === id)) return;
    change({
      formation: current.formation,
      players: placePlayer(players, position, id),
    });
    setPicked("");
    setFeedback(
      `Đã xếp ${memberLabel(members.find((m) => m.id === id)!)} vào ${positions.find((p) => p.id === position)?.label}. Nhớ lưu đội hình nhé.`,
    );
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (busy || event.button !== 0) return;
    if (
      event.pointerType === "touch" &&
      event.currentTarget.hasAttribute("data-dream-member") &&
      !(event.target as HTMLElement).closest("[data-drag-handle]")
    )
      return;
    suppressClick.current = false;
    gesture.current = {
      id,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function positionAt(x: number, y: number) {
    const target = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-dream-position]");
    return target && fieldRef.current?.contains(target)
      ? (target.dataset.dreamPosition ?? "")
      : "";
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 8)
      active.dragging = true;
    if (active.dragging) {
      setGhost({ id: active.id, x: event.clientX, y: event.clientY });
      setHovered(positionAt(event.clientX, event.clientY));
    }
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (active.dragging) {
      suppressClick.current = true;
      const position = positionAt(event.clientX, event.clientY);
      if (position) assign(position, active.id);
    }
    gesture.current = null;
    setGhost(null);
    setHovered("");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function cancelDrag() {
    gesture.current = null;
    setGhost(null);
    setHovered("");
  }
  function select(id: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setPicked((previous) => (previous === id ? "" : id));
  }
  const draggedMember = members.find((m) => m.id === ghost?.id);
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label htmlFor="dream-formation" className="label">
            Sơ đồ thi đấu
          </label>
          <select
            id="dream-formation"
            className="input mt-2"
            value={current.formation}
            disabled={busy}
            onChange={(e) => {
              const formation = e.target.value as FormationId;
              change({
                formation,
                players: Object.fromEntries(
                  Object.entries(players).filter(([position]) =>
                    formations[formation].some((p) => p.id === position),
                  ),
                ),
              });
              setPicked("");
              setFeedback(
                "Đã đổi sơ đồ. Cầu thủ ở vị trí không còn phù hợp được đưa về danh sách.",
              );
            }}
          >
            <option value="3-1-2">3-1-2</option>
            <option value="2-3-1">2-3-1</option>
          </select>
        </div>
        <p className="text-sm text-emerald-100/60">
          <strong className="text-xl text-amber-300">
            {Object.keys(players).length}
          </strong>{" "}
          / {positions.length} vị trí đã chọn
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-emerald-100/55">
        Kéo cầu thủ từ danh sách vào sân, hoặc chạm tên rồi chạm vị trí. Kéo
        giữa hai vị trí đã có người để hoán đổi. Bạn có thể lưu khi chưa đủ đội
        hình.
      </p>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={fieldRef}
          className="dream-field order-2 lg:order-1"
          aria-label={`Sân bóng sơ đồ ${current.formation}`}
        >
          <svg
            viewBox="0 0 600 720"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
          >
            <g stroke="#efffe8" strokeOpacity=".6" strokeWidth="2" fill="none">
              <rect x="22" y="22" width="556" height="676" rx="3" />
              <path d="M22 360H578" />
              <circle cx="300" cy="360" r="70" />
              <circle cx="300" cy="360" r="3" fill="#efffe8" />
              <path d="M165 22V133H435V22M165 698V587H435V698M235 22V65H365V22M235 698V655H365V698M263 22V8H337V22M263 698V712H337V698M247 133Q300 190 353 133M247 587Q300 530 353 587" />
              <path d="M22 42Q42 42 42 22M558 22Q558 42 578 42M22 678Q42 678 42 698M558 698Q558 678 578 678" />
            </g>
          </svg>
          {positions.map((position) => {
            const player = members.find((m) => m.id === players[position.id]);
            return (
              <div
                key={position.id}
                data-dream-position={position.id}
                className={`dream-position ${hovered === position.id ? "dream-drop-target" : ""}`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <span className="mb-1 rounded bg-black/30 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/90">
                  {position.label}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className={`dream-player ${player ? "touch-none" : ""} ${picked && picked === player?.id ? "ring-2 ring-amber-300" : ""}`}
                  aria-label={`${position.label}: ${player ? memberLabel(player) : "Chưa chọn cầu thủ"}`}
                  aria-pressed={!!player && picked === player.id}
                  onPointerDown={(e) => {
                    if (player) pointerDown(e, player.id);
                  }}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={cancelDrag}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    if (picked) assign(position.id, picked);
                    else if (player) select(player.id);
                    else
                      setFeedback(
                        "Chọn một cầu thủ trong danh sách rồi chạm vị trí này.",
                      );
                  }}
                >
                  <Shirt number={player?.jerseyNumber} empty={!player} />
                  <span className="dream-player-name">
                    {player?.name ?? "Chọn cầu thủ"}
                  </span>
                </button>
                {player && (
                  <button
                    type="button"
                    disabled={busy}
                    className="dream-remove"
                    aria-label={`Bỏ ${memberLabel(player)} khỏi ${position.label}`}
                    onClick={() => {
                      const next = { ...players };
                      delete next[position.id];
                      change({ formation: current.formation, players: next });
                      if (picked === player.id) setPicked("");
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="order-1 min-w-0 rounded-xl border border-white/10 bg-black/10 p-4 lg:order-2">
          <h3 className="font-bold">
            Danh sách cầu thủ{" "}
            <span className="text-emerald-100/40">/ {members.length}</span>
          </h3>
          <p className="mt-2 text-xs leading-5 text-emerald-100/55">
            {picked
              ? `Đang chọn ${memberLabel(members.find((m) => m.id === picked) ?? owner)}. Chạm vị trí trên sân để xếp.`
              : "Kéo tên hoặc chạm để chọn cầu thủ."}
          </p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:max-h-[520px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1">
            {members.map((m) => {
              const assigned = positions.find((p) => players[p.id] === m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  disabled={busy}
                  aria-pressed={picked === m.id}
                  aria-label={`Chọn ${memberLabel(m)}`}
                  data-dream-member={m.id}
                  className={`flex min-h-12 min-w-48 shrink-0 touch-auto items-center gap-3 rounded-xl border px-3 py-2 text-left lg:min-w-0 ${picked === m.id ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[.03] hover:border-blue-300/60"}`}
                  onPointerDown={(e) => pointerDown(e, m.id)}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={cancelDrag}
                  onClick={() => select(m.id)}
                >
                  <span
                    data-drag-handle
                    className="flex size-9 shrink-0 touch-none items-center justify-center rounded-lg bg-[#0066cc] text-sm font-black text-white"
                    title="Kéo số áo để xếp cầu thủ"
                  >
                    {m.jerseyNumber ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm">
                    {m.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-blue-200">
                    {assigned?.label ?? "＋"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {ghost && draggedMember && (
        <div
          className="pointer-events-none fixed z-50 w-24 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#081c2e]/90 p-2 text-center shadow-2xl"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <Shirt number={draggedMember.jerseyNumber} />
          <span className="text-xs font-bold text-white">
            {draggedMember.name}
          </span>
        </div>
      )}
      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-amber-200">
        {feedback}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          disabled={busy || !dirty}
          className="primary"
          onClick={async () => {
            if (
              await onSave(
                {
                  action: "dreamTeam",
                  memberId: owner.id,
                  formation: current.formation,
                  players,
                },
                "Đã lưu đội bóng trong mơ.",
              )
            ) {
              setDraft(null);
              setFeedback(
                "Đã lưu đội hình. Cả đội có thể xem lựa chọn của bạn.",
              );
            } else
              setFeedback(
                "Chưa lưu được đội hình. Bản nháp vẫn được giữ, hãy thử lại.",
              );
          }}
        >
          {busy ? "Đang lưu…" : "Lưu đội hình"}
        </button>
        {dirty && (
          <button
            type="button"
            disabled={busy}
            className="secondary"
            onClick={() => {
              setDraft(null);
              setPicked("");
              setFeedback("Đã huỷ thay đổi chưa lưu.");
            }}
          >
            Huỷ thay đổi đội hình
          </button>
        )}
        <span className="text-xs text-emerald-100/50">
          {dirty
            ? "Có thay đổi chưa lưu"
            : owner.dreamTeam
              ? "Đội hình đã lưu"
              : "Chưa có đội hình đã lưu"}
        </span>
      </div>
    </div>
  );
}
