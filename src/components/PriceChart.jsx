import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw } from "lucide-react";
import { stocksAPI } from "../services/api";
import { theme } from "../theme";
import { symbolOf, Segmented } from "./ui";

const PERIODS = [
  { value: "1D", label: "1D", period: "1d",  interval: "5m" },
  { value: "1W", label: "1W", period: "5d",  interval: "15m" },
  { value: "1M", label: "1M", period: "1mo", interval: "1d" },
  { value: "3M", label: "3M", period: "3mo", interval: "1d" },
  { value: "6M", label: "6M", period: "6mo", interval: "1d" },
  { value: "1Y", label: "1Y", period: "1y",  interval: "1d" },
];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const s = symbolOf(currency);
  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.rule}`, borderRadius: 6, padding: "10px 12px", fontSize: 12 }}>
      <div style={{ color: theme.mute }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15, margin: "2px 0 4px" }}>{s}{d.close?.toLocaleString()}</div>
      <div style={{ color: theme.mute }}>
        High {s}{d.high?.toLocaleString()} · Low {s}{d.low?.toLocaleString()}
      </div>
      <div style={{ color: theme.mute }}>Volume {d.volume?.toLocaleString()}</div>
    </div>
  );
}

export default function PriceChart({ symbol, market, currency = "INR", fetchHistory = stocksAPI.history }) {
  const [selected, setSelected] = useState("1M");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const period = PERIODS.find((p) => p.value === selected);

  const load = async (p = period) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetchHistory(symbol, market, p.period, p.interval);
      setCandles(res.data.candles || []);
    } catch {
      setCandles([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [symbol, market, selected]);

  const isUp = candles.length > 1 && candles[candles.length - 1]?.close >= candles[0]?.close;
  const color = isUp ? theme.up : theme.down;
  const intraday = period.interval === "5m" || period.interval === "15m";

  const formatX = (val) => {
    if (!val) return "";
    const d = new Date(val.replace(" ", "T"));
    return intraday
      ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <section className="panel" aria-label={`${symbol} price chart`}>
      <div className="panel-head">
        <h2 className="panel-title">Price</h2>
        <Segmented value={selected} onChange={setSelected} options={PERIODS} label="Chart period" />
      </div>
      <div className="panel-body" style={{ paddingLeft: 4 }}>
        {loading ? (
          <div className="skel" style={{ height: 300, margin: "0 12px" }} aria-label="Loading chart" />
        ) : candles.length === 0 ? (
          <div className="empty" style={{ height: 300, display: "grid", alignContent: "center" }}>
            <h3>{failed ? "Couldn't load the chart" : "No price history for this period"}</h3>
            <p>The price source may be busy or blocking requests. Try again in a minute.</p>
            <div><button className="btn" onClick={() => load()}><RefreshCw size={14} /> Retry</button></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={candles} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.ruleSoft} vertical={false} />
              <XAxis dataKey="time" tickFormatter={formatX} tick={{ fontSize: 11, fill: theme.mute }}
                tickLine={false} axisLine={{ stroke: theme.rule }} interval="preserveStartEnd" minTickGap={48} />
              <YAxis domain={["auto", "auto"]} orientation="right" width={68} tick={{ fontSize: 11, fill: theme.mute }}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => `${symbolOf(currency)}${v.toLocaleString()}`} />
              <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: theme.mute, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#fillPrice)"
                dot={false} activeDot={{ r: 4, fill: color, stroke: theme.ink }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
