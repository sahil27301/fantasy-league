import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";

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
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
