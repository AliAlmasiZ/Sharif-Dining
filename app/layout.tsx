import type { Metadata } from "next";
import { ToastContainer } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "رزرو غذا | سامانه تغذیه شریف",
  description: "سامانه مدیریت و رزرو آنلاین غذای دانشگاه صنعتی شریف",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
