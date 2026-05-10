"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const onRefresh = async () => {
    setMessage("Refreshing...");
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      setMessage("Live scores updated");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("Unable to refresh right now");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onRefresh}
        disabled={isPending}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Refreshing..." : "Refresh Live Scores"}
      </button>
      <p className="min-h-4 text-xs text-slate-500">{message || ""}</p>
    </div>
  );
}
