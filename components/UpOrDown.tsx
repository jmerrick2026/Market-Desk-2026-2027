"use client";

import { useState } from "react";

type Item = { s: string; name: string; pct: number; owner: string };

/** Guess whether each holding rose or fell in the latest session. */
export default function UpOrDown({ items, session }: { items: Item[]; session: string }) {
  const [picks, setPicks] = useState<Record<string, "up" | "down">>({});
  const done = Object.keys(picks).length === items.length;
  const score = items.filter((i) => picks[i.s] && (picks[i.s] === "up") === (i.pct >= 0)).length;
  return (
    <div className="uod">
      <div className="uod-grid">
        {items.map((i) => {
          const p = picks[i.s];
          const right = p && (p === "up") === (i.pct >= 0);
          return (
            <div key={i.s} className={`uod-card ${p ? (right ? "right" : "miss") : ""}`}>
              <p className="uod-sym">{i.s}</p>
              <p className="uod-name">{i.name}</p>
              <p className="uod-owner">{i.owner}</p>
              {p ? (
                <p className="uod-result">
                  <span className={i.pct >= 0 ? "up" : "down"}>{i.pct >= 0 ? "▲" : "▼"} {i.pct > 0 ? "+" : ""}{i.pct.toFixed(2)}%</span>
                  <span className="uod-verdict">{right ? "Correct" : "Missed"}</span>
                </p>
              ) : (
                <div className="uod-btns">
                  <button onClick={() => setPicks((x) => ({ ...x, [i.s]: "up" }))} aria-label={`${i.s} went up`}>▲ Up</button>
                  <button onClick={() => setPicks((x) => ({ ...x, [i.s]: "down" }))} aria-label={`${i.s} went down`}>▼ Down</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="uod-score">
        {done ? <><b>{score} of {items.length}</b> {score === items.length ? "Perfect read of the tape." : score >= items.length - 2 ? "Sharp. You were watching." : "The market humbles everyone."}</> : <>Make a call on all {items.length} for the {session} session.</>}
        {done && <button className="uod-again" onClick={() => setPicks({})}>Play again</button>}
      </p>
    </div>
  );
}
