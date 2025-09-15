'use client';
import React from "react";

export default function NumberField({ value, onChange, onCommit, step = "any", placeholder }:{ value: any; onChange: (v:string)=>void; onCommit?: (v:string)=>void; step?: string; placeholder?: string; }) {
  return (
    <input
      className="h-12 rounded-lg border border-gray-400 px-3 text-[16px] bg-white text-black placeholder-gray-500 caret-black shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      type="text"
      inputMode="decimal"
      step={step}
      value={String(value ?? "")}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit && onCommit(e.target.value)}
    />
  );
}
