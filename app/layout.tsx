import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediCare",
  description: "Hệ thống quản trị MediCare",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Tiện ích trình duyệt (dịch trang, dark mode…) gắn thêm class vào <html> trước
    // khi hydrate → lệch className. React không vá attribute khi hydrate, nên chỉ
    // cần tắt cảnh báo cho riêng thẻ này.
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
