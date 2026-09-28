"use client";
import Link from "next/link";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { DreamTeamSection } from "@/components/dream-team";
import { TopSlotsChart } from "@/components/top-slots-chart";
import { demoTeam } from "@/lib/demo";
import { days, memberLabel, rankSlots, sessions } from "@/lib/team";
export default function DemoPage() {
  const [memberId, setMemberId] = useState(demoTeam.members[0].id);
  const member = demoTeam.members.find(m => m.id === memberId)!;
  const ranks = rankSlots(demoTeam);
  return <Shell><div className="flex flex-wrap justify-between gap-4"><div><Link href="/" className="eyebrow">← HOME</Link><h1 className="mt-4 text-4xl font-black">{demoTeam.name}</h1><p className="mt-2 text-emerald-100/60">Demo chỉ đọc · 19 thành viên giả lập · Đội trưởng: {demoTeam.members[0].name}</p></div><Link href="/auth?mode=register" className="primary self-start">Tạo đội của bạn</Link></div>
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]"><section className="panel p-6"><h2 className="text-xl font-bold">Lịch của từng người</h2><label className="label mt-5 block">Chọn thành viên<select className="input mt-2" value={memberId} onChange={e => setMemberId(e.target.value)}>{demoTeam.members.map(m => <option key={m.id} value={m.id}>{memberLabel(m)}</option>)}</select></label><div className="mt-5 grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-2"><div/>{sessions.map(s => <strong key={s.name} className="text-center text-sm">{s.name}</strong>)}{days.map((day,d) => <div className="contents" key={day}><span className="self-center text-sm">{day}</span>{sessions.map((s,i) => <span key={s.name} className={`slot text-center ${member.slots.includes(d*3+i) ? "slot-selected" : ""}`}>{member.slots.includes(d*3+i) ? "✓" : "–"}</span>)}</div>)}</div></section><aside className="panel p-6"><h2 className="text-xl font-bold">Top 5 khung giờ</h2><TopSlotsChart ranks={ranks} memberCount={19}/><ol className="mt-5 space-y-2 text-sm">{ranks.map((r,i) => <li key={r.slot}>{i+1}. {days[Math.floor(r.slot/3)]} · {sessions[r.slot%3].name}: {r.available}/19 rảnh</li>)}</ol></aside></div>
    <section className="panel mt-6 p-6"><h2 className="text-xl font-bold">Đội hình và số áo</h2><p className="mt-3 text-sm text-emerald-100/60">{demoTeam.members.map(memberLabel).join(" · ")}</p></section>
    <DreamTeamSection team={demoTeam} busy={false} editableOwnerId="" onSave={async () => false}/>
  </Shell>;
}
