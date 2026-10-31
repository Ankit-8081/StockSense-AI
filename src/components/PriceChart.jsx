import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { stocksAPI } from "../services/api";

const PERIODS = [
  { label: "1D",  period: "1d",  interval: "5m" },
  { label: "1W",  period: "5d",  interval: "15m" },
  { label: "1M",  period: "1mo", interval: "1d" },
  { label: "3M",  period: "3mo", interval: "1d" },
  { label: "6M",  period: "6mo", interval: "1d" },
  { label: "1Y",  period: "1y",  interval: "1d" },
];

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sym = currency === "INR" ? "₹" : "$";
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm space-y-1">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="font-semibold text-gray-900 dark:text-white">{sym}{d.close?.toLocaleString()}</p>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>H: {sym}{d.high}</span>
        <span>L: {sym}{d.low}</span>
        <span>V: {d.volume?.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function PriceChart({ symbol, market, currency = "INR", fetchHistory = stocksAPI.history }) {
  const [selected, setSelected] = useState(PERIODS[2]);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (p) => {
    setSelected(p);
    setLoading(true);
    try {
      const res = await fetchHistory(symbol, market, p.period, p.interval);
      setCandles(res.data.candles || []);
    } catch {
      setCandles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(PERIODS[2]); }, [symbol, market]);

  const isUp = candles.length > 1 && candles[candles.length - 1]?.close >= candles[0]?.close;
  const color = isUp ? "#10b981" : "#ef4444";

  const formatX = (val) => {
    if (!val) return "";
    const d = new Date(val.replace(" ", "T"));
    if (selected.interval === "5m" || selected.interval === "15m")
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{symbol} price chart</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.label} onClick={() => load(p)}
              className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                selected.label === p.label
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
      ) : candles.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={candles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" />
            <XAxis dataKey="time" tickFormatter={formatX} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} width={65}
              tickFormatter={(v) => `${currency === "INR" ? "₹" : "$"}${v.toLocaleString()}`} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2}
              fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: color }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
