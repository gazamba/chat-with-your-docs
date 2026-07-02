import type { Source } from "./types";

export interface ChatHandlers {
  onSources: (sources: Source[]) => void;
  onDelta: (text: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

/**
 * POST a question and consume the newline-delimited JSON stream returned by
 * /api/chat, dispatching each event to the provided handlers.
 */
export async function streamChat(
  question: string,
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    handlers.onError?.(data.error ?? `Request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const raw = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!raw) continue;

      const event = JSON.parse(raw) as
        | { type: "sources"; sources: Source[] }
        | { type: "delta"; text: string }
        | { type: "done" }
        | { type: "error"; error: string };

      if (event.type === "sources") handlers.onSources(event.sources);
      else if (event.type === "delta") handlers.onDelta(event.text);
      else if (event.type === "done") handlers.onDone?.();
      else if (event.type === "error") handlers.onError?.(event.error);
    }
  }
}
