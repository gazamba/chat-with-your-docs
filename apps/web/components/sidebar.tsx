"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ClipboardType, Loader2, X } from "lucide-react";
import type { DocumentDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PasteModal } from "@/components/paste-modal";

const OUTLINE =
  "h-9 flex-1 justify-center gap-2 rounded-lg border-[#d6d4c8] text-[13px] font-medium text-[var(--color-body)] hover:bg-[#ebeae1]";

export function Sidebar() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      const data = (await res.json()) as { documents: DocumentDTO[] };
      setDocuments(data.documents);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch("/api/documents", { method: "POST", body });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(data.error ?? `Upload failed for ${file.name}`);
          }
          await refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [refresh],
  );

  const pasteText = useCallback(
    async (title: string, text: string) => {
      setError(null);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not add text");
      }
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocuments((docs) => docs.filter((d) => d.id !== id));
  }, []);

  const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)]">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 pb-4 pt-5">
        <span className="size-2.5 rounded-full bg-[var(--color-brand)]" />
        <span className="font-serif text-[15px] font-semibold text-[var(--color-ink)]">
          Chat with your docs
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4">
        <Button
          variant="outline"
          className={OUTLINE}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload files
        </Button>
        <Button
          variant="outline"
          className={OUTLINE}
          onClick={() => setPasteOpen(true)}
        >
          <ClipboardType className="size-4" />
          Paste text
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mx-4 mt-3 rounded-md bg-[#b3261e]/10 px-2.5 py-1.5 text-[11.5px] text-[#b3261e]">
          {error}
        </p>
      )}

      <p className="section-label px-5 pb-2 pt-5">Collection</p>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {documents.length === 0 ? (
          <p className="px-3 py-2 text-[12.5px] text-[var(--color-meta)]">
            No documents yet.
          </p>
        ) : (
          <ul>
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#ebeae1]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
                    {doc.filename}
                  </p>
                  <p className="truncate text-[11.5px] text-[var(--color-meta)]">
                    {doc.status === "error"
                      ? (doc.errorMessage ?? "Failed")
                      : doc.status === "processing"
                        ? "Processing…"
                        : `${doc.chunkCount} chunk${doc.chunkCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(doc.id)}
                  aria-label={`Remove ${doc.filename}`}
                  className="shrink-0 rounded p-0.5 text-[var(--color-meta)] opacity-0 transition-opacity hover:text-[#b3261e] group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer stats */}
      <div className="border-t border-[var(--color-sidebar-border)] px-5 py-3 text-[11.5px] text-[var(--color-meta)]">
        {documents.length} document{documents.length === 1 ? "" : "s"} ·{" "}
        {totalChunks} chunk{totalChunks === 1 ? "" : "s"}
      </div>

      <PasteModal
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onSubmit={pasteText}
      />
    </aside>
  );
}
