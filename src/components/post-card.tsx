import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, fieldClass } from "@/components/ui-bits";
import { EmojiBar } from "@/components/emoji-bar";
import { addPostComment, deletePost } from "@/lib/market/server";
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    <article className="space-y-3 border border-ink/20 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted">
          <Link to="/u/$handle" params={{ handle: post.authorHandle }} className="hover:text-ink">
            @{post.authorHandle}
          </Link>
          {post.authorIsNew ? <span className="ml-2 border border-ink/30 px-2 py-0.5">Новый пользователь</span> : null}
          {" · "}
          <span suppressHydrationWarning>{formatWhen(post.createdAt)}</span>
        </p>
        {mine ? (
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
        ) : null}
      </div>
      <p className="whitespace-pre-wrap">{post.body}</p>
      {post.images.length > 0 ? (
        <div className="flex flex-nowrap gap-2 overflow-x-auto">
          {post.images.map((image) => (
            <img key={image.id} src={image.src} alt="" className="h-36 w-36 shrink-0 object-cover" />
          ))}
        </div>
      ) : null}
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
      <EmojiBar onPick={(emoji) => setBody((value) => value + emoji)} />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(replyTo);
        }}
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyTo ? "Ответ" : "Комментарий"}
          className={fieldClass}
          maxLength={500}
        />
        <Button type="submit" variant="line" disabled={busy}>
          ок
        </Button>
      </form>
    </article>
  );
}

function CommentLine({ comment, onReply }: { comment: PostComment; onReply: () => void }) {
  return (
    <div>
      <p className="font-mono text-xs text-muted">
        <Link to="/u/$handle" params={{ handle: comment.authorHandle }} className="hover:text-ink">
          @{comment.authorHandle}
        </Link>
        {" · "}
        <span suppressHydrationWarning>{formatWhen(comment.createdAt)}</span>
      </p>
      <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
      <button type="button" className="mt-1 font-mono text-xs text-muted hover:text-ink" onClick={onReply}>
        Ответить
      </button>
    </div>
  );
}
