import { Header, Footer, Term, Chg, fmt, usd, CurveChart, LineChart, filingUrl } from "../components/ui";
import { MARKET, loadAll, Trend } from "../lib/calc";
import { Quote } from "../lib/data";
import { BENCHMARK } from "../lib/portfolios";
import { closing, curveStats, huddle, macroMicroQuestion, macroRead, microRead, setup, upcomingEarnings } from "../lib/prompts";

export const revalidate = 60;

const dateLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });

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

function TrendCell({ t, v }: { t: Trend; v?: number }) {
  if (t.kind === "yield") return <Chg v={v} digits={0} suffix=" bp" />;
  if (t.kind === "pts") return <Chg v={v} digits={1} suffix=" pts" />;
  return <Chg v={v} digits={1} />;
}

const arrow = (v?: number) => (v == null ? "" : v > 0.05 ? "▲" : v < -0.05 ? "▼" : "▬");

function Banner({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="banner">
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

export default async function FrontPage() {
  const { quotes: q, curve, results, trends, micro } = await loadAll();
  const s = setup(q, curve);
  const prompts = huddle(q, curve);
  const cs = curveStats(curve);
  const sectors = MARKET.sectors.filter(([k]) => q[k]).map(([k, n]) => ({ k, n, v: q[k].changePct })).sort((a, b) => b.v - a.v);
  const maxAbs = Math.max(0.5, ...sectors.map((x) => Math.abs(x.v)));
  const macroLines = macroRead(trends);
  const mr = microRead(micro);
  const board = [...results].sort((a, b) => b.sincePct - a.sincePct);
  const earnings = upcomingEarnings(results);
  const cq = closing(results, q, curve);
  cq.splice(Math.max(0, cq.length - 1), 0, { title: "Macro or micro?", items: [macroMicroQuestion(micro, trends)] });
  let qn = 0;

  return (
    <>
      <Header />
      <main className="wrap">
        {/* ── Front page ── */}
        <div className="front" id="front" data-slide>
          <article className="lede story">
            <p className="kicker">The Session</p>
            <h1>{s.headline}</h1>
            <p className="deck">A desk read of the tape, written from the closing numbers.</p>
            <div className="cols">{s.body.map((b, i) => <p key={i}>{b}</p>)}</div>
          </article>
          <aside className="huddle">
            <p className="kicker">Huddle</p>
            <h3>Three Questions to Open Class</h3>
            <ol>{prompts.map((p, i) => <li key={i}>{p}</li>)}</ol>
          </aside>
        </div>

        {/* ── Macro trends ── */}
        <section id="macro" data-slide>
          <Banner title="Macro Trends" sub="The big forces that move every stock at once: rates, currencies, commodities, and fear." />
          <div className="macro-grid">
            <div className="cols-narrow">{macroLines.map((l, i) => <p key={i}>{l}</p>)}</div>
            <div className="scroll">
              <table className="trend-table">
                <thead><tr><th>Indicator</th><th className="r">Level</th><th className="r">Today</th><th className="r">1 week</th><th className="r">1 month</th><th></th></tr></thead>
                <tbody>
                  {trends.macro.map((t) => (
                    <tr key={t.s}>
                      <td><b>{t.n}</b><span className="why">{t.why}</span></td>
                      <td className="r num">{t.level == null ? <span className="muted">n/a</span> : t.kind === "yield" ? `${t.level.toFixed(2)}%` : fmt(t.level, t.level > 1000 ? 0 : 2)}</td>
                      <td className="r num"><TrendCell t={t} v={t.d1} /></td>
                      <td className="r num"><TrendCell t={t} v={t.w1} /></td>
                      <td className="r num"><TrendCell t={t} v={t.m1} /></td>
                      <td className={`r arrow ${(t.m1 ?? 0) > 0 ? "up" : (t.m1 ?? 0) < 0 ? "down" : "flat"}`}>{arrow(t.m1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted small">Yields show changes in <Term t="basis point">basis points</Term>; the VIX shows changes in index points; everything else is percent.</p>
        </section>

        <section className="card" data-slide>
          <div className="grid2 tight">
            <div>
              <h2>Style &amp; <Term t="breadth" /> <span className="muted small">who is winning, relative to whom</span></h2>
              <table>
                <thead><tr><th>Matchup</th><th className="r">Today</th><th className="r">1 week</th><th className="r">1 month</th></tr></thead>
                <tbody>
                  {trends.styles.map((p) => (
                    <tr key={p.n}>
                      <td><b>{p.n}</b><span className="why">{(p.m1 ?? 0) >= 0 ? `${p.aName} leading` : `${p.bName} leading`} this month. {p.why}</span></td>
                      <td className="r num"><Chg v={p.d1} suffix=" pts" /></td>
                      <td className="r num"><Chg v={p.w1} digits={1} suffix=" pts" /></td>
                      <td className="r num"><Chg v={p.m1} digits={1} suffix=" pts" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Positive means the first group outperformed the second (for example, growth beat value).</p>
            </div>
            <div>
              <h2><Term t="rotation">Sector rotation</Term> <span className="muted small">1-month return</span></h2>
              <ol className="rotation">
                {trends.sectors1m.map((x) => (
                  <li key={x.s}><span>{x.n} <span className="muted">{x.s}</span></span><span className="num"><Chg v={x.m1} digits={1} /></span></li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Markets ── */}
        <section id="markets" data-slide>
          <Banner title="Markets" sub="Where the major indices closed, at home and abroad." />
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
        </section>

        <section className="card" data-slide>
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

        <div className="grid2" data-slide>
          <section className="card">
            <h2>Rates, dollar &amp; commodities <span className="muted small">via <Term t="ETF">ETFs</Term></span></h2>
            <QuoteTable rows={MARKET.macro} q={q} cols="Price" />
          </section>
          <section className="card">
            <h2>Crypto</h2>
            <QuoteTable rows={MARKET.crypto} q={q} cols="Price (USD)" />
          </section>
        </div>

        <section className="card" data-slide>
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

        {/* ── Micro trends ── */}
        <section id="micro" data-slide>
          <Banner title="Micro Trends" sub="What individual companies in our three portfolios are doing, apart from the market." />
          <div className="micro-top">
            <div className="verdict">
              <p className="kicker">Today&apos;s verdict</p>
              <p className="big">{mr.verdict}</p>
              <p className="muted small">{Math.round(micro.sameDirPct)}% of holdings moved with the S&amp;P 500</p>
            </div>
            <div className="cols-narrow">{mr.lines.map((l, i) => <p key={i}>{l}</p>)}</div>
          </div>
          <div className="grid2 tight">
            <div>
              <h3 className="sub">Leaders this week</h3>
              <MoverTable rows={micro.leaders} />
            </div>
            <div>
              <h3 className="sub">Laggards this week</h3>
              <MoverTable rows={micro.laggards} />
            </div>
          </div>
        </section>

        <section className="card" data-slide>
          <div className="three">
            <div>
              <h3 className="sub">Near a <Term t="52-week high" /></h3>
              {micro.nearHigh.length ? <ul className="plain">{micro.nearHigh.map((r) => <li key={r.s}><b>{r.s}</b> {r.name !== r.s && <span className="muted">{r.name}</span>}<span className="num">{r.offHigh!.toFixed(1)}% from high</span></li>)}</ul> : <p className="muted">None of our holdings is within 3% of its 52-week high.</p>}
            </div>
            <div>
              <h3 className="sub">Near a 52-week low</h3>
              {micro.nearLow.length ? <ul className="plain">{micro.nearLow.map((r) => <li key={r.s}><b>{r.s}</b> {r.name !== r.s && <span className="muted">{r.name}</span>}<span className="num">+{r.offLow!.toFixed(1)}% above low</span></li>)}</ul> : <p className="muted">None of our holdings is within 8% of its 52-week low.</p>}
            </div>
            <div>
              <h3 className="sub"><Term t="unusual volume">Unusual volume</Term></h3>
              {micro.volume.length ? <ul className="plain">{micro.volume.map((r) => <li key={r.s}><b>{r.s}</b> {r.name !== r.s && <span className="muted">{r.name}</span>}<span className="num">{r.volX!.toFixed(1)}× normal</span></li>)}</ul> : <p className="muted">No holding traded at 1.5× its usual volume.</p>}
            </div>
          </div>
          <p className="muted small">Stocks pressing new highs show momentum; stocks near lows may be broken stories or bargains. Heavy volume means big investors are acting on news.</p>
        </section>

        {/* ── Portfolios ── */}
        <section id="portfolios" data-slide>
          <Banner title="Portfolios" sub={`Three model portfolios measured against the S&P 500 (${BENCHMARK}), share-weighted and including cash.`} />
          <div className="grid2 tight">
            <div>
              <h2>Leaderboard</h2>
              <div className="scroll"><table>
                <thead>
                  <tr><th>#</th><th>Portfolio</th><th className="r">Value</th><th className="r">Today</th><th className="r"><Term t="since inception">Since start</Term></th><th className="r">vs. {BENCHMARK}</th></tr>
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
                  {results[0] && (
                    <tr className="benchrow">
                      <td></td><td>{BENCHMARK} (S&amp;P 500)</td><td className="r num">{fmt(q[BENCHMARK]?.price)}</td>
                      <td className="r num"><Chg v={results[0].benchDayPct} /></td><td className="r num"><Chg v={results[0].benchSincePct} /></td><td></td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </div>
            <div>
              <h2>Upcoming <Term t="earnings" /> <span className="muted small">next 45 days</span></h2>
              {earnings.length ? (
                <ul className="cal cal-narrow">
                  {earnings.map((e) => (
                    <li key={e.symbol}><span className="date">{dateLabel(e.date)}</span><b>{e.symbol}</b> {e.name !== e.symbol && <span className="muted">{e.name}</span>}<span className="owners">{e.owners.join(" · ")}</span></li>
                  ))}
                </ul>
              ) : <p className="muted">No scheduled earnings found in the next 45 days.</p>}
              <p className="muted small">Yahoo&apos;s dates can be off by a day or two.</p>
            </div>
          </div>
        </section>

        {results.map((r) => (
          <section className="card port" id={r.p.id} key={r.p.id} data-slide>
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

        {/* ── Closing questions ── */}
        <section id="closing" data-slide>
          <Banner title="Closing Questions" sub="End-of-class prompts from today's moves. Answers should name a cause, a mechanism, and a number." />
          <div className="cq-grid">
            {cq.map((sec) => (
              <div className="cq" key={sec.title}>
                <h3 className="sub">{sec.title}</h3>
                <ol start={qn + 1}>{sec.items.map((it, i) => { qn++; return <li key={i}>{it}</li>; })}</ol>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function MoverTable({ rows }: { rows: { s: string; name: string; d1: number; w1?: number }[] }) {
  if (!rows.length) return <p className="muted">Not enough history yet.</p>;
  return (
    <table>
      <thead><tr><th>Holding</th><th className="r">Today</th><th className="r">1 week</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.s}>
            <td><b>{r.s}</b> {r.name !== r.s && <span className="muted">{r.name}</span>}</td>
            <td className="r num"><Chg v={r.d1} /></td>
            <td className="r num"><Chg v={r.w1} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
