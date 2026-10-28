import { createFileRoute, Link } from "@tanstack/react-router";
import { Kicker } from "@/components/ui-bits";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Условия — AdoptAI" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <div>
        <Kicker>terms</Kicker>
        <h1 className="mt-2 font-display text-5xl leading-none">условия.</h1>
        <p className="mt-3 text-muted">Коротко и по делу. Это не замена совету юриста, но правила пользования площадкой.</p>
      </div>
      <Section title="Площадка">
        AdoptAI даёт место для лотов, ставок и чата сделки. Мы не сторона договора купли-продажи и не платёжный агент.
      </Section>
      <Section title="Аккаунт">
        Вы отвечаете за доступ к аккаунту. Один человек — один основной профиль. Ник не должен притворяться чужим именем.
      </Section>
      <Section title="Контент">
        Вы загружаете только то, чем вправе распоряжаться. На ленте видно превью и публичный текст. Полные файлы через площадку не передаются. Размещая лот, вы даёте площадке право показать превью и публичный текст.
      </Section>
      <Section title="Деньги">
        Перевод происходит вне AdoptAI. Площадка не подтверждает оплату и не хранит файлы сделки. Споры о переводе вы решаете между собой; модерация смотрит переписку и жалобы.
      </Section>
      <Section title="Снятие лотов">
        Мы можем скрыть лот или ограничить аккаунт, если есть жалоба, очевидное воровство работы или попытка обойти закрытость файлов.
      </Section>
      <Section title="Ответственность">
        Сервис даётся как есть. Мы не обещаем, что вторая сторона оплатит или что файл окажется тем, чего вы ждали. Смотрите превью и переписку до подтверждения.
      </Section>
      <p className="text-sm">
        Домашние правила — на странице <Link to="/rules" className="underline">«Правила»</Link>.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="border-t border-ink/15 pt-4">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-muted">{children}</p>
    </section>
  );
}
