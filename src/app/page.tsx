"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/team/${data.team.slug}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể tạo đội.");
      setBusy(false);
    }
  }
  return (
    <Shell>
      <div className="grid items-center gap-14 py-6 lg:grid-cols-2 lg:py-12">
        <section>
          <p className="eyebrow">HẾT HỎI “BAO GIỜ ĐÁ?”</p>
          <h1 className="mt-5 text-5xl leading-[1.1] font-black tracking-tight sm:text-7xl">
            Đủ người.
            <br />
            <span className="text-amber-300">Lên sân thôi.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-emerald-100/65">
            Không trôi tin nhắn, không đếm từng người. Cả đội chọn giờ rảnh,
            lịch đẹp nhất sẽ hiện ra.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 text-sm text-emerald-100/70">
            <span className="chip">↗ Một link cho cả đội</span>
            <span className="chip">✓ Không cần đăng nhập</span>
          </div>
          <div className="pitch mt-12 h-48 max-w-lg" aria-hidden="true">
            <div className="pitch-circle" />
            <span className="pitch-ball">⚽</span>
            <span className="pitch-label">
              TRẬN HAY BẮT ĐẦU TỪ MỘT CÁI HẸN.
            </span>
          </div>
        </section>
        <section className="panel p-7 sm:p-10">
          <span className="eyebrow">KHỞI ĐỘNG / 01</span>
          <h2 className="mt-4 text-3xl font-extrabold">Tập hợp đội của bạn</h2>
          <p className="mt-3 text-sm leading-6 text-emerald-100/60">
            Tạo đội, gửi link vào nhóm chat rồi cùng chọn lịch. Chỉ mất một
            phút.
          </p>
          <form onSubmit={create} className="mt-8">
            <label htmlFor="team-name" className="label">
              Tên đội bóng
            </label>
            <input
              id="team-name"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: K67 Toán Tin FC"
              className="input mt-2"
            />
            <button
              disabled={busy || !name.trim()}
              className="primary mt-4 w-full"
            >
              {busy ? "Đang tạo đội…" : "Tạo đội & chọn lịch"} ↗
            </button>
            {error && (
              <p role="alert" className="error mt-4">
                {error}
              </p>
            )}
          </form>
          <div className="mt-8 space-y-5 border-t border-white/10 pt-7">
            {[
              "Thêm tên các thành viên vào đội",
              "Mỗi người tick những buổi mình rảnh",
              "Chốt top 5 khung giờ đông đủ nhất",
            ].map((text, i) => (
              <div
                key={text}
                className="flex items-center gap-4 text-sm text-emerald-100/70"
              >
                <span className="text-amber-300">0{i + 1}</span>
                {text}
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs leading-5 text-emerald-100/40">
            Ai có link đều có thể sửa lịch và thành viên. Lịch được giữ tối đa
            28 ngày.
          </p>
        </section>
      </div>
    </Shell>
  );
}
