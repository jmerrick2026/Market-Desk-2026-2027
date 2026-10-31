import { Header, Footer, Term, Chg, fmt, usd, CurveChart, LineChart, Reports, reportLinks, HoldingsMap, CorrHeatmap } from "../components/ui";
import { MARKET, loadAll, Trend } from "../lib/calc";
import { Quote } from "../lib/data";
import { BENCHMARK } from "../lib/portfolios";
import { makeCrossword, Entry } from "../lib/crossword";
import Crossword from "../components/Crossword";
import UpOrDown from "../components/UpOrDown";
import AskJack from "../components/AskJack";
import { VIDEOS, toEmbed } from "../lib/videos";
import { buildAskJack } from "../lib/askjack";
import { closing, curveStats, huddle, macroMicroQuestion, macroRead, microRead, setup, upcomingEarnings } from "../lib/prompts";

export const revalidate = 60;

const dayLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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
  const { quotes: q, curve, results, trends, micro, risk, econ } = await loadAll();
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
  // One row per company across all three portfolios, for the reports directory
  const companies = new Map<string, { s: string; name: string; filing: string; owners: string[] }>();
  for (const r of results) for (const h of r.positions) {
    const c = companies.get(h.symbol) ?? { s: h.symbol, name: h.name, filing: h.filing, owners: [] };
    c.owners.push(r.p.name.replace(" Portfolio", "").replace("'s", ""));
    companies.set(h.symbol, c);
  }
  const directory = [...companies.values()].sort((a, b) => a.s.localeCompare(b.s));

  // ── Puzzles: answers drawn from today's market ──
  const etDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const allPos = [...new Map(results.flatMap((r) => r.positions.map((p) => [p.symbol, { ...p, owner: r.p.name.replace(" Portfolio", "").replace("'s", "") }]))).values()];
  const byDay = [...allPos].sort((a, b) => b.dayPct - a.dayPct);
  const jm = results.find((r) => r.p.id === "jack-merrick");
  const jmTop = jm ? [...jm.positions].sort((a, b) => b.weight - a.weight)[0] : undefined;
  const fedMonth = econ.nextFed ? new Date(econ.nextFed + "T12:00:00Z").toLocaleDateString("en-US", { month: "long" }) : undefined;
  const daily: Entry[] = [
    byDay[0] && { answer: byDay[0].symbol, clue: `Ticker of the day's biggest gainer in our portfolios (${byDay[0].dayPct > 0 ? "+" : ""}${byDay[0].dayPct.toFixed(1)}%)` },
    byDay[byDay.length - 1] && { answer: byDay[byDay.length - 1].symbol, clue: `Ticker of the day's biggest decliner in our portfolios (${byDay[byDay.length - 1].dayPct.toFixed(1)}%)` },
    jmTop && { answer: jmTop.symbol, clue: "Ticker of the largest position in Jack Merrick's Portfolio" },
    sectors[0] && { answer: sectors[0].n.split(" ")[0], clue: `First word of the day's best-performing S&P sector (${sectors[0].v > 0 ? "+" : ""}${sectors[0].v.toFixed(1)}%)` },
    trends.sectors1m[0] && trends.sectors1m[0].n !== sectors[0]?.n && { answer: trends.sectors1m[0].n.split(" ")[0], clue: "First word of the strongest sector over the past month" },
    fedMonth && { answer: fedMonth, clue: "Month of the Fed's next rate decision" },
    { answer: mr.verdict.split(" ")[1], clue: "Today was a ___ day, according to our Micro Trends verdict" },
    micro.leaders[0] && { answer: micro.leaders[0].s, clue: "Ticker of our best performer over the past week" },
  ].filter(Boolean) as Entry[];
  const puzzle = makeCrossword(daily, etDate);
  const code = Buffer.from(puzzle.grid.flat().map((ch) => String.fromCharCode((ch ?? ".").charCodeAt(0) ^ 7)).join(""), "binary").toString("base64");
  const xwWords = puzzle.words.map((w) => ({ num: w.num, dir: w.dir, row: w.row, col: w.col, len: w.answer.length, clue: w.clue }));
  // Up or Down: six holdings, a different set each day
  let h = 0; for (const ch of etDate) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const shuffled = [...allPos].sort((a, b) => ((h ^ a.symbol.charCodeAt(0) * 2654435761) % 997) - ((h ^ b.symbol.charCodeAt(0) * 2654435761) % 997) || a.symbol.localeCompare(b.symbol));
  const uodItems = shuffled.slice(0, 6).map((p) => ({ s: p.symbol, name: p.name, pct: p.dayPct, owner: p.owner }));
  const mt = q[BENCHMARK]?.marketTime;
  const asOf = mt ? new Date(mt).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) : etDate;
  const askTopics = buildAskJack({ q, curve, results, trends, micro, risk, econ, sectors });
  const session = mt ? new Date(mt).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }) : "latest";

  return (
    <>
      <Header />
      <main className="wrap">
        {/* ── 15-minute recap ── */}
        <section id="recap" className="recap" data-slide data-brief>
          <div className="recap-head">
            <p className="kicker">If you only have 15 minutes</p>
            <h2>The Recap</h2>
            <p className="recap-hl">{s.headline}</p>
          </div>
          <div className="recap-grid">
            <div className="recap-block">
              <p className="mins">Minutes 0–3 · The tape</p>
              <div className="chips">
                {[["S&P 500", "^GSPC"], ["Nasdaq 100", "^NDX"], ["Russell 2000", "^RUT"], ["Crude oil", "CL=F"], ["Gold", "GC=F"], ["Bitcoin", "BTC-USD"]].map(([n, k]) => (
                  <div className="chip" key={k}><span>{n}</span><b><Chg v={q[k]?.changePct} /></b></div>
                ))}
                <div className="chip"><span>10-yr yield</span><b>{cs?.y10 != null ? `${cs.y10.toFixed(2)}%` : "n/a"}</b></div>
                <div className="chip"><span>VIX</span><b>{fmt(q["^VIX"]?.price, 1)}</b></div>
              </div>
              {sectors.length > 1 && <p className="recap-note">Best sector: <b>{sectors[0].n}</b> <Chg v={sectors[0].v} />. Worst: <b>{sectors[sectors.length - 1].n}</b> <Chg v={sectors[sectors.length - 1].v} />.</p>}
            </div>
            <div className="recap-block">
              <p className="mins">Minutes 3–7 · The big picture</p>
              <ul className="recap-list">{macroLines.slice(0, 3).map((l, i) => <li key={i}>{l}</li>)}</ul>
              {econ.nextFed && <p className="recap-note">Next Fed decision: <b>{new Date(econ.nextFed + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</b> ({econ.fedIn} days).{econ.ahead[0] ? <> Next big release: <b>{econ.ahead[0].name}</b>, {dayLabel(econ.ahead[0].date)}.</> : null}</p>}
            </div>
            <div className="recap-block">
              <p className="mins">Minutes 7–11 · Our portfolios</p>
              <ol className="recap-board">
                {board.map((r) => (
                  <li key={r.p.id}><span>{r.p.name.replace(" Portfolio", "")}</span><span className="num">Today <Chg v={r.dayPct} /></span><span className="num">Since start <Chg v={r.sincePct} /></span></li>
                ))}
                <li className="bench"><span>S&amp;P 500 (SPY)</span><span className="num">Today <Chg v={results[0]?.benchDayPct} /></span><span className="num">Since start <Chg v={results[0]?.benchSincePct} /></span></li>
              </ol>
              {byDay.length > 1 && <p className="recap-note">Top mover: <b>{byDay[0].symbol}</b> <Chg v={byDay[0].dayPct} />. Biggest drag: <b>{byDay[byDay.length - 1].symbol}</b> <Chg v={byDay[byDay.length - 1].dayPct} />. {mr.verdict}.</p>}
            </div>
            <div className="recap-block discuss">
              <p className="mins">Minutes 11–15 · Discuss</p>
              <p className="recap-q">{prompts[0]}</p>
              <p className="recap-q alt">{macroMicroQuestion(micro, trends)}</p>
            </div>
          </div>
        </section>

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
        <section id="macro" data-slide data-brief>
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

        {/* ── Economic calendar ── */}
        <section id="week" data-slide>
          <Banner title="The Week Ahead" sub="Scheduled economic releases that can move the whole market. Times are Eastern." />
          <div className="week-grid">
            <div className="fedbox">
              <p className="kicker">Next Fed decision</p>
              {econ.nextFed ? (
                <>
                  <p className="big">{new Date(econ.nextFed + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                  <p className="small">2:00 PM ET · {econ.fedIn === 0 ? "today" : `in ${econ.fedIn} days`}</p>
                </>
              ) : <p className="muted">Not yet scheduled.</p>}
              <p className="small muted">The Federal Open Market Committee sets the short-term interest rate that ripples through every asset on this page.</p>
            </div>
            <div>
              {econ.ahead.length ? (
                <div className="scroll"><table className="econ">
                  <thead><tr><th>Day</th><th>Time</th><th>Release</th><th className="r"><Term t="consensus">Consensus</Term></th><th className="r">Previous</th></tr></thead>
                  <tbody>
                    {econ.ahead.map((e, i) => (
                      <tr key={i}>
                        <td className="nowrap">{dayLabel(e.date)}</td>
                        <td className="nowrap">{e.time}</td>
                        <td><b>{e.name}</b><span className="why">{e.why}</span></td>
                        <td className="r num">{e.consensus ?? "n/a"}</td>
                        <td className="r num">{e.previous ?? "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              ) : <p className="muted">{econ.ok ? "No major U.S. releases are scheduled in the next week." : "The economic calendar is not available right now."}</p>}
              {econ.recent.length > 0 && (
                <>
                  <h3 className="sub" style={{ marginTop: 18 }}>Just released</h3>
                  <table className="econ">
                    <thead><tr><th>Day</th><th>Release</th><th className="r">Actual</th><th className="r">Consensus</th><th className="r">Surprise?</th></tr></thead>
                    <tbody>
                      {econ.recent.map((e, i) => {
                        const a = parseFloat(e.actual ?? ""), c = parseFloat(e.consensus ?? "");
                        const surprise = isFinite(a) && isFinite(c) ? (a > c ? "Above" : a < c ? "Below" : "In line") : "n/a";
                        return (
                          <tr key={i}>
                            <td className="nowrap">{dayLabel(e.date)}</td>
                            <td><b>{e.name}</b></td>
                            <td className="r num"><b>{e.actual}</b></td>
                            <td className="r num">{e.consensus ?? "n/a"}</td>
                            <td className="r">{surprise}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
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

        <section id="map" className="card" data-slide data-brief>
          <h2>Holdings Map <span className="muted small">each block is sized by its weight in the portfolio and shaded by today&apos;s move</span></h2>
          <div className="maps">
            {results.map((r) => (
              <figure key={r.p.id}>
                <figcaption className="mapcap"><b>{r.p.name}</b> <Chg v={r.dayPct} /></figcaption>
                <HoldingsMap items={r.positions.map((h) => ({ symbol: h.symbol, weight: h.weight, dayPct: h.dayPct }))} />
              </figure>
            ))}
          </div>
          <p className="legend"><span className="sw" style={{ background: "rgba(163,39,29,.93)" }} /> −3% or worse <span className="sw" style={{ background: "rgba(163,39,29,.35)" }} /> <span className="sw" style={{ background: "rgba(31,107,58,.35)" }} /> <span className="sw" style={{ background: "rgba(31,107,58,.93)" }} /> +3% or better</p>
        </section>

        <section id="risk" data-slide>
          <Banner title="Risk" sub={`How bumpy each portfolio's ride is, using today's holdings over the last ${risk.days} trading days.`} />
          <div className="scroll">
            <table className="risk">
              <thead>
                <tr>
                  <th>Portfolio</th>
                  <th className="r">6-mo return</th>
                  <th className="r"><Term t="volatility">Volatility</Term></th>
                  <th className="r"><Term t="beta">Beta</Term></th>
                  <th className="r"><Term t="max drawdown">Max drawdown</Term></th>
                  <th className="r"><Term t="Sharpe ratio">Sharpe</Term></th>
                  <th className="r"><Term t="correlation">Avg. correlation</Term></th>
                </tr>
              </thead>
              <tbody>
                {risk.portfolios.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.stats.name}</b><span className="why">Highest beta: {p.topBeta?.s} ({p.topBeta?.beta.toFixed(2)}). Most volatile: {p.topVol?.s} ({p.topVol?.vol.toFixed(0)}% a year).</span></td>
                    <td className="r num"><Chg v={p.stats.ret} digits={1} /></td>
                    <td className="r num">{p.stats.vol?.toFixed(1)}%</td>
                    <td className="r num">{p.stats.beta?.toFixed(2)}</td>
                    <td className="r num down">{p.stats.maxDD?.toFixed(1)}%</td>
                    <td className="r num">{p.stats.sharpe?.toFixed(2)}</td>
                    <td className="r num">{p.stats.avgCorr?.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="benchrow">
                  <td>{risk.bench.name}</td>
                  <td className="r num"><Chg v={risk.bench.ret} digits={1} /></td>
                  <td className="r num">{risk.bench.vol?.toFixed(1)}%</td>
                  <td className="r num">1.00</td>
                  <td className="r num">{risk.bench.maxDD?.toFixed(1)}%</td>
                  <td className="r num">{risk.bench.sharpe?.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="risk-notes">
            {risk.portfolios.map((p) => {
              const b = p.stats.beta ?? 1;
              return (
                <p key={p.id}><b>{p.stats.name.replace(" Portfolio", "")}:</b> a beta of {b.toFixed(2)} means that when the S&amp;P 500 moves 1%, this portfolio has tended to move about {b.toFixed(1)}%. {(p.stats.avgCorr ?? 0) > 0.4 ? "Its holdings move together a lot, so diversification is weaker than the number of names suggests." : (p.stats.avgCorr ?? 0) < 0.2 ? "Its holdings move fairly independently, which is what real diversification looks like." : "Its holdings are moderately linked."}</p>
              );
            })}
          </div>
          <p className="muted small">Sharpe ratio uses the current 3-month T-bill yield as the risk-free rate. These are backward-looking measures, not forecasts.</p>
        </section>

        <section className="card" data-slide>
          <h2>Which holdings move together? <span className="muted small"><Term t="correlation" /> of daily returns, last {risk.days} trading days</span></h2>
          <div className="heats">
            {risk.portfolios.map((p) => (
              <figure key={p.id}>
                <figcaption className="mapcap"><b>{p.stats.name}</b> <span className="muted">avg. {p.stats.avgCorr?.toFixed(2)}</span></figcaption>
                <CorrHeatmap syms={p.syms} matrix={p.matrix} slots={Math.max(...risk.portfolios.map((x) => x.syms.length))} />
              </figure>
            ))}
          </div>
          <p className="legend"><span className="sw" style={{ background: "rgba(163,39,29,.6)" }} /> move opposite <span className="sw" style={{ background: "rgba(22,20,18,.08)", border: "1px solid #cfc6b4" }} /> unrelated <span className="sw" style={{ background: "rgba(22,20,18,.5)" }} /> <span className="sw" style={{ background: "rgba(22,20,18,.95)" }} /> move together · holdings ordered by weight, largest first</p>
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
                    <th className="r">Today</th><th className="r"><Term t="contribution">Contrib.</Term></th><th className="r">Since start</th><th className="r">Earnings</th><th className="r">Reports</th>
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
                      <td className="r"><Reports symbol={h.symbol} filing={h.filing} /></td>
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

        {/* ── Company reports directory ── */}
        <section id="reports" data-slide>
          <Banner title="Company Reports" sub="Primary sources for every company we own. Start with the annual report's Item 1 (the business) and Item 7 (management's discussion)." />
          <div className="scroll">
            <table className="directory">
              <thead>
                <tr>
                  <th>Company</th><th>Held in</th>
                  <th className="c"><Term t="10-K">Annual</Term></th>
                  <th className="c"><Term t="10-Q">Quarterly</Term></th>
                  <th className="c"><Term t="8-K">News filings</Term></th>
                  <th className="c">Financial statements</th>
                  <th className="c">Earnings estimates</th>
                </tr>
              </thead>
              <tbody>
                {directory.map((c) => {
                  const l = reportLinks(c.s, c.filing);
                  const A = ({ x }: { x: { label: string; url: string } }) => <a href={x.url} target="_blank" rel="noreferrer">{x.label}</a>;
                  return (
                    <tr key={c.s}>
                      <td><a href={l.quote} target="_blank" rel="noreferrer"><b>{c.s}</b></a> {c.name !== c.s && <span className="muted">{c.name}</span>}</td>
                      <td className="owners-cell">{c.owners.join(" · ")}</td>
                      <td className="c"><A x={l.annual} /></td>
                      <td className="c"><A x={l.quarterly} /></td>
                      <td className="c"><A x={l.news} /></td>
                      <td className="c"><A x={l.statements} /></td>
                      <td className="c"><A x={l.earnings} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">SEC links open the company&apos;s filing list on EDGAR, newest first. Foreign companies file a 20-F (annual) and 6-K (interim) instead. Statements and estimates open on Yahoo Finance.</p>
        </section>

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
        {/* ── Video ── */}
        <section id="watch" data-slide>
          <Banner title="Watch" sub="Videos picked for this week's lessons." />
          {VIDEOS.length ? (
            <div className="videos">
              {VIDEOS.map((v) => {
                const e = toEmbed(v.url);
                return (
                  <figure key={v.url} className="video">
                    <div className="frame">
                      {e?.kind === "iframe" ? (
                        <iframe src={e.src} title={v.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      ) : e?.kind === "file" ? (
                        <video src={e.src} controls preload="metadata" />
                      ) : (
                        <a href={v.url} target="_blank" rel="noreferrer">Open video</a>
                      )}
                    </div>
                    <figcaption><b>{v.title}</b>{v.note && <span> · {v.note}</span>}</figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="muted">No videos yet. Add YouTube, Vimeo, or .mp4 links to <code>lib/videos.ts</code> and they will appear here.</p>
          )}
        </section>

        {/* ── Puzzles & games ── */}
        <section id="puzzles" data-slide>
          <Banner title="Puzzles" sub="The Daily Crossword: finance vocabulary, with a few answers pulled from today's market. A new grid every day." />
          <Crossword rows={puzzle.rows} cols={puzzle.cols} code={code} nums={puzzle.nums} words={xwWords} puzzleId={etDate} />
        </section>

        <section className="card" data-slide data-brief>
          <h2>Up or Down? <span className="muted small">six of our holdings, a new set each day</span></h2>
          <p className="deck-sm">Did each stock rise or fall in the {session} session? Make your call, then see the answer.</p>
          <UpOrDown items={uodItems} session={session} />
        </section>
      </main>
      <Footer />
      <AskJack topics={askTopics} asOf={asOf} />
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
