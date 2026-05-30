import Link from "next/link";
import { getLeagueComputation } from "@/lib/data/score-service";
import { formatDateTimeIST, formatPoints } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function WrappedHomePage() {
  const score = await getLeagueComputation(false);

  return (
    <main className="fixed inset-0 z-10 h-[100dvh] bg-[#020617] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#020617]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_16%,rgba(76,29,149,0.34),transparent_34%),radial-gradient(circle_at_88%_24%,rgba(6,182,212,0.24),transparent_38%),radial-gradient(circle_at_54%_86%,rgba(79,70,229,0.2),transparent_42%)]" />
      <div className="relative z-10 max-h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
        <section className="flex min-h-[100svh] snap-start flex-col justify-end px-5 pb-14 pt-10 sm:px-6 md:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">
            IPL Wrapped
          </p>
          <h1 className="mt-3 max-w-2xl text-5xl font-semibold leading-[0.92] tracking-[-0.05em] sm:text-6xl md:text-7xl">
            Choose your fantasy team
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            Full-screen immersive stories for your fantasy season and league superlatives.
          </p>
          <p className="mt-5 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/75">
            Updated {formatDateTimeIST(score.generatedAt)}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
            Scroll to browse teams
          </p>
        </section>

        {score.snapshot.standings.map((team) => (
          <Link
            key={team.leagueTeamId}
            href={`/wrapped/${team.leagueTeamId}`}
            className="group relative flex min-h-[100svh] snap-start flex-col justify-end overflow-hidden px-5 pb-16 pt-12 text-white sm:px-6 md:px-10"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-black/55" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(129,140,248,0.22),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.2),transparent_38%)] opacity-70" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
                Rank #{team.rank}
              </p>
              <h2 className="mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl">
                {team.displayName}
              </h2>
              <p className="mt-3 text-xl text-white/75">{team.ownerName}</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-100">{formatPoints(team.totalPoints)} pts</p>
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-white/65 transition group-hover:text-white">
                Enter Wrapped →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
