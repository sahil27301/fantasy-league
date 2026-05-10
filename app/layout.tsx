import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DesktopNav, MobileNav } from "@/components/mobile-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IPL Fantasy League",
  description: "Live fantasy league standings, stats and progression",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-zinc-900">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 -top-16 h-64 w-64 rounded-full bg-indigo-300/45 blur-3xl" />
          <div className="absolute -right-14 top-14 h-60 w-60 rounded-full bg-sky-300/45 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-violet-300/35 blur-3xl" />
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col px-3 pb-28 pt-4 sm:px-4 md:px-8 md:pb-10 md:pt-6">
          <DesktopNav />
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
