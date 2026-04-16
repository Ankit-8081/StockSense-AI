import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from "lucide-react";
import clsx from "clsx";

const DIRECTION_CONFIG = {
  UP: {
    icon: TrendingUp,
    label: "Bullish",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    icon_color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  DOWN: {
    icon: TrendingDown,
    label: "Bearish",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon_color: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
  NEUTRAL: {
    icon: Minus,
    label: "Neutral",
    bg: "bg-gray-50 dark:bg-gray-900",
    border: "border-gray-200 dark:border-gray-700",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon_color: "text-gray-500",
    bar: "bg-gray-400",
  },
};

function SentimentDot({ label, score }) {
  const color = score > 0.2 ? "bg-emerald-500" : score < -0.2 ? "bg-red-500" : "bg-yellow-400";
  return (
    <div className="flex items-center gap-2">
      <span className={clsx("w-2 h-2 rounded-full", color)} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 ml-auto">
        {score > 0 ? "+" : ""}{(score * 100).toFixed(0)}
      </span>
    </div>
  );
}

function SignalRow({ label, value }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

export default function PredictionCard({ data, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const cfg = DIRECTION_CONFIG[data.direction] || DIRECTION_CONFIG.NEUTRAL;
  const Icon = cfg.icon;
  const confidencePct = Math.round(data.confidence * 100);
  const signals = data.technical?.signals || {};

  return (
    <div className={clsx("rounded-2xl border p-6 space-y-5 transition-all", cfg.bg, cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {data.prediction_type === "intraday" ? "Intraday Prediction" : "Delivery / Swing"}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {data.symbol}
            <span className="text-sm font-normal text-gray-400 ml-2">{data.market}</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
            {data.currency === "INR" ? "₹" : "$"}{data.current_price?.toLocaleString()}
          </p>
        </div>
        <div className={clsx("flex flex-col items-center gap-1 rounded-xl px-4 py-3", cfg.badge)}>
          <Icon className={clsx("w-7 h-7", cfg.icon_color)} strokeWidth={2.5} />
          <span className="text-sm font-bold">{cfg.label}</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>Confidence</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{confidencePct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={clsx("h-2 rounded-full transition-all duration-700", cfg.bar)}
            style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {/* Target range */}
      {data.target_range && (
        <div className="flex gap-3">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Expected range</p>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              +{data.target_range.low}% – +{data.target_range.high}%
            </p>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">News coverage</p>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {data.news_count} articles
            </p>
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Signal breakdown
        </p>
        <SentimentDot label="News sentiment" score={data.sentiment?.score ?? 0} />
        <SentimentDot label="Technical score" score={data.technical?.score ?? 0} />
        <SentimentDot label="Combined score" score={data.combined_score ?? 0} />
      </div>

      {/* Technical signals */}
      {Object.keys(signals).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Technical signals
          </p>
          <SignalRow label="RSI (14)" value={signals.rsi} />
          <SignalRow label="MACD" value={signals.macd} />
          <SignalRow label="BB Position" value={signals.bb_position} />
          <SignalRow label="SMA 20" value={signals.sma20} />
          <SignalRow label="SMA 50" value={signals.sma50} />
          <SignalRow label="VWAP" value={signals.vwap} />
          <SignalRow label="Volume ratio" value={signals.volume_ratio} />
        </div>
      )}

      {/* AI reasoning */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          AI analysis
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {data.reasoning}
        </p>
      </div>

      {/* Key risks */}
      {data.key_risks?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.key_risks.map((risk, i) => (
            <span key={i} className="flex items-center gap-1 text-xs bg-yellow-50 dark:bg-yellow-950
              text-yellow-700 dark:text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-3 h-3" />
              {risk}
            </span>
          ))}
        </div>
      )}

      {/* Sentiment themes */}
      {data.sentiment?.key_themes?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">News themes</p>
          <div className="flex flex-wrap gap-2">
            {data.sentiment.key_themes.map((t, i) => (
              <span key={i} className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700
                dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
