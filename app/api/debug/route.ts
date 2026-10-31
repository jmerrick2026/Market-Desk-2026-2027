import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

// Temporary diagnostics: checks the economic calendar source and copper history.
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const r = await fetch("https://api.nasdaq.com/api/calendar/economicevents?date=2026-11-06", {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", Accept: "application/json, text/plain, */*", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" },
      cache: "no-store",
    });
    out.nasdaqStatus = r.status;
    out.nasdaq = (await r.text()).slice(0, 2500);
  } catch (e) { out.nasdaqErr = String(e); }
  try {
    const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] } as any);
    const c: any = await (yf as any).chart("HG=F", { period1: new Date(Date.now() - 45 * 864e5), interval: "1d" }, { validateResult: false });
    out.copper = (c.quotes ?? []).map((q: any) => [new Date(q.date).toISOString().slice(0, 10), q.close]);
    const q: any = await (yf as any).quote("HG=F", {}, { validateResult: false });
    out.copperQuote = { price: q.regularMarketPrice, prev: q.regularMarketPreviousClose, time: q.regularMarketTime };
  } catch (e) { out.copperErr = String(e); }
  return NextResponse.json(out);
}
