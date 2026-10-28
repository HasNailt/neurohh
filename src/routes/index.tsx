import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingCardView } from "@/components/listing-card";
import { Kicker } from "@/components/ui-bits";
import { listListings, listPopularTags, listRecommendations } from "@/lib/market/server";
import { parseFeedQuery, type FeedQuery } from "@/lib/market/shared";

export const Route = createFileRoute("/")({
  validateSearch: (search): FeedQuery => parseFeedQuery(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => Promise.all([listListings({ data: deps }), listPopularTags(), listRecommendations()]),
  head: () => ({ meta: [{ title: "AdoptAI — открытые лоты" }] }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const [feed, tags, recommended] = Route.useLoaderData();
  const pristine = !search.q && !search.tag && search.kind === "all" && search.page === 1;
  const emptyMarket = pristine && feed.total === 0;
  const showReco = search.page === 1 && !search.q && !search.tag && search.kind !== "fixed" && recommended.length > 0;
  const recoIds = new Set(showReco ? recommended.map((item) => item.id) : []);
  const items = feed.items.filter((item) => !recoIds.has(item.id));

  return (
    <div className="space-y-8">
      {emptyMarket ? <EmptyBooth /> : <BoardHead total={feed.total} search={search} />}
      <FilterBar search={search} tags={tags} />
      {showReco ? (
        <section className="space-y-3">
          <div>
            <Kicker>weighted</Kicker>
            <h2 className="mt-1 font-display text-3xl leading-none">рекомендации.</h2>
            <p className="mt-1 text-sm text-muted">Только живые аукционы. Чем больше лайков и ставок, тем выше шанс попасть сюда.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <ListingCardView key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
      {items.length === 0 ? (
        showReco ? null : (
        <p className="border border-dashed border-ink/30 px-4 py-10 text-center text-muted">
          {emptyMarket ? "Первый лот ещё не выставлен." : "По этому запросу лотов нет."}
        </p>
        )
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
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

function BoardHead({ total, search }: { total: number; search: FeedQuery }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Kicker>01 / open booth</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight sm:text-6xl">
          <span className="bg-wine px-2 text-foam">AdoptAI</span> адопты.
        </h1>
        {search.tag ? <p className="mt-3 text-muted">Тег: {search.tag}</p> : null}
        {search.q ? <p className="mt-1 text-muted">Запрос: {search.q}</p> : null}
      </div>
      <Score n={total} label="OPEN" />
    </div>
  );
}

function EmptyBooth() {
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Kicker>01 / март не обязателен</Kicker>
          <p className="mt-3 font-display text-lg">#ПерсонажиНаходятДом</p>
        </div>
        <div className="text-right">
          <Kicker>off-site payment</Kicker>
          <p className="mt-2 font-mono text-xs text-muted">346° 89′ 07″</p>
        </div>
      </div>
      <div className="hidden grid-cols-6 gap-3 opacity-40 sm:grid" aria-hidden="true">
        {["01", "02", "03", "04", "05", "06"].map((n) => (
          <div key={n} className="flex flex-col items-center gap-2">
            <span className="font-mono text-xs">{n}</span>
            <span className="h-10 w-8 border border-ink" />
          </div>
        ))}
      </div>
      <div className="grid items-end gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <h1 className="font-display text-6xl leading-none tracking-tight sm:text-8xl">
          <span className="bg-wine px-2 text-foam">AdoptAI</span>
          <br />
          адопты.
        </h1>
        <div className="space-y-3">
          <p className="font-display text-3xl leading-none">
            никогда не
            <br />
            останавливай
            <br />
            линию.
          </p>
          <p className="max-w-sm text-muted">
            Аукцион или фикс. Оплата вне площадки, в чате сделки. Проданные аукционы из ленты уходят.
          </p>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-4">
        {[
          ["01", "Лот", "Аукцион или фиксированная цена, свои теги."],
          ["02", "Ставка", "Антиснайп продлевает последние минуты. Продавец тоже может поставить."],
          ["03", "Чат", "После покупки открывается переписка. Деньги идут мимо площадки."],
          ["04", "Лента", "В рекомендациях только аукционы: лайки и ставки поднимают шанс."],
        ].map(([n, t, d]) => (
          <li key={n} className="border border-ink/20 border-l-2 border-l-wine bg-card p-3">
            <p className="font-mono text-xs text-muted">{n}</p>
            <p className="mt-2 font-display text-xl">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Score({ n, label }: { n: number; label: string }) {
  return (
    <div className="inline-flex border border-ink/40">
      <span className="bg-wine px-2 py-1 font-mono text-xs tracking-widest text-foam">{label}</span>
      <span className="px-3 py-1 font-mono text-sm tabular-nums">{n}</span>
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
