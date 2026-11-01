const EMOJI = ["😀", "😂", "🥰", "😎", "👍", "🔥", "❤️", "✨", "🎨", "😭", "🙏", "💯"];

export function EmojiBar({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="grid size-9 place-items-center text-lg leading-none"
          onClick={() => onPick(emoji)}
          aria-label={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
