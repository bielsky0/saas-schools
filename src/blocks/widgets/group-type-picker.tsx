"use client";

import { useEffect, useState } from "react";

export function GroupTypePickerWidget({ value, onChange, id, onBlur }: Record<string, any>) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blocks/group-types-list")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onBlur(id, e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">
        {loading ? "Ładowanie..." : "Wybierz ofertę..."}
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  );
}
