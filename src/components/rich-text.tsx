import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MentionLink, useKnownHandles } from "@/components/mentions";
import { splitMentions } from "@/lib/market/shared";

const RULES: { open: string; close: string; style: CSSProperties }[] = [
  { open: "~~", close: "~~", style: { textDecoration: "line-through" } },
  { open: "**", close: "**", style: { fontWeight: 700 } },
  { open: "__", close: "__", style: { textDecoration: "underline", textUnderlineOffset: "2px" } },
  { open: "*", close: "*", style: { fontStyle: "italic" } },
];

function parseRich(text: string, keyBase: string, known: Set<string>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let n = 0;
  const flush = () => {
    if (!buf) return;
    for (const part of splitMentions(buf)) {
      if (part.kind === "text") {
        if (part.text) nodes.push(part.text);
        continue;
      }
      if (known.has(part.handle)) {
        const key = `${keyBase}-m${n}`;
        n += 1;
        nodes.push(<MentionLink key={key} handle={part.handle} raw={part.raw} />);
      } else {
        nodes.push(`@${part.raw}`);
      }
    }
    buf = "";
  };
  while (i < text.length) {
    const rest = text.slice(i);
    const rule = RULES.find((item) => rest.startsWith(item.open));
    if (!rule) {
      buf += text[i];
      i += 1;
      continue;
    }
    const closeAt = rest.indexOf(rule.close, rule.open.length);
    const inner = closeAt > rule.open.length ? rest.slice(rule.open.length, closeAt) : "";
    if (!inner || inner.includes("\n")) {
      buf += text[i];
      i += 1;
      continue;
    }
    flush();
    const key = `${keyBase}-${n}`;
    n += 1;
    nodes.push(
      <span key={key} style={rule.style}>
        {parseRich(inner, key, known)}
      </span>,
    );
    i += closeAt + rule.close.length;
  }
  flush();
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const known = useKnownHandles(text);
  return <>{parseRich(text, "t", known)}</>;
}

export function wrapSelection(value: string, start: number, end: number, open: string, close: string) {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const selected = value.slice(safeStart, safeEnd);
  const before = value.slice(0, safeStart);
  const after = value.slice(safeEnd);
  if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
    const inner = selected.slice(open.length, selected.length - close.length);
    return { value: before + inner + after, start: safeStart, end: safeStart + inner.length };
  }
  if (before.endsWith(open) && after.startsWith(close)) {
    return {
      value: before.slice(0, -open.length) + selected + after.slice(close.length),
      start: safeStart - open.length,
      end: safeEnd - open.length,
    };
  }
  const next = `${before}${open}${selected}${close}${after}`;
  if (!selected) {
    const caret = safeStart + open.length;
    return { value: next, start: caret, end: caret };
  }
  return { value: next, start: safeStart + open.length, end: safeEnd + open.length };
}

const ACTIONS = [
  { label: "Жирный", mark: "**", style: { fontWeight: 700 } as CSSProperties, text: "B" },
  { label: "Курсив", mark: "*", style: { fontStyle: "italic" } as CSSProperties, text: "I" },
  { label: "Подчёркнутый", mark: "__", style: { textDecoration: "underline" } as CSSProperties, text: "U" },
  { label: "Зачёркнутый", mark: "~~", style: { textDecoration: "line-through" } as CSSProperties, text: "S" },
] as const;

function selectionAnchor(el: HTMLInputElement | HTMLTextAreaElement) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (start === end) return null;
  const rect = el.getBoundingClientRect();
  const barWidth = 148;
  const left = Math.min(window.innerWidth - barWidth - 8, Math.max(8, rect.left));
  const top = Math.max(8, rect.top - 40);
  return { top, left };
}

export function FormatBar({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const range = useRef<{ start: number; end: number } | null>(null);
  const applying = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const update = () => {
      if (applying.current) return;
      if (document.activeElement !== el) {
        setBox(null);
        return;
      }
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start === end) {
        range.current = null;
        setBox(null);
        return;
      }
      range.current = { start, end };
      setBox(selectionAnchor(el));
    };
    const onSelect = () => window.setTimeout(update, 0);
    el.addEventListener("select", onSelect);
    el.addEventListener("keyup", onSelect);
    el.addEventListener("mouseup", onSelect);
    el.addEventListener("scroll", update);
    document.addEventListener("selectionchange", onSelect);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      el.removeEventListener("select", onSelect);
      el.removeEventListener("keyup", onSelect);
      el.removeEventListener("mouseup", onSelect);
      el.removeEventListener("scroll", update);
      document.removeEventListener("selectionchange", onSelect);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [inputRef, value]);

  function apply(mark: string) {
    const el = inputRef.current;
    const saved = range.current;
    if (!el || !saved || saved.start === saved.end) return;
    const next = wrapSelection(value || el.value, saved.start, saved.end, mark, mark);
    range.current = { start: next.start, end: next.end };
    applying.current = true;
    onChange(next.value);
    window.setTimeout(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
      applying.current = false;
      setBox(selectionAnchor(el));
    }, 0);
  }

  if (!box || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="toolbar"
      aria-label="Формат"
      className="fixed z-[80] flex gap-1 border border-ink/30 bg-card p-1 shadow-sm"
      style={{ top: box.top, left: box.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          title={action.label}
          onMouseDown={(event) => {
            event.preventDefault();
            apply(action.mark);
          }}
          className="grid size-7 place-items-center border border-ink/20 font-mono text-xs leading-none"
        >
          <span style={action.style}>{action.text}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
