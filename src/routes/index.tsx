import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingCardView } from "@/components/listing-card";
import { listListings, listPopularTags, listRecommendations, searchPeople } from "@/lib/market/server";
import { GRID_PAGE, parseFeedQuery, type FeedQuery, type FeedResult, type PersonHit } from "@/lib/market/shared";

const emptyFeed: FeedResult = { items: [], total: 0, hasMore: false };

export const Route = createFileRoute("/")({
  validateSearch: (search): FeedQuery => parseFeedQuery(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const home = isHome(deps);
    const peopleQuery = deps.q.startsWith("@") ? deps.q : "";
    const listingQuery = peopleQuery ? { ...deps, q: peopleQuery.replace(/^@+/, "") } : deps;
    const [feed, tags, recommended, people] = await Promise.all([
      home ? Promise.resolve(emptyFeed) : listListings({ data: listingQuery }),
      listPopularTags().catch(() => []),
      home ? listRecommendations().catch(() => []) : Promise.resolve([]),
      peopleQuery ? searchPeople({ data: peopleQuery }).catch(() => []) : Promise.resolve([] as PersonHit[]),
    ]);
    return [feed, tags, recommended, people] as const;
  },
  head: () => ({ meta: [{ title: "AdoptAI — открытые лоты" }] }),
  component: Home,
});

function isHome(search: FeedQuery): boolean {
  return !search.q && !search.tag && search.kind === "all";
}

function Home() {
  const search = Route.useSearch();
  const [feed, tags, recommended, people] = Route.useLoaderData();
  const home = isHome(search);
  const grid = search.kind === "auction" || search.kind === "fixed";
  const pageSize = grid ? GRID_PAGE : 12;

  return (
    <div className="space-y-8">
      <FilterBar search={search} tags={tags} showSort={!home && search.kind !== "fixed"} />
      {home ? (
        <section className="space-y-3">
          <h2 className="font-display text-3xl leading-none">Топ Аукционов</h2>
          {recommended.length === 0 ? (
            <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">Лотов пока нет.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {recommended.map((item) => (
                <ListingCardView key={item.id} item={item} dense />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          {people.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-3xl leading-none">Люди</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((person) => (
                  <li key={person.handle}>
                    <Link to="/u/$handle" params={{ handle: person.handle }} className="block border border-ink/20 bg-card px-3 py-3">
                      <p className="font-display text-2xl leading-none">
                        {person.premium ? <span className="text-foam">★ </span> : null}
                        <span className={person.premium ? "text-[#e6c36a]" : undefined}>@{person.handle}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted">{person.displayName}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {feed.items.length === 0 ? (
            people.length > 0 ? null : (
              <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">По этому запросу лотов нет.</p>
            )
          ) : (
            <div className={grid ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" : "grid gap-8 sm:grid-cols-2 lg:grid-cols-3"}>
              {feed.items.map((item) => (
                <ListingCardView key={item.id} item={item} dense={grid} />
              ))}
            </div>
          )}
        </div>
      )}
      {!home && feed.total > 0 ? (
        <div className="flex items-center justify-between gap-3 font-mono text-sm">
          {search.page > 1 ? (
            <Link to="/" search={{ ...search, page: search.page - 1 }} className="min-h-11 underline">
              Назад
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted tabular-nums">
            {search.page} / {Math.max(1, Math.ceil(feed.total / pageSize))}
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

function FilterBar({
  search,
  tags,
  showSort,
}: {
  search: FeedQuery;
  tags: { slug: string; label: string }[];
  showSort: boolean;
}) {
  const kinds = [
    ["all", "Топ"],
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
            search={{ ...search, kind: id, page: 1, ...(id === "fixed" ? { sort: "new" as const } : {}) }}
            className={
              search.kind === id
                ? "inline-flex min-h-11 items-center border border-wine bg-wine px-3 text-sm text-foam"
                : "inline-flex min-h-11 items-center border border-ink/25 px-3 text-sm"
            }
          >
            {label}
          </Link>
        ))}
        {showSort ? (
          <>
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
          </>
        ) : null}
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