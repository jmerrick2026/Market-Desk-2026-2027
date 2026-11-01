"use client";

import { useSyncExternalStore, useState } from "react";
import type { Quant, QuantPortfolio } from "../lib/quant";

// One portfolio choice shared by every Quant Lab panel on the page
let pick = 0;
const subs = new Set<() => void>();
const setPick = (i: number) => { pick = i; subs.forEach((f) => f()); };
const usePick = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => pick, () => 0);

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;
const usd0 = (x: number) => `$${Math.round(x).toLocaleString("en-US")}`;
const sgn = (x: number, d = 2) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;
const short = (n: string) => n.replace(" Portfolio", "").replace("'s", "’s");

function Picker({ q }: { q: Quant }) {
  const i = usePick();
  return (
    <div className="ql-pick" role="tablist" aria-label="Choose a portfolio">
      {q.portfolios.map((p, k) => (
        <button key={p.id} role="tab" aria-selected={i === k} className={i === k ? "on" : ""} onClick={() => setPick(k)}>{short(p.name)}</button>
      ))}
    </div>
  );
}

/* ───────── Show the Math ───────── */
function MathCards({ p, q }: { p: QuantPortfolio; q: Quant }) {
  const [tab, setTab] = useState<"beta" | "alpha" | "vol" | "sharpe" | "corr">("beta");
  const n = q.days;
  const body = {
    beta: {
      name: "Beta (β)", f: <>β = Cov(R<sub>p</sub>, R<sub>m</sub>) ÷ Var(R<sub>m</sub>)</>,
      steps: [
        <>Covariance of our daily returns with the S&amp;P 500: <b>{(p.cov * 1e4).toFixed(3)}</b> (×10⁻⁴)</>,
        <>Variance of the S&amp;P 500’s daily returns: <b>{(p.varM * 1e4).toFixed(3)}</b> (×10⁻⁴)</>,
        <>{(p.cov * 1e4).toFixed(3)} ÷ {(p.varM * 1e4).toFixed(3)} = <b className="ql-ans">{p.beta.toFixed(2)}</b></>,
      ],
      read: `When the S&P 500 moves 1%, this portfolio has tended to move about ${p.beta.toFixed(2)}%. ${p.beta > 1.1 ? "That is an aggressive book." : p.beta < 0.9 ? "That is a defensive book." : "That is close to the market itself."}`,
    },
    alpha: {
      name: "Alpha (α)", f: <>α = R<sub>p</sub> − [R<sub>f</sub> + β × (R<sub>m</sub> − R<sub>f</sub>)]</>,
      steps: [
        <>Our annualized return R<sub>p</sub>: <b>{pct(p.retA, 1)}</b>. The S&amp;P 500’s R<sub>m</sub>: <b>{pct(q.spy.retA, 1)}</b>. T-bills R<sub>f</sub>: <b>{q.rfPct.toFixed(2)}%</b></>,
        <>What our beta “earned” (CAPM): {q.rfPct.toFixed(2)}% + {p.beta.toFixed(2)} × ({pct(q.spy.retA, 1)} − {q.rfPct.toFixed(2)}%) = <b>{pct(p.capm, 1)}</b></>,
        <>{pct(p.retA, 1)} − {pct(p.capm, 1)} = <b className="ql-ans">{sgn(p.jensen, 1)}</b> a year</>,
      ],
      read: `Alpha is the return left over after paying for the market risk we took. ${p.jensen >= 0 ? `Positive: our picks added about ${pct(p.jensen, 1)} a year beyond what beta alone explains.` : `Negative: we earned about ${pct(-p.jensen, 1)} a year less than our beta predicted.`} Six months is a short sample, so treat it as a clue, not proof of skill.`,
    },
    vol: {
      name: "Volatility (σ)", f: <>σ<sub>annual</sub> = σ<sub>daily</sub> × √252</>,
      steps: [
        <>Standard deviation of {n} daily returns: <b>{pct(p.sdD, 3)}</b></>,
        <>√252 trading days = <b>15.87</b></>,
        <>{pct(p.sdD, 3)} × 15.87 = <b className="ql-ans">{pct(p.volA, 1)}</b> a year</>,
      ],
      read: `A typical year’s swing is about ±${pct(p.volA, 0)} around the average. The S&P 500’s is ${pct(q.spy.volA, 1)}.`,
    },
    sharpe: {
      name: "Sharpe ratio", f: <>Sharpe = (R<sub>p</sub> − R<sub>f</sub>) ÷ σ<sub>p</sub></>,
      steps: [
        <>Annualized return: average daily {pct(p.meanD, 3)} × 252 = <b>{pct(p.retA, 1)}</b></>,
        <>Risk-free rate (3-month T-bill): <b>{q.rfPct.toFixed(2)}%</b></>,
        <>({pct(p.retA, 1)} − {q.rfPct.toFixed(2)}%) ÷ {pct(p.volA, 1)} = <b className="ql-ans">{p.sharpe.toFixed(2)}</b></>,
      ],
      read: `Return earned per unit of risk taken. ${p.sharpe >= 1 ? "Above 1 is excellent over any stretch." : p.sharpe > 0 ? "Positive means it beat T-bills after adjusting for risk." : "Negative means T-bills did better, risk for nothing."}`,
    },
    corr: {
      name: "Correlation (ρ)", f: <>ρ = Cov(R<sub>p</sub>, R<sub>m</sub>) ÷ (σ<sub>p</sub> × σ<sub>m</sub>)</>,
      steps: [
        <>Covariance: <b>{(p.cov * 1e4).toFixed(3)}</b> (×10⁻⁴)</>,
        <>σ<sub>p</sub> × σ<sub>m</sub> = {pct(p.sdD, 3)} × {pct(q.spy.sdD, 3)} = <b>{(p.sdD * q.spy.sdD * 1e4).toFixed(3)}</b> (×10⁻⁴)</>,
        <>ρ = <b className="ql-ans">{p.corr.toFixed(2)}</b>, and ρ² = R² = <b>{p.r2.toFixed(2)}</b></>,
      ],
      read: `${pct(p.r2, 0)} of this portfolio’s daily movement lines up with the market. The other ${pct(1 - p.r2, 0)} is stock picking, for better or worse.`,
    },
  }[tab];
  return (
    <div className="ql-panel">
      <p className="ql-kick">Show the Math</p>
      <div className="ql-tabs">
        {(["beta", "alpha", "vol", "sharpe", "corr"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{{ beta: "Beta", alpha: "Alpha", vol: "Volatility", sharpe: "Sharpe", corr: "Correlation" }[t]}</button>
        ))}
      </div>
      <h4>{body.name}</h4>
      <p className="ql-formula">{body.f}</p>
      <ol className="ql-steps">{body.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="ql-read">{body.read}</p>
    </div>
  );
}

/* ───────── Regression scatter ───────── */
function Scatter({ p }: { p: QuantPortfolio }) {
  const W = 420, H = 300, m = 34;
  const lim = Math.max(1.5, ...p.points.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)])) * 1.08;
  const sx = (x: number) => m + ((x + lim) / (2 * lim)) * (W - 2 * m);
  const sy = (y: number) => H - m - ((y + lim) / (2 * lim)) * (H - 2 * m);
  const a = p.alphaD * 100;
  const ticks = [-Math.floor(lim), 0, Math.floor(lim)];
  return (
    <div className="ql-panel">
      <p className="ql-kick">The Regression</p>
      <h4>Every day, us vs. the market</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="ql-svg" role="img" aria-label={`Scatter of daily returns, beta ${p.beta.toFixed(2)}`}>
        <line x1={sx(-lim)} x2={sx(lim)} y1={sy(0)} y2={sy(0)} className="ql-axis" />
        <line x1={sx(0)} x2={sx(0)} y1={sy(-lim)} y2={sy(lim)} className="ql-axis" />
        <line x1={sx(-lim)} y1={sy(-lim)} x2={sx(lim)} y2={sy(lim)} className="ql-ref" />
        {ticks.map((t) => <text key={"x" + t} x={sx(t)} y={H - m + 16} className="ql-tick" textAnchor="middle">{t}%</text>)}
        {ticks.filter((t) => t).map((t) => <text key={"y" + t} x={m - 6} y={sy(t) + 4} className="ql-tick" textAnchor="end">{t}%</text>)}
        {p.points.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={3} className={y >= x ? "ql-dot up" : "ql-dot dn"} />)}
        <line x1={sx(-lim)} y1={sy(a - p.beta * lim)} x2={sx(lim)} y2={sy(a + p.beta * lim)} className="ql-fit" />
        <text x={W - m} y={m - 10} textAnchor="end" className="ql-lbl">Portfolio ↑</text>
        <text x={W - m} y={sy(0) - 6} textAnchor="end" className="ql-lbl">S&amp;P 500 →</text>
      </svg>
      <div className="ql-stats">
        <span>Slope β <b>{p.beta.toFixed(2)}</b></span>
        <span>Alpha <b className={p.jensen >= 0 ? "up" : "down"}>{sgn(p.jensen, 1)}/yr</b></span>
        <span>R² <b>{p.r2.toFixed(2)}</b></span>
      </div>
      <p className="ql-read">Red line: best fit. Dashed line: a portfolio that simply copies the market. Green dots are days we beat the S&amp;P 500, gray dots days we trailed it. Alpha is the return left over after the market’s share (and the T-bill rate) is removed; see the Alpha card for the math.</p>
    </div>
  );
}

