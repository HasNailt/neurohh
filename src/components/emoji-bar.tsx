import { useState } from "react";

const EMOJI = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "🙂", "😇",
  "🥰", "😍", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑",
  "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄",
  "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
  "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟",
  "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥",
  "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡",
  "😠", "🤬", "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "💀", "🔥", "✨",
];

const KAOMOJI = [
  "(＾▽＾)",
  "(´・ω・`)",
  "(｡♥‿♥｡)",
  "(≧▽≦)",
  "(づ｡◕‿‿◕｡)づ",
  "¯\\_(ツ)_/¯",
  "(╯°□°）╯︵ ┻━┻",
  "(ノಠ益ಠ)ノ",
  "(；￣Д￣)",
  "(╥﹏╥)",
  "(￣ヘ￣)",
  "(￣ω￣)",
  "(•‿•)",
  "(¬‿¬)",
  "(ಠ_ಠ)",
  "(⊙_⊙)",
  "(✧ω✧)",
  "(๑˃ᴗ˂)ﻭ",
  "(ง'̀-'́)ง",
  "(☞ﾟヮﾟ)☞",
  "(づ￣ ³￣)づ",
  "( ˘ ³˘)♥",
  "(｡•́︿•̀｡)",
  "(´；ω；`)",
  "(￣▽￣)ノ",
  "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
  "(＾• ω •＾)",
  "(￣ー￣)",
  "(´∀｀)",
  "(っ˘ω˘ς )",
  "(；一_一)",
  "(￣□￣;)",
  "(๑•̀ㅂ•́)و✧",
  "(ᵔᴥᵔ)",
  "(✿◠‿◠)",
  "(ノ_<。)",
];

/** Square smiley that opens emoji, with a kaomoji switch in the same panel. */
export function EmojiBar({ onPick, up = false }: { onPick: (emoji: string) => void; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "kao">("emoji");
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Эмодзи"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center border border-ink/25 text-lg leading-none"
      >
        😊
      </button>
      {open ? (
        <div
          className={
            up
              ? "absolute bottom-full left-0 z-40 mb-1 w-80 border border-ink/30 bg-card p-2 shadow-lg"
              : "absolute top-full left-0 z-40 mt-1 w-80 border border-ink/30 bg-card p-2 shadow-lg"
          }
        >
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              className={tab === "emoji" ? "min-h-9 flex-1 border border-wine bg-wine font-mono text-xs text-foam" : "min-h-9 flex-1 border border-ink/25 font-mono text-xs"}
              onClick={() => setTab("emoji")}
            >
              смайлы
            </button>
            <button
              type="button"
              className={tab === "kao" ? "min-h-9 flex-1 border border-wine bg-wine font-mono text-xs text-foam" : "min-h-9 flex-1 border border-ink/25 font-mono text-xs"}
              onClick={() => setTab("kao")}
            >
              каомодзи
            </button>
          </div>
          {tab === "emoji" ? (
            <div className="grid grid-cols-8 gap-1">
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
          ) : (
            <div className="flex max-h-64 flex-wrap gap-1 overflow-y-auto">
              {KAOMOJI.map((face) => (
                <button
                  key={face}
                  type="button"
                  className="border border-ink/20 px-2 py-1 font-mono text-xs hover:bg-wine/25"
                  onClick={() => {
                    onPick(face);
                    setOpen(false);
                  }}
                >
                  {face}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
