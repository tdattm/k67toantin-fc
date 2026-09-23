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
          <a
            href="https://github.com/tdattm/k67toantin-fc"
            target="_blank"
            rel="noreferrer"
            aria-label="Mã nguồn dự án trên GitHub"
            className="group flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-emerald-100/70 transition-colors hover:border-amber-300/50 hover:text-amber-200"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-current"
            >
              <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.25c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
            </svg>
            <span>Mã nguồn dự án</span>
          </a>
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
