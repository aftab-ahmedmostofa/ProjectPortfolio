"use client";

import { useEffect, useState } from "react";
import { ChartKind } from "./ChartTypeSelector";

const STORAGE_KEY = "pm.chartKinds.v1";

function loadAll(): Record<string, ChartKind> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChartKind>) : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, ChartKind>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Hook: keeps the panel's chart type in component state and persists to
// localStorage so the user's choice survives reloads / navigation.
// `allowedKinds` is optional but recommended — if a stored value isn't in
// the panel's allow-list we ignore it and use the default. That prevents a
// panel from going blank when a previously-stored kind no longer applies
// (e.g. after a refactor that changed the chart's available variants).
export function useChartKind(
  panelId: string,
  defaultKind: ChartKind,
  allowedKinds?: readonly ChartKind[]
): [ChartKind, (k: ChartKind) => void] {
  const [kind, setKind] = useState<ChartKind>(defaultKind);

  // Hydrate from localStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    const stored = loadAll()[panelId];
    if (!stored) return;
    if (allowedKinds && !allowedKinds.includes(stored)) return;
    setKind(stored);
  }, [panelId, allowedKinds]);

  const update = (k: ChartKind) => {
    setKind(k);
    const map = loadAll();
    map[panelId] = k;
    saveAll(map);
  };

  return [kind, update];
}
