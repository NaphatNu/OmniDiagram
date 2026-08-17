"use client";

import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

export function GenericDiagramEditor({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange: (content: string) => void;
}) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const renderId = useId().replace(/:/g, "");

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "neutral" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(`mermaid-${renderId}`, content)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Invalid Mermaid syntax");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [content, renderId]);

  return (
    <div className="grid flex-1 grid-cols-2">
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        spellCheck={false}
        className="h-full resize-none border-r border-black/10 bg-transparent p-4 font-mono text-sm outline-none dark:border-white/10"
      />
      <div className="flex h-full items-center justify-center overflow-auto p-4">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>
    </div>
  );
}
