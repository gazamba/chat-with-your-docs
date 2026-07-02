"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DocumentDetail, Source } from "@/lib/types";

interface Props {
  source: Source;
  passageNumber: number;
  onClose: () => void;
}

/** Split full text around the cited passage so it can be wrapped in <mark>. */
function splitAroundPassage(full: string, passage: string) {
  const idx = full.indexOf(passage);
  if (idx === -1) return null;
  return {
    before: full.slice(0, idx),
    match: full.slice(idx, idx + passage.length),
    after: full.slice(idx + passage.length),
  };
}

export function SourcePanel({ source, passageNumber, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setContent(null);
    fetch(`/api/documents/${source.documentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((data: { document: DocumentDetail }) => {
        if (active) setContent(data.document.content ?? source.content);
      })
      .catch(() => active && setContent(source.content))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [source]);

  // Auto-scroll so the highlight sits in the upper third of the panel.
  useEffect(() => {
    if (!content || !scrollRef.current || !markRef.current) return;
    const container = scrollRef.current;
    const mark = markRef.current;
    container.scrollTop = Math.max(
      0,
      mark.offsetTop - container.clientHeight / 3,
    );
  }, [content]);

  const parts =
    content && splitAroundPassage(content, source.content);

  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col border-l border-[var(--color-sidebar-border)] bg-[var(--color-panel)]">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-divider)] px-5 py-4">
        <div className="min-w-0">
          <p className="section-label">Source · Passage {passageNumber}</p>
          <h2 className="mt-1 truncate font-serif text-[15px] font-semibold text-[var(--color-ink)]">
            {source.filename}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close source panel"
          className="rounded-md p-1 text-[var(--color-meta)] transition-colors hover:bg-[#ebeae1] hover:text-[var(--color-ink)]"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ fontSize: "13px", lineHeight: 1.75, color: "var(--color-passage)" }}
      >
        {loading ? (
          <p className="text-[var(--color-meta)]">Loading passage…</p>
        ) : parts ? (
          <p className="whitespace-pre-wrap">
            {parts.before}
            <mark className="passage" ref={markRef}>
              {parts.match}
            </mark>
            {parts.after}
          </p>
        ) : (
          <p className="whitespace-pre-wrap">
            <mark className="passage" ref={markRef}>
              {source.content}
            </mark>
          </p>
        )}
      </div>
    </aside>
  );
}
