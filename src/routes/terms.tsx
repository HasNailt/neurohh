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
        <h1 className="mt-2 font-display text-5xl leading-none">условия</h1>
      </div>
      <section className="space-y-4 border-t border-ink/15 pt-4 text-muted">
        <p>Используя AdoptAI, вы соглашаетесь с этими условиями и с использованием файлов cookie.</p>
        <p>
          Сайт и администрация не несут ответственности за действия пользователей и не дают гарантий по контенту, который они публикуют или передают. Споры по оплате и файлам стороны решают сами.
        </p>
        <p>По вопросам, связанным с работой площадки, пишите @alexalter в личные сообщения на сайте.</p>
        <p>
          Подробные{" "}
          <Link to="/rules" className="text-ink underline">
            правила
          </Link>{" "}
          поведения и контента — на странице «Правила».
        </p>
      </section>
    </article>
  );
}
