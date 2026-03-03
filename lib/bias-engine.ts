import { ASSETS } from "./assets";
import { Asset, AssetBias, BiasDirection, NewsItem } from "./types";

const POSITIVE_WORDS = [
  "beat",
  "surge",
  "rally",
  "expands",
  "easing inflation",
  "rate cut",
  "cooling inflation",
  "strong demand",
  "ceasefire",
  "deal reached",
  "stimulus"
];

const NEGATIVE_WORDS = [
  "miss",
  "drop",
  "selloff",
  "recession",
  "rate hike",
  "sticky inflation",
  "conflict",
  "sanctions",
  "shock",
  "downgrade",
  "default",
  "tariff"
];

const EVENT_WORDS = ["cpi", "nfp", "fomc", "fed", "ecb", "boe", "boj", "pmi", "gdp", "rate decision", "payrolls"];
const SHOCK_WORDS = ["war", "earthquake", "sanction", "default", "bank run", "emergency", "attack", "blackout", "crash"];

const ASSET_BULLISH_HINTS: Record<string, string[]> = {
  XAUUSD: ["rate cut", "conflict", "risk-off", "safe haven", "falling yields"],
  EURUSD: ["ecb hawkish", "eurozone growth", "usd weak"],
  GBPUSD: ["boe hawkish", "uk growth", "usd weak"],
  USDJPY: ["fed hawkish", "higher yields", "boj dovish"],
  US500: ["rate cut", "earnings beat", "ai rally", "soft landing"],
  NAS100: ["rate cut", "tech earnings", "ai demand", "chip demand"],
  WTI: ["opec cuts", "supply disruption", "strong demand"],
  BTCUSD: ["etf inflows", "risk-on", "liquidity", "halving"],
  DXY: ["fed hawkish", "higher yields", "risk-off", "us growth"],
  US10Y: ["fed hawkish", "inflation sticky", "higher supply"]
};

const ASSET_BEARISH_HINTS: Record<string, string[]> = {
  XAUUSD: ["fed hawkish", "higher yields", "usd strong"],
  EURUSD: ["usd strong", "eurozone slowdown", "ecb dovish"],
  GBPUSD: ["usd strong", "uk recession", "boe dovish"],
  USDJPY: ["boj hawkish", "jpy strength", "falling us yields"],
  US500: ["rate hike", "earnings miss", "credit stress", "geopolitical shock"],
  NAS100: ["higher yields", "tech downgrade", "rate hike"],
  WTI: ["demand slowdown", "inventory build", "opec output increase"],
  BTCUSD: ["regulatory crackdown", "risk-off", "exchange outflow", "etf outflows"],
  DXY: ["fed dovish", "falling yields", "risk-on"],
  US10Y: ["fed dovish", "disinflation", "flight to bonds"]
};

function includesAny(text: string, words: string[]): number {
  const t = text.toLowerCase();
  return words.reduce((acc, word) => (t.includes(word) ? acc + 1 : acc), 0);
}

function matchedAssetsFromTitle(title: string): string[] {
  const lower = title.toLowerCase();
  const matches: string[] = [];

  for (const asset of ASSETS) {
    const hasMatch = asset.tags.some((tag) => lower.includes(tag));
    if (hasMatch) {
      matches.push(asset.symbol);
    }
  }

  if (matches.length === 0) {
    if (lower.includes("federal reserve") || lower.includes("fed") || lower.includes("usd") || lower.includes("us economy")) {
      matches.push("DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US500", "NAS100", "US10Y");
    }
  }

  return [...new Set(matches)];
}

export function normalizeFeedItem(item: { title: string; link: string; source: string; publishedAt: string }): NewsItem {
  const eventScore = includesAny(item.title, EVENT_WORDS);
  const shockScore = includesAny(item.title, SHOCK_WORDS);
  const matchedAssets = matchedAssetsFromTitle(item.title);

  return {
    title: item.title,
    link: item.link,
    source: item.source,
    publishedAt: item.publishedAt,
    matchedAssets,
    shockScore,
    eventScore
  };
}

function directionalScore(asset: Asset, headlines: NewsItem[]): { score: number; drivers: string[] } {
  let score = 0;
  const drivers = new Map<string, number>();

  for (const item of headlines) {
    const title = item.title.toLowerCase();

    score += includesAny(title, POSITIVE_WORDS);
    score -= includesAny(title, NEGATIVE_WORDS);

    const bullishHints = ASSET_BULLISH_HINTS[asset.symbol] ?? [];
    const bearishHints = ASSET_BEARISH_HINTS[asset.symbol] ?? [];

    const bullHits = includesAny(title, bullishHints);
    const bearHits = includesAny(title, bearishHints);

    score += bullHits * 2;
    score -= bearHits * 2;

    for (const h of bullishHints) {
      if (title.includes(h)) drivers.set(h, (drivers.get(h) ?? 0) + 1);
    }
    for (const h of bearishHints) {
      if (title.includes(h)) drivers.set(h, (drivers.get(h) ?? 0) - 1);
    }

    if (item.shockScore > 0) {
      if (asset.symbol === "XAUUSD" || asset.symbol === "DXY") score += item.shockScore;
      if (asset.symbol === "US500" || asset.symbol === "NAS100" || asset.symbol === "BTCUSD") score -= item.shockScore;
    }
  }

  const topDrivers = [...drivers.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4)
    .map(([k, v]) => `${k} (${v > 0 ? "+" : ""}${v})`);

  return { score, drivers: topDrivers };
}

function scoreToBias(score: number): BiasDirection {
  if (score >= 3) return "Bullish";
  if (score <= -3) return "Bearish";
  return "Neutral";
}

function confidenceFrom(score: number, sample: number): number {
  const raw = Math.min(95, Math.abs(score) * 8 + Math.min(sample, 12) * 3);
  return Math.max(35, raw);
}

export function buildAssetBias(feed: NewsItem[]): AssetBias[] {
  return ASSETS.map((asset) => {
    const related = feed
      .filter((n) => n.matchedAssets.includes(asset.symbol))
      .slice(0, 20);

    const { score, drivers } = directionalScore(asset, related);
    const bias = scoreToBias(score);
    const confidence = confidenceFrom(score, related.length);

    return {
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      bias,
      confidence,
      score,
      drivers: drivers.length ? drivers : ["headline momentum", "macro tone"],
      headlines: related.slice(0, 4)
    };
  });
}
