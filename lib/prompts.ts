import { Quote, Curve } from "./data";
import { MARKET, PortfolioResult, Trends, Micro } from "./calc";

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const name = (list: readonly (readonly [string, string])[], s: string) => list.find(([k]) => k === s)?.[1] ?? s;

export function curveStats(c: Curve | null) {
  if (!c) return null;
  const at = (l: string) => c.points.find((p) => p.label === l)?.y;
  const y2 = at("2Y"), y10 = at("10Y"), y3m = at("3M"), y30 = at("30Y");
  return {
    s2s10: y2 != null && y10 != null ? Math.round((y10 - y2) * 100) : undefined,
    s3m10: y3m != null && y10 != null ? Math.round((y10 - y3m) * 100) : undefined,
    y10, y30,
  };
}

function sectorsRanked(q: Record<string, Quote>) {
  return MARKET.sectors.filter(([s]) => q[s]).map(([s, n]) => ({ s, n, v: q[s].changePct })).sort((a, b) => b.v - a.v);
}

/** One-paragraph read of the session, generated from the numbers. */
export function setup(q: Record<string, Quote>, c: Curve | null): { headline: string; body: string[] } {
  const spx = q["^GSPC"], ndx = q["^NDX"], rut = q["^RUT"], vix = q["^VIX"];
  if (!spx) return { headline: "Market data is not available right now.", body: [] };
  const sec = sectorsRanked(q);
  const big = Math.abs(spx.changePct) >= 1;
  const dir = spx.changePct >= 0 ? "higher" : "lower";
  const growthLed = ndx && rut ? ndx.changePct - spx.changePct : 0;
  const upDay = spx.changePct >= 0;
  const style = Math.abs(growthLed) < 0.3 ? "in a broad-based move"
    : growthLed > 0 ? (upDay ? "led by growth stocks" : "though growth stocks held up best")
    : (upDay ? "even as growth stocks lagged" : "dragged down by growth stocks");
  const headline = `Stocks finished ${big ? "sharply " : ""}${dir}, ${style}.`;
  const body: string[] = [];
  body.push(`The S&P 500 moved ${pct(spx.changePct)}${ndx ? `, the Nasdaq 100 ${pct(ndx.changePct)}` : ""}${rut ? `, and the small-cap Russell 2000 ${pct(rut.changePct)}` : ""}.`);
  if (sec.length) body.push(`${sec[0].n} led the sectors (${pct(sec[0].v)}) while ${sec[sec.length - 1].n} lagged (${pct(sec[sec.length - 1].v)}), a spread of ${(sec[0].v - sec[sec.length - 1].v).toFixed(1)} points.`);
  if (vix) body.push(`The VIX sits at ${vix.price.toFixed(1)}, ${vix.price < 15 ? "a calm reading" : vix.price < 22 ? "a middling reading" : "an elevated reading that signals real hedging demand"}.`);
  const cs = curveStats(c);
  if (cs?.y10 != null) body.push(`The 10-year yields ${cs.y10.toFixed(2)}%${cs.s2s10 != null ? `, with 2s10s at ${cs.s2s10 > 0 ? "+" : ""}${cs.s2s10} bp` : ""}.`);
  return { headline, body };
}

/** Three discussion prompts for the opening class huddle. */
export function huddle(q: Record<string, Quote>, c: Curve | null): string[] {
  const out: string[] = [];
  const sec = sectorsRanked(q);
  const spx = q["^GSPC"], vix = q["^VIX"], tlt = q["TLT"], gld = q["GLD"], uup = q["UUP"], uso = q["USO"];
  if (sec.length >= 2) {
    const t = sec[0], b = sec[sec.length - 1];
    out.push(`${t.n} (${pct(t.v)}) and ${b.n} (${pct(b.v)}) were the two ends of the sector board. Name one piece of news or data that could move these two sectors in opposite directions on the same day.`);
  }
  if (spx && tlt) {
    const same = Math.sign(spx.changePct) === Math.sign(tlt.changePct);
    out.push(same
      ? `Stocks (${pct(spx.changePct)}) and long Treasuries via TLT (${pct(tlt.changePct)}) moved the same direction. Bonds usually act as a hedge. What would make both rise or fall together?`
      : `Stocks (${pct(spx.changePct)}) and long Treasuries via TLT (${pct(tlt.changePct)}) moved in opposite directions. Is this a "risk-on/risk-off" day, or is something else driving yields?`);
  }
  const cs = curveStats(c);
  if (cs?.s2s10 != null) {
    out.push(cs.s2s10 >= 0
      ? `The 2s10s spread is +${cs.s2s10} bp, so the curve slopes upward. If the Fed cut short-term rates tomorrow, sketch what happens to the curve and explain who benefits: banks, borrowers, or savers?`
      : `The 2s10s spread is ${cs.s2s10} bp, so the curve is inverted. Why do investors accept a lower yield to lock up money for longer, and what does that imply about their outlook?`);
  }
  if (gld && uup && out.length < 3) out.push(`Gold (${pct(gld.changePct)}) and the dollar (${pct(uup.changePct)}): gold is priced in dollars. Did today's moves follow the usual inverse relationship? If not, what else might be bidding gold?`);
  if (vix && out.length < 3) out.push(`The VIX is ${vix.price.toFixed(1)}. Translate that into an expected daily move for the S&P 500 (hint: divide by √252). Did today's move beat it?`);
  if (uso && out.length < 3) out.push(`Crude via USO moved ${pct(uso.changePct)}. Which holdings in our three portfolios are most exposed to oil, and in which direction?`);
  return out.slice(0, 3);
}

