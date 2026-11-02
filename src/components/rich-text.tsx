import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

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

const MIRROR_PROPS = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontWeight",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textIndent",
  "textAlign",
] as const;

function selectionAnchor(el: HTMLInputElement | HTMLTextAreaElement) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (start === end) return null;
  const computed = getComputedStyle(el);
  const mirror = document.createElement("div");
  const style = mirror.style;
  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = el.nodeName === "INPUT" ? "pre" : "pre-wrap";
  style.wordWrap = "break-word";
  style.overflow = "hidden";
  for (const prop of MIRROR_PROPS) style[prop] = computed[prop];
  style.width = computed.boxSizing === "border-box" ? `${el.offsetWidth}px` : `${el.clientWidth}px`;
  mirror.textContent = el.value.slice(0, start);
  const mark = document.createElement("span");
  mark.textContent = el.value.slice(start, start + 1) || "\u200b";
  mirror.append(mark);
  document.body.append(mirror);
  const border = Number.parseFloat(computed.borderTopWidth) || 0;
  const top = el.getBoundingClientRect().top + mark.offsetTop + border - el.scrollTop;
  const left = el.getBoundingClientRect().left + mark.offsetLeft - el.scrollLeft;
  mirror.remove();
  const barWidth = 148;
  const clampedLeft = Math.min(window.innerWidth - barWidth - 8, Math.max(8, left));
  const clampedTop = Math.max(8, top - 36);
  return { top: clampedTop, left: clampedLeft };
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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const update = () => {
      if (document.activeElement !== el) {
        setBox(null);
        return;
      }
      setBox(selectionAnchor(el));
    };
    const onSelect = () => window.setTimeout(update, 0);
    el.addEventListener("select", onSelect);
    el.addEventListener("keyup", onSelect);
    el.addEventListener("mouseup", onSelect);
    el.addEventListener("scroll", update);
    const onDoc = () => {
      if (document.activeElement === el) update();
    };
    document.addEventListener("selectionchange", onDoc);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      el.removeEventListener("select", onSelect);
      el.removeEventListener("keyup", onSelect);
      el.removeEventListener("mouseup", onSelect);
      el.removeEventListener("scroll", update);
      document.removeEventListener("selectionchange", onDoc);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [inputRef, value]);

  function apply(mark: string) {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const next = wrapSelection(el.value, start, end, mark, mark);
    onChange(next.value);
    setBox(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.end, next.end);
    });
  }

  if (!box || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="toolbar"
      aria-label="Формат"
      className="fixed z-[90] flex gap-1 border border-ink/30 bg-card p-1"
      style={{ top: box.top, left: box.left }}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          title={action.label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply(action.mark)}
          className="grid size-7 place-items-center border border-ink/20 font-mono text-xs leading-none"
        >
          <span className={action.className}>{action.text}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
