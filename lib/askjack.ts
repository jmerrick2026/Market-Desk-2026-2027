// Ask Jack: built-in, rule-based answers computed from the data on the page. No AI calls.
import type { PortfolioResult, Trends, Micro } from "./calc";
import type { Risk } from "./risk";
import type { Econ } from "./econ";
import type { Curve, Quote } from "./data";
import { curveStats, macroRead, microRead, setup, huddle } from "./prompts";
import { BENCHMARK } from "./portfolios";

export type QA = { q: string; a: string[]; list?: string[] };
export type Topic = { id: string; label: string; qs: QA[] };

const p = (v?: number, d = 2) => (v == null || !isFinite(v) ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`);
const short = (n: string) => n.replace(" Portfolio", "");
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export function buildAskJack(d: {
  q: Record<string, Quote>; curve: Curve | null; results: PortfolioResult[]; trends: Trends; micro: Micro; risk: Risk; econ: Econ;
  sectors: { n: string; v: number }[];
}): Topic[] {
  const { q, curve, results, trends, micro, risk, econ, sectors } = d;
  const s = setup(q, curve);
  const cs = curveStats(curve);
  const all = [...new Map(results.flatMap((r) => r.positions.map((x) => [x.symbol, { ...x, owner: short(r.p.name) }]))).values()];
  const byDay = [...all].sort((a, b) => b.dayPct - a.dayPct);
  const bySince = [...all].sort((a, b) => b.sincePct - a.sincePct);
  const board = [...results].sort((a, b) => b.sincePct - a.sincePct);
  const spy = results[0];
  const mr = microRead(micro);
  const row = (x: { symbol: string; name: string; owner: string }, v: string) => `${x.symbol} (${x.name}, ${x.owner}): ${v}`;

  const session: QA[] = [
    { q: "What happened in the market today?", a: [s.headline, ...s.body] },
    { q: "What should we talk about in class?", a: ["Here are today's three huddle questions:"], list: huddle(q, curve) },
  ];

  const macro: QA[] = [
    { q: "What are the big macro trends right now?", a: macroRead(trends) },
    {
      q: "What do interest rates have to do with stocks?",
      a: [
        `Think of the 10-year Treasury yield (now ${trends.macro.find((m) => m.s === "^TNX")?.level?.toFixed(2) ?? "n/a"}%) as the "safe" return. When it rises, a stock's future profits are worth less today, so investors pay less for them.`,
        "Growth stocks, whose profits sit far in the future, feel this most. Banks can benefit from higher rates; homebuilders and utilities usually suffer.",
      ],
    },
    {
      q: "Is growth or value winning?",
      a: trends.styles.map((x) => `${x.n}: ${(x.m1 ?? 0) >= 0 ? x.aName : x.bName} is ahead by ${Math.abs(x.m1 ?? 0).toFixed(1)} points over the past month.`),
    },
  ];

  const week: QA[] = [
    {
      q: "What economic news is coming up?",
      a: econ.ahead.length ? ["The biggest scheduled U.S. releases over the next week (Eastern time):"] : ["No major U.S. releases are scheduled in the next week."],
      list: econ.ahead.slice(0, 8).map((e) => `${day(e.date)}, ${e.time}: ${e.name}${e.consensus ? ` (forecast ${e.consensus})` : ""}`),
    },
    {
      q: "When is the next Fed decision?",
      a: econ.nextFed
        ? [`${new Date(econ.nextFed + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at 2:00 PM ET, ${econ.fedIn} days from now.`, "The Fed sets the overnight interest rate. Markets usually price in the decision ahead of time, so the press conference and any hints about future moves can matter more than the decision itself."]
        : ["The next meeting date is not on our calendar yet."],
    },
    {
      q: "Why does a 'surprise' matter more than the number?",
      a: ["Prices already reflect what economists expect (the consensus). Markets move when reality differs.", ...(econ.recent[0] ? [`Example: ${econ.recent[0].name} came in at ${econ.recent[0].actual} versus a ${econ.recent[0].consensus ?? "n/a"} forecast.`] : [])],
    },
  ];

  const markets: QA[] = [
    {
      q: "Which sectors led and lagged today?",
      a: sectors.length ? [`Leaders: ${sectors.slice(0, 3).map((x) => `${x.n} ${p(x.v)}`).join(", ")}.`, `Laggards: ${sectors.slice(-3).reverse().map((x) => `${x.n} ${p(x.v)}`).join(", ")}.`] : ["Sector data is not available right now."],
    },
    {
      q: "What does the yield curve tell us?",
      a: cs?.s2s10 != null
        ? [`The 10-year yields ${cs.y10?.toFixed(2)}%, and the gap to the 2-year (2s10s) is ${cs.s2s10 > 0 ? "+" : ""}${cs.s2s10} basis points.`, cs.s2s10 >= 0 ? "A positive gap is normal: lenders want more to tie money up longer. It suggests the bond market is not bracing for a recession." : "A negative (inverted) gap means short-term rates are higher than long-term ones, which has often come before recessions."]
        : ["Yield curve data is not available right now."],
    },
  ];

  const microQ: QA[] = [
    { q: "Was today a macro or a micro day?", a: [`${mr.verdict}.`, ...mr.lines] },
    {
      q: "Which of our stocks had the best and worst week?",
      a: ["Best this week:"],
      list: [...micro.leaders.slice(0, 3).map((x) => `${x.s}: ${p(x.w1)}`), "Worst this week:", ...micro.laggards.slice(0, 3).map((x) => `${x.s}: ${p(x.w1)}`)],
    },
  ];

  const portfolios: QA[] = [
    {
      q: "Which stocks did best and worst today?",
      a: ["Across all three portfolios:"],
      list: [...byDay.slice(0, 3).map((x) => row(x, p(x.dayPct))), "...and at the bottom:", ...byDay.slice(-3).reverse().map((x) => row(x, p(x.dayPct)))],
    },
    {
      q: "Which stocks did best and worst since the start?",
      a: [`Measured from the inception close on ${results[0]?.p.startDate ?? "the start date"}:`],
      list: [...bySince.slice(0, 3).map((x) => row(x, p(x.sincePct))), "...and at the bottom:", ...bySince.slice(-3).reverse().map((x) => row(x, p(x.sincePct)))],
    },
    {
      q: "How do our portfolios compare with the S&P 500?",
      a: [`Since inception, ${BENCHMARK} (the S&P 500) is ${p(spy?.benchSincePct)}.`],
      list: board.map((r, i) => `${i + 1}. ${short(r.p.name)}: ${p(r.sincePct)}, ${r.sincePct >= r.benchSincePct ? "ahead of" : "behind"} the S&P 500 by ${Math.abs(r.sincePct - r.benchSincePct).toFixed(2)} points`),
    },
    {
      q: "What does 'contribution' mean?",
      a: ["Contribution is how many dollars one stock added to or took from the portfolio's day. It depends on both the stock's move and how big the position is.", byDay[0] ? `Today, for example, ${byDay[0].symbol} rose ${p(byDay[0].dayPct)}; a big position in it helps far more than a tiny one.` : ""].filter(Boolean),
    },
  ];

  const riskQ: QA[] = [
    {
      q: "Which portfolio is the riskiest?",
      a: (() => {
        const v = [...risk.portfolios].sort((a, b) => (b.stats.vol ?? 0) - (a.stats.vol ?? 0));
        return [
          `By volatility, over the last ${risk.days} trading days: ${v.map((x) => `${short(x.stats.name)} ${x.stats.vol?.toFixed(1)}%`).join(", ")} (S&P 500: ${risk.bench.vol?.toFixed(1)}%).`,
          `Worst drop from a peak: ${v.map((x) => `${short(x.stats.name)} ${x.stats.maxDD?.toFixed(1)}%`).join(", ")}.`,
        ];
      })(),
    },
    {
      q: "What is beta, in plain English?",
      a: ["Beta tells you how much something tends to move when the S&P 500 moves 1%.", ...risk.portfolios.map((x) => `${short(x.stats.name)}: beta ${x.stats.beta?.toFixed(2)}, so about ${(x.stats.beta ?? 0).toFixed(1)}% for each 1% market move. Its highest-beta stock is ${x.topBeta?.s} (${x.topBeta?.beta.toFixed(2)}).`)],
    },
    {
      q: "Are we actually diversified?",
      a: ["Owning many stocks only helps if they don't all move together. Average correlation (0 = unrelated, 1 = lockstep):", ...risk.portfolios.map((x) => `${short(x.stats.name)}: ${x.stats.avgCorr?.toFixed(2)}`)],
    },
  ];

  const reports: QA[] = [
    {
      q: "Where do I find a company's financials?",
      a: ["Open the Company Reports section. For each company:", "10-K is the audited annual report: read Item 1 (the business) and Item 7 (management's discussion). 10-Q is the quarterly update. 8-K filings carry earnings press releases. 'Statements' opens the income statement, balance sheet, and cash flow."],
    },
    {
      q: "Who reports earnings soon?",
      a: ["Upcoming earnings for our holdings:"],
      list: [...all].filter((x) => x.earnings && x.earnings >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.earnings!.localeCompare(b.earnings!)).slice(0, 8).map((x) => `${day(x.earnings!)}: ${x.symbol} (${x.owner})`),
    },
  ];

  const puzzles: QA[] = [
    { q: "How does the crossword work?", a: ["Click a square and type. Click the same square (or press Space) to switch between across and down. Tab jumps to the next clue.", "A few answers come from today's market, like the day's top-gaining ticker, so the Portfolios and Markets sections are fair game for hints."] },
    { q: "How do I play Up or Down?", a: ["Six of our holdings, a new set each day. Guess whether each rose or fell in the latest session, then see the answer and your score."] },
  ];

  return [
    { id: "front", label: "Today's session", qs: session },
    { id: "macro", label: "Macro trends", qs: macro },
    { id: "week", label: "The week ahead", qs: week },
    { id: "markets", label: "Markets", qs: markets },
    { id: "micro", label: "Micro trends", qs: microQ },
    { id: "portfolios", label: "Portfolio comparison", qs: portfolios },
    { id: "risk", label: "Risk", qs: riskQ },
    { id: "reports", label: "Company reports", qs: reports },
    { id: "puzzles", label: "Puzzles", qs: puzzles },
  ];
}