/** End-of-class questions built from the portfolios and the tape. */
export function closing(results: PortfolioResult[], q: Record<string, Quote>, c: Curve | null) {
  const sections: { title: string; items: string[] }[] = [];
  const ranked = [...results].sort((a, b) => b.dayPct - a.dayPct);
  if (ranked.length) {
    const w = ranked[0], l = ranked[ranked.length - 1];
    sections.push({
      title: "The scoreboard",
      items: [
        `${w.p.name} won the day (${pct(w.dayPct)}) and ${l.p.name} trailed (${pct(l.dayPct)}). Was the gap driven by a few stocks or by the portfolio's overall tilt? Use the holdings tables to defend your answer.`,
        `Since inception, which portfolio is ahead of SPY and which is behind? Is the leader winning because of skill, sector luck, or concentration? How would you tell the difference?`,
      ],
    });
  }
  for (const r of results) {
    if (!r.positions.length) continue;
    const byContrib = [...r.positions].sort((a, b) => b.dayPnl - a.dayPnl);
    const top = byContrib[0], bot = byContrib[byContrib.length - 1];
    const heavy = [...r.positions].sort((a, b) => b.weight - a.weight)[0];
    const vs = r.dayPct - r.benchDayPct;
    sections.push({
      title: r.p.name,
      items: [
        `The portfolio ${vs >= 0 ? "beat" : "lagged"} SPY by ${Math.abs(vs).toFixed(2)} points today. ${top.symbol} added the most dollars (${pct(top.dayPct)}) and ${bot.symbol} cost the most (${pct(bot.dayPct)}). Was each move about the company, its sector, or the whole market?`,
        `${heavy.symbol} is now the largest position at ${heavy.weight.toFixed(1)}% of the portfolio. Would you trim it, hold it, or add to it? State the one number that would change your mind.`,
      ],
    });
  }
  // Business-model detective: the single biggest mover across all portfolios
  const all = results.flatMap((r) => r.positions);
  if (all.length) {
    const mover = [...all].sort((a, b) => Math.abs(b.dayPct) - Math.abs(a.dayPct))[0];
    sections.push({
      title: "How does this business make money?",
      items: [
        `${mover.name} (${mover.symbol}) had the biggest move of any holding: ${pct(mover.dayPct)}. Open its latest ${mover.filing} from the Portfolios page. In two sentences, explain where its revenue comes from and which line of the income statement today's news most likely affects.`,
      ],
    });
  }
  const cs = curveStats(c);
  const vix = q["^VIX"];
  sections.push({
    title: "Take it home",
    items: [
      cs?.y10 != null
        ? `The 10-year is at ${cs.y10.toFixed(2)}%. If it rose 50 bp tomorrow, which of our holdings would you expect to fall the most, and why? Think about duration, valuation, and debt.`
        : `If long-term interest rates rose sharply tomorrow, which of our holdings would you expect to fall the most, and why?`,
      `Write tomorrow's headline before it happens: one sentence predicting the market's biggest story${vix ? ` (the VIX at ${vix.price.toFixed(1)} is a clue about how big a move is priced in)` : ""}. We will check it at the next huddle.`,
    ],
  });
  return sections;
}

