import { DocumentsPanel } from "@/components/documents-panel";
import { Chat } from "@/components/chat";

export default function HomePage() {
  return (
    <div className="mx-auto flex h-screen max-w-6xl flex-col p-4 sm:p-6">
      <header className="mb-4 shrink-0">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Chat with your docs
        </h1>
        <p className="text-sm text-slate-500">
          Grounded answers with inline citations from your documents.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="min-h-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <DocumentsPanel />
        </aside>
        <section className="min-h-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
          <Chat />
        </section>
      </div>
    </div>
  );
}
