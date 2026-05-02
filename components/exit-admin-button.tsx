"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ExitAdminButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const onLogout = async () => {
    setMessage("Exiting admin...");
    console.info("[exit-admin] Logout requested");
    try {
      const response = await fetch("/api/admin/logout?returnTo=/", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }
      setMessage("Admin session cleared");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("[exit-admin] Logout failed", { error });
      setMessage("Unable to exit admin");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onLogout}
        disabled={isPending}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
      >
        {isPending ? "Exiting..." : "Exit Admin"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
