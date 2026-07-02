"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentDTO, DocumentStatus } from "@/lib/types";
import { formatBytes } from "@/lib/format";

const STATUS_STYLES: Record<DocumentStatus, string> = {
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

export function DocumentsPanel() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      const data = (await res.json()) as { documents: DocumentDTO[] };
      setDocuments(data.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
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

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocuments((docs) => docs.filter((d) => d.id !== id));
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Documents</h2>
        <p className="text-xs text-slate-400">PDF, TXT or Markdown · up to 10MB</p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? "border-slate-900 bg-slate-50"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
        <span className="text-sm font-medium text-slate-600">
          {uploading ? "Uploading…" : "Drop files or click to upload"}
        </span>
        <span className="text-xs text-slate-400">
          Text is extracted, chunked and embedded on upload
        </span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400">
            No documents yet. Upload one to start asking questions.
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="group rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(doc.size)}
                    {doc.status === "ready" &&
                      ` · ${doc.chunkCount} chunk${doc.chunkCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[doc.status]}`}
                  >
                    {doc.status}
                  </span>
                  <button
                    onClick={() => void remove(doc.id)}
                    className="text-xs text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {doc.status === "error" && doc.errorMessage && (
                <p className="mt-1 text-xs text-red-500">{doc.errorMessage}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
