"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { DocumentDTO, DocumentStatus } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "success" | "warning" | "destructive"
> = {
  ready: "success",
  processing: "warning",
  error: "destructive",
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
        <h2 className="text-sm font-semibold text-foreground">Documents</h2>
        <p className="text-xs text-muted-foreground">
          PDF, TXT or Markdown · up to 10MB
        </p>
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
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-accent"
            : "border-border hover:border-muted-foreground/40 hover:bg-accent/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="size-5 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {uploading ? "Uploading…" : "Drop files or click to upload"}
        </span>
        <span className="text-xs text-muted-foreground">
          Extracted, chunked &amp; embedded on upload
        </span>
      </label>

      {error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="-mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="size-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              No documents yet. Upload one to start asking questions.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="group p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(doc.size)}
                      {doc.status === "ready" &&
                        ` · ${doc.chunkCount} chunk${doc.chunkCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={STATUS_VARIANT[doc.status]}>
                    {doc.status === "processing" && (
                      <Loader2 className="size-2.5 animate-spin" />
                    )}
                    {doc.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void remove(doc.id)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {doc.status === "error" && doc.errorMessage && (
                <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                  {doc.errorMessage}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
