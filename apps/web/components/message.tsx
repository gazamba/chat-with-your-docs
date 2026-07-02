"use client";

import { Fragment, type ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Render answer text, turning inline `[filename]` citations that match a known
 * source into clickable chips (styled with the shadcn button variants).
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
    nodes.push(
      <Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>,
    );
    if (name && known.has(name)) {
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={() => onCite(name)}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "mx-0.5 inline h-5 gap-1 px-1.5 align-baseline text-xs font-medium",
          )}
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
    <details className="mt-3" open>
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
        {sources.length} source{sources.length === 1 ? "" : "s"} retrieved
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <Card
            key={s.chunkId}
            data-file={s.filename}
            className={cn(
              "p-2.5 text-xs shadow-none transition-colors",
              highlighted === s.filename && "border-ring ring-2 ring-ring/30",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-card-foreground">
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.filename}</span>
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {(s.similarity * 100).toFixed(0)}% match
              </span>
            </div>
            <p className="line-clamp-4 text-muted-foreground">{s.content}</p>
          </Card>
        ))}
      </ul>
    </details>
  );
}
