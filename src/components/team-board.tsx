"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Shell } from "./shell";
import { days, sessions, rankSlots, memberLabel, type Team } from "@/lib/team";
import { TopSlotsChart } from "./top-slots-chart";
export function TeamBoard({ slug }: { slug: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [mode, setMode] = useState("");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [shortNameConfirmed, setShortNameConfirmed] = useState(false);
  const [nameSuggestionChoice, setNameSuggestionChoice] = useState<
    "nickname" | "original" | null
  >(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removeId, setRemoveId] = useState("");
  const version = useRef(0);
  const mutating = useRef(false);
  const request = useCallback(
    async (body?: object): Promise<{ team: Team; storageMode: string }> => {
      const response = await fetch(`/api/teams/${slug}`, {
        method: body ? "PATCH" : "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể kết nối.");
      return data;
    },
    [slug],
  );
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const current = ++version.current;
    try {
      const data = await request();
      if (current === version.current) {
        setTeam(data.team);
        setMode(data.storageMode);
        setError("");
      }
    } catch (error) {
      if (current === version.current)
        setError(
          error instanceof Error ? error.message : "Không thể tải lịch.",
        );
    } finally {
      setLoaded(true);
    }
  }, [request]);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      version.current++;
    };
  }, [refresh]);
  const member = team?.members.find((m) => m.id === selected);
  useEffect(() => {
    if (!dirty) setDraft(member?.slots || []);
  }, [member, dirty]);
  useEffect(() => {
    if (team && selected && !team.members.some((m) => m.id === selected)) {
      setSelected("");
      setDirty(false);
      setNotice("Thành viên đã bị xoá khỏi đội.");
    }
  }, [team, selected]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function mutate(body: object, message: string) {
    if (mutating.current) return false;
    mutating.current = true;
    version.current++;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await request(body);
      setTeam(data.team);
      setMode(data.storageMode);
      setNotice(message);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể lưu.");
      return false;
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  async function add(event: FormEvent) {
    event.preventDefault();
    const wordCount = name.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 1 || (wordCount === 2 && !shortNameConfirmed)) return;
    if (
      await mutate(
        {
          action: "add",
          name,
          jerseyNumber: Number(jerseyNumber),
          allowShortName: shortNameConfirmed,
        },
        "Đã thêm thành viên.",
      )
    ) {
      setName("");
      setJerseyNumber("");
      setShortNameConfirmed(false);
      setNameSuggestionChoice(null);
    }
  }
  async function save() {
    if (
      await mutate(
        { action: "availability", memberId: selected, slots: draft },
        "Đã lưu giờ rảnh của bạn.",
      )
    )
      setDirty(false);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Đã sao chép link. Gửi vào nhóm chat nhé!");
    } catch {
      setNotice(`Link của đội: ${window.location.href}`);
    }
  }
  if (!team)
    return (
      <Shell>
        <div className="panel mx-auto max-w-xl p-8">
          <p className="eyebrow">LỊCH CỦA ĐỘI</p>
          <h1 className="mt-4 text-2xl font-bold">
            {loaded ? "Chưa tải được đội bóng" : "Đang tập hợp đội hình…"}
          </h1>
          {error && (
            <p role="alert" className="error mt-4">
              {error}
            </p>
          )}
          {loaded && (
            <div className="mt-6 flex gap-5">
              <button className="primary" onClick={() => void refresh()}>
                Thử lại
              </button>
              <Link href="/" className="secondary">
                Tạo đội mới
              </Link>
            </div>
          )}
        </div>
      </Shell>
    );
  const submitted = team.members.filter((m) => m.updatedAt).length;
  const ranks = rankSlots(team);
  const nameWordCount = name.trim().split(/\s+/).filter(Boolean).length;
  const isOneWordName = nameWordCount === 1;
  const isTwoWordName = nameWordCount === 2;
  const normalizedName = name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
  const isSuggestedTruongName =
    jerseyNumber === "8" &&
    (normalizedName === "nguyễn công trường" ||
      normalizedName === "công trường");
  const showNameSuggestion =
    isSuggestedTruongName && nameSuggestionChoice === null;
  const needsShortNameConfirmation =
    isTwoWordName && !shortNameConfirmed && !showNameSuggestion;
  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <Link href="/" className="eyebrow">
            ← VỀ TRANG CHỦ
          </Link>
          <h1 className="mt-4 break-words text-4xl font-black tracking-tight sm:text-5xl">
            {team.name}
          </h1>
          <p className="mt-3 text-sm text-emerald-100/60">
            Một đội, một lịch. Chọn giờ rảnh để hẹn nhau ra sân.
          </p>
        </div>
        <button onClick={share} className="primary">
          ↗ Chia sẻ link đội
        </button>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          [String(team.members.length).padStart(2, "0"), "THÀNH VIÊN"],
          [String(submitted).padStart(2, "0"), "ĐÃ NHẬP LỊCH"],
          ["21", "KHUNG GIỜ / TUẦN"],
        ].map(([number, label]) => (
          <div key={label} className="stat">
            <strong className="text-3xl font-black text-amber-300 sm:text-4xl">
              {number}
            </strong>
            <span className="mt-2 block text-[10px] tracking-wider text-emerald-100/50 sm:text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
      {/* {mode === "temporary" && (
        <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-200">
          Bản demo lưu tạm: dữ liệu có thể mất khi máy chủ khởi động lại và
          không đảm bảo đồng bộ giữa các máy chủ Vercel. Dùng Redis để cả đội
          chia sẻ ổn định.
        </p>
      )} */}
      <div
        aria-live="polite"
        className="my-4 min-h-6 break-words text-sm text-amber-200"
      >
        {notice}
      </div>
      {error && (
        <p role="alert" className="error mb-5">
          {error}{" "}
          <button className="underline" onClick={() => void refresh()}>
            Tải lại
          </button>
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-6">
          <section className="panel p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Đội hình{" "}
                <span className="text-emerald-100/35">
                  / {team.members.length}
                </span>
              </h2>
              <span className="eyebrow">01</span>
            </div>
            <form
              onSubmit={add}
              className="mt-5 grid grid-cols-[minmax(0,1fr)_90px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_90px_auto]"
            >
              <div className="min-w-0">
                <label htmlFor="member-name" className="label mb-2 block">
                  Tên thành viên mới
                </label>
                <input
                  id="member-name"
                  ref={nameInputRef}
                  className="input min-w-0 flex-1"
                  placeholder="Tên hoặc biệt danh…"
                  value={name}
                  maxLength={50}
                  required
                  onChange={(e) => {
                    setName(e.target.value);
                    setShortNameConfirmed(false);
                    setNameSuggestionChoice(null);
                  }}
                />
              </div>
              <div>
                <label htmlFor="jersey-number" className="label mb-2 block">
                  Số áo
                </label>
                <input
                  id="jersey-number"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  step={1}
                  required
                  placeholder="0–99"
                  value={jerseyNumber}
                  onChange={(e) => {
                    setJerseyNumber(e.target.value);
                    setNameSuggestionChoice(null);
                  }}
                />
              </div>
              <button
                disabled={
                  busy ||
                  !name.trim() ||
                  !jerseyNumber.trim() ||
                  isOneWordName ||
                  needsShortNameConfirmation ||
                  showNameSuggestion
                }
                className="primary col-span-2 sm:col-span-1"
              >
                + Thêm
              </button>
            </form>
            {showNameSuggestion && (
              <div
                className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"
                role="alert"
              >
                <p>Bạn có muốn đặt tên là Trường con Bắc Ninh không?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="secondary border-amber-200/30 text-amber-50"
                    onClick={() => {
                      setName("Trường con Bắc Ninh");
                      setNameSuggestionChoice("nickname");
                      setShortNameConfirmed(false);
                    }}
                  >
                    Chắc chắn rồi
                  </button>
                  <button
                    type="button"
                    className="secondary border-amber-200/30 text-amber-50"
                    onClick={() => {
                      setNameSuggestionChoice("original");
                      if (isTwoWordName) setShortNameConfirmed(true);
                    }}
                  >
                    Có
                  </button>
                </div>
              </div>
            )}
            {isOneWordName && (
              <div
                className="mt-3 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100"
                role="alert"
              >
                Nhập đủ họ tên đi con vợ ơi!
              </div>
            )}
            {needsShortNameConfirmation && (
              <div
                className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"
                role="alert"
              >
                <p>Tên ông bạn chỉ có 2 từ thôi à?</p>
                <p className="mt-2">Ông bạn muốn tiếp tục với tên này không?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="secondary border-amber-200/30 text-amber-50"
                    onClick={() => setShortNameConfirmed(true)}
                  >
                    Có
                  </button>
                  <button
                    type="button"
                    className="secondary border-amber-200/30 text-amber-50"
                    onClick={() => {
                      setName("");
                      setShortNameConfirmed(false);
                      nameInputRef.current?.focus();
                    }}
                  >
                    Để tôi viết lại
                  </button>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-emerald-100/50">
              Có thể trùng tên; mỗi cầu thủ dùng một số áo riêng (0–99).
            </p>
            {!team.members.length ? (
              <p className="mt-5 text-sm text-emerald-100/50">
                Đội hình còn trống. Thêm thành viên đầu tiên để bắt đầu nhé.
              </p>
            ) : (
              <ul className="mt-5 flex flex-wrap gap-2">
                {team.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] py-2 pr-1 pl-3"
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${m.updatedAt ? "bg-amber-300" : "bg-white/25"}`}
                    />
                    <span className="truncate text-sm">{memberLabel(m)}</span>
                    <span className="sr-only">
                      {m.updatedAt ? "Đã nhập lịch" : "Chưa nhập lịch"}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => setRemoveId(m.id)}
                      aria-label={`Xoá ${memberLabel(m)}`}
                      className="flex size-8 items-center justify-center rounded text-emerald-100/40 hover:bg-red-300/10 hover:text-red-200"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-emerald-100/40">
              <span className="text-amber-300">●</span> Đã nhập lịch{" "}
              <span className="ml-3">● Chưa nhập lịch</span>
            </p>
            {removeId && (
              <div className="mt-4 rounded-xl border border-red-300/20 p-4 text-sm">
                <p>
                  Xoá{" "}
                  <strong>
                    {team.members
                      .filter((m) => m.id === removeId)
                      .map(memberLabel)
                      .join("")}
                  </strong>{" "}
                  và toàn bộ giờ rảnh của thành viên này?
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    disabled={busy}
                    className="secondary text-red-200"
                    onClick={async () => {
                      if (
                        await mutate(
                          { action: "remove", memberId: removeId },
                          "Đã xoá thành viên.",
                        )
                      )
                        setRemoveId("");
                    }}
                  >
                    Xoá thành viên
                  </button>
                  <button className="secondary" onClick={() => setRemoveId("")}>
                    Huỷ
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="panel overflow-hidden p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Bạn có thể tham gia lúc nào?
              </h2>
              <span className="eyebrow">02</span>
            </div>
            <p className="mt-2 text-sm text-emerald-100/50">
              Chọn tên, tick giờ rảnh rồi lưu lịch của bạn.
            </p>
            <label htmlFor="member-select" className="label mt-6 block">
              Tôi là
            </label>
            <select
              id="member-select"
              className="input mt-2"
              disabled={busy || dirty}
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setNotice("");
              }}
            >
              <option value="">Chọn tên của bạn</option>
              {team.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberLabel(m)}
                </option>
              ))}
            </select>
            <div className="mt-6 grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-2 sm:grid-cols-[90px_repeat(3,minmax(0,1fr))]">
              <div />
              {sessions.map((s) => (
                <div key={s.name} className="pb-2 text-center">
                  <span className="text-xl text-amber-200">{s.icon}</span>
                  <strong className="mt-1 block text-sm">{s.name}</strong>
                  <span className="text-[11px] text-emerald-100/45">
                    {s.time}
                  </span>
                </div>
              ))}
              {days.map((day, dayIndex) => (
                <div className="contents" key={day}>
                  <span
                    className={`flex items-center text-xs font-semibold sm:text-sm ${dayIndex > 4 ? "text-amber-200" : "text-emerald-100/70"}`}
                  >
                    {day}
                  </span>
                  {sessions.map((session, i) => {
                    const slot = dayIndex * 3 + i;
                    const checked = draft.includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={!member || busy}
                        aria-label={`${day}, ${session.name} ${session.time}`}
                        aria-pressed={checked}
                        onClick={() => {
                          setDraft((current) =>
                            current.includes(slot)
                              ? current.filter((s) => s !== slot)
                              : [...current, slot],
                          );
                          setDirty(true);
                          setNotice("");
                        }}
                        className={`slot ${checked ? "slot-selected" : ""}`}
                      >
                        <span aria-hidden="true">{checked ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-emerald-100/45">
              <span>
                <span className="text-amber-300">■</span> Rảnh, đi đá được
              </span>
              <span>{draft.length}/21 buổi đã chọn</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
              <button
                disabled={!member || busy}
                onClick={save}
                className="primary"
              >
                {busy ? "Đang lưu…" : "Lưu giờ rảnh"} ✓
              </button>
              {dirty && (
                <button
                  disabled={busy}
                  className="secondary"
                  onClick={() => setDirty(false)}
                >
                  Huỷ thay đổi
                </button>
              )}
              <span className="text-xs text-emerald-100/45">
                {dirty
                  ? "Có thay đổi chưa lưu"
                  : member?.updatedAt
                    ? "Lịch của bạn đã được lưu"
                    : "Lưu kể cả khi không rảnh buổi nào"}
              </span>
            </div>
          </section>
        </div>
        <aside className="panel min-w-0 p-5 sm:p-6 lg:sticky lg:top-6">
          <span className="eyebrow">GIỜ ĐẸP RA SÂN ↗</span>
          <h2 className="mt-3 text-2xl font-extrabold">Top 5 khung giờ</h2>
          <p className="mt-2 text-xs leading-5 text-emerald-100/50">
            Ưu tiên ít người vắng nhất. Bằng điểm thì xếp theo thứ và buổi trong
            tuần.
          </p>
          {team.members.length > 0 && submitted > 0 && (
            <TopSlotsChart ranks={ranks} memberCount={team.members.length} />
          )}
          {!team.members.length || !submitted ? (
            <div className="my-7 rounded-xl border border-dashed border-white/15 px-5 py-10 text-center">
              <span className="text-3xl">⚑</span>
              <p className="mt-3 text-sm font-semibold">
                Chờ đội mình chọn lịch
              </p>
              <p className="mt-2 text-xs leading-5 text-emerald-100/45">
                Khi có người lưu giờ rảnh, những khung giờ tốt nhất sẽ xuất hiện
                ở đây.
              </p>
            </div>
          ) : (
            <ol className="mt-6 space-y-3">
              {ranks.map((rank, index) => (
                <li
                  key={rank.slot}
                  className={`rounded-xl border p-4 ${index === 0 ? "border-amber-300/50 bg-amber-300/10" : "border-white/10 bg-white/[.02]"}`}
                >
                  {index === 0 && (
                    <p className="mb-3 text-[10px] font-bold tracking-widest text-amber-300">
                      ★ LỰA CHỌN TỐT NHẤT
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xl font-black ${index === 0 ? "text-amber-300" : "text-emerald-100/25"}`}
                    >
                      0{index + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">
                        {days[Math.floor(rank.slot / 3)]} ·{" "}
                        {sessions[rank.slot % 3].name}
                      </h3>
                      <p className="mt-1 text-xs text-emerald-100/50">
                        {sessions[rank.slot % 3].time}
                      </p>
                    </div>
                    <span
                      aria-label={`${rank.available} trên ${team.members.length} người rảnh`}
                      className="text-lg font-black text-amber-200"
                    >
                      {rank.available}
                      <span className="text-xs font-normal text-emerald-100/40">
                        /{team.members.length}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full rounded bg-amber-300"
                      style={{
                        width: `${(rank.available / team.members.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 break-words text-xs leading-5 text-emerald-100/55">
                    {rank.absent.length ? (
                      <>
                        <span className="text-amber-200">
                          Vắng {rank.absent.length}:
                        </span>{" "}
                        {rank.absent.map(memberLabel).join(", ")}
                      </>
                    ) : (
                      <span className="text-amber-200">
                        Đủ đội hình. Sẵn sàng ra sân!
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-emerald-100/45">
            <p>
              {team.members.length - submitted} người chưa nhập lịch; tạm tính
              là vắng.
            </p>
            <p className="mt-2">
              Tự cập nhật mỗi 15 giây khi mở trang. Lịch áp dụng cho tuần điển
              hình, không theo ngày cụ thể.
            </p>
          </div>
        </aside>
      </div>
      <p className="mt-7 text-xs leading-5 text-emerald-100/40">
        Ai có link đều có thể chỉnh sửa. Lịch hết hạn ngày{" "}
        {new Date(team.expiresAt).toLocaleDateString("vi-VN")}.
      </p>
    </Shell>
  );
}
