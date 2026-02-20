interface PositionRowProps {
  marketQuestion: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
}

export function PositionRow({
  marketQuestion,
  outcome,
  size,
  avgPrice,
  currentPrice,
}: PositionRowProps) {
  const pnl = (currentPrice - avgPrice) * size;
  const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
  const isPositive = pnl >= 0;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-2 px-3 text-sm text-gray-900 max-w-[200px] truncate">
        {marketQuestion}
      </td>
      <td className="py-2 px-3 text-sm text-gray-500">{outcome}</td>
      <td className="py-2 px-3 text-sm text-gray-500 text-right">
        {size.toFixed(1)}
      </td>
      <td className="py-2 px-3 text-sm text-gray-500 text-right">
        ${avgPrice.toFixed(2)}
      </td>
      <td className="py-2 px-3 text-sm text-gray-500 text-right">
        ${currentPrice.toFixed(2)}
      </td>
      <td
        className={`py-2 px-3 text-sm text-right font-medium ${
          isPositive ? "text-[#34C759]" : "text-[#FF3B30]"
        }`}
      >
        {isPositive ? "+" : ""}${pnl.toFixed(2)} ({isPositive ? "+" : ""}
        {pnlPct.toFixed(1)}%)
      </td>
    </tr>
  );
}
