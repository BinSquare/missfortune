interface MarketCardProps {
  question: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  recommendation?: string;
  confidence?: number;
  reasoning?: string;
  edge?: number;
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

export function MarketCard({
  question,
  outcomes,
  outcomePrices,
  volume,
  liquidity,
  endDate,
  recommendation,
  confidence,
  reasoning,
  edge,
}: MarketCardProps) {
  const hasAnalysis = !!recommendation;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <h3 className="text-gray-900 font-medium text-sm mb-3 line-clamp-2">
        {question}
      </h3>

      <div className="space-y-2 mb-3">
        {outcomes.map((outcome, i) => {
          const price = parseFloat(outcomePrices[i] || "0");
          const pct = (price * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-500 text-xs w-12 shrink-0 truncate">
                {outcome}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center px-2 text-xs font-medium text-white"
                  style={{
                    width: `${Math.max(price * 100, 8)}%`,
                    backgroundColor:
                      i === 0 ? "#34C759" : "#FF3B30",
                  }}
                >
                  {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasAnalysis && (
        <div className="mb-3 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                recommendation!.toLowerCase().includes("yes")
                  ? "bg-[#34C759]/10 text-[#34C759]"
                  : "bg-[#FF3B30]/10 text-[#FF3B30]"
              }`}
            >
              {recommendation}
            </span>
            {edge != null && edge !== 0 && (
              <span className="text-xs font-medium text-[#007AFF]">
                {edge > 0 ? "+" : ""}{(edge * 100).toFixed(0)}% edge
              </span>
            )}
          </div>
          {confidence != null && confidence > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#007AFF]"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {reasoning && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {reasoning}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5" title="Volume">
          Vol {formatNumber(volume)}
        </span>
        <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5" title="Liquidity">
          Liq {formatNumber(liquidity)}
        </span>
        {endDate && (
          <span className="ml-auto text-gray-500">
            {new Date(endDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
