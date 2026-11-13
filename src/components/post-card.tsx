import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageZoom } from "@/components/image-zoom";
import { Nick, PremiumBadge } from "@/components/nick";
import { EmojiBar } from "@/components/emoji-bar";
import { FormatBar, RichText } from "@/components/rich-text";
import { MentionSuggest } from "@/components/mentions";
import { Button, fieldClass } from "@/components/ui-bits";
import { addPostComment, deletePost, setPostPinned } from "@/lib/market/server";
import { errText, formatWhen, type AuthorPost, type PostComment } from "@/lib/market/shared";

export function PostCard({
  post,
  mine,
  onChange,
}: {
  post: AuthorPost;
  mine: boolean;
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const roots = post.comments.filter((comment) => !comment.parentId);
  const replies = (id: string) => post.comments.filter((comment) => comment.parentId === id);

  function send(parentId: string | null) {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    void addPostComment({ data: { postId: post.id, parentId, body: text } })
      .then(() => {
        setBody("");
        setReplyTo(null);
        onChange();
      })
      .catch((err) => toast.error(errText(err)))
      .finally(() => setBusy(false));
  }

  return (
    <article
      id={`post-${post.id}`}
      className={post.authorPremium ? "scroll-mt-24 space-y-4 border border-[#e6c36a] bg-card p-5 sm:p-6" : "scroll-mt-24 space-y-4 border border-ink/20 bg-card p-5 sm:p-6"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted">
          <Nick handle={post.authorHandle} premium={post.authorPremium} />
          {post.authorPremium ? (
            <span className="ml-2">
              <PremiumBadge />
            </span>
          ) : null}
          {post.authorIsNew ? <span className="ml-2 border border-ink/30 px-2 py-0.5">Новый пользователь</span> : null}
          {post.pinned ? <span className="ml-2 border border-[#e6c36a] px-2 py-0.5 text-[#e6c36a]">PIN</span> : null}
          {" · "}
          <span suppressHydrationWarning>{formatWhen(post.createdAt)}</span>
        </p>
        {mine ? (
          <span className="flex gap-3">
            <button
              type="button"
              className="font-mono text-xs text-muted hover:text-ink"
              onClick={() => {
                void setPostPinned({ data: { id: post.id, pinned: !post.pinned } })
                  .then(onChange)
                  .catch((err) => toast.error(errText(err)));
              }}
            >
              {post.pinned ? "Открепить" : "Закрепить"}
            </button>
            <button
              type="button"
              className="font-mono text-xs text-muted hover:text-ink"
              onClick={() => {
                if (!window.confirm("Удалить пост? Он исчезнет вместе с картинками и комментариями.")) return;
                void deletePost({ data: post.id })
                  .then(onChange)
                  .catch((err) => toast.error(errText(err)));
              }}
            >
              Удалить
            </button>
          </span>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap">
        <RichText text={post.body} />
      </p>
      {post.images.length > 0 ? (
        <div className="flex flex-nowrap items-start gap-2 overflow-x-auto">
          {post.images.map((image) => (
            <button key={image.id} type="button" className="shrink-0" onClick={() => setZoom(image.src)}>
              <img src={image.src} alt="" className="h-40 w-auto max-w-64 object-contain" />
            </button>
          ))}
        </div>
      ) : null}
      <ImageZoom open={Boolean(zoom)} onClose={() => setZoom(null)}>
        {zoom ? <img src={zoom} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" /> : null}
      </ImageZoom>
      <ul className="space-y-3 border-t border-ink/10 pt-3">
        {roots.map((comment) => (
          <li key={comment.id}>
            <CommentLine comment={comment} onReply={() => setReplyTo(comment.id)} />
            {replies(comment.id).length > 0 ? (
              <ul className="mt-2 space-y-2 border-l border-ink/15 pl-3">
                {replies(comment.id).map((reply) => (
                  <li key={reply.id}>
                    <CommentLine comment={reply} onReply={() => setReplyTo(comment.id)} />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(replyTo);
        }}
      >
        <EmojiBar up onPick={(emoji) => setBody((value) => value + emoji)} />
        <FormatBar inputRef={bodyRef} value={body} onChange={setBody} />
        <MentionSuggest inputRef={bodyRef} value={body} onChange={setBody} />
        <input ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} placeholder={replyTo ? "Ответ" : "Комментарий"} className={`${fieldClass} min-w-0 flex-1`} />
        <Button type="submit" variant="line" disabled={busy}>
          ок
        </Button>
      </form>
    </article>
  );
}

function CommentLine({ comment, onReply }: { comment: PostComment; onReply: () => void }) {
  return (
    <div id={`comment-${comment.id}`} className="scroll-mt-24">
      <p className="font-mono text-xs text-muted">
        <Nick handle={comment.authorHandle} premium={comment.authorPremium} />
        {" · "}
        <span suppressHydrationWarning>{formatWhen(comment.createdAt)}</span>
        <button type="button" className="ml-2 underline" onClick={onReply}>
          ответить
        </button>
      </p>
      <p className="whitespace-pre-wrap">
        <RichText text={comment.body} />
      </p>
    </div>
  );
}
