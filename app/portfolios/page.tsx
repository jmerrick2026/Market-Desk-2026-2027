import { Header, Footer, Term, Chg, fmt, usd, LineChart, filingUrl } from "../../components/ui";
import { loadPortfolios } from "../../lib/calc";
import { BENCHMARK } from "../../lib/portfolios";
import { upcomingEarnings } from "../../lib/prompts";

export const revalidate = 60;

const dateLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function Portfolios() {
  const { results, quotes } = await loadPortfolios();
  const board = [...results].sort((a, b) => b.sincePct - a.sincePct);
  const bench = results[0];
  const earnings = upcomingEarnings(results);

  return (
    <>
      <Header active="portfolios" />
      <main className="wrap">
        <section className="lede">
          <h1>Portfolios</h1>
          <p>
            Three model portfolios measured against the <Term t="benchmark" /> ({BENCHMARK}). Returns are{" "}
            <Term t="share-weighted" /> and include cash, starting from each portfolio&apos;s inception close.
          </p>
        </section>

        <section className="card">
          <h2>Leaderboard</h2>
          <div className="scroll"><table>
            <thead>
              <tr><th>#</th><th>Portfolio</th><th className="r">Value</th><th className="r">Today</th><th className="r"><Term t="since inception">Since inception</Term></th><th className="r">vs. {BENCHMARK}</th></tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.p.id}>
                  <td className="rank">{i + 1}</td>
                  <td><a href={`#${r.p.id}`}>{r.p.name}</a></td>
                  <td className="r num">{usd(r.value)}</td>
                  <td className="r num"><Chg v={r.dayPct} /></td>
                  <td className="r num"><Chg v={r.sincePct} /></td>
                  <td className="r num"><Chg v={r.sincePct - r.benchSincePct} suffix=" pts" /></td>
                </tr>
              ))}
              {bench && (
                <tr className="benchrow">
                  <td></td><td>{BENCHMARK} (S&amp;P 500)</td><td className="r num">{fmt(quotes[BENCHMARK]?.price)}</td>
                  <td className="r num"><Chg v={bench.benchDayPct} /></td><td className="r num"><Chg v={bench.benchSincePct} /></td><td></td>
                </tr>
              )}
            </tbody>
          </table></div>
        </section>

        <section className="card">
          <h2>Upcoming <Term t="earnings" /> <span className="muted small">next 45 days, all three portfolios</span></h2>
          {earnings.length ? (
            <ul className="cal">
              {earnings.map((e) => (
                <li key={e.symbol}><span className="date">{dateLabel(e.date)}</span><b>{e.symbol}</b> {e.name !== e.symbol && <span className="muted">{e.name}</span>}<span className="owners">{e.owners.join(" · ")}</span></li>
              ))}
            </ul>
          ) : <p className="muted">No scheduled earnings found in the next 45 days.</p>}
          <p className="muted small">Yahoo&apos;s earnings dates can be off by a day or two; confirm on the company&apos;s investor relations page.</p>
        </section>

        {results.map((r) => (
          <section className="card port" id={r.p.id} key={r.p.id}>
            <div className="porthead">
              <div>
                <h2>{r.p.name}</h2>
                <p className="muted">{r.p.blurb}</p>
              </div>
              <div className="stats">
                <div><span>Value</span><b>{usd(r.value)}</b></div>
                <div><span>Cash</span><b>{usd(r.p.cash)}</b></div>
                <div><span>Today</span><b><Chg v={r.dayPct} /></b><small>{usd(r.dayPnl)}</small></div>
                <div><span>Since {dateLabel(r.p.startDate)}</span><b><Chg v={r.sincePct} /></b><small>{BENCHMARK} <Chg v={r.benchSincePct} /></small></div>
              </div>
            </div>

            <LineChart series={r.series} labels={[r.p.name.replace(" Portfolio", ""), BENCHMARK]} />

            <div className="scroll">
              <table className="holdings">
                <thead>
                  <tr>
                    <th>Holding</th><th className="r">Shares</th><th className="r">Price</th><th className="r">Value</th><th className="r">Weight</th>
                    <th className="r">Today</th><th className="r"><Term t="contribution">Contrib.</Term></th><th className="r">Since start</th><th className="r">Earnings</th><th className="r">Filing</th>
                  </tr>
                </thead>
                <tbody>
                  {r.positions.map((h) => (
                    <tr key={h.symbol}>
                      <td><b>{h.symbol}</b> {h.name !== h.symbol && <span className="muted">{h.name}</span>}</td>
                      <td className="r num">{fmt(h.shares, h.estimatedShares ? 2 : 0)}{h.estimatedShares && <sup title="Estimated: equal dollars at inception">*</sup>}</td>
                      <td className="r num">{fmt(h.price)}</td>
                      <td className="r num">{usd(h.value)}</td>
                      <td className="r num">{h.weight.toFixed(1)}%</td>
                      <td className="r num"><Chg v={h.dayPct} /></td>
                      <td className="r num"><Chg v={h.dayPnl} digits={0} suffix="" /></td>
                      <td className="r num"><Chg v={h.sincePct} /></td>
                      <td className="r num">{h.earnings ? dateLabel(h.earnings) : <span className="muted">n/a</span>}</td>
                      <td className="r"><a href={filingUrl(h.symbol, h.filing)} target="_blank" rel="noreferrer"><Term t={h.filing} /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.positions.some((h) => h.estimatedShares) && (
              <p className="muted small">* Share count estimated as an <Term t="equal-weighted" /> buy at the inception close. Enter real share counts in <code>lib/portfolios.ts</code>.</p>
            )}
            {r.missing.length > 0 && <p className="muted small">No data for: {r.missing.join(", ")}.</p>}
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