/* ───────── Monte Carlo fan ───────── */
function Fan({ p }: { p: QuantPortfolio }) {
  const W = 420, H = 260, m = 40;
  const b = p.mc.bands, D = p.mc.days;
  const lo = Math.min(...b.p5), hi = Math.max(...b.p95);
  const sx = (d: number) => m + (d / D) * (W - m - 12);
  const sy = (v: number) => H - 28 - ((v - lo) / (hi - lo || 1)) * (H - 48);
  const area = (top: number[], bot: number[]) => top.map((v, d) => `${d ? "L" : "M"}${sx(d)},${sy(v)}`).join("") + bot.map((v, d) => `L${sx(D - d)},${sy(bot[D - d])}`).join("") + "Z";
  const line = (s: number[]) => s.map((v, d) => `${d ? "L" : "M"}${sx(d)},${sy(v)}`).join("");
  return (
    <div className="ql-panel">
      <p className="ql-kick">Monte Carlo · 1,000 futures</p>
      <h4>The next three months, simulated</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="ql-svg" role="img" aria-label="Fan chart of simulated portfolio values">
        <path d={area(b.p95, b.p5)} className="ql-fan1" />
        <path d={area(b.p75, b.p25)} className="ql-fan2" />
        <path d={line(b.p50)} className="ql-mid" />
        <line x1={sx(0)} x2={sx(D)} y1={sy(p.value)} y2={sy(p.value)} className="ql-ref" />
        {[lo, p.value, hi].map((v, i) => <text key={i} x={m - 6} y={sy(v) + 4} textAnchor="end" className="ql-tick">{`$${(v / 1000).toFixed(1)}k`}</text>)}
        {[0, 21, 42, 63].map((d) => <text key={d} x={sx(d)} y={H - 10} textAnchor="middle" className="ql-tick">{d ? `Mo ${d / 21}` : "Today"}</text>)}
      </svg>
      <div className="ql-stats">
        <span>Chance of a gain <b>{pct(p.mc.probUp, 0)}</b></span>
        <span>Chance of beating S&amp;P <b>{pct(p.mc.probBeat, 0)}</b></span>
      </div>
      <p className="ql-read">Median outcome {usd0(p.mc.medianEnd)}. In the worst 5% of paths it ends below {usd0(p.mc.p5End)}; in the best 5% above {usd0(p.mc.p95End)}. Each path draws random daily shocks with this portfolio’s own average, volatility, and correlation to the market. A range of possibilities, not a forecast.</p>
    </div>
  );
}

