"use client";

import { Fragment, type ReactNode } from "react";
import { FileText } from "lucide-react";
import type { Source } from "@/lib/types";

export type OpenSource = (source: Source, passageNumber: number) => void;

function CitationChip({ n, onClick }: { n: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`View passage ${n}`}
      className="relative -top-0.5 mx-0.5 inline-flex items-center rounded-full border px-1.5 text-[10.5px] font-semibold text-[var(--color-brand)]"
      style={{ background: "var(--chip-bg)", borderColor: "var(--chip-border)" }}
    >
      {n}
    </button>
  );
}

/**
 * Render an inline string: `**bold**` becomes <strong>, and numeric citations
 * like `[1]` / `[2, 3]` that map to a known source become clickable chips.
 */
function renderInline(
  text: string,
  sources: Source[],
  onOpenSource: OpenSource,
  keyBase: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([\d,\s]+)\]/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyBase}-t${k++}`}>
          {text.slice(last, match.index)}
        </Fragment>,
      );
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong
          key={`${keyBase}-b${k++}`}
          className="font-semibold text-[var(--color-ink)]"
        >
          {match[1]}
        </strong>,
      );
    } else {
      const nums = match[2]!
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => n >= 1 && n <= sources.length);
      if (nums.length > 0) {
        for (const n of nums) {
          nodes.push(
            <CitationChip
              key={`${keyBase}-c${k++}`}
              n={n}
              onClick={() => onOpenSource(sources[n - 1]!, n)}
            />,
          );
        }
      } else {
        nodes.push(<Fragment key={`${keyBase}-x${k++}`}>{match[0]}</Fragment>);
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyBase}-e`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

const isBullet = (line: string) => /^\s*[-*]\s+/.test(line);

/**
 * Lightweight Markdown renderer over the answer: headings, paragraphs (wrapped
 * lines joined), bullet lists (with indentation), bold, and clickable citations.
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
  const lines = text.trim().split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let bullets: { indent: number; content: string }[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length === 0) return;
    const kb = `p${key++}`;
    blocks.push(
      <p key={kb} className="my-2 first:mt-0 last:mb-0">
        {renderInline(para.join(" "), sources, onOpenSource, kb)}
      </p>,
    );
    para = [];
  };
  const flushBullets = () => {
    if (bullets.length === 0) return;
    const kb = `u${key++}`;
    blocks.push(
      <ul key={kb} className="my-2 space-y-1.5 first:mt-0 last:mb-0">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex gap-2.5"
            style={{ marginLeft: Math.floor(b.indent / 2) * 18 }}
          >
            <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-[var(--color-meta)]" />
            <span>
              {renderInline(b.content, sources, onOpenSource, `${kb}-${i}`)}
            </span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  const flush = () => {
    flushPara();
    flushBullets();
  };

  for (const raw of lines) {
    if (raw.trim() === "") {
      flush();
      continue;
    }
    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      const kb = `h${key++}`;
      blocks.push(
        <p
          key={kb}
          className="mb-1 mt-3 font-semibold text-[var(--color-ink)] first:mt-0"
        >
          {renderInline(heading[2]!, sources, onOpenSource, kb)}
        </p>,
      );
      continue;
    }
    if (isBullet(raw)) {
      flushPara();
      const indent = raw.match(/^\s*/)![0].length;
      bullets.push({ indent, content: raw.replace(/^\s*[-*]\s+/, "") });
      continue;
    }
    flushBullets();
    para.push(raw.trim());
  }
  flush();

  return (
    <div
      className="font-serif text-[var(--color-body)]"
      style={{ fontSize: "16.5px", lineHeight: 1.7 }}
    >
      {blocks}
    </div>
  );
}

/**
 * Retrieved sources, grouped by document — one card per file with a clickable
 * chip per cited passage (an exact excerpt of the document that was retrieved).
 */
export function SourceCards({
  sources,
  onOpenSource,
}: {
  sources: Source[];
  onOpenSource: OpenSource;
}) {
  if (sources.length === 0) return null;

  const groups = new Map<string, { source: Source; n: number }[]>();
  sources.forEach((source, i) => {
    const list = groups.get(source.filename) ?? [];
    list.push({ source, n: i + 1 });
    groups.set(source.filename, list);
  });

  return (
    <div className="mt-4 space-y-2">
      <div>
        <p className="section-label">Sources</p>
        <p className="text-[11px] text-[var(--color-meta)]">
          Exact passages the answer cited — click one to read it in context.
        </p>
      </div>
      <ul className="space-y-1.5">
        {[...groups.entries()].map(([filename, items]) => {
          const topMatch = Math.max(...items.map((it) => it.source.similarity));
          return (
            <li
              key={filename}
              className="rounded-lg border border-[var(--color-divider)] bg-[var(--color-panel)] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0 text-[var(--color-meta)]" />
                  <span className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                    {filename}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--color-meta)]">
                  {(topMatch * 100).toFixed(0)}% top match
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map(({ source, n }) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onOpenSource(source, n)}
                    title={`Open passage ${n} (cited as [${n}])`}
                    className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--chip-bg)]"
                    style={{ borderColor: "var(--chip-border)" }}
                  >
                    Passage {n}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
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
