import Link from "next/link";
import { getMatchProgression } from "@/lib/progression/match-progression";
import { ProgressionDashboard } from "@/components/progression-dashboard";

export const dynamic = "force-dynamic";

export default async function ProgressionPage() {
  const progression = await getMatchProgression(false);

  return (
    <main className="flex flex-col gap-5 pb-10">
      <header className="glass-card-strong rounded-3xl p-6">
        <p className="muted-label">Progression</p>
        <h1 className="section-title mt-2">Match-wise League Progression</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cumulative team points are computed for each completed IPL match using captain and
          vice-captain multipliers for the active window.
        </p>
      </header>

      {progression.matches.length === 0 ? (
        <section className="glass-card rounded-3xl p-5">
          <p className="text-sm text-zinc-500">No completed match data available yet.</p>
        </section>
      ) : (
        <ProgressionDashboard progression={progression} />
      )}

      <Link href="/" className="text-sm font-semibold text-indigo-700">
        ← Back to leaderboard
      </Link>
    </main>
  );
}
