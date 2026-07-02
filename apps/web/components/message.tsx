"use client";

import { Fragment, type ReactNode } from "react";
import type { Source } from "@/lib/types";

/**
 * Render answer text, turning inline `[filename]` citations that match a known
 * source into clickable chips.
 */
export function AnswerText({
  text,
  sources,
  onCite,
}: {
  text: string;
  sources: Source[];
  onCite: (filename: string) => void;
}) {
  const known = new Set(sources.map((s) => s.filename));
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    const [full, name] = match;
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    if (name && known.has(name)) {
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={() => onCite(name)}
          className="mx-0.5 rounded bg-slate-100 px-1 text-xs font-medium text-slate-600 align-baseline hover:bg-slate-200"
        >
          {name}
        </button>,
      );
    } else {
      nodes.push(<Fragment key={key++}>{full}</Fragment>);
    }
    lastIndex = match.index + full.length;
  }
  nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);

  return <p className="whitespace-pre-wrap leading-relaxed">{nodes}</p>;
}

export function SourceList({
  sources,
  highlighted,
}: {
  sources: Source[];
  highlighted: string | null;
}) {
  if (sources.length === 0) return null;
  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60" open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-500">
        {sources.length} source{sources.length === 1 ? "" : "s"} retrieved
      </summary>
      <ul className="space-y-2 px-3 pb-3">
        {sources.map((s) => (
          <li
            key={s.chunkId}
            id={`src-${s.chunkId}`}
            className={`rounded-md border p-2 text-xs transition-colors ${
              highlighted === s.filename
                ? "border-slate-400 bg-white"
                : "border-slate-200 bg-white/70"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700">{s.filename}</span>
              <span className="shrink-0 text-[10px] text-slate-400">
                {(s.similarity * 100).toFixed(0)}% match
              </span>
            </div>
            <p className="line-clamp-4 text-slate-500">{s.content}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
