import { DocumentsPanel } from "@/components/documents-panel";
import { Chat } from "@/components/chat";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-4 sm:p-6">
      <header className="mb-4 shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Chat with your docs
        </h1>
        <p className="text-sm text-muted-foreground">
          Grounded answers with inline citations from your documents.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="min-h-0 p-4">
          <DocumentsPanel />
        </Card>
        <Card className="min-h-0 bg-muted/30 p-4">
          <Chat />
        </Card>
      </div>
    </div>
  );
}
