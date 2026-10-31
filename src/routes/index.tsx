import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingCardView } from "@/components/listing-card";
import { Kicker } from "@/components/ui-bits";
import { listListings, listPopularTags, listRecommendations } from "@/lib/market/server";
import { parseFeedQuery, type FeedQuery } from "@/lib/market/shared";

export const Route = createFileRoute("/")({
  validateSearch: (search): FeedQuery => parseFeedQuery(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [feed, tags, recommended] = await Promise.all([
      listListings({ data: deps }),
      listPopularTags().catch(() => []),
      listRecommendations().catch(() => []),
    ]);
    return [feed, tags, recommended] as const;
  },
  head: () => ({ meta: [{ title: "AdoptAI — открытые лоты" }] }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const [feed, tags, recommended] = Route.useLoaderData();
  const pristine = !search.q && !search.tag && search.kind === "all" && search.page === 1;
  const showReco = search.page === 1 && !search.q && !search.tag && search.kind !== "fixed" && recommended.length > 0;

  return (
    <div className="space-y-8">
      <FilterBar search={search} tags={tags} />
      {showReco ? (
        <section className="space-y-3">
          <div>
            <Kicker>weighted</Kicker>
            <h2 className="mt-1 font-display text-3xl leading-none">рекомендации.</h2>
            <p className="mt-1 text-sm text-muted">
              Живые аукционы со ставками. Чем больше ставок, тем выше. Две ставки и больше — всегда в этом блоке.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <ListingCardView key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
      {feed.items.length === 0 ? (
        <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">
          {pristine ? "Лотов пока нет." : "По этому запросу лотов нет."}
        </p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {feed.items.map((item) => (
            <ListingCardView key={item.id} item={item} />
          ))}
        </div>
      )}
      {feed.total > 0 ? (
        <div className="flex items-center justify-between gap-3 font-mono text-sm">
          {search.page > 1 ? (
            <Link to="/" search={{ ...search, page: search.page - 1 }} className="min-h-11 underline">
              Назад
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted tabular-nums">
            {search.page} / {Math.max(1, Math.ceil(feed.total / 12))}
          </span>
          {feed.hasMore ? (
            <Link to="/" search={{ ...search, page: search.page + 1 }} className="min-h-11 underline">
              Дальше
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilterBar({ search, tags }: { search: FeedQuery; tags: { slug: string; label: string }[] }) {
  const kinds = [
    ["all", "Все"],
    ["auction", "Аукцион"],
    ["fixed", "Фикс"],
  ] as const;
  const sorts = [
    ["new", "Новые"],
    ["ending", "Скоро конец"],
  ] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map(([id, label]) => (
          <Link
            key={id}
            to="/"
            search={{ ...search, kind: id, page: 1 }}
            className={
              search.kind === id
                ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 text-sm text-foam"
                : "inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm"
            }
          >
            {label}
          </Link>
        ))}
        <span className="mx-1 hidden w-px bg-ink/15 sm:block" />
        {sorts.map(([id, label]) => (
          <Link
            key={id}
            to="/"
            search={{ ...search, sort: id, page: 1 }}
            className={
              search.sort === id
                ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 text-sm text-foam"
                : "inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm"
            }
          >
            {label}
          </Link>
        ))}
      </div>
      {tags.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              to="/"
              search={{ ...search, tag: search.tag === tag.slug ? "" : tag.slug, page: 1 }}
              className={
                search.tag === tag.slug
                  ? "shrink-0 border border-wine bg-wine px-2 py-1 font-mono text-xs text-foam"
                  : "shrink-0 border border-ink/25 px-2 py-1 font-mono text-xs"
              }
            >
              {tag.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
