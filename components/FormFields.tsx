'use client';

import React from 'react';

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function NumberField({
  label, value, onChange, min, max, step = 1, unit,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </div>
    </label>
  );
}

export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export function SelectField<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
