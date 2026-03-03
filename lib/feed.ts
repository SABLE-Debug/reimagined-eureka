import Parser from "rss-parser";
import { FEED_SOURCES } from "./assets";
import { normalizeFeedItem } from "./bias-engine";
import { NewsItem } from "./types";

const parser = new Parser();

function parseDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function fetchSingleFeed(source: string, url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);

    return (feed.items ?? [])
      .map((item) => {
        const title = item.title?.trim() || "Untitled";
        const link = item.link?.trim() || "#";
        const publishedAt = parseDate(item.isoDate || item.pubDate);

        return normalizeFeedItem({
          title,
          link,
          source,
          publishedAt
        });
      })
      .filter((n) => n.link !== "#");
  } catch {
    return [];
  }
}

export async function fetchUnifiedFeed(): Promise<NewsItem[]> {
  const results = await Promise.all(FEED_SOURCES.map((f) => fetchSingleFeed(f.source, f.url)));
  const merged = results.flat();

  const dedupMap = new Map<string, NewsItem>();
  for (const item of merged) {
    const key = item.title.toLowerCase();
    if (!dedupMap.has(key)) dedupMap.set(key, item);
  }

  return [...dedupMap.values()]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 180);
}

function toGdeltDate(date: string, endOfDay: boolean): string {
  const suffix = endOfDay ? "235959" : "000000";
  return date.replaceAll("-", "") + suffix;
}

type GdeltArticle = {
  title?: string;
  url?: string;
  seendate?: string;
  domain?: string;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

export async function fetchHistoricalFeedByDate(date: string): Promise<NewsItem[]> {
  const startdatetime = toGdeltDate(date, false);
  const enddatetime = toGdeltDate(date, true);
  const query = "(finance OR forex OR stocks OR oil OR gold OR bitcoin OR federal reserve OR ECB OR BOE OR BOJ OR inflation OR yields)";
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=250&format=json&sort=datedesc&startdatetime=${startdatetime}&enddatetime=${enddatetime}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as GdeltResponse;
    const articles = data.articles ?? [];

    const mapped = articles
      .map((article) => {
        const title = article.title?.trim() || "Untitled";
        const link = article.url?.trim() || "#";
        const source = article.domain?.trim() || "GDELT";
        const publishedAt = article.seendate?.trim()
          ? new Date(article.seendate.replace(" ", "T") + "Z").toISOString()
          : new Date(`${date}T12:00:00Z`).toISOString();

        return normalizeFeedItem({ title, link, source, publishedAt });
      })
      .filter((n) => n.link !== "#");

    const dedupMap = new Map<string, NewsItem>();
    for (const item of mapped) {
      const key = item.title.toLowerCase();
      if (!dedupMap.has(key)) dedupMap.set(key, item);
    }

    return [...dedupMap.values()]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 180);
  } catch {
    return [];
  }
}
