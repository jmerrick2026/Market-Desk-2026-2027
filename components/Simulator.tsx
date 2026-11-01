"use client";

import { useEffect, useMemo, useState } from "react";
import type { SimData } from "../lib/calc";

const START_CASH = 10000;
const LOT = 1000;
const ROUNDS = 20;
const LOOKBACK = 20;

type Pos = Record<string, number>; // shares; negative = short

/** 20-Day Trading Challenge: replay a random window of real prices, trade, and try to beat the S&P 500. */
export default function Simulator({ data }: { data: SimData }) {
  const n = data.dates.length;
  const playable = n >= LOOKBACK + ROUNDS + 1 && data.stocks.length > 0;
  const [start, setStart] = useState(LOOKBACK);
  const [t, setT] = useState(0); // round index 0..ROUNDS
  const [cash, setCash] = useState(START_CASH);
  const [pos, setPos] = useState<Pos>({});
  const [values, setValues] = useState<number[]>([START_CASH]);
  const [log, setLog] = useState<string[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => { try { const b = localStorage.getItem("sim-best"); if (b) setBest(parseFloat(b)); } catch {} }, []);

  const day = start + t;
  const price = (s: string, d = day) => data.stocks.find((x) => x.s === s)!.closes[d];
  const value = (p: Pos, c: number, d = day) => c + Object.entries(p).reduce((a, [s, sh]) => a + sh * price(s, d), 0);
  const nowValue = value(pos, cash);
  const spyRet = (data.spy[day] / data.spy[start] - 1) * 100;
  const myRet = (nowValue / START_CASH - 1) * 100;
  const done = t >= ROUNDS;

  const newGame = () => {
    const maxStart = n - ROUNDS - 1;
    const s = LOOKBACK + Math.floor(Math.random() * Math.max(1, maxStart - LOOKBACK + 1));
    setStart(s); setT(0); setCash(START_CASH); setPos({}); setValues([START_CASH]); setLog([]); setStarted(true);
  };

  const trade = (s: string, dir: 1 | -1) => {
    if (done) return;
    const px = price(s);
    if (!px) return;
    const sh = LOT / px;
    const cur = pos[s] ?? 0;
    // Buying needs cash unless it covers a short; shorting is capped at $5,000 per stock
    if (dir === 1 && cur >= 0 && cash < LOT - 0.01) { setLog((l) => [`Not enough cash to buy ${s}.`, ...l].slice(0, 6)); return; }
    if (dir === -1 && cur * px <= -5000 + 0.01) { setLog((l) => [`Short limit reached on ${s} ($5,000).`, ...l].slice(0, 6)); return; }
    setPos((p) => ({ ...p, [s]: +(cur + dir * sh).toFixed(6) }));
    setCash((c) => c - dir * LOT);
    setLog((l) => [`Day ${t + 1}: ${dir > 0 ? (cur < 0 ? "Covered" : "Bought") : cur > 0 ? "Sold" : "Shorted"} $1,000 of ${s} at ${px.toFixed(2)}`, ...l].slice(0, 6));
  };

  const next = () => {
    if (done) return;
    const nt = t + 1;
    setT(nt);
    const v = value(pos, cash, start + nt);
    setValues((vs) => [...vs, v]);
    if (nt >= ROUNDS) {
      const ret = (v / START_CASH - 1) * 100;
      const spy = (data.spy[start + nt] / data.spy[start] - 1) * 100;
      const edge = ret - spy;
      if (best == null || edge > best) { setBest(edge); try { localStorage.setItem("sim-best", String(edge)); } catch {} }
    }
  };

  const grade = useMemo(() => {
    const edge = myRet - spyRet;
    if (edge > 3) return ["A", "You crushed the market. Was it skill or a lucky streak? Check which trade made the difference."];
    if (edge > 0.5) return ["B", "You beat the S&P 500. Small edges compound into big ones over time."];
    if (edge > -0.5) return ["C", "You matched the market, which is what most professionals manage after fees."];
    if (edge > -3) return ["D", "You trailed the market. Did you trade too often, or fight the trend?"];
    return ["F", "The market won this round. Most active traders underperform an index fund, so you're in good company."];
  }, [myRet, spyRet]);

  if (!playable) return <p className="muted">Not enough price history to run the simulator right now.</p>;

  if (!started) {
    return (
      <div className="sim-intro">
        <ul>
          <li>You get <b>$10,000</b> and eight of our holdings. Prices are real, replayed from a random stretch of the last six months.</li>
          <li>Each round, buy or sell in <b>$1,000</b> lots. Selling below zero opens a short (up to $5,000 per stock).</li>
          <li>Press <b>Next day</b> to advance. After <b>20 trading days</b>, see whether you beat simply holding the S&amp;P 500.</li>
        </ul>
        <button className="sim-go" onClick={newGame}>Start the challenge ▶</button>
        {best != null && <p className="muted small">Your best: {best >= 0 ? "+" : ""}{best.toFixed(2)} points versus the S&amp;P 500</p>}
      </div>
    );
  }

  const W = 120, H = 34;
  const spark = (closes: number[]) => {
    const seg = closes.slice(day - LOOKBACK, day + 1);
    const lo = Math.min(...seg), hi = Math.max(...seg) || 1;
    return seg.map((v, i) => `${i ? "L" : "M"}${((i / (seg.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1)}`).join("");
  };
  // Performance chart: you vs SPY, both indexed to 100
  const CW = 520, CH = 150;
  const mine = values.map((v) => (v / START_CASH) * 100);
  const spyIdx = values.map((_, i) => (data.spy[start + i] / data.spy[start]) * 100);
  const all = [...mine, ...spyIdx];
  const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  const px = (i: number) => (i / ROUNDS) * (CW - 20) + 10;
  const py = (v: number) => CH - 10 - ((v - lo) / (hi - lo)) * (CH - 20);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join("");

  return (
    <div className="sim">
      <div className="sim-bar">
        <div><span>Day</span><b>{Math.min(t + 1, ROUNDS)} / {ROUNDS}</b></div>
        <div><span>Portfolio</span><b>${nowValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</b></div>
        <div><span>Cash</span><b>${cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}</b></div>
        <div><span>You</span><b className={myRet >= 0 ? "up" : "down"}>{myRet >= 0 ? "+" : ""}{myRet.toFixed(2)}%</b></div>
        <div><span>S&amp;P 500</span><b className={spyRet >= 0 ? "up" : "down"}>{spyRet >= 0 ? "+" : ""}{spyRet.toFixed(2)}%</b></div>
        <button className="sim-next" onClick={next} disabled={done}>{done ? "Finished" : "Next day ▶"}</button>
      </div>

      {done && (
        <div className="sim-result">
          <span className="sim-grade">{grade[0]}</span>
          <div>
            <p><b>You {myRet >= spyRet ? "beat" : "trailed"} the S&amp;P 500 by {Math.abs(myRet - spyRet).toFixed(2)} points</b> ({myRet >= 0 ? "+" : ""}{myRet.toFixed(2)}% vs {spyRet >= 0 ? "+" : ""}{spyRet.toFixed(2)}%).</p>
            <p>{grade[1]}</p>
            <p className="muted small">This window ran {data.dates[start]} to {data.dates[start + ROUNDS]}.</p>
            <button className="sim-go" onClick={newGame}>Play a new window ▶</button>
          </div>
        </div>
      )}

      <div className="sim-grid">
        <table className="sim-table">
          <thead><tr><th>Stock</th><th>Last 20 days</th><th className="r">Price</th><th className="r">Day</th><th className="r">Position</th><th></th></tr></thead>
          <tbody>
            {data.stocks.map((st) => {
              const p0 = st.closes[day], p1 = st.closes[day - 1];
              const ch = p1 ? (p0 / p1 - 1) * 100 : 0;
              const shares = pos[st.s] ?? 0;
              const posVal = shares * p0;
              return (
                <tr key={st.s}>
                  <td><b>{st.s}</b><span className="muted sim-name">{st.name !== st.s ? st.name : ""}</span></td>
                  <td><svg viewBox={`0 0 ${W} ${H}`} className="sim-spark"><path d={spark(st.closes)} fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></td>
                  <td className="r num">{p0.toFixed(2)}</td>
                  <td className={`r num ${ch >= 0 ? "up" : "down"}`}>{ch >= 0 ? "+" : ""}{ch.toFixed(1)}%</td>
                  <td className={`r num ${posVal > 0 ? "up" : posVal < 0 ? "down" : ""}`}>{Math.abs(posVal) < 1 ? "–" : `${posVal < 0 ? "short " : ""}$${Math.abs(posVal).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}</td>
                  <td className="sim-btns">
                    <button onClick={() => trade(st.s, 1)} disabled={done} aria-label={`Buy $1,000 of ${st.s}`}>Buy</button>
                    <button onClick={() => trade(st.s, -1)} disabled={done} aria-label={`Sell $1,000 of ${st.s}`}>Sell</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="sim-side">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="sim-chart" role="img" aria-label="Your portfolio versus the S&P 500">
            <line x1="10" x2={CW - 10} y1={py(100)} y2={py(100)} stroke="#9aa3ad" strokeDasharray="3 3" />
            <path d={path(spyIdx)} fill="none" stroke="#9aa3ad" strokeWidth="2" strokeDasharray="5 3" />
            <path d={path(mine)} fill="none" stroke="#161412" strokeWidth="2.6" />
          </svg>
          <p className="sim-legend"><span className="k me" /> You <span className="k spy" /> S&amp;P 500 (buy and hold)</p>
          <ul className="sim-log">{log.length ? log.map((l, i) => <li key={i}>{l}</li>) : <li className="muted">Make your first trade, then press Next day.</li>}</ul>
        </div>
      </div>
    </div>
  );
}
