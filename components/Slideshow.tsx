"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Turns every element marked data-slide on the page into a full-screen slide.
 * Keys: → / Space / PageDown = next, ← / PageUp = back, Home / End, Esc = exit.
 * Open the page with ?slides=1 to start in slideshow mode, or ?slides=brief for the 15-minute recap.
 * Elements marked data-brief form the short "15-minute recap" deck.
 */
export default function Slideshow({ title, date }: { title: string; date: string }) {
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const mode = useRef<"slide" | "brief">("slide");

  const slides = () => Array.from(document.querySelectorAll<HTMLElement>(mode.current === "brief" ? "[data-brief]" : "[data-slide]"));

  const show = useCallback((idx: number) => {
    const all = slides();
    const k = Math.max(0, Math.min(all.length - 1, idx));
    all.forEach((el, j) => el.classList.toggle("slide-active", j === k));
    all[k]?.scrollTo(0, 0);
    setI(k);
    setN(all.length);
  }, []);

  const start = useCallback((idx = 0, m: "slide" | "brief" = "slide") => {
    mode.current = m;
    document.querySelectorAll(".slide-active").forEach((el) => el.classList.remove("slide-active"));
    document.body.classList.add("presenting");
    setOn(true);
    show(idx);
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
  }, [show]);

  const stop = useCallback(() => {
    document.body.classList.remove("presenting");
    document.querySelectorAll(".slide-active").forEach((el) => el.classList.remove("slide-active"));
    setOn(false);
    try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {}
  }, []);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("slides");
    if (v === "1") start(0);
    else if (v === "brief") start(0, "brief");
  }, [start]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); show(i + 1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); show(i - 1); }
      else if (e.key === "Home") show(0);
      else if (e.key === "End") show(n - 1);
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, i, n, show, stop]);

  if (!on) {
    return (
      <>
        <button className="present-btn" onClick={() => start(0, "brief")} title="A 4-slide recap for a 15-minute class">
          ⏱ 15-Min Recap
        </button>
        <button className="present-btn" onClick={() => start(0)} title="Present the full page as a slideshow (arrow keys to move, Esc to exit)">
          ▶ Present
        </button>
      </>
    );
  }
  return createPortal(
    <div className="slide-chrome" role="toolbar" aria-label="Slideshow controls">
      <span className="slide-brand">The {title} <em>· {mode.current === "brief" ? "15-minute recap · " : ""}{date}</em></span>
      <span className="slide-ctrl">
        <button onClick={() => show(i - 1)} disabled={i === 0} aria-label="Previous slide">←</button>
        <span className="slide-count">{i + 1} / {n}</span>
        <button onClick={() => show(i + 1)} disabled={i >= n - 1} aria-label="Next slide">→</button>
        <button onClick={stop} aria-label="Exit slideshow">Exit</button>
      </span>
    </div>,
    document.body
  );
}
