import { Header, Footer } from "../../components/ui";
import { loadPortfolios, loadMarket } from "../../lib/calc";
import { getCurve } from "../../lib/data";
import { closing } from "../../lib/prompts";

export const revalidate = 60;

export default async function ClosingQuestions() {
  const [{ results }, q, curve] = await Promise.all([loadPortfolios(), loadMarket(), getCurve()]);
  const sections = closing(results, q, curve);
  let n = 0;
  return (
    <>
      <Header active="closing" />
      <main className="wrap">
        <section className="lede">
          <h1>Closing Questions</h1>
          <p>End-of-class prompts generated from today&apos;s portfolio moves and market data. Answers should name a cause, a mechanism, and a number.</p>
        </section>
        {sections.map((s) => (
          <section className="card cq" key={s.title}>
            <h2>{s.title}</h2>
            <ol start={n + 1}>{s.items.map((it, i) => { n++; return <li key={i}>{it}</li>; })}</ol>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
