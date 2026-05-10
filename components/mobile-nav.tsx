"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/stats", label: "Insights" },
  { href: "/progression", label: "Progression" },
  { href: "/matches", label: "Matches" },
  { href: "/players", label: "Players" },
];

const mobilePrimaryLinks = links.slice(0, 3);

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 hidden md:block">
      <ul className="glass-card-strong flex w-fit items-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`inline-flex items-center rounded-xl px-4 py-2 transition ${
                pathname === link.href
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {isMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {isMenuOpen ? (
        <div className="fixed bottom-20 left-3 right-3 z-50 md:hidden">
          <div className="glass-card-strong rounded-3xl p-2.5">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              More Navigation
            </p>
            <ul className="grid gap-1">
              {links.map((link) => (
                <li key={`mobile-menu-${link.href}`}>
                  <Link
                    href={link.href}
                    className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      pathname === link.href
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-2 md:hidden">
        <ul className="glass-card-strong mx-auto grid max-w-lg grid-cols-4 gap-1 rounded-3xl p-1.5 text-[11px] font-semibold">
          {mobilePrimaryLinks.map((link) => (
            <li key={`mobile-primary-${link.href}`}>
              <Link
                href={link.href}
                className={`inline-flex h-11 w-full items-center justify-center rounded-2xl px-2 text-center transition ${
                  pathname === link.href
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-white"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className={`inline-flex h-11 w-full items-center justify-center rounded-2xl px-2 text-center transition ${
                isMenuOpen
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
