export type BiasDirection = "Bullish" | "Bearish" | "Neutral";

export type Asset = {
  symbol: string;
  name: string;
  category: "FX" | "Index" | "Commodity" | "Crypto";
  tags: string[];
};

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  matchedAssets: string[];
  shockScore: number;
  eventScore: number;
};

export type AssetBias = {
  symbol: string;
  name: string;
  category: Asset["category"];
  bias: BiasDirection;
  confidence: number;
  score: number;
  drivers: string[];
  headlines: NewsItem[];
  backtestOutcome?: "Win" | "Loss" | "N/A";
  realizedMovePct?: number;
};

export type BacktestResult = {
  symbol: string;
  outcome: "Win" | "Loss" | "N/A";
  startClose?: number;
  endClose?: number;
  movePct?: number;
  reason?: string;
};

export type BacktestSummary = {
  date: string;
  horizonDays: number;
  scored: number;
  wins: number;
  losses: number;
  accuracyPct: number;
  results: BacktestResult[];
};

export type DashboardPayload = {
  generatedAt: string;
  timezone: string;
  mode: "live" | "backtest";
  assets: AssetBias[];
  feed: NewsItem[];
  events: NewsItem[];
  shocks: NewsItem[];
  backtest?: BacktestSummary;
  note?: string;
};
