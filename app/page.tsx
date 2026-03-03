"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DashboardPayload, NewsItem } from "@/lib/types";

dayjs.extend(utc);
dayjs.extend(timezone);

const ZONE = "Africa/Johannesburg";

function biasClass(v: string) {
  if (v === "Bullish") return "pill bull";
  if (v === "Bearish") return "pill bear";
  return "pill neutral";
}

function formatSast(iso: string) {
  return dayjs(iso).tz(ZONE).format("DD MMM HH:mm");
}

export default function HomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "backtest">("live");
  const [backtestDate, setBacktestDate] = useState(dayjs().tz(ZONE).subtract(365, "day").format("YYYY-MM-DD"));
  const [horizonDays, setHorizonDays] = useState(5);

  const refresh = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (mode === "backtest") {
        params.set("date", backtestDate);
        params.set("horizonDays", String(horizonDays));
      }

      const res = await fetch(`/api/fundamentals?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const payload = (await res.json()) as DashboardPayload;
      setData(payload);
    } catch {
      setError("Feed unavailable. Check internet or data source health.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [mode, backtestDate, horizonDays]);

  useEffect(() => {
    if (mode !== "live") return;
    const timer = setInterval(() => {
      void refresh();
    }, 45_000);
    return () => clearInterval(timer);
  }, [mode, backtestDate, horizonDays]);

  const topEvents = useMemo(() => data?.events.slice(0, 8) ?? [], [data]);
  const topShocks = useMemo(() => data?.shocks.slice(0, 8) ?? [], [data]);
  const feed = useMemo(() => data?.feed.slice(0, 20) ?? [], [data]);

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1 className="title">Fundamental Bias Radar</h1>
          <p className="sub">10 assets • Daily bias model • Live + Backtest mode • Timezone: SAST (UTC+2)</p>
        </div>
        <div className="status">
          {loading ? "Updating…" : data ? `${data.mode === "backtest" ? "Backtest" : "Live"} • ${formatSast(data.generatedAt)} SAST` : "No data"}
        </div>
      </header>

      <div className="controls">
        <button className={`btn ${mode === "live" ? "active" : ""}`} onClick={() => setMode("live")}>Live mode</button>
        <button className={`btn ${mode === "backtest" ? "active" : ""}`} onClick={() => setMode("backtest")}>Backtest mode</button>
        <button className="btn" onClick={() => void refresh()}>Refresh now</button>
      </div>

      {mode === "backtest" ? (
        <div className="controls">
          <input
            className="input"
            type="date"
            value={backtestDate}
            max={dayjs().tz(ZONE).format("YYYY-MM-DD")}
            onChange={(e) => setBacktestDate(e.target.value)}
          />
          <select className="input" value={horizonDays} onChange={(e) => setHorizonDays(Number(e.target.value))}>
            <option value={1}>1 day horizon</option>
            <option value={3}>3 day horizon</option>
            <option value={5}>5 day horizon</option>
            <option value={10}>10 day horizon</option>
            <option value={20}>20 day horizon</option>
          </select>
          <span className="small">Bias date + forward horizon accuracy scoring</span>
        </div>
      ) : (
        <div className="controls">
          <span className="small">Auto-refresh every 45s (provider latency applies)</span>
        </div>
      )}

      {data?.note ? <div className="card small">{data.note}</div> : null}
      {error ? <div className="card small">{error}</div> : null}

      {mode === "backtest" && data?.backtest ? (
        <section className="card backtestSummary">
          <strong>Backtest Summary</strong>
          <span>Date {data.backtest.date}</span>
          <span>Horizon {data.backtest.horizonDays}d</span>
          <span>Scored {data.backtest.scored}/10</span>
          <span>Wins {data.backtest.wins}</span>
          <span>Losses {data.backtest.losses}</span>
          <span>Accuracy {data.backtest.accuracyPct}%</span>
        </section>
      ) : null}

      <h2 className="sectionTitle">Daily Fundamental Bias</h2>
      <section className="grid">
        {(data?.assets ?? []).map((asset) => (
          <article key={asset.symbol} className="card">
            <div className="assetTop">
              <div>
                <h3 className="symbol">{asset.symbol}</h3>
                <div className="name">{asset.name}</div>
              </div>
              <span className={biasClass(asset.bias)}>{asset.bias}</span>
            </div>
            <div className="meta">
              <span>{asset.category}</span>
              <span>Confidence {asset.confidence}%</span>
              <span>Score {asset.score >= 0 ? `+${asset.score}` : asset.score}</span>
            </div>
            {mode === "backtest" ? (
              <div className="meta">
                <span className={`pill ${asset.backtestOutcome === "Win" ? "bull" : asset.backtestOutcome === "Loss" ? "bear" : "neutral"}`}>
                  {asset.backtestOutcome ?? "N/A"}
                </span>
                <span>
                  Move {typeof asset.realizedMovePct === "number" ? `${asset.realizedMovePct > 0 ? "+" : ""}${asset.realizedMovePct.toFixed(2)}%` : "N/A"}
                </span>
              </div>
            ) : null}
            <div className="drivers">
              {asset.drivers.map((d) => (
                <span className="driver" key={`${asset.symbol}-${d}`}>{d}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <h2 className="sectionTitle">High-Impact Events</h2>
      <section className="card feed">
        {topEvents.length === 0 ? <span className="small">No major event headlines detected yet.</span> : null}
        {topEvents.map((item) => (
          <FeedItem key={`e-${item.link}`} item={item} kind="Event" />
        ))}
      </section>

      <h2 className="sectionTitle">Shocks & Risk Alerts</h2>
      <section className="card feed">
        {topShocks.length === 0 ? <span className="small">No active shock headlines detected.</span> : null}
        {topShocks.map((item) => (
          <FeedItem key={`s-${item.link}`} item={item} kind="Shock" />
        ))}
      </section>

      <h2 className="sectionTitle">Latest Articles & Headlines</h2>
      <section className="card feed">
        {feed.map((item) => (
          <FeedItem key={item.link} item={item} />
        ))}
      </section>
    </main>
  );
}

function FeedItem({ item, kind }: { item: NewsItem; kind?: "Event" | "Shock" }) {
  return (
    <article className="item">
      {kind ? <span className="kicker">{kind}</span> : null}
      <a href={item.link} target="_blank" rel="noreferrer" className="itemTitle">
        {item.title}
      </a>
      <div className="itemMeta">
        <span>{item.source}</span>
        <span>{formatSast(item.publishedAt)} SAST</span>
        <span>{item.matchedAssets.slice(0, 4).join(" • ") || "Macro"}</span>
      </div>
    </article>
  );
}
