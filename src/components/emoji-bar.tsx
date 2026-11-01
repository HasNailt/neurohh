import { useState } from "react";

const EMOJI = [
  "😀", "😁", "😂", "🤣", "😊", "🥰", "😍", "😘", "😎", "🤔",
  "😭", "😡", "👍", "👎", "👏", "🙏", "🔥", "✨", "❤️", "💔",
  "⭐", "💯", "🎨", "🖤", "👀", "💀", "🎉", "✅", "❌", "💬",
];

/** A button that opens the picker. The panel stays closed until it is pressed. */
export function EmojiBar({ onPick, up = false }: { onPick: (emoji: string) => void; up?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm"
      >
        Эмодзи
      </button>
      {open ? (
        <div className={up ? "absolute bottom-full left-0 z-30 mb-1 grid w-64 grid-cols-6 gap-1 border border-ink/30 bg-card p-2 shadow-lg" : "absolute top-full left-0 z-30 mt-1 grid w-64 grid-cols-6 gap-1 border border-ink/30 bg-card p-2 shadow-lg"}>
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="grid size-9 place-items-center text-lg leading-none hover:bg-wine/25"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
