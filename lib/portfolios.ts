// ─────────────────────────────────────────────────────────────
//  PORTFOLIO SETTINGS: edit this file to change the portfolios.
// ─────────────────────────────────────────────────────────────
//
//  startDate   The inception date. Returns are measured from the
//              closing price on this date.
//  startValue  Dollars invested at inception (cash included).
//  cash        Dollars held in cash (earns nothing in this model).
//  holdings    One line per position.
//                shares  Optional. Enter the real share count to get
//                        true weighted returns. Leave it out and the
//                        app buys an equal dollar amount of each stock
//                        at the inception close.
//                filing  Optional. "20-F" for foreign filers that do not
//                        file a 10-K. Defaults to "10-K".

export type Holding = { symbol: string; shares?: number; filing?: "10-K" | "20-F" };

export type Portfolio = {
  id: string;
  name: string;
  blurb: string;
  startDate: string; // YYYY-MM-DD
  startValue: number;
  cash: number;
  holdings: Holding[];
};

export const BENCHMARK = "SPY";

export const PORTFOLIOS: Portfolio[] = [
  {
    id: "jack-merrick",
    name: "Jack Merrick's Portfolio",
    blurb: "AI hardware, crude tankers, and healthcare with GLP-1 exposure.",
    startDate: "2026-08-31",
    startValue: 10000,
    cash: 0,
    holdings: [
      { symbol: "LLY" }, { symbol: "INCY" }, { symbol: "DXCM" }, { symbol: "JLL" },
      { symbol: "VEEV" }, { symbol: "TILE" }, { symbol: "TNK", filing: "20-F" }, { symbol: "SN" },
      { symbol: "ROKU" }, { symbol: "AMZN" }, { symbol: "INSW" }, { symbol: "RELY" },
      { symbol: "GRMN" }, { symbol: "LIVN" }, { symbol: "APH" }, { symbol: "NVDA" },
      { symbol: "MU" }, { symbol: "P" }, { symbol: "ANET" },
    ],
  },
  {
    id: "class",
    name: "Class Portfolio",
    blurb: "A barbell: AI and compute on one side, defensive healthcare and staples on the other.",
    startDate: "2026-08-31",
    startValue: 10000,
    cash: 0,
    holdings: [
      { symbol: "LLY" }, { symbol: "GILD" }, { symbol: "WMT" }, { symbol: "CVX" },
      { symbol: "CROX" }, { symbol: "NBIX" }, { symbol: "JNJ" }, { symbol: "CEG" },
      { symbol: "ELF" }, { symbol: "AAPL" }, { symbol: "TTWO" }, { symbol: "NVDA" },
      { symbol: "SOFI" }, { symbol: "AVGO" }, { symbol: "PLTR" }, { symbol: "ORCL" },
    ],
  },
  {
    id: "dartboard",
    name: "Dartboard Portfolio",
    blurb: "Staples, pharma, utilities, pipelines, plus cyclical leisure and freight.",
    startDate: "2026-08-31",
    startValue: 10000,
    cash: 0,
    holdings: [
      { symbol: "PEP" }, { symbol: "LIN" }, { symbol: "PFE" }, { symbol: "MO" },
      { symbol: "TSN" }, { symbol: "CTAS" }, { symbol: "ATO" }, { symbol: "ODFL" },
      { symbol: "LVS" }, { symbol: "VICI" }, { symbol: "KMI" }, { symbol: "NCLH" },
    ],
  },
];

export const SITE = {
  title: "Market Monitor",
  course: "MATH 621 · Quantitative Finance and AI",
  school: "Ransom Everglades School",
  byline: "Jess Merrick & Rob Jaffee",
};
