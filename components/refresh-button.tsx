"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("[refresh-button] Refresh failed", { error });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing || isPending}
      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition hover:bg-zinc-800 disabled:opacity-60"
    >
      {isRefreshing || isPending ? "Refreshing..." : "Refresh Live Scores"}
    </button>
  );
}
