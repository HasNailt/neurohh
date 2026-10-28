import { useEffect, useState } from "react";
import { fieldClass } from "@/components/ui-bits";
import { suggestTags } from "@/lib/market/server";
import { tagParts, type Tag } from "@/lib/market/shared";

export function TagField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [hints, setHints] = useState<Tag[]>([]);

  useEffect(() => {
    const q = draft.trim();
    if (q.length < 1) {
      setHints([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void suggestTags({ data: q })
        .then(setHints)
        .catch(() => setHints([]));
    }, 160);
    return () => window.clearTimeout(timer);
  }, [draft]);

  function add(raw: string) {
    const parts = tagParts(raw);
    if (!parts) return;
    if (tags.some((t) => tagParts(t)?.slug === parts.slug)) {
      setDraft("");
      setHints([]);
      return;
    }
    if (tags.length >= 8) return;
    onChange([...tags, parts.label]);
    setDraft("");
    setHints([]);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tagParts(tag)?.slug ?? tag}
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="bg-ink px-2 py-1 font-mono text-xs text-paper"
          >
            {tag} ×
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
          if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        placeholder="Тег и Enter"
        className={fieldClass}
        aria-label="Тег"
      />
      {hints.length > 0 ? (
        <ul className="border border-ink/20 bg-card">
          {hints.map((hint) => (
            <li key={hint.slug}>
              <button
                type="button"
                className="min-h-11 w-full px-3 text-left hover:bg-wine/20"
                onClick={() => add(hint.label)}
              >
                {hint.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted">Регистр не важен: «Человек» и «человек» — один тег. До 8.</p>
    </div>
  );
}
