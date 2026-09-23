import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lịch đá bóng đội · Hẹn nhau ra sân",
  description: "Chọn giờ rảnh, tìm lịch đá bóng đông đủ nhất cho cả đội.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
