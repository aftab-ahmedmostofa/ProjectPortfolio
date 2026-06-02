"use client";

import { useEffect, useRef, useState } from "react";

interface MultiSelectProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (next: string[]) => void;
}

export function MultiSelect({ label, values, options, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = values.length > 0;
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`flex items-center gap-1 rounded-lg border bg-white px-2 py-1 text-xs shadow-sm ${active ? "border-brand-300" : "border-slate-300"}`}
      >
        <span className="text-slate-500">{label}</span>
        <span className={`text-sm ${active ? "font-medium text-brand-700" : "text-slate-700"}`}>
          {active ? values.length === 1 ? values[0] : `${values.length} selected` : "All"}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1">
            <button type="button" onClick={() => onChange(options)} className="text-[11px] text-brand-600 hover:underline">
              Select all
            </button>
            <button type="button" onClick={() => onChange([])} className="text-[11px] text-slate-500 hover:underline">
              Clear
            </button>
          </div>
          <ul>
            {options.map((opt) => {
              const checked = values.includes(opt);
              return (
                <li key={opt}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50">
                    <input type="checkbox" checked={checked} onChange={() => toggle(opt)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-slate-700">{opt}</span>
                  </label>
                </li>
              );
            })}
            {options.length === 0 ? <li className="px-1.5 py-1 text-xs text-slate-400">No options</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
