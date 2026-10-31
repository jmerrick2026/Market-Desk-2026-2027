// Daily crossword generator: finance vocabulary plus clues drawn from today's market.

export type Entry = { answer: string; clue: string };
export type Placed = Entry & { row: number; col: number; dir: "across" | "down"; num: number };
export type Puzzle = { rows: number; cols: number; grid: (string | null)[][]; nums: (number | null)[][]; words: Placed[] };

export const WORD_BANK: Entry[] = [
  { answer: "BETA", clue: "Measure of how much a stock moves with the market" },
  { answer: "ALPHA", clue: "Return earned above a benchmark" },
  { answer: "YIELD", clue: "A bond's annual income as a percent of its price" },
  { answer: "BOND", clue: "IOU that pays a coupon" },
  { answer: "EQUITY", clue: "Ownership stake in a company" },
  { answer: "DIVIDEND", clue: "Cash a company pays its shareholders" },
  { answer: "BULL", clue: "Investor who expects prices to rise" },
  { answer: "BEAR", clue: "Investor who expects prices to fall" },
  { answer: "HEDGE", clue: "Position taken to offset risk" },
  { answer: "OPTION", clue: "Right, but not obligation, to buy or sell" },
  { answer: "FUTURES", clue: "Contracts to buy or sell at a set price on a later date" },
  { answer: "SPREAD", clue: "Gap between two yields or prices" },
  { answer: "INVERTED", clue: "Like a yield curve when short rates exceed long rates" },
  { answer: "COUPON", clue: "Interest payment on a bond" },
  { answer: "PAR", clue: "A bond's face value" },
  { answer: "INDEX", clue: "The S&P 500, for one" },
  { answer: "SECTOR", clue: "Energy or Health Care, on the S&P 500 board" },
  { answer: "VOLUME", clue: "Number of shares traded" },
  { answer: "RALLY", clue: "Sharp rise in prices" },
  { answer: "MARGIN", clue: "Profit as a share of revenue" },
  { answer: "LIQUIDITY", clue: "How easily an asset becomes cash" },
  { answer: "INFLATION", clue: "General rise in prices" },
  { answer: "RECESSION", clue: "Two straight quarters of shrinking GDP, informally" },
  { answer: "DOVE", clue: "Fed official who leans toward lower rates" },
  { answer: "HAWK", clue: "Fed official who worries most about inflation" },
  { answer: "ROTATION", clue: "Money moving from one sector to another" },
  { answer: "BREADTH", clue: "How many stocks join a market move" },
  { answer: "DRAWDOWN", clue: "Peak-to-trough decline" },
  { answer: "SHARPE", clue: "Ratio of excess return to volatility" },
  { answer: "VIX", clue: "Wall Street's fear gauge" },
  { answer: "NASDAQ", clue: "Tech-heavy exchange and index" },
  { answer: "DOW", clue: "30-stock average, familiarly" },
  { answer: "EARNINGS", clue: "Quarterly profit report" },
  { answer: "REVENUE", clue: "Top line of the income statement" },
  { answer: "TICKER", clue: "NVDA or AAPL, for example" },
  { answer: "IPO", clue: "A company's stock market debut (abbr.)" },
  { answer: "CAPEX", clue: "Spending on plants and equipment, for short" },
  { answer: "LEVERAGE", clue: "Using debt to amplify returns" },
  { answer: "ASSET", clue: "Something a company owns" },
  { answer: "COPPER", clue: "Dr. ___, the metal that reads the economy" },
  { answer: "GOLD", clue: "Classic hedge against inflation" },
  { answer: "CRUDE", clue: "WTI, for one" },
  { answer: "DOLLAR", clue: "World's reserve currency" },
  { answer: "BASIS", clue: "___ point: one hundredth of a percent" },
  { answer: "DURATION", clue: "A bond's sensitivity to interest rates" },
  { answer: "CALL", clue: "Option to buy" },
  { answer: "PUT", clue: "Option to sell" },
  { answer: "STRIKE", clue: "Price at which an option can be exercised" },
  { answer: "PREMIUM", clue: "Price paid for an option" },
  { answer: "SHORT", clue: "Bet that a stock will fall" },
  { answer: "BID", clue: "Highest price a buyer will pay" },
  { answer: "ASK", clue: "Lowest price a seller will accept" },
  { answer: "PORTFOLIO", clue: "Collection of investments" },
  { answer: "DIVERSIFY", clue: "Spread your bets" },
  { answer: "VALUE", clue: "Investing style that hunts for cheap stocks" },
  { answer: "GROWTH", clue: "Investing style that pays up for fast-rising sales" },
  { answer: "MOMENTUM", clue: "Tendency of winners to keep winning" },
  { answer: "CYCLICAL", clue: "Like automakers and airlines, which rise and fall with the economy" },
  { answer: "DEFENSIVE", clue: "Like utilities and staples, which hold up in downturns" },
  { answer: "TREASURY", clue: "Government bond, or the department that issues it" },
  { answer: "CPI", clue: "Monthly consumer inflation gauge (abbr.)" },
  { answer: "GDP", clue: "Broadest measure of economic output (abbr.)" },
  { answer: "FED", clue: "Central bank, for short" },
  { answer: "ETF", clue: "Basket of assets that trades like a stock (abbr.)" },
  { answer: "BLUECHIP", clue: "Large, established, reliable company" },
  { answer: "BROKER", clue: "Middleman who executes trades" },
  { answer: "CASH", clue: "The safest asset in a portfolio, and the most boring" },
];

