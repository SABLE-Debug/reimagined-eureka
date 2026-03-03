import { Asset } from "./types";

export const ASSETS: Asset[] = [
  { symbol: "XAUUSD", name: "Gold vs US Dollar", category: "Commodity", tags: ["gold", "bullion", "xauusd"] },
  { symbol: "EURUSD", name: "Euro vs US Dollar", category: "FX", tags: ["euro", "ecb", "eurusd", "eur"] },
  { symbol: "GBPUSD", name: "British Pound vs US Dollar", category: "FX", tags: ["pound", "boe", "gbpusd", "sterling", "uk"] },
  { symbol: "USDJPY", name: "US Dollar vs Japanese Yen", category: "FX", tags: ["yen", "boj", "usdjpy", "japan"] },
  { symbol: "US500", name: "S&P 500 Index", category: "Index", tags: ["s&p", "sp500", "equities", "wall street", "stocks"] },
  { symbol: "NAS100", name: "Nasdaq 100 Index", category: "Index", tags: ["nasdaq", "tech stocks", "us tech", "nas100"] },
  { symbol: "WTI", name: "WTI Crude Oil", category: "Commodity", tags: ["crude", "oil", "wti", "opec", "brent"] },
  { symbol: "BTCUSD", name: "Bitcoin vs US Dollar", category: "Crypto", tags: ["bitcoin", "btc", "crypto", "etf"] },
  { symbol: "DXY", name: "US Dollar Index", category: "FX", tags: ["dxy", "dollar index", "usd", "greenback"] },
  { symbol: "US10Y", name: "US 10-Year Treasury Yield", category: "Index", tags: ["treasury", "bond yields", "10-year", "us10y"] }
];

export const FEED_SOURCES = [
  { source: "Reuters Markets", url: "https://feeds.reuters.com/reuters/businessNews" },
  { source: "Reuters World", url: "https://feeds.reuters.com/Reuters/worldNews" },
  { source: "MarketWatch Top", url: "http://feeds.marketwatch.com/marketwatch/topstories/" },
  { source: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
  { source: "FXStreet", url: "https://www.fxstreet.com/rss/news" },
  { source: "Investing.com", url: "https://www.investing.com/rss/news.rss" },
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" }
] as const;
