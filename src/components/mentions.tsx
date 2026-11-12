import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { resolveHandles, suggestHandles } from "@/lib/market/server";
import { mentionAtCaret, mentionHandles, type PersonHit } from "@/lib/market/shared";

const known = new Map<string, boolean>();
let queued = new Set<string>();
let waiters: Array<() => void> = [];
let timer: number | null = null;

function knownSet(handles: string[]): Set<string> {
  const set = new Set<string>();
  for (const handle of handles) if (known.get(handle)) set.add(handle);
  return set;
}

function flushQueue() {
  if (queued.size === 0 || timer != null) return;
  timer = window.setTimeout(() => {
    timer = null;
    const batch = [...queued];
    queued = new Set();
    const done = waiters;
    waiters = [];
    void resolveHandles({ data: batch.slice(0, 80) })
      .then((found) => {
        const ok = new Set(found);
        for (const handle of batch.slice(0, 80)) known.set(handle, ok.has(handle));
      })
      .catch(() => {
        for (const handle of batch.slice(0, 80)) known.set(handle, false);
      })
      .finally(() => {
        for (const handle of batch.slice(80)) queued.add(handle);
        for (const finish of done) finish();
        flushQueue();
      });
  }, 16);
}

function resolveBatch(handles: string[]): Promise<Set<string>> {
  const missing = handles.filter((handle) => !known.has(handle));
  if (missing.length === 0) return Promise.resolve(knownSet(handles));
  return new Promise((resolve) => {
    for (const handle of missing) queued.add(handle);
    waiters.push(() => resolve(knownSet(handles)));
    flushQueue();
  });
}

/** Handles in `text` that belong to real profiles. Unknown names stay out of the set. */
export function useKnownHandles(text: string): Set<string> {
  const handles = mentionHandles(text);
  const key = handles.join("\n");
  const [set, apply] = useState<Set<string>>(() => knownSet(handles));
  useEffect(() => {
    let live = true;
    if (handles.length === 0) {
      apply(new Set());
      return;
    }
    void resolveBatch(handles).then((next) => {
      if (live) apply(next);
    });
    return () => {
      live = false;
    };
    // key tracks the handle list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return set;
}

export function MentionLink({ handle, raw }: { handle: string; raw: string }) {
  const navigate = useNavigate();
  return (
    <span
      data-mention=""
      role="link"
      tabIndex={0}
      className="cursor-pointer text-wine underline decoration-wine/40 underline-offset-2"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void navigate({ to: "/u/$handle", params: { handle } });
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        void navigate({ to: "/u/$handle", params: { handle } });
      }}
    >
      @{raw}
    </span>
  );
}

export function MentionSuggest({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [token, setToken] = useState<{ start: number; q: string } | null>(null);
  const [hits, setHits] = useState<PersonHit[]>([]);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const hitsRef = useRef(hits);
  const tokenRef = useRef(token);
  const activeRef = useRef(active);
  hitsRef.current = hits;
  tokenRef.current = token;
  activeRef.current = active;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const place = () => {
      if (document.activeElement !== el) {
        setToken(null);
        return;
      }
      const next = mentionAtCaret(el.value, el.selectionStart ?? 0);
      setToken(next);
      if (!next) return;
      const rect = el.getBoundingClientRect();
      setBox({ top: rect.bottom + 4, left: rect.left, width: Math.max(220, Math.min(320, rect.width)) });
    };
    const pick = (handle: string) => {
      const current = tokenRef.current;
      if (!current) return;
      const caret = el.selectionStart ?? el.value.length;
      const next = `${el.value.slice(0, current.start)}@${handle} ${el.value.slice(caret)}`;
      const pos = current.start + handle.length + 2;
      onChange(next);
      setToken(null);
      window.setTimeout(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      }, 0);
    };
    const onKey = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      const list = hitsRef.current;
      if (!tokenRef.current || list.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => (index + 1) % list.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => (index - 1 + list.length) % list.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(list[Math.min(activeRef.current, list.length - 1)].handle);
      } else if (event.key === "Escape") {
        setToken(null);
      }
    };
    const later = () => window.setTimeout(place, 0);
    el.addEventListener("keyup", later);
    el.addEventListener("click", place);
    el.addEventListener("focus", place);
    el.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    place();
    return () => {
      el.removeEventListener("keyup", later);
      el.removeEventListener("click", place);
      el.removeEventListener("focus", place);
      el.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [inputRef, value, onChange]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    const wait = window.setTimeout(() => {
      void suggestHandles({ data: token.q })
        .then((rows) => {
          if (!live) return;
          setHits(rows);
          setActive(0);
        })
        .catch(() => {
          if (live) setHits([]);
        });
    }, 80);
    return () => {
      live = false;
      window.clearTimeout(wait);
    };
  }, [token?.q, token?.start]);

  if (!token || hits.length === 0 || !box || typeof document === "undefined") return null;
  return createPortal(
    <ul
      className="fixed z-[80] overflow-hidden border border-ink/30 bg-card shadow-sm"
      style={{ top: box.top, left: box.left, width: box.width }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {hits.map((hit, index) => (
        <li key={hit.handle}>
          <button
            type="button"
            className={index === active ? "flex w-full items-baseline gap-2 bg-wine/10 px-3 py-2 text-left" : "flex w-full items-baseline gap-2 px-3 py-2 text-left"}
            onMouseDown={(event) => {
              event.preventDefault();
              const el = inputRef.current;
              const current = tokenRef.current;
              if (!el || !current) return;
              const caret = el.selectionStart ?? value.length;
              const next = `${value.slice(0, current.start)}@${hit.handle} ${value.slice(caret)}`;
              const pos = current.start + hit.handle.length + 2;
              onChange(next);
              setToken(null);
              window.setTimeout(() => {
                el.focus();
                el.setSelectionRange(pos, pos);
              }, 0);
            }}
          >
            <span className="font-medium">@{hit.handle}</span>
            <span className="truncate text-sm text-muted">{hit.displayName}</span>
          </button>
        </li>
      ))}
    </ul>,
    document.body,
  );
}
