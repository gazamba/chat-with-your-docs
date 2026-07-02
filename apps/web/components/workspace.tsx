"use client";

import { useState } from "react";
import type { Source } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";
import { ChatColumn } from "@/components/chat-column";
import { SourcePanel } from "@/components/source-panel";

interface ActiveSource {
  source: Source;
  passageNumber: number;
}

/** Three-column app shell; the source panel appears when a citation is opened. */
export function Workspace() {
  const [active, setActive] = useState<ActiveSource | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <ChatColumn
        onOpenSource={(source, passageNumber) =>
          setActive({ source, passageNumber })
        }
      />
      {active && (
        <SourcePanel
          source={active.source}
          passageNumber={active.passageNumber}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
