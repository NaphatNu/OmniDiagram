import { Diagram } from "@/lib/types";
import { AppHeader } from "./AppHeader";
import { KindBadge } from "./KindBadge";

export function EditorHeader({ diagram }: { diagram: Diagram }) {
  return (
    <AppHeader>
      <span className="text-sm font-medium">{diagram.title}</span>
      <KindBadge kind={diagram.kind} />
      <button className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        Export
      </button>
      <button className="rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
        Copy link
      </button>
    </AppHeader>
  );
}
