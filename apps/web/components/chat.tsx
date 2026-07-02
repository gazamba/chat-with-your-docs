"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Source } from "@/lib/types";
import { streamChat } from "@/lib/chat-client";
import { AnswerText, SourceList } from "@/components/message";

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

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const onCite = useCallback((filename: string) => {
    setHighlighted(filename);
  }, []);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setStreaming(true);
      setHighlighted(null);

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
        update({ error: e instanceof Error ? e.message : "Something went wrong" }),
      );

      setStreaming(false);
    },
    [streaming],
  );

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-1">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Ask a question about your documents
              </p>
              <p className="text-xs text-slate-400">
                Answers are grounded in your sources with inline citations.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2 text-sm text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex flex-col items-start">
                <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-slate-800 shadow-sm ring-1 ring-slate-100">
                  {msg.error ? (
                    <p className="text-red-500">{msg.error}</p>
                  ) : msg.content ? (
                    <AnswerText
                      text={msg.content}
                      sources={msg.sources ?? []}
                      onCite={onCite}
                    />
                  ) : (
                    <span className="inline-flex gap-1 text-slate-400">
                      <span className="animate-pulse">Thinking…</span>
                    </span>
                  )}
                  {msg.sources && (
                    <SourceList sources={msg.sources} highlighted={highlighted} />
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask a question…"
          className="max-h-32 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {streaming ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
