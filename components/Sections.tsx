"use client";

import { useEffect } from "react";

/**
 * Reads the paper one section at a time, like turning pages.
 * Every top-level block in <main> carries data-sec="A".."H"; this shows one section and hides the rest.
 * Any in-page link (#markets, #risk, …) jumps to the right section first, then scrolls to the anchor.
 */
import { SECTIONS } from "../lib/sections";

export function show(sec: string, anchor?: string, smooth = true) {
  document.body.dataset.show = sec;
  const el = anchor ? document.getElementById(anchor) : null;
  const top = document.querySelector(".masthead nav") as HTMLElement | null;
  requestAnimationFrame(() => {
    if (el && anchor !== SECTIONS.find((s) => s[0] === sec)?.[2]) el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    else if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 8), behavior: smooth ? "smooth" : "auto" });
  });
}

function secOf(id: string) {
  const el = document.getElementById(id);
  const blk = el?.closest("main > [data-sec]") as HTMLElement | null;
  return blk?.dataset.sec;
}

export default function Sections() {
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const sec = id && (SECTIONS.find((s) => s[0] === id.toUpperCase())?.[0] ?? secOf(id));
      if (sec) show(sec, id.length > 1 ? id : undefined, false);
      else document.body.dataset.show ??= "A";
    };
    fromHash();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='#'], [data-goto]") as HTMLElement | null;
      if (!a) return;
      const id = a.dataset.goto ?? a.getAttribute("href")!.slice(1);
      const sec = SECTIONS.find((s) => s[0] === id)?.[0] ?? secOf(id);
      if (!sec) return;
      e.preventDefault();
      history.replaceState(null, "", "#" + (SECTIONS.find((s) => s[0] === id) ? SECTIONS.find((s) => s[0] === id)![2] : id));
      show(sec, SECTIONS.find((s) => s[0] === id)?.[2] ?? id);
    };
    window.addEventListener("hashchange", fromHash);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("hashchange", fromHash); document.removeEventListener("click", onClick); };
  }, []);
  return null;
}

/** "Continued on page C" footer at the bottom of each section. */
export function PageTurn({ sec }: { sec: string }) {
  const k = SECTIONS.findIndex((s) => s[0] === sec);
  const prev = SECTIONS[k - 1], next = SECTIONS[k + 1];
  return (
    <nav className="turn" data-sec={sec} aria-label="Turn the page">
      {prev ? <button data-goto={prev[0]}>‹ Section {prev[0]} · {prev[1]}</button> : <span />}
      <span className="turn-mid">End of Section {sec}</span>
      {next ? <button data-goto={next[0]}>Continued in Section {next[0]} · {next[1]} ›</button> : <button data-goto="A">Back to the Front Page ›</button>}
    </nav>
  );
}