/* ───────── Value at Risk ───────── */
function VaR({ p, q }: { p: QuantPortfolio; q: Quant }) {
  return (
    <div className="ql-panel">
      <p className="ql-kick">Value at Risk · 95%, one day</p>
      <h4>On a bad day, 1 in 20, we could lose about {usd0(p.varHist)}</h4>
      <table className="ql-table">
        <thead><tr><th>Method</th><th className="r">Loss</th><th className="r">% of book</th></tr></thead>
        <tbody>
          <tr><td>Historical <span className="muted">5th-worst percentile of {q.days} real days</span></td><td className="r num">{usd0(p.varHist)}</td><td className="r num">{pct(p.varHistPct)}</td></tr>
          <tr><td>Parametric <span className="muted">1.645σ − μ, assumes a bell curve</span></td><td className="r num">{usd0(p.varParam)}</td><td className="r num">{pct(p.varParamPct)}</td></tr>
          <tr><td>Expected shortfall <span className="muted">average loss beyond VaR</span></td><td className="r num">{usd0(p.cvar)}</td><td className="r num">{pct(p.cvar / p.value)}</td></tr>
          <tr><td>Worst single day in sample</td><td className="r num">{usd0(-p.worstDay * p.value)}</td><td className="r num">{pct(-p.worstDay)}</td></tr>
        </tbody>
      </table>
      <p className="ql-read">{p.varHist > p.varParam * 1.05 ? "History is harsher than the bell curve: real markets have fatter tails than the textbook formula assumes." : p.varHist < p.varParam * 0.95 ? "The bell curve is the stricter estimate here; recent history has been calmer than its volatility implies." : "Both methods agree closely, a sign the returns have looked roughly normal lately."}</p>
    </div>
  );
}