// Deterministic random numbers so everyone gets the same puzzle each day
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

type Cell = string | null;
const N = 17;

function tryLayout(words: Entry[], rand: () => number, mustCount: number): { grid: Cell[][]; placed: Omit<Placed, "num">[] } {
  const grid: Cell[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const placed: Omit<Placed, "num">[] = [];
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= N || c >= N ? null : grid[r][c]);
  const fits = (w: string, r: number, c: number, dir: "across" | "down") => {
    const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
    if (r < 0 || c < 0 || r + dr * (w.length - 1) >= N || c + dc * (w.length - 1) >= N) return -1;
    if (at(r - dr, c - dc) || at(r + dr * w.length, c + dc * w.length)) return -1; // no touching ends
    let cross = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i, cc = c + dc * i, cur = grid[rr][cc];
      if (cur) { if (cur !== w[i]) return -1; cross++; continue; }
      // empty cell: neighbors perpendicular to the word must be empty
      if (dir === "across" && (at(rr - 1, cc) || at(rr + 1, cc))) return -1;
      if (dir === "down" && (at(rr, cc - 1) || at(rr, cc + 1))) return -1;
    }
    return cross === w.length ? -1 : cross;
  };
  const put = (e: Entry, r: number, c: number, dir: "across" | "down") => {
    for (let i = 0; i < e.answer.length; i++) grid[r + (dir === "down" ? i : 0)][c + (dir === "across" ? i : 0)] = e.answer[i];
    placed.push({ ...e, row: r, col: c, dir });
  };
  const first = words[0];
  put(first, Math.floor(N / 2), Math.floor((N - first.answer.length) / 2), "across");
  for (const e of words.slice(1)) {
    if (placed.length >= 16) break;
    let best: { r: number; c: number; dir: "across" | "down"; score: number } | null = null;
    for (const p of placed) for (let i = 0; i < p.answer.length; i++) for (let j = 0; j < e.answer.length; j++) {
      if (p.answer[i] !== e.answer[j]) continue;
      const dir = p.dir === "across" ? "down" : "across";
      const pr = p.row + (p.dir === "down" ? i : 0), pc = p.col + (p.dir === "across" ? i : 0);
      const r = dir === "down" ? pr - j : pr, c = dir === "across" ? pc - j : pc;
      const s = fits(e.answer, r, c, dir);
      if (s > 0) {
        const centre = -Math.abs(r - N / 2) - Math.abs(c - N / 2);
        const score = s * 10 + centre * 0.3 + rand();
        if (!best || score > best.score) best = { r, c, dir, score };
      }
    }
    if (best) put(e, best.r, best.c, best.dir);
  }
  void mustCount;
  return { grid, placed };
}

export function makeCrossword(daily: Entry[], seed: string): Puzzle {
  const rand = rng(seed);
  const clean = (e: Entry) => ({ ...e, answer: e.answer.toUpperCase().replace(/[^A-Z]/g, "") });
  const today = daily.map(clean).filter((e) => e.answer.length >= 3 && e.answer.length <= 11);
  const todaySet = new Set(today.map((e) => e.answer));
  let best: ReturnType<typeof tryLayout> | null = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const bank = WORD_BANK.map(clean).filter((e) => !todaySet.has(e.answer)).sort(() => rand() - 0.5);
    // Lead with a long word, then today's market answers, then the bank
    const longs = bank.filter((e) => e.answer.length >= 7);
    const lead = longs[Math.floor(rand() * longs.length)];
    const words = [lead, ...today.sort(() => rand() - 0.5), ...bank.filter((e) => e !== lead)];
    const res = tryLayout(words, rand, today.length);
    const daily = res.placed.filter((p) => todaySet.has(p.answer)).length;
    const score = res.placed.length + daily * 3;
    if (score > bestScore) { best = res; bestScore = score; }
    if (res.placed.length >= 15 && daily === today.length) break;
  }
  const { grid, placed } = best!;
  // crop to the used area
  let r0 = N, r1 = 0, c0 = N, c1 = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  const rows = r1 - r0 + 1, cols = c1 - c0 + 1;
  const g = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => grid[r + r0][c + c0]));
  // number the starts in reading order
  const nums: (number | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const starts = placed.map((p) => ({ ...p, row: p.row - r0, col: p.col - c0 }));
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (starts.some((p) => p.row === r && p.col === c)) nums[r][c] = ++n;
  const words: Placed[] = starts.map((p) => ({ ...p, num: nums[p.row][p.col]! })).sort((a, b) => a.num - b.num);
  return { rows, cols, grid: g, nums, words };
}
