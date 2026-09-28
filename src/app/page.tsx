import Link from "next/link";
import { Shell } from "@/components/shell";
export default function Home() {
  return <Shell>
    <div className="grid items-center gap-12 py-8 lg:grid-cols-2 lg:py-16">
      <section>
        <p className="eyebrow">LỊCH ĐÁ BÓNG CHO CẢ ĐỘI</p>
        <h1 className="mt-5 text-5xl font-black leading-tight sm:text-7xl">Đủ người.<br/><span className="text-amber-300">Lên sân thôi.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-emerald-100/70">Cùng chọn giờ rảnh trong 21 khung giờ mỗi tuần, xem top 5 giờ đẹp và xếp Dream Team của riêng bạn.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/auth?mode=register" className="primary">Đăng ký</Link>
          <Link href="/auth?mode=login" className="secondary">Đăng nhập</Link>
          <Link href="/demo" className="secondary">Xem demo</Link>
        </div>
        <p className="mt-6 text-sm text-emerald-100/50">Bạn vẫn có thể mở link đội cũ được chia sẻ mà không cần tài khoản.</p>
      </section>
      <section className="panel p-7 sm:p-10">
        <p className="eyebrow">MỘT ĐỘI, MỘT LỊCH</p>
        <h2 className="mt-4 text-3xl font-bold">Hẹn nhau ra sân dễ hơn</h2>
        <ol className="mt-8 space-y-6 text-emerald-100/75">
          <li><span className="mr-4 font-black text-amber-300">01</span>Tạo đội bằng tài khoản đã xác minh email.</li>
          <li><span className="mr-4 font-black text-amber-300">02</span>Chia sẻ link, mỗi thành viên chọn số áo riêng.</li>
          <li><span className="mr-4 font-black text-amber-300">03</span>Cập nhật lịch, xem giờ phù hợp và Dream Team.</li>
        </ol>
      </section>
    </div>
  </Shell>;
}