/* ───────── Efficient frontier ───────── */
function Frontier({ q }: { q: Quant }) {
  const i = usePick();
  const f = q.frontier;
  const W = 640, H = 330, m = 44;
  const xs = [...f.cloud.map((c) => c[0]), ...f.marks.map((k) => k.vol)], ys = [...f.cloud.map((c) => c[1]), ...f.marks.map((k) => k.ret)];
  const x0 = Math.max(0, Math.min(...xs) * 0.9), x1 = Math.max(...xs) * 1.04, y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.08;
  const sx = (x: number) => m + ((x - x0) / (x1 - x0 || 1)) * (W - m - 16);
  const sy = (y: number) => H - 30 - ((y - (y0 - pad)) / (y1 - y0 + 2 * pad || 1)) * (H - 50);
  const chosen = q.portfolios[i]?.name.replace(" Portfolio", "");
  return (
    <div className="ql-panel wide">
      <p className="ql-kick">The Efficient Frontier · {f.cloud.length.toLocaleString()} random mixes of our {f.nAssets} stocks</p>
      <h4>Is there a better recipe using the same ingredients?</h4>
      <div className="ql-front">
        <svg viewBox={`0 0 ${W} ${H}`} className="ql-svg" role="img" aria-label="Efficient frontier scatter">
          {f.cloud.map(([x, y], k) => <circle key={k} cx={sx(x)} cy={sy(y)} r={1.8} className="ql-cloud" />)}
          {f.marks.map((k) => (
            <g key={k.label} className={`ql-mk ${k.kind} ${k.label === chosen ? "sel" : ""}`}>
              {k.kind === "best" ? <path d={`M${sx(k.vol)},${sy(k.ret) - 9}l2.6,6 6.4,.6-4.9,4.2 1.5,6.3-5.6-3.4-5.6,3.4 1.5-6.3-4.9-4.2 6.4-.6z`} /> : <circle cx={sx(k.vol)} cy={sy(k.ret)} r={k.label === chosen ? 8 : 6} />}
              <text x={sx(k.vol) + 11} y={sy(k.ret) + 4}>{k.label}</text>
            </g>
          ))}
          <text x={W / 2} y={H - 6} textAnchor="middle" className="ql-tick">Risk: annualized volatility →</text>
          <text x={14} y={H / 2} textAnchor="middle" className="ql-tick" transform={`rotate(-90 14 ${H / 2})`}>Annualized return →</text>
          {[x0, (x0 + x1) / 2, x1].map((v, k) => <text key={k} x={sx(v)} y={H - 18} textAnchor="middle" className="ql-tick">{v.toFixed(0)}%</text>)}
        </svg>
        <div className="ql-side">
          <p><b>Up and to the left is better:</b> more return for less risk. The upper edge of the cloud is the efficient frontier.</p>
          <p>The ★ best Sharpe mix earned {pct(f.best.ret, 1)} a year at {pct(f.best.vol, 1)} volatility, a Sharpe of {f.best.sharpe.toFixed(2)}. Its biggest weights:</p>
          <ul>{f.best.top.map(([s, w]) => <li key={s}><button className="tick" data-stock={s}>{s}</button> <span className="num">{pct(w, 0)}</span></li>)}</ul>
          <p className="muted small">Hindsight warning: this mix is optimized on the past six months. Past winners rarely stay the best recipe, which is exactly why real managers diversify.</p>
        </div>
      </div>
    </div>
  );
}

export default function QuantLab({ q, part }: { q: Quant; part: "math" | "risk" | "frontier" }) {
  const i = usePick();
  const p = q.portfolios[i] ?? q.portfolios[0];
  if (!p) return null;
  return (
    <>
      <div className="ql-bar"><Picker q={q} /><span className="muted small">{q.days} trading days, {q.start} to {q.end}, today’s weights</span></div>
      {part === "math" && <div className="ql-grid"><MathCards p={p} q={q} /><Scatter p={p} /></div>}
      {part === "risk" && <div className="ql-grid"><Fan p={p} /><VaR p={p} q={q} /></div>}
      {part === "frontier" && <Frontier q={q} />}
    </>
  );
}
