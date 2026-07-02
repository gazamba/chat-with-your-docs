"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import type { Source } from "@/lib/types";
import { streamChat } from "@/lib/chat-client";
import { AnswerText, SourceList } from "@/components/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

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
    // Reveal the matching source passage.
    scrollRef.current
      ?.querySelector(`[data-file="${CSS.escape(filename)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-1">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent">
              <Sparkles className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Ask a question about your documents
              </p>
              <p className="text-xs text-muted-foreground">
                Answers are grounded in your sources with inline citations.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => void send(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <Card className="max-w-[95%] px-4 py-3 text-sm text-card-foreground">
                  {msg.error ? (
                    <p className="text-destructive">{msg.error}</p>
                  ) : msg.content ? (
                    <AnswerText
                      text={msg.content}
                      sources={msg.sources ?? []}
                      onCite={onCite}
                    />
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Thinking…
                    </span>
                  )}
                  {msg.sources && (
                    <SourceList sources={msg.sources} highlighted={highlighted} />
                  )}
                </Card>
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
        className="mt-3 flex items-end gap-2 border-t border-border pt-3"
      >
        <Textarea
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
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={streaming || !input.trim()}
          aria-label="Send"
        >
          {streaming ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Send />
          )}
        </Button>
      </form>
    </div>
  );
}