export const upcomingEarnings = (results: PortfolioResult[], days = 45) => {
  const today = new Date().toISOString().slice(0, 10);
  const lim = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  const map = new Map<string, { symbol: string; name: string; date: string; owners: string[] }>();
  for (const r of results)
    for (const p of r.positions)
      if (p.earnings && p.earnings >= today && p.earnings <= lim) {
        const e = map.get(p.symbol) ?? { symbol: p.symbol, name: p.name, date: p.earnings, owners: [] };
        e.owners.push(r.p.name.replace(" Portfolio", "").replace("'s", ""));
        map.set(p.symbol, e);
      }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export { name as labelFor };

const bp = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)} bp`;
const up = (v: number, a: string, b: string) => (v >= 0 ? a : b);

/** Plain-English read of the macro picture over the past month. */
export function macroRead(t: Trends): string[] {
  const out: string[] = [];
  const get = (s: string) => t.macro.find((m) => m.s === s);
  const tnx = get("^TNX"), dxy = get("DX-Y.NYB"), oil = get("CL=F"), cu = get("HG=F"), vix = get("^VIX");
  if (tnx?.m1 != null && tnx.level != null)
    out.push(`The 10-year yield is ${tnx.level.toFixed(2)}%, ${up(tnx.m1, "up", "down")} ${Math.abs(Math.round(tnx.m1))} bp over the past month. ${tnx.m1 > 15 ? "Rising rates are a headwind for long-duration growth stocks." : tnx.m1 < -15 ? "Falling rates are a tailwind for growth stocks and rate-sensitive sectors." : "Rates have been roughly stable, so they are not the main story."}`);
  const bits: string[] = [];
  if (dxy?.m1 != null) bits.push(`the dollar is ${pct(dxy.m1)}`);
  if (oil?.m1 != null) bits.push(`crude oil is ${pct(oil.m1)}`);
  if (cu?.m1 != null) bits.push(`copper is ${pct(cu.m1)}`);
  if (bits.length) out.push(`Over the same month, ${bits.join(", ")}.${cu?.m1 != null && oil?.m1 != null ? (cu.m1 > 0 && oil.m1 > 0 ? " Commodities rising together points to firm global demand." : cu.m1 < 0 && oil.m1 < 0 ? " Commodities falling together hints at cooling global growth." : "") : ""}`);
  const gv = t.styles.find((x) => x.a === "IWF"), br = t.styles.find((x) => x.a === "RSP");
  if (gv?.m1 != null) out.push(`${gv.m1 >= 0 ? "Growth is beating value" : "Value is beating growth"} by ${Math.abs(gv.m1).toFixed(1)} points this month${br?.m1 != null ? `, and the typical stock is ${br.m1 >= 0 ? "keeping pace with" : "lagging"} the mega-caps (${br.m1 >= 0 ? "+" : ""}${br.m1.toFixed(1)} pts), ${br.m1 >= 0 ? "a sign of healthy, broad participation" : "so a few giants are doing the heavy lifting"}` : ""}.`);
  if (t.sectors1m.length >= 2) {
    const a = t.sectors1m, top = a.slice(0, 2), bot = a.slice(-2);
    out.push(`Over the past month the strongest sectors were ${top.map((x) => `${x.n} (${pct(x.m1)})`).join(" and ")}; the weakest were ${bot.map((x) => `${x.n} (${pct(x.m1)})`).join(" and ")}. That gap is the rotation to explain.`);
  }
  if (vix?.level != null && vix.m1 != null) out.push(`The VIX is ${vix.level.toFixed(1)}, ${up(vix.m1, "up", "down")} ${Math.abs(vix.m1).toFixed(1)} points on the month.`);
  return out;
}

/** Plain-English read of what is happening inside our holdings. */
export function microRead(m: Micro): { verdict: string; lines: string[] } {
  const verdict = m.sameDirPct >= 75 ? "A macro day" : m.sameDirPct <= 60 ? "A micro day" : "A mixed day";
  const lines: string[] = [];
  lines.push(`${Math.round(m.sameDirPct)}% of our ${m.count} holdings moved the same direction as the S&P 500 today. ${m.sameDirPct >= 75 ? "When nearly everything moves together, big-picture forces (rates, the Fed, the economy) are in charge." : m.sameDirPct <= 60 ? "When stocks split from the market, company-specific news (earnings, guidance, product launches) is in charge." : "Big-picture forces and company news are sharing the wheel."}`);
  lines.push(`${m.advancers} of ${m.count} advanced today, and ${m.above50} trade above their 50-day average${m.above50 / Math.max(1, m.count) > 0.6 ? ", so the medium-term trend across our names is up" : m.above50 / Math.max(1, m.count) < 0.4 ? ", so most of our names are in medium-term downtrends" : ""}.`);
  return { verdict, lines };
}

export function macroMicroQuestion(m: Micro, t: Trends): string {
  const v = microRead(m).verdict.toLowerCase();
  const lead = m.leaders[0];
  return `Today looked like ${v} (${Math.round(m.sameDirPct)}% of our holdings moved with the S&P 500).${lead ? ` Pick ${lead.s}, our best performer this week (${pct(lead.w1 ?? 0)}): was its move driven by a macro trend from the top of the page or by company news? Cite one number for each side.` : ""}`;
}
