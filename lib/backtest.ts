import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { AssetBias, BacktestResult, BacktestSummary } from "./types";

dayjs.extend(utc);

const YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: "GC=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "JPY=X",
  US500: "^GSPC",
  NAS100: "^NDX",
  WTI: "CL=F",
  BTCUSD: "BTC-USD",
  DXY: "DX-Y.NYB",
  US10Y: "^TNX"
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

type Point = { t: number; c: number };

async function fetchSeries(symbol: string, from: number, to: number): Promise<Point[]> {
  const ySymbol = YAHOO_SYMBOLS[symbol];
  if (!ySymbol) return [];

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?period1=${from}&period2=${to}&interval=1d&includePrePost=false&events=history`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as YahooChartResponse;

    const result = json.chart?.result?.[0];
    const ts = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    const points: Point[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        points.push({ t: ts[i], c });
      }
    }
    return points;
  } catch {
    return [];
  }
}

function firstCloseOnOrAfter(points: Point[], targetTs: number): number | undefined {
  const p = points.find((x) => x.t >= targetTs);
  return p?.c;
}

function pctMove(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

function outcomeForBias(bias: AssetBias["bias"], movePct: number): "Win" | "Loss" | "N/A" {
  if (bias === "Neutral") return "N/A";
  if (bias === "Bullish") return movePct > 0 ? "Win" : "Loss";
  return movePct < 0 ? "Win" : "Loss";
}

export async function evaluateBacktest(assets: AssetBias[], date: string, horizonDays: number): Promise<BacktestSummary> {
  const startDay = dayjs.utc(`${date}T00:00:00Z`);
  const endDay = startDay.add(horizonDays, "day");

  const from = startDay.subtract(3, "day").unix();
  const to = endDay.add(7, "day").unix();

  const results: BacktestResult[] = [];

  for (const asset of assets) {
    const points = await fetchSeries(asset.symbol, from, to);
    if (points.length === 0) {
      results.push({ symbol: asset.symbol, outcome: "N/A", reason: "No historical market data available" });
      continue;
    }

    const startClose = firstCloseOnOrAfter(points, startDay.unix());
    const endClose = firstCloseOnOrAfter(points, endDay.unix());

    if (startClose === undefined || endClose === undefined) {
      results.push({ symbol: asset.symbol, outcome: "N/A", reason: "Not enough bars for selected horizon" });
      continue;
    }

    const movePct = pctMove(startClose, endClose);
    const outcome = outcomeForBias(asset.bias, movePct);

    results.push({ symbol: asset.symbol, outcome, startClose, endClose, movePct });
  }

  const scored = results.filter((r) => r.outcome !== "N/A");
  const wins = scored.filter((r) => r.outcome === "Win").length;
  const losses = scored.filter((r) => r.outcome === "Loss").length;
  const accuracyPct = scored.length ? Number(((wins / scored.length) * 100).toFixed(1)) : 0;

  return {
    date,
    horizonDays,
    scored: scored.length,
    wins,
    losses,
    accuracyPct,
    results
  };
}
