import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { buildAssetBias } from "@/lib/bias-engine";
import { fetchHistoricalFeedByDate, fetchUnifiedFeed } from "@/lib/feed";
import { evaluateBacktest } from "@/lib/backtest";
import { DashboardPayload } from "@/lib/types";

dayjs.extend(utc);
dayjs.extend(timezone);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ZONE = "Africa/Johannesburg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") === "backtest" ? "backtest" : "live";
  const date = searchParams.get("date") ?? dayjs().tz(ZONE).format("YYYY-MM-DD");
  const horizonDays = Math.max(1, Math.min(30, Number(searchParams.get("horizonDays") ?? 5)));

  const feed = mode === "backtest" ? await fetchHistoricalFeedByDate(date) : await fetchUnifiedFeed();
  const assetBias = buildAssetBias(feed);

  const events = feed
    .filter((n) => n.eventScore > 0)
    .sort((a, b) => b.eventScore - a.eventScore)
    .slice(0, 20);

  const shocks = feed
    .filter((n) => n.shockScore > 0)
    .sort((a, b) => b.shockScore - a.shockScore)
    .slice(0, 20);

  const backtest = mode === "backtest" ? await evaluateBacktest(assetBias, date, horizonDays) : undefined;

  const assets = backtest
    ? assetBias.map((asset) => {
        const outcome = backtest.results.find((r) => r.symbol === asset.symbol);
        return {
          ...asset,
          backtestOutcome: outcome?.outcome,
          realizedMovePct: outcome?.movePct
        };
      })
    : assetBias;

  const payload: DashboardPayload = {
    generatedAt: dayjs().tz(ZONE).toISOString(),
    timezone: "SAST (UTC+2)",
    mode,
    assets,
    feed: feed.slice(0, 50),
    events,
    shocks,
    backtest,
    note:
      mode === "backtest" && feed.length === 0
        ? "No historical headlines returned by provider for this date. Try a different day."
        : undefined
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=45, stale-while-revalidate=30"
    }
  });
}
