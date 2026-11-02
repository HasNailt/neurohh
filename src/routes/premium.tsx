import { createFileRoute } from "@tanstack/react-router";
import { Frame, Kicker } from "@/components/ui-bits";

export const Route = createFileRoute("/premium")({
  head: () => ({ meta: [{ title: "Premium — AdoptAI" }] }),
  component: PremiumPage,
});

const HEARTS = [1, 1, 0, 1, 1, 1, 0, 1];

function Hearts() {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {HEARTS.map((on, index) => (
        <svg key={index} width="13" height="11" viewBox="0 0 7 6" shapeRendering="crispEdges" className={on ? "text-[#e6c36a]" : "text-ink/25"}>
          <path fill="currentColor" d="M1 0h2v1H1zm3 0h2v1H4zM0 1h7v2H0zM1 3h5v1H1zM2 4h3v1H2zM3 5h1v1H3z" />
        </svg>
      ))}
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="grid gap-1 border-t border-ink/15 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
      <p>{left}</p>
      <p className="font-mono text-xs text-[#e6c36a] sm:text-right">{right}</p>
    </div>
  );
}

function PremiumPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <Frame gold className="bg-card px-5 py-10 sm:px-10">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.28em] text-muted uppercase">
          <span>SYS // 250</span>
          <span>★ pass</span>
        </div>
        <div className="mt-8 text-center">
          <Kicker>off-site</Kicker>
          <h1 className="mt-3 font-display text-6xl leading-none tracking-tight sm:text-8xl">Premium</h1>
          <p className="mt-5 font-display text-5xl leading-none text-[#e6c36a] tabular-nums">250 ₽</p>
          <p className="mt-2 font-mono text-sm tracking-wide text-ink">на месяц</p>
          <div className="mx-auto mt-6 h-px w-24 bg-[#e6c36a]/70" />
          <div className="mt-4">
            <Hearts />
          </div>
          <p className="mx-auto mt-5 max-w-md text-sm text-muted">
            Для покупки писать:{" "}
            <a href="https://t.me/Dont_Sleep_Alex" className="text-ink underline" target="_blank" rel="noreferrer">
              https://t.me/Dont_Sleep_Alex
            </a>
          </p>
        </div>
        <p className="mt-8 text-center font-mono text-[10px] tracking-[0.22em] text-muted uppercase">HI SCORE // ★</p>
      </Frame>

      <section className="border border-ink/20 bg-card">
        <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
          <h2 className="font-display text-2xl">Внешний вид</h2>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">01</span>
        </header>
        <div className="px-4">
          <Row left="Белая или золотая звёздочка ★ перед ником везде" right="★" />
          <Row left="Золотой цвет ника" right="gold" />
          <Row left="Плашка Premium в профиле" right="badge" />
          <Row left="Золотая рамка у карточек лотов" right="frame" />
        </div>
      </section>

      <section className="border border-ink/20 bg-card">
        <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
          <h2 className="font-display text-2xl">Лимиты</h2>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">02</span>
        </header>
        <div className="px-4">
          <Row left="Активные аукционы" right="10 / 20" />
          <Row left="Активные фиксы" right="10 / 20" />
          <Row left="Описание лота" right="400 / 1200" />
          <Row left="Превью в лоте" right="4 / 8" />
          <Row left="Баннер" right="1.2 МБ / GIF 3 МБ" />
          <Row left="Аватар" right="500 КБ / GIF 1.5 МБ" />
        </div>
        <p className="border-t border-ink/15 px-4 py-3 font-mono text-[10px] tracking-widest text-muted uppercase">обычный / premium</p>
      </section>

      <section className="border border-ink/20 bg-card">
        <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
          <h2 className="font-display text-2xl">Профиль</h2>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">03</span>
        </header>
        <div className="space-y-3 px-4 py-4 text-sm">
          <p>Акцентный цвет: вино, золото, роза, лёд, лес, фиолет, уголь, светлый.</p>
          <p>Рамка аватарки: тонкая, круг, скруглённый квадрат, золотая, без рамки.</p>
          <p>Оверлей баннера: градиент, затемнение, виньетка, без оверлея.</p>
          <p>Левая и правая боковые картинки в рамках, до 3 МБ.</p>
          <p>Форма боковых рамок: прямоугольник, шире, квадрат сверху или снизу.</p>
          <p>Фон середины страницы под профилем, до 3 МБ.</p>
        </div>
      </section>

      <section className="border border-ink/20 bg-card">
        <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
          <h2 className="font-display text-2xl">Лоты и лента</h2>
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">04</span>
        </header>
        <div className="px-4">
          <Row left="Закреп лотов и постов" right="до 3 + 3" />
          <Row left="Буст лота" right="24 / 48 / 72 ч" />
          <Row left="Метка на карточке" right="BOOST" />
          <Row left="В списках лоты Premium и буст идут выше" right="rank" />
          <Row left="В поиске людей Premium тоже выше" right="search" />
        </div>
      </section>
      <p className="text-center text-xs leading-relaxed text-muted">
        Вся собранная сумма идёт на поддержание и развитие сайта.
      </p>
    </article>
  );
}
