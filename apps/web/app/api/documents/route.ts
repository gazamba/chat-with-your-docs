import { NextRequest, NextResponse } from "next/server";
import {
  ingestDocument,
  listDocuments,
  deleteDocument,
  RAG_CONFIG,
  requestLogger,
  type AllowedMimeType,
} from "@repo/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT_MIME: Record<string, AllowedMimeType> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
};

/** Trust the declared MIME type when allowed, else fall back to the extension. */
function resolveMime(file: File): AllowedMimeType | null {
  const allowed = RAG_CONFIG.upload.allowedMimeTypes as readonly string[];
  if (allowed.includes(file.type)) return file.type as AllowedMimeType;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? null;
}

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const log = requestLogger(crypto.randomUUID(), { route: "documents.post" });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > RAG_CONFIG.upload.maxBytes) {
    const mb = Math.round(RAG_CONFIG.upload.maxBytes / (1024 * 1024));
    return NextResponse.json(
      { error: `File exceeds the ${mb}MB limit` },
      { status: 413 },
    );
  }
  const mimeType = resolveMime(file);
  if (!mimeType) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: pdf, txt, md" },
      { status: 415 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const result = await ingestDocument({
      filename: file.name,
      mimeType,
      bytes,
      log,
    });
    return NextResponse.json({ document: result }, { status: 201 });
  } catch (err) {
    // The document row is persisted with status=error; surface the reason.
    const error = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ error }, { status: 422 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteDocument(id);
  return new NextResponse(null, { status: 204 });
}
