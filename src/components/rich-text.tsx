import { useRef, type ReactNode, type RefObject } from "react";

const RULES: { open: string; close: string; className: string }[] = [
  { open: "~~", close: "~~", className: "line-through" },
  { open: "**", close: "**", className: "font-bold" },
  { open: "__", close: "__", className: "underline" },
  { open: "*", close: "*", className: "italic" },
];

function parseRich(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let n = 0;
  const flush = () => {
    if (!buf) return;
    nodes.push(buf);
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
      <span key={key} className={rule.className}>
        {parseRich(inner, key)}
      </span>,
    );
    i += closeAt + rule.close.length;
  }
  flush();
  return nodes;
}

export function RichText({ text }: { text: string }) {
  return <>{parseRich(text, "t")}</>;
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
  { label: "Жирный", mark: "**", className: "font-bold", text: "B" },
  { label: "Курсив", mark: "*", className: "italic", text: "I" },
  { label: "Подчёркнутый", mark: "__", className: "underline", text: "U" },
  { label: "Зачёркнутый", mark: "~~", className: "line-through", text: "S" },
] as const;

export function FormatBar({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const busy = useRef(false);
  function apply(mark: string) {
    if (busy.current) return;
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = wrapSelection(el?.value ?? value, start, end, mark, mark);
    onChange(next.value);
    busy.current = true;
    requestAnimationFrame(() => {
      const node = inputRef.current;
      node?.focus();
      node?.setSelectionRange(next.start, next.end);
      busy.current = false;
    });
  }
  return (
    <div className="flex shrink-0 flex-col gap-1">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          title={action.label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply(action.mark)}
          className="grid size-8 place-items-center border border-ink/25 font-mono text-xs leading-none"
        >
          <span className={action.className}>{action.text}</span>
        </button>
      ))}
    </div>
  );
}
