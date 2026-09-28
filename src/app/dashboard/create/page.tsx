"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Shell } from "@/components/shell";
import { authHeaders } from "@/lib/firebase-client";
import { useAuth } from "@/lib/use-auth";
import { userFacingError } from "@/lib/user-error";
export default function CreateTeamPage() {
  const router = useRouter(); const { user, ready } = useAuth();
  const [name, setName] = useState(""); const [jersey, setJersey] = useState("");
  const [pin, setPin] = useState(""); const [protect, setProtect] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function create(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try {
    const response = await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json", ...await authHeaders() }, body: JSON.stringify({ name, jerseyNumber: Number(jersey), pin: protect ? pin : undefined }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    router.push(`/team/${data.team.slug}`);
  } catch (error) { setError(userFacingError(error, "Không thể tạo đội. Hãy kiểm tra thông tin rồi thử lại.")); } finally { setBusy(false); } }
  return <Shell><section className="panel mx-auto max-w-xl p-7 sm:p-10"><Link href="/dashboard" className="eyebrow">← DASHBOARD</Link><h1 className="mt-4 text-3xl font-bold">Tạo đội mới</h1>
    {!ready ? <p className="mt-5">Đang kiểm tra tài khoản…</p> : !user ? <Link href="/auth?mode=login" className="primary mt-5 inline-block">Đăng nhập</Link> : !user.emailVerified ? <p className="mt-5">Hãy xác minh email trong dashboard trước khi tạo đội.</p> : <form onSubmit={create} className="mt-6 space-y-5">
      <p className="text-sm text-emerald-100/65">Bạn ({user.displayName}) sẽ là thành viên đầu tiên và đội trưởng.</p>
      <label className="label block">Tên đội<input className="input mt-2" required maxLength={50} value={name} onChange={e => setName(e.target.value)}/></label>
      <label className="label block">Số áo của bạn<input className="input mt-2" type="number" min={0} max={99} step={1} required value={jersey} onChange={e => setJersey(e.target.value)}/></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={protect} onChange={e => setProtect(e.target.checked)}/>Yêu cầu mã tham gia 6 số</label>
      {protect && <label className="label block">Mã tham gia<input className="input mt-2" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0,6))}/></label>}
      <button className="primary" disabled={busy || jersey === "" || (protect && pin.length !== 6)}>{busy ? "Đang tạo…" : "Tạo đội"}</button>{error && <p role="alert" className="error">{error}</p>}
    </form>}
  </section></Shell>;
}
