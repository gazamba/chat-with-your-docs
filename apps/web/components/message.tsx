"use client";

import { Fragment, type ReactNode } from "react";
import type { Source } from "@/lib/types";

export type OpenSource = (source: Source, passageNumber: number) => void;

/**
 * Render answer text, turning inline numeric citations like `[1]` / `[2, 3]`
 * into small pill buttons that open the matching source passage.
 */
export function AnswerText({
  text,
  sources,
  onOpenSource,
}: {
  text: string;
  sources: Source[];
  onOpenSource: OpenSource;
}) {
  const nodes: ReactNode[] = [];
  const pattern = /\[([\d,\s]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    const numbers = match[1]!
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => n >= 1 && n <= sources.length);

    nodes.push(
      <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>,
    );

    if (numbers.length > 0) {
      for (const n of numbers) {
        nodes.push(
          <button
            key={key++}
            type="button"
            onClick={() => onOpenSource(sources[n - 1]!, n)}
            className="relative -top-0.5 mx-0.5 inline-flex items-center rounded-full border px-1.5 text-[10.5px] font-semibold text-[var(--color-brand)]"
            style={{
              background: "var(--chip-bg)",
              borderColor: "var(--chip-border)",
            }}
          >
            {n}
          </button>,
        );
      }
    } else {
      nodes.push(<Fragment key={key++}>{match[0]}</Fragment>);
    }
    lastIndex = match.index + match[0].length;
  }
  nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);

  return (
    <div
      className="font-serif text-[var(--color-body)]"
      style={{ fontSize: "16.5px", lineHeight: 1.7 }}
    >
      <p className="whitespace-pre-wrap">{nodes}</p>
    </div>
  );
}

/** Numbered source cards shown beneath an assistant answer. */
export function SourceCards({
  sources,
  onOpenSource,
}: {
  sources: Source[];
  onOpenSource: OpenSource;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="section-label">Sources</p>
      <ul className="space-y-1.5">
        {sources.map((s, i) => (
          <li key={s.chunkId}>
            <button
              type="button"
              onClick={() => onOpenSource(s, i + 1)}
              className="group flex w-full items-center gap-2.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-panel)] px-3 py-2 text-left transition-colors hover:border-[var(--color-brand)]"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--color-brand)] group-hover:bg-[var(--chip-bg)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[var(--color-ink)]">
                  {s.filename}
                </span>
                <span className="block truncate text-[11.5px] text-[var(--color-meta)]">
                  {(s.similarity * 100).toFixed(0)}% match · passage {i + 1}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three staggered pulsing dots, shown while the answer is streaming. */
export function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="loading-dot block size-[7px] rounded-full bg-[var(--color-meta)]"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
