"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Word = { num: number; dir: "across" | "down"; row: number; col: number; len: number; clue: string };

/**
 * Interactive crossword. `code` is the solution grid, lightly encoded so the answers
 * aren't sitting in plain sight in the page source ("." marks a black square).
 */
export default function Crossword({ rows, cols, code, nums, words, puzzleId }: {
  rows: number; cols: number; code: string; nums: (number | null)[][]; words: Word[]; puzzleId: string;
}) {
  const solution = useMemo(() => {
    const s = atob(code).split("").map((ch) => String.fromCharCode(ch.charCodeAt(0) ^ 7));
    return Array.from({ length: rows }, (_, r) => s.slice(r * cols, r * cols + cols).map((x) => (x === "." ? null : x)));
  }, [code, rows, cols]);

  const key = `xword-${puzzleId}`;
  const [fill, setFill] = useState<string[][]>(() => Array.from({ length: rows }, () => Array(cols).fill("")));
  const [sel, setSel] = useState<{ r: number; c: number }>(() => ({ r: words[0]?.row ?? 0, c: words[0]?.col ?? 0 }));
  const [dir, setDir] = useState<"across" | "down">(words[0]?.dir ?? "across");
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [secs, setSecs] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // restore progress for today's puzzle (browser storage can be unavailable; ignore if so)
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (saved) setFill(JSON.parse(saved)); } catch {}
  }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(fill)); } catch {} }, [fill, key]);

  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols && solution[r][c] != null;
  const solved = useMemo(() => solution.every((row, r) => row.every((s, c) => s == null || fill[r][c] === s)), [fill, solution]);

  useEffect(() => {
    if (solved || revealed) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [solved, revealed]);

  const wordAt = (r: number, c: number, d: "across" | "down") =>
    words.find((w) => w.dir === d && (d === "across" ? w.row === r && c >= w.col && c < w.col + w.len : w.col === c && r >= w.row && r < w.row + w.len));
  const active = wordAt(sel.r, sel.c, dir) ?? wordAt(sel.r, sel.c, dir === "across" ? "down" : "across");
  const inActive = (r: number, c: number) => !!active && (active.dir === "across" ? r === active.row && c >= active.col && c < active.col + active.len : c === active.col && r >= active.row && r < active.row + active.len);

  const select = (r: number, c: number) => {
    if (!open(r, c)) return;
    if (r === sel.r && c === sel.c) setDir((d) => (wordAt(r, c, d === "across" ? "down" : "across") ? (d === "across" ? "down" : "across") : d));
    else { setSel({ r, c }); if (!wordAt(r, c, dir)) setDir(dir === "across" ? "down" : "across"); }
    gridRef.current?.focus();
  };
  const step = (dr: number, dc: number) => {
    let r = sel.r + dr, c = sel.c + dc;
    while (r >= 0 && c >= 0 && r < rows && c < cols) { if (open(r, c)) { setSel({ r, c }); return; } r += dr; c += dc; }
  };
  const setCell = (r: number, c: number, v: string) => setFill((f) => f.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  const jumpWord = (back = false) => {
    const order = [...words.filter((w) => w.dir === "across"), ...words.filter((w) => w.dir === "down")];
    const i = active ? order.indexOf(active) : -1;
    const w = order[(i + (back ? -1 : 1) + order.length) % order.length];
    setDir(w.dir); setSel({ r: w.row, c: w.col });
  };

  const onKey = (e: React.KeyboardEvent) => {
    const d = dir === "across" ? [0, 1] : [1, 0];
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault(); setChecked(false);
      setCell(sel.r, sel.c, e.key.toUpperCase());
      const nr = sel.r + d[0], nc = sel.c + d[1];
      if (open(nr, nc) && inActive(nr, nc)) setSel({ r: nr, c: nc });
    } else if (e.key === "Backspace") {
      e.preventDefault(); setChecked(false);
      if (fill[sel.r][sel.c]) setCell(sel.r, sel.c, "");
      else { const pr = sel.r - d[0], pc = sel.c - d[1]; if (open(pr, pc)) { setSel({ r: pr, c: pc }); setCell(pr, pc, ""); } }
    } else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setDir("across"); step(0, 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setDir("across"); step(0, -1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setDir("down"); step(1, 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setDir("down"); step(-1, 0); }
    else if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); jumpWord(e.shiftKey); }
    else if (e.key === " ") { e.preventDefault(); e.stopPropagation(); select(sel.r, sel.c); }
  };

  const revealWord = () => {
    if (!active) return;
    setFill((f) => f.map((row, r) => row.map((x, c) => (inActive(r, c) ? solution[r][c]! : x))));
  };
  const revealAll = () => { setFill(solution.map((row) => row.map((s) => s ?? ""))); setRevealed(true); };
  const clear = () => { setFill(Array.from({ length: rows }, () => Array(cols).fill(""))); setChecked(false); setRevealed(false); setSecs(0); };

  const mm = String(Math.floor(secs / 60)).padStart(1, "0"), ss = String(secs % 60).padStart(2, "0");
  const Clues = ({ d }: { d: "across" | "down" }) => (
    <div className="clues">
      <h4>{d === "across" ? "Across" : "Down"}</h4>
      <ol>
        {words.filter((w) => w.dir === d).map((w) => (
          <li key={d + w.num} className={active === w ? "on" : ""} onClick={() => { setDir(d); setSel({ r: w.row, c: w.col }); gridRef.current?.focus(); }}>
            <b>{w.num}</b> {w.clue} <span className="muted">({w.len})</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="xword">
      <div className="xw-left">
        <div className="xw-bar">
          <span className="xw-clue">{active ? <><b>{active.num} {active.dir === "across" ? "Across" : "Down"}:</b> {active.clue}</> : "Click a square to begin"}</span>
          <span className="xw-timer">{revealed ? "Revealed · " : solved ? "Solved! " : ""}{mm}:{ss}</span>
        </div>
        <div
          ref={gridRef} className="xw-grid" tabIndex={0} onKeyDown={onKey}
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}
          aria-label="Crossword grid. Type letters; arrows move; Tab jumps to the next clue; Space switches direction."
        >
          {solution.map((row, r) => row.map((s, c) => {
            if (s == null) return <div key={`${r}-${c}`} className="xw-blank" />;
            const v = fill[r][c];
            const wrong = checked && v && v !== s;
            const cls = ["xw-cell", inActive(r, c) ? "hl" : "", sel.r === r && sel.c === c ? "sel" : "", wrong ? "wrong" : "", solved ? "done" : ""].join(" ");
            return (
              <div key={`${r}-${c}`} className={cls} onClick={() => select(r, c)}>
                {nums[r][c] && <span className="xw-num">{nums[r][c]}</span>}
                <span className="xw-letter">{v}</span>
              </div>
            );
          }))}
        </div>
        <div className="xw-actions">
          <button onClick={() => setChecked(true)}>Check</button>
          <button onClick={revealWord}>Reveal word</button>
          <button onClick={revealAll}>Reveal puzzle</button>
          <button onClick={clear}>Clear</button>
        </div>
        {/* hidden input so phones bring up a keyboard */}
        <input className="xw-mobile" aria-label="Type a letter" autoCapitalize="characters" value=""
          onChange={(e) => { const ch = e.target.value.slice(-1); if (ch) onKey({ key: ch, preventDefault() {}, stopPropagation() {}, shiftKey: false } as unknown as React.KeyboardEvent); }}
          onKeyDown={(e) => { if (e.key === "Backspace") onKey(e); }} placeholder="Tap here to type on a phone" />
      </div>
      <div className="xw-right">
        <Clues d="across" />
        <Clues d="down" />
      </div>
    </div>
  );
}
