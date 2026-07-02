import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@repo/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Return a single document including its full text (for the source panel). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
}
