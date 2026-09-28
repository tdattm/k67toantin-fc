"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Shell } from "./shell";
import { DreamTeamSection } from "./dream-team";
import { TopSlotsChart } from "./top-slots-chart";
import { authHeaders } from "@/lib/firebase-client";
import { useAuth } from "@/lib/use-auth";
import { userFacingError } from "@/lib/user-error";
import { days, memberLabel, rankSlots, sessions, type Team } from "@/lib/team";

export function AccountBoard({ slug }: { slug: string }) {
  const { user, ready } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [meta, setMeta] = useState<{ name: string; hasPin: boolean } | null>(null);
  const [joinNeeded, setJoinNeeded] = useState(false);
  const [jersey, setJersey] = useState(""); const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState(""); const [transferId, setTransferId] = useState("");
  const [slots, setSlots] = useState<number[]>([]); const [dirty, setDirty] = useState(false);
  const [viewMemberId, setViewMemberId] = useState("");
  const [isCaptain, setIsCaptain] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const request = useCallback(async (path = "", method = "GET", data?: object) => {
    const response = await fetch(`/api/teams/${slug}${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json", ...await authHeaders() }, body: data ? JSON.stringify(data) : undefined });
    const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error || "Không thể kết nối."), { status: response.status });
    return result;
  }, [slug]);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await request(); setTeam(data.team); setIsCaptain(data.isCaptain); setJoinNeeded(false); setError("");
      if (!dirty) setSlots(data.team.members.find((m: { uid?: string }) => m.uid === user.uid)?.slots || []);
    } catch (error) {
      if ((error as { status?: number }).status === 403) {
        try { setMeta(await request("/join")); setJoinNeeded(true); setTeam(null); return; } catch { /* show original error */ }
      }
      setError(userFacingError(error, "Không thể mở đội. Hãy thử tải lại trang."));
    }
  }, [user, request, dirty]);
  useEffect(() => { if (!user) return; void refresh(); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 15000); return () => clearInterval(timer); }, [user, refresh]);
  async function mutate(data: object, message: string) {
    setBusy(true); setError(""); try { const result = await request("", "PATCH", data); setTeam(result.team); setIsCaptain(result.isCaptain); setNotice(message); return true; }
    catch (error) { setError(userFacingError(error, "Không thể lưu thay đổi. Hãy thử lại.")); return false; }
    finally { setBusy(false); }
  }
  async function join(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try {
    await request("/join", "POST", { jerseyNumber: Number(jersey), pin }); await refresh();
  } catch (error) { setError(userFacingError(error, "Không thể tham gia đội. Hãy kiểm tra thông tin rồi thử lại.")); } finally { setBusy(false); } }
  async function removeOrLeave(memberId: string, leave = false) {
    if (!window.confirm(leave ? "Rời đội này?" : "Xóa thành viên khỏi đội?")) return;
    if (await mutate({ action: leave ? "leave" : "remove", memberId }, leave ? "Đã rời đội." : "Đã xóa thành viên.")) await refresh();
  }
  async function deleteTeam() {
    if (!window.confirm("Xóa đội này và toàn bộ lịch, Dream Team?")) return;
    setBusy(true); try { await request("", "DELETE"); window.location.href = "/dashboard"; }
    catch (error) { setError(userFacingError(error, "Không thể xóa đội. Hãy thử lại.")); setBusy(false); }
  }
  if (!ready) return <Shell><p>Đang kiểm tra tài khoản…</p></Shell>;
  if (!user) return <Shell><section className="panel max-w-xl p-7"><h1 className="text-2xl font-bold">Đăng nhập để tham gia đội</h1><Link href={`/auth?mode=login&next=${encodeURIComponent(`/team/${slug}`)}`} className="primary mt-5 inline-block">Đăng nhập</Link></section></Shell>;
  if (!user.emailVerified) return <Shell><section className="panel max-w-xl p-7"><h1 className="text-2xl font-bold">Hãy xác minh email</h1><p className="mt-3">Sau khi xác minh, mở lại link đội.</p><Link href="/dashboard" className="primary mt-5 inline-block">Dashboard</Link></section></Shell>;
  if (joinNeeded) return <Shell><section className="panel mx-auto max-w-xl p-7"><Link href="/dashboard" className="eyebrow">← DASHBOARD</Link><h1 className="mt-4 text-3xl font-bold">Tham gia {meta?.name}</h1><p className="mt-3 text-sm text-emerald-100/60">Tên thành viên lấy từ hồ sơ của bạn. Số áo phải riêng trong đội này.</p><form onSubmit={join} className="mt-6 space-y-4"><label className="label block">Số áo (0–99)<input className="input mt-2" type="number" min={0} max={99} step={1} required value={jersey} onChange={e => setJersey(e.target.value)}/></label>{meta?.hasPin && <label className="label block">Mã tham gia 6 số<input className="input mt-2" type="password" inputMode="numeric" pattern="[0-9]{6}" required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0,6))}/></label>}<button className="primary" disabled={busy || jersey === "" || (meta?.hasPin && pin.length !== 6)}>Tham gia đội</button></form>{error && <p role="alert" className="error mt-4">{error}</p>}</section></Shell>;
  if (!team) return <Shell><p>{error || "Đang tải đội…"}</p></Shell>;
  const mine = team.members.find(m => m.uid === user.uid);
  const shownMember = team.members.find(m => m.id === (viewMemberId || user.uid)) || mine;
  const shownSlots = shownMember?.uid === user.uid ? slots : shownMember?.slots || [];
  const ranks = rankSlots(team); const submitted = team.members.filter(m => m.updatedAt).length;
  return <Shell><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/dashboard" className="eyebrow">← DASHBOARD</Link><h1 className="mt-3 text-4xl font-black">{team.name}</h1><p className="mt-2 text-emerald-100/60">{team.members.length} thành viên · Đội trưởng: {team.members.find(m => m.uid === team.captainUid)?.name}</p></div><button className="secondary" onClick={() => void navigator.clipboard.writeText(window.location.href).then(() => setNotice("Đã sao chép link đội."))}>Chia sẻ link đội</button></div>
    {notice && <p role="status" className="mt-5 text-amber-200">{notice}</p>}{error && <p role="alert" className="error mt-5">{error}</p>}
    <section className="panel mt-7 p-6"><h2 className="text-xl font-bold">Thành viên</h2><ul className="mt-5 flex flex-wrap gap-3">{team.members.map(m => <li key={m.id} className="rounded-lg border border-white/10 p-3 text-sm">{memberLabel(m)}{m.uid === team.captainUid ? " · Đội trưởng" : ""}{isCaptain && m.uid !== user.uid && <button className="ml-3 text-red-200 underline" disabled={busy} onClick={() => void removeOrLeave(m.id)}>Xóa</button>}</li>)}</ul>{!isCaptain && <button className="secondary mt-5" disabled={busy} onClick={() => void removeOrLeave(user.uid, true)}>Rời đội</button>}</section>
    {isCaptain && <section className="panel mt-6 p-6"><h2 className="text-xl font-bold">Quản lý đội</h2><div className="mt-5 grid gap-5 md:grid-cols-2"><div><p className="label">Mã tham gia: {team.hasPin ? "đang bật" : "đang tắt"}</p><input className="input mt-2" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0,6))} placeholder="6 chữ số"/><div className="mt-3 flex gap-2"><button className="secondary" disabled={busy || newPin.length !== 6} onClick={() => void mutate({ action: "setPin", pin: newPin }, "Đã cập nhật mã tham gia.").then(() => setNewPin(""))}>Lưu mã</button>{team.hasPin && <button className="secondary" disabled={busy} onClick={() => void mutate({ action: "setPin", pin: null }, "Đã tắt mã tham gia.")}>Tắt mã</button>}</div></div><div><label className="label">Chuyển quyền đội trưởng<select className="input mt-2" value={transferId} onChange={e => setTransferId(e.target.value)}><option value="">Chọn thành viên</option>{team.members.filter(m => m.uid !== user.uid).map(m => <option key={m.id} value={m.id}>{memberLabel(m)}</option>)}</select></label><button className="secondary mt-3" disabled={busy || !transferId} onClick={() => void mutate({ action: "transferCaptain", memberId: transferId }, "Đã chuyển quyền đội trưởng.")}>Chuyển quyền</button></div></div><button className="secondary mt-7 text-red-200" disabled={busy} onClick={() => void deleteTeam()}>Xóa đội</button></section>}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]"><section className="panel p-6"><h2 className="text-xl font-bold">Lịch thành viên</h2><label className="label mt-4 block">Xem lịch của<select className="input mt-2" value={shownMember?.id || ""} disabled={dirty} onChange={e => setViewMemberId(e.target.value)}>{team.members.map(m => <option key={m.id} value={m.id}>{memberLabel(m)}{m.uid === user.uid ? " · Tôi" : ""}</option>)}</select></label>{shownMember?.uid !== user.uid && <p className="mt-2 text-xs text-emerald-100/60">Bạn chỉ có thể xem lịch của thành viên này.</p>}<div className="mt-5 grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-2"><div/>{sessions.map(s => <strong key={s.name} className="text-center text-sm">{s.name}<span className="block text-xs font-normal text-emerald-100/50">{s.time}</span></strong>)}{days.map((day,d) => <div className="contents" key={day}><span className="self-center text-sm">{day}</span>{sessions.map((session,i) => { const slot=d*3+i; return <button key={slot} type="button" disabled={shownMember?.uid !== user.uid} aria-label={`${day}, ${session.name}`} aria-pressed={shownSlots.includes(slot)} className={`slot ${shownSlots.includes(slot) ? "slot-selected" : ""}`} onClick={() => { setSlots(current => current.includes(slot) ? current.filter(s => s !== slot) : [...current,slot]); setDirty(true); }}>{shownSlots.includes(slot) ? "✓" : "+"}</button>; })}</div>)}</div>{shownMember?.uid === user.uid && <><button className="primary mt-5" disabled={busy || !dirty} onClick={async () => { if (await mutate({ action: "availability", memberId: user.uid, slots }, "Đã lưu lịch.")) setDirty(false); }}>Lưu giờ rảnh</button>{dirty && <button className="secondary ml-2" onClick={() => { setSlots(mine?.slots || []); setDirty(false); }}>Huỷ thay đổi</button>}</>}</section><aside className="panel p-6"><h2 className="text-xl font-bold">Top 5 khung giờ</h2>{submitted ? <><TopSlotsChart ranks={ranks} memberCount={team.members.length}/><ol className="mt-5 space-y-3">{ranks.map((r,i) => <li key={r.slot} className="rounded-lg border border-white/10 p-3 text-sm">{i+1}. {days[Math.floor(r.slot/3)]} · {sessions[r.slot%3].name}: {r.available}/{team.members.length} rảnh<p className="text-xs text-emerald-100/60">Vắng: {r.absent.map(memberLabel).join(", ") || "Không ai"}</p></li>)}</ol></> : <p className="mt-4 text-sm text-emerald-100/60">Chưa có lịch được lưu.</p>}</aside></div>
    <DreamTeamSection team={team} busy={busy} editableOwnerId={user.uid} onSave={mutate}/>
  </Shell>;
}
