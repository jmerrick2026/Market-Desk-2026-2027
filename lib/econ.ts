import { DEMO } from "./data";

// Federal Reserve FOMC rate-decision days (the second day of each meeting), 2:00 PM ET.
export const FOMC_DECISIONS = [
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
];

export type EconEvent = { date: string; time: string; name: string; actual?: string; consensus?: string; previous?: string; why?: string };

// Only the U.S. releases that reliably move markets
const KEY_EVENTS: [RegExp, string][] = [
  [/nonfarm payrolls/i, "The headline jobs number: the single most-watched monthly report."],
  [/unemployment rate/i, "Share of the labor force without a job; a rising rate raises recession odds."],
  [/average hourly earnings/i, "Wage growth: a key input into future inflation."],
  [/^core cpi|^cpi/i, "Consumer inflation. A hot print pushes yields up and growth stocks down."],
  [/^core ppi|^ppi/i, "Producer (wholesale) inflation, an early read on consumer prices."],
  [/pce/i, "The Fed's preferred inflation gauge."],
  [/^gdp/i, "Total output of the economy, the broadest growth measure."],
  [/retail sales/i, "Consumer spending, about two-thirds of the U.S. economy."],
  [/ism (manufacturing|non-manufacturing|services) pmi/i, "Purchasing managers' survey: above 50 means expansion."],
  [/initial jobless claims/i, "Weekly layoffs, the most timely labor-market signal."],
  [/jolts/i, "Job openings: a gauge of labor demand."],
  [/adp nonfarm/i, "Private payroll estimate released two days before the official jobs report."],
  [/cb consumer confidence|michigan consumer sentiment/i, "How households feel, which drives what they spend."],
  [/fed interest rate decision|fomc statement/i, "The Fed sets short-term interest rates."],
  [/fed chair .* speaks|powell/i, "Markets parse every word for hints about future rate moves."],
  [/durable goods/i, "Orders for big-ticket items, a read on business investment."],
  [/housing starts|existing home sales|new home sales/i, "Housing activity, very sensitive to mortgage rates."],
  [/industrial production/i, "Output of factories, mines, and utilities."],
];

const clean = (s?: string) => {
  const t = (s ?? "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  return t || undefined;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function fetchDay(date: string): Promise<EconEvent[]> {
  const res = await fetch(`https://api.nasdaq.com/api/calendar/economicevents?date=${date}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Origin: "https://www.nasdaq.com",
      Referer: "https://www.nasdaq.com/",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  const json: any = await res.json();
  const rows: any[] = json?.data?.rows ?? [];
  const out: EconEvent[] = [];
  for (const r of rows) {
    if (r.country !== "United States") continue;
    const name = clean(r.eventName) ?? "";
    const hit = KEY_EVENTS.find(([re]) => re.test(name));
    if (!hit) continue;
    // Times arrive in GMT; show Eastern time
    const [hh, mm] = String(r.gmt ?? "").split(":").map(Number);
    let time = "";
    if (isFinite(hh) && isFinite(mm)) {
      const t = new Date(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
      time = t.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    }
    out.push({ date, time, name, actual: clean(r.actual), consensus: clean(r.consensus), previous: clean(r.previous), why: hit[1] });
  }
  return out;
}

function demoEvents(): EconEvent[] {
  const d = (n: number) => isoDay(new Date(Date.now() + n * 864e5));
  return [
    { date: d(-1), time: "8:30 AM", name: "Core PCE Price Index (MoM)", actual: "0.3%", consensus: "0.2%", previous: "0.2%", why: KEY_EVENTS[5][1] },
    { date: d(2), time: "10:00 AM", name: "ISM Manufacturing PMI", consensus: "49.6", previous: "49.1", why: KEY_EVENTS[8][1] },
    { date: d(4), time: "8:15 AM", name: "ADP Nonfarm Employment Change", consensus: "45K", previous: "32K", why: KEY_EVENTS[11][1] },
    { date: d(5), time: "8:30 AM", name: "Initial Jobless Claims", consensus: "225K", previous: "219K", why: KEY_EVENTS[9][1] },
    { date: d(6), time: "8:30 AM", name: "Nonfarm Payrolls", consensus: "110K", previous: "98K", why: KEY_EVENTS[0][1] },
    { date: d(6), time: "8:30 AM", name: "Unemployment Rate", consensus: "4.3%", previous: "4.3%", why: KEY_EVENTS[1][1] },
  ];
}

/** Recent releases (last 3 days) and the week ahead (next 7 days). */
export async function getEconCalendar() {
  const today = isoDay(new Date());
  const days: string[] = [];
  for (let n = -3; n <= 7; n++) {
    const d = new Date(Date.now() + n * 864e5);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) days.push(isoDay(d));
  }
  let events: EconEvent[] = [];
  let ok = true;
  if (DEMO) events = demoEvents();
  else {
    const res = await Promise.allSettled(days.map(fetchDay));
    for (const r of res) if (r.status === "fulfilled") events.push(...r.value);
    ok = res.some((r) => r.status === "fulfilled");
  }
  // collapse duplicate names on the same day (e.g., MoM and YoY variants stay; exact repeats go)
  const seen = new Set<string>();
  events = events.filter((e) => { const k = e.date + e.name; if (seen.has(k)) return false; seen.add(k); return true; });
  const nextFed = FOMC_DECISIONS.find((d) => d >= today);
  const fedIn = nextFed ? Math.round((+new Date(nextFed + "T12:00:00Z") - +new Date(today + "T12:00:00Z")) / 864e5) : undefined;
  return {
    ok,
    recent: events.filter((e) => e.date < today && e.actual).slice(-8),
    ahead: events.filter((e) => e.date >= today).slice(0, 14),
    nextFed, fedIn,
  };
}
export type Econ = Awaited<ReturnType<typeof getEconCalendar>>;
