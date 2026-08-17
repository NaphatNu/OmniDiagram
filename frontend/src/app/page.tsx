import { AppHeader } from "@/components/AppHeader";
import { DiagramRow } from "@/components/DiagramRow";
import { NewDiagramButton } from "@/components/NewDiagramButton";
import { DiagramSummary } from "@/lib/types";

export default function Dashboard() {
  const diagrams: DiagramSummary[] = [];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader>
        <NewDiagramButton />
      </AppHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {diagrams.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No diagrams yet. Create one to get started.
          </p>
        ) : (
          <div className="rounded-lg border border-black/10 dark:border-white/10">
            {diagrams.map((diagram) => (
              <DiagramRow key={diagram.shareToken} diagram={diagram} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
