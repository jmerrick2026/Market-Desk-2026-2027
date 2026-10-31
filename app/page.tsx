import { Header, Footer, Term, Chg, fmt, CurveChart } from "../components/ui";
import { MARKET, loadMarket } from "../lib/calc";
import { getCurve, Quote } from "../lib/data";
import { curveStats, huddle, setup } from "../lib/prompts";

export const revalidate = 60;

function QuoteTable({ rows, q, cols = "Level", digits = 2 }: { rows: readonly (readonly [string, string])[]; q: Record<string, Quote>; cols?: string; digits?: number }) {
  return (
    <table>
      <thead><tr><th>Name</th><th className="r">{cols}</th><th className="r">Change</th></tr></thead>
      <tbody>
        {rows.map(([s, n]) => (
          <tr key={s}>
            <td>{s === "^VIX" ? <Term t="VIX" /> : n}</td>
            <td className="r num">{fmt(q[s]?.price, digits)}</td>
            <td className="r num"><Chg v={q[s]?.changePct} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function Markets() {
  const [q, curve] = await Promise.all([loadMarket(), getCurve()]);
  const s = setup(q, curve);
  const prompts = huddle(q, curve);
  const cs = curveStats(curve);
  const sectors = MARKET.sectors.filter(([k]) => q[k]).map(([k, n]) => ({ k, n, v: q[k].changePct })).sort((a, b) => b.v - a.v);
  const maxAbs = Math.max(0.5, ...sectors.map((x) => Math.abs(x.v)));

  return (
    <>
      <Header active="markets" />
      <main className="wrap">
        <div className="front">
          <article className="lede story">
            <p className="kicker">The Session</p>
            <h1>{s.headline}</h1>
            <p className="deck">A desk read of the tape, written from the closing numbers.</p>
            <div className="cols">{s.body.map((b, i) => <p key={i}>{b}</p>)}</div>
          </article>
          <aside className="huddle">
            <p className="kicker">Huddle</p>
            <h2>Three Questions to Open Class</h2>
            <ol>{prompts.map((p, i) => <li key={i}>{p}</li>)}</ol>
          </aside>
        </div>

        <div className="grid2">
          <section className="card">
            <h2>U.S. indices</h2>
            <QuoteTable rows={MARKET.us} q={q} />
          </section>
          <section className="card">
            <h2>World markets</h2>
            <QuoteTable rows={MARKET.intl} q={q} />
          </section>
        </div>

        <section className="card">
          <h2><Term t="sector">Sectors</Term> <span className="muted small">S&amp;P 500 sector ETFs, today</span></h2>
          <div className="bars">
            {sectors.map((x) => (
              <div className="barrow" key={x.k}>
                <span className="bl">{x.n} <span className="muted">{x.k}</span></span>
                <span className="track">
                  <span className="mid" />
                  <span className={`fill ${x.v >= 0 ? "pos" : "neg"}`}
                    style={{ width: `${(Math.abs(x.v) / maxAbs) * 50}%`, [x.v >= 0 ? "left" : "right"]: "50%" } as React.CSSProperties} />
                </span>
                <span className="r num"><Chg v={x.v} /></span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid2">
          <section className="card">
            <h2>Rates, dollar &amp; commodities <span className="muted small">via <Term t="ETF">ETFs</Term></span></h2>
            <QuoteTable rows={MARKET.macro} q={q} cols="Price" />
          </section>
          <section className="card">
            <h2>Crypto</h2>
            <QuoteTable rows={MARKET.crypto} q={q} cols="Price (USD)" />
          </section>
        </div>

        <section className="card">
          <h2>Treasury <Term t="yield curve" /></h2>
          {curve ? (
            <>
              <p className="muted small">
                <Term t="par yield">Par yields</Term> as of {curve.date} · {curve.source}
                {cs?.s2s10 != null && <> · <Term t="2s10s" /> spread <b>{cs.s2s10 > 0 ? "+" : ""}{cs.s2s10} <Term t="basis point">bp</Term></b></>}
              </p>
              <CurveChart points={curve.points} />
              <table className="curve-table">
                <thead><tr>{curve.points.map((p) => <th key={p.label} className="r">{p.label}</th>)}</tr></thead>
                <tbody><tr>{curve.points.map((p) => <td key={p.label} className="r num">{p.y.toFixed(2)}</td>)}</tr></tbody>
              </table>
            </>
          ) : <p className="muted">Yield curve data is not available right now.</p>}
        </section>
      </main>
      <Footer />
    </>
  );
}
