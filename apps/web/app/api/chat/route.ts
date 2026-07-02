import { NextRequest } from "next/server";
import {
  retrieve,
  streamGroundedAnswer,
  requestLogger,
  estimateCostUsd,
  embeddingCostUsd,
  RAG_CONFIG,
  INSUFFICIENT_CONTEXT_MESSAGE,
  type RetrievedChunk,
} from "@repo/rag";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/** One newline-delimited JSON event in the response stream. */
type ChatEvent =
  | { type: "sources"; sources: RetrievedChunk[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

function line(event: ChatEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + "\n");
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = requestLogger(requestId, { route: "chat" });

  const limit = rateLimit(`chat:${clientKey(req)}`, 20, 60_000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const { question } = (await req.json().catch(() => ({}))) as {
    question?: unknown;
  };
  if (typeof question !== "string" || question.trim().length === 0) {
    return Response.json({ error: "Missing question" }, { status: 400 });
  }

  const startedAt = performance.now();
  const { sources, queryTokens } = await retrieve(question);
  log.info(
    { retrieved: sources.length, queryTokens, topSimilarity: sources[0]?.similarity },
    "retrieval complete",
  );

  const headers = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "x-request-id": requestId,
  };

  // Guardrail: with no retrieved context, refuse deterministically (no LLM call).
  if (sources.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(line({ type: "sources", sources: [] }));
        controller.enqueue(
          line({ type: "delta", text: INSUFFICIENT_CONTEXT_MESSAGE }),
        );
        controller.enqueue(line({ type: "done" }));
        controller.close();
      },
    });
    log.info("refused: no context retrieved");
    return new Response(stream, { headers });
  }

  const result = streamGroundedAnswer({ question, sources });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(line({ type: "sources", sources }));
      try {
        for await (const delta of result.textStream) {
          controller.enqueue(line({ type: "delta", text: delta }));
        }
        const usage = await result.usage;
        const costUsd =
          estimateCostUsd(RAG_CONFIG.models.answer, {
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
          }) + embeddingCostUsd(queryTokens);
        log.info(
          {
            ms: Math.round(performance.now() - startedAt),
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            queryTokens,
            estimatedCostUsd: Number(costUsd.toFixed(6)),
          },
          "answer streamed",
        );
        controller.enqueue(line({ type: "done" }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Streaming failed";
        log.error({ err: message }, "chat stream failed");
        controller.enqueue(line({ type: "error", error: message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
