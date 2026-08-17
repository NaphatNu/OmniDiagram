export default function DiagramNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium">Diagram not found</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        It may have been deleted, or the link is incorrect.
      </p>
    </div>
  );
}
