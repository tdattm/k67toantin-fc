import Link from "next/link";
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-extrabold">
            <span className="rounded-xl bg-amber-300 p-2 text-2xl">⚽</span>
            <span>
              LỊCH ĐÁ BÓNG
              <span className="block text-xs font-normal tracking-widest text-emerald-200/60">
                CÙNG ĐỘI RA SÂN
              </span>
            </span>
          </Link>
          {/* <span className="hidden text-xs tracking-widest text-emerald-100/50 sm:block">
            ÍT NGƯỜI VẮNG · NHIỀU NIỀM VUI
          </span>
          <span className="chip text-xs text-amber-200">MVP</span> */}
        </div>
      </header>
      <main className="mx-auto min-h-[80vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {children}
      </main>
      <footer className="mx-auto max-w-7xl border-t border-white/10 px-5 py-6 text-xs text-emerald-100/40">
        Một chiếc lịch nhỏ, cho những trận bóng đông đủ.
      </footer>
    </>
  );
}
