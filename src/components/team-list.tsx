"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { TeamSummary } from "@/lib/team";
import { userFacingError } from "@/lib/user-error";

export function TeamList() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [canDelete, setCanDelete] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    async function load() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/teams", {
          cache: "no-store",
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể tải danh sách đội.");
        if (active && !request.signal.aborted) {
          setTeams(data.teams);
          setCanDelete(data.canDelete === true);
        }
      } catch (error) {
        if (active && !request.signal.aborted)
          setError(userFacingError(error, "Không thể tải danh sách đội. Hãy thử lại sau."));
      } finally {
        if (active && !request.signal.aborted) setLoading(false);
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    void load();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  function toggleTeam(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  async function removeSelected(event: FormEvent) {
    event.preventDefault();
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selected, pin }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể xóa các đội đã chọn.");
      const selectedSlugs = new Set(selected);
      setTeams((current) => current.filter((team) => !selectedSlugs.has(team.slug)));
      setSelected([]);
      setPin("");
      setConfirmDelete(false);
      setRefresh((value) => value + 1);
    } catch (error) {
      setDeleteError(userFacingError(error, "Không thể xóa các đội đã chọn. Hãy thử lại."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="team-list-heading" className="mt-8 border-t border-white/10 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">CÙNG ĐỘI RA SÂN</p>
          <h2 id="team-list-heading" className="mt-3 text-3xl font-extrabold">Các đội đã tạo</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-100/60">
            Chọn đội để xem thành viên và tiếp tục lên lịch đá bóng.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
          className="chip text-sm text-emerald-100/80 hover:text-amber-300"
        >
          {loading ? "Đang tải…" : "Tải lại danh sách"}
        </button>
      </div>
      {canDelete && teams.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="chip text-sm text-emerald-100/80 hover:text-amber-300"
            onClick={() =>
              setSelected((current) =>
                current.length === teams.length ? [] : teams.map((team) => team.slug),
              )
            }
          >
            {selected.length === teams.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          {selected.length > 0 && (
            <button
              type="button"
              className="secondary border-red-300/30 text-red-200 hover:bg-red-300/10"
              onClick={() => {
                setDeleteError("");
                setPin("");
                setConfirmDelete(true);
              }}
            >
              Xóa {selected.length} đội đã chọn
            </button>
          )}
        </div>
      )}
      {confirmDelete && (
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-teams-heading"
          className="panel mt-5 max-w-lg border-red-300/30 p-6"
          onSubmit={removeSelected}
        >
          <h3 id="delete-teams-heading" className="text-lg font-bold text-red-100">
            Xóa vĩnh viễn {selected.length} đội?
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-100/70">
            Lịch, thành viên và đội hình của các đội này sẽ bị xóa. Nhập PIN 6 số để xác nhận.
          </p>
          <label htmlFor="delete-team-pin" className="label mt-5 block">PIN xóa đội</label>
          <input
            id="delete-team-pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="input mt-2 max-w-48 tracking-[0.4em]"
          />
          {deleteError && <p role="alert" className="error mt-4">{deleteError}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={deleting || pin.length !== 6} className="secondary border-red-300/30 text-red-200 hover:bg-red-300/10">
              {deleting ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
            <button type="button" disabled={deleting} className="secondary" onClick={() => setConfirmDelete(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}
      {loading && <p role="status" className="mt-6 text-sm text-emerald-100/60">Đang tải danh sách đội…</p>}
      {error && <p role="alert" className="error mt-6">{error}</p>}
      {!loading && !error && teams.length === 0 && (
        <p className="panel mt-6 p-6 text-sm text-emerald-100/70">
          Chưa có đội nào. Tạo đội đầu tiên bằng form phía trên nhé!
        </p>
      )}
      {teams.length > 0 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.slug} className="min-w-0">
              <article className="panel h-full p-6">
                {canDelete && (
                  <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-emerald-100/70">
                    <input
                      type="checkbox"
                      checked={selected.includes(team.slug)}
                      onChange={() => toggleTeam(team.slug)}
                      aria-label={`Chọn đội ${team.name} để xóa`}
                      className="size-4 accent-amber-300"
                    />
                    Chọn để xóa
                  </label>
                )}
                <Link
                  href={`/team/${team.slug}`}
                  className="block rounded-lg transition-colors hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
                >
                  <h3 className="text-xl font-bold [overflow-wrap:anywhere]">{team.name}</h3>
                  <p className="mt-3 text-sm text-emerald-100/60">{team.memberCount} thành viên</p>
                  {team.requiresPin && <p className="mt-2 text-xs text-amber-200">Cần PIN để vào đội</p>}
                  <span className="mt-5 block text-sm font-semibold text-amber-300">Mở đội & chọn lịch ↗</span>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
