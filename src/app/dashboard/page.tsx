"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Shell } from "@/components/shell";
import { clientAuth, authHeaders } from "@/lib/firebase-client";
import { useAuth } from "@/lib/use-auth";
import { userFacingError } from "@/lib/user-error";
import type { TeamSummary } from "@/lib/team";

export default function Dashboard() {
  const { user, ready } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [created, setCreated] = useState<TeamSummary[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => { try {
      const response = await fetch("/api/teams", { headers: await authHeaders(), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (active) { setTeams(data.teams); setCreated(data.created); }
    } catch (error) { if (active) setMessage(userFacingError(error, "Không thể tải danh sách đội. Hãy thử lại sau.")); } })();
    return () => { active = false; };
  }, [user]);
  return <Shell><div className="mx-auto max-w-4xl">
    {!ready ? <p>Đang kiểm tra tài khoản…</p> : !user ? <section className="panel p-7"><h1 className="text-2xl font-bold">Hãy đăng nhập</h1><Link href="/auth?mode=login" className="primary mt-5 inline-block">Đăng nhập</Link></section> : <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">DASHBOARD</p><h1 className="mt-3 text-3xl font-bold">Chào mừng {user.displayName || "bạn"} đã quay lại đội</h1></div><button className="secondary" onClick={() => void signOut(clientAuth)}>Đăng xuất</button></div>
      {!user.emailVerified && <div className="panel mt-6 p-5"><p>Hãy xác minh email trước khi tạo hoặc tham gia đội mới.</p><p className="mt-2 text-sm text-emerald-100/70">Chưa thấy email? Hãy kiểm tra Hộp thư đến và thư mục Spam/Thư rác; email có thể mất vài phút mới tới.</p><div className="mt-4 flex flex-wrap gap-3"><button className="secondary" onClick={async () => { try { await sendEmailVerification(user); setMessage("Đã yêu cầu gửi lại email xác minh. Hãy kiểm tra cả thư mục Spam/Thư rác."); } catch (error) { setMessage(userFacingError(error, "Chưa thể gửi email xác minh. Hãy chờ một lúc rồi thử lại.", { "auth/too-many-requests": "Hệ thống tạm giới hạn gửi email xác minh. Hãy chờ một lúc rồi thử lại; kiểm tra cả thư mục Spam/Thư rác." })); } }}>Gửi lại email xác minh</button><button className="secondary" onClick={async () => { try { await user.reload(); await user.getIdToken(true); if (user.emailVerified) window.location.reload(); else setMessage("Email chưa được xác minh."); } catch { setMessage("Chưa thể kiểm tra email. Hãy thử lại."); } }}>Kiểm tra lại</button></div></div>}
      {message && <p role="status" className="mt-4 text-amber-200">{message}</p>}
      <div className="mt-7 flex flex-wrap gap-3"><Link href="/dashboard/create" className="primary">+ Tạo đội</Link><p className="self-center text-sm text-emerald-100/60">Để tham gia, mở link đội được chia sẻ và chọn số áo.</p></div>
      <section className="panel mt-8 p-6"><h2 className="text-xl font-bold">Đội của tôi</h2>{teams.length ? <ul className="mt-5 space-y-3">{teams.map(team => <li key={team.slug}><Link className="secondary block" href={`/team/${team.slug}`}>{team.name} · {team.memberCount} thành viên</Link></li>)}</ul> : <p className="mt-5 text-emerald-100/60">Bạn chưa tham gia đội nào.</p>}</section>
      <section className="panel mt-6 p-6"><h2 className="text-xl font-bold">Đội đã tạo</h2>{created.length ? <ul className="mt-5 space-y-3">{created.map(team => <li key={team.slug}><Link className="secondary block" href={`/team/${team.slug}`}>{team.name} · {team.memberCount} thành viên</Link></li>)}</ul> : <p className="mt-5 text-emerald-100/60">Bạn chưa tạo đội nào.</p>}</section>
    </>}
  </div></Shell>;
}
