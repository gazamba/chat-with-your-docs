"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/types";
import { streamChat } from "@/lib/chat-client";
import {
  AnswerText,
  SourceCards,
  LoadingDots,
  type OpenSource,
} from "@/components/message";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: string;
}

const SUGGESTIONS = [
  "What are these documents about?",
  "Summarise the key points.",
];

export function ChatColumn({ onOpenSource }: { onOpenSource: OpenSource }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streaming) return;

      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setStreaming(true);

      const update = (patch: Partial<ChatMessage>) =>
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, ...patch } : msg)),
        );

      let text = "";
      await streamChat(trimmed, {
        onSources: (sources) => update({ sources }),
        onDelta: (delta) => {
          text += delta;
          update({ content: text });
        },
        onError: (error) => update({ error }),
      }).catch((e: unknown) =>
        update({
          error: e instanceof Error ? e.message : "Something went wrong",
        }),
      );

      setStreaming(false);
    },
    [streaming],
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--color-divider)] px-6 py-3.5">
        <h1 className="text-[14.5px] font-semibold text-[var(--color-ink)]">
          Chat
        </h1>
        <p className="text-[12.5px] text-[var(--color-meta)]">
          Grounded answers with inline citations
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="mx-auto flex h-full max-w-[760px] flex-col items-center justify-center gap-5 px-6 text-center">
            <div>
              <h2
                className="font-serif font-semibold text-[var(--color-ink)]"
                style={{ fontSize: "32px" }}
              >
                Ask your documents
              </h2>
              <p className="mt-2 text-[14px] text-[var(--color-meta)]">
                Answers are grounded in your sources with inline citations.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-[var(--color-divider)] bg-[var(--color-panel)] px-4 py-2 text-[13px] text-[var(--color-body)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[760px] space-y-6 px-6 py-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className="max-w-[78%] px-4 py-2.5 text-[14.5px] text-[var(--color-ink)]"
                    style={{
                      background: "var(--user-bubble-bg)",
                      border: "1px solid var(--user-bubble-border)",
                      borderRadius: "14px 14px 4px 14px",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id}>
                  {msg.error ? (
                    <p className="text-[14px] text-[#b3261e]">{msg.error}</p>
                  ) : msg.content ? (
                    <>
                      <AnswerText
                        text={msg.content}
                        sources={msg.sources ?? []}
                        onOpenSource={onOpenSource}
                      />
                      {msg.sources && (
                        <SourceCards
                          sources={msg.sources}
                          onOpenSource={onOpenSource}
                        />
                      )}
                    </>
                  ) : (
                    <LoadingDots />
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-6 pb-5 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mx-auto flex max-w-[760px] items-center gap-2 rounded-xl border border-[var(--color-divider)] bg-[var(--color-panel)] px-3 py-2 shadow-sm"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 border-0 bg-transparent px-1 text-[14.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-meta)]"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-[9px] bg-[var(--color-brand)] px-4 py-1.5 text-[13.5px] font-medium text-white transition-opacity disabled:opacity-45"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
