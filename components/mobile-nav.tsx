"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/stats", label: "Insights" },
  { href: "/progression", label: "Progression" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 md:hidden">
      <ul className="glass-card-strong mx-auto flex max-w-lg items-center justify-between rounded-2xl px-2 py-2 text-sm font-semibold">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`rounded-xl px-4 py-2 transition ${
                pathname === link.href
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100"
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
