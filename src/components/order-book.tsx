interface OrderBookProps {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

function OrderRow({
  price,
  size,
  side,
  maxSize,
}: {
  price: string;
  size: string;
  side: "bid" | "ask";
  maxSize: number;
}) {
  const sizeNum = parseFloat(size);
  const widthPct = maxSize > 0 ? (sizeNum / maxSize) * 100 : 0;

  return (
    <div className="relative flex items-center justify-between px-2 py-0.5 text-xs font-mono">
      <div
        className="absolute inset-y-0 right-0 opacity-15"
        style={{
          width: `${widthPct}%`,
          backgroundColor: side === "bid" ? "#34C759" : "#FF3B30",
        }}
      />
      <span
        className={`z-10 ${
          side === "bid" ? "text-[#34C759]" : "text-[#FF3B30]"
        }`}
      >
        {parseFloat(price).toFixed(3)}
      </span>
      <span className="text-gray-500 z-10">{parseFloat(size).toFixed(1)}</span>
    </div>
  );
}

export function OrderBook({ bids, asks }: OrderBookProps) {
  const topBids = (bids || []).slice(0, 8);
  const topAsks = (asks || []).slice(0, 8);

  const allSizes = [...topBids, ...topAsks].map((o) => parseFloat(o.size));
  const maxSize = Math.max(...allSizes, 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-3 max-w-sm w-full">
      <h4 className="text-gray-900 text-xs font-medium mb-2 uppercase tracking-wide">
        Order Book
      </h4>

      <div className="flex justify-between px-2 text-[10px] text-gray-500 uppercase mb-1">
        <span>Price</span>
        <span>Size</span>
      </div>

      <div className="space-y-px">
        {topAsks
          .slice()
          .reverse()
          .map((ask, i) => (
            <OrderRow
              key={`ask-${i}`}
              price={ask.price}
              size={ask.size}
              side="ask"
              maxSize={maxSize}
            />
          ))}
      </div>

      <div className="border-t border-gray-200 my-1" />

      <div className="space-y-px">
        {topBids.map((bid, i) => (
          <OrderRow
            key={`bid-${i}`}
            price={bid.price}
            size={bid.size}
            side="bid"
            maxSize={maxSize}
          />
        ))}
      </div>
    </div>
  );
}
