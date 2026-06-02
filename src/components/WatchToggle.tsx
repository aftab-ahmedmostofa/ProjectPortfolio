"use client";

import { useApp } from "./AppProvider";

export function WatchToggle({ projectId, size = "sm" }: { projectId: string; size?: "sm" | "md" }) {
  const { isWatched, toggleWatch } = useApp();
  const watched = isWatched(projectId);
  const cls = size === "md" ? "text-xl" : "text-base";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch(projectId);
      }}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      title={watched ? "Watching · click to unwatch" : "Add to watchlist"}
      className={`leading-none transition-colors ${cls} ${watched ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
