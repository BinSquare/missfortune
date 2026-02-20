"use client";

import {
  useDefaultTool,
  useRenderToolCall,
  useCoAgent,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { DefaultToolComponent } from "@/components/default-tool-ui";
import { MarketCard } from "@/components/market-card";
import { OrderBook } from "@/components/order-book";
import { PositionRow } from "@/components/position-row";

interface Market {
  id: string;
  question: string;
  outcomes: string[];
  outcome_prices: string[];
  volume: string;
  liquidity: string;
  end_date: string;
}

interface Position {
  market_question: string;
  outcome: string;
  size: number;
  avg_price: number;
  current_price: number;
}

interface AgentState {
  markets: Market[];
  positions: Position[];
  last_action: string;
}

const THEME = "#007AFF";

export default function MissFortunePage() {
  return (
    <main
      style={
        { "--copilot-kit-primary-color": THEME } as CopilotKitCSSProperties
      }
    >
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Miss Fortune",
          initial:
            "I'm Miss Fortune, your autonomous Polymarket trading agent. Ask me to find markets, analyze odds, or place bets.",
        }}
        suggestions={[
          {
            title: "Closing Soon",
            message: "Find bets closing in the next 24 hours, research them, and tell me which have the highest chance of winning",
          },
          {
            title: "Best Edges",
            message: "Find closing-soon markets where the odds look mispriced and show me the best opportunities",
          },
          {
            title: "Quick Wins",
            message: "What are the safest bets closing soon with the highest probability of winning?",
          },
        ]}
      >
        <Dashboard />
      </CopilotSidebar>
    </main>
  );
}

function Dashboard() {
  const { state } = useCoAgent<AgentState>({
    name: "strands_agent",
    initialState: {
      markets: [],
      positions: [],
      last_action: "",
    },
  });

  // Generative UI: render closing-soon markets
  useRenderToolCall({
    name: "get_closing_soon_markets",
    parameters: [
      { name: "hours", description: "Hours to look ahead", required: false },
      { name: "limit", description: "Max results", required: false },
    ],
    render: (props) => {
      if (props.status === "executing" || props.status === "inProgress") {
        return (
          <div className="text-purple-300 text-sm py-2 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Scanning for markets closing soon...
          </div>
        );
      }

      let markets: (Market & { hours_remaining?: number })[] = [];
      try {
        const parsed = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        if (Array.isArray(parsed)) markets = parsed;
      } catch { /* ignore */ }

      if (markets.length === 0) return <div className="text-gray-500 text-sm py-2">No closing-soon markets found.</div>;

      return (
        <div className="space-y-2 my-2">
          <div className="text-xs text-purple-400 font-medium uppercase tracking-wide">
            {markets.length} market{markets.length !== 1 ? "s" : ""} closing soon
          </div>
          <div className="grid grid-cols-1 gap-2">
            {markets.slice(0, 8).map((m, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm text-gray-200 font-medium leading-tight">{m.question}</p>
                  <span className="text-xs text-orange-400 whitespace-nowrap font-medium">
                    {m.hours_remaining != null ? `${m.hours_remaining}h left` : ""}
                  </span>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  {m.outcomes?.map((o, j) => (
                    <span key={j}>
                      {o}: <span className="text-gray-200 font-medium">{(Number(m.outcome_prices?.[j] || 0) * 100).toFixed(0)}%</span>
                    </span>
                  ))}
                  <span className="ml-auto">Vol: ${Number(m.volume || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
  });

  // Generative UI: render Exa research results
  useRenderToolCall({
    name: "exa_research",
    parameters: [
      { name: "query", description: "Research query", required: true },
      { name: "num_results", description: "Number of results", required: false },
    ],
    render: (props) => {
      if (props.status === "executing" || props.status === "inProgress") {
        return (
          <div className="text-purple-300 text-sm py-2 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Researching: &quot;{props.args.query}&quot;...
          </div>
        );
      }

      let sources: { title?: string; url?: string; published_date?: string; text?: string }[] = [];
      try {
        const parsed = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        if (Array.isArray(parsed)) sources = parsed;
      } catch { /* ignore */ }

      if (sources.length === 0) return <div className="text-gray-500 text-sm py-2">No research results found.</div>;

      return (
        <div className="space-y-2 my-2">
          <div className="text-xs text-purple-400 font-medium uppercase tracking-wide flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            {sources.length} source{sources.length !== 1 ? "s" : ""} found
          </div>
          {sources.map((s, i) => (
            <div key={i} className="bg-gray-800/80 border border-gray-700/50 rounded-lg p-3">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-300 hover:text-purple-200 font-medium underline decoration-purple-500/30">
                {s.title || s.url}
              </a>
              {s.published_date && (
                <span className="text-xs text-gray-500 ml-2">{s.published_date.split("T")[0]}</span>
              )}
              {s.text && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-3 leading-relaxed">{s.text.slice(0, 300)}{s.text.length > 300 ? "..." : ""}</p>
              )}
            </div>
          ))}
        </div>
      );
    },
  });

  // Generative UI: render search_markets results as a grid
  useRenderToolCall({
    name: "search_markets",
    parameters: [
      { name: "query", description: "Search query", required: true },
    ],
    render: (props) => {
      if (props.status === "executing" || props.status === "inProgress") {
        return (
          <div className="text-[#007AFF] text-sm py-2 flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Searching markets for &quot;{props.args.query}&quot;...
          </div>
        );
      }

      let markets: Market[] = [];
      try {
        const parsed =
          typeof props.result === "string"
            ? JSON.parse(props.result)
            : props.result;
        if (Array.isArray(parsed)) markets = parsed;
      } catch {
        /* ignore parse errors */
      }

      if (markets.length === 0) return <div className="text-gray-500 text-sm py-2">No markets found.</div>;

      return (
        <div className="grid grid-cols-1 gap-2 my-2">
          {markets.slice(0, 6).map((m, i) => (
            <MarketCard
              key={i}
              question={m.question}
              outcomes={m.outcomes}
              outcomePrices={m.outcome_prices}
              volume={m.volume}
              liquidity={m.liquidity}
              endDate={m.end_date}
            />
          ))}
        </div>
      );
    },
  });

  // Generative UI: render order book
  useRenderToolCall({
    name: "get_order_book",
    parameters: [
      { name: "token_id", description: "Token ID", required: true },
    ],
    render: (props) => {
      if (props.status === "executing" || props.status === "inProgress") {
        return (
          <div className="text-[#007AFF] text-sm py-2">
            Loading order book...
          </div>
        );
      }

      let book = { bids: [], asks: [] };
      try {
        const parsed =
          typeof props.result === "string"
            ? JSON.parse(props.result)
            : props.result;
        book = parsed;
      } catch {
        /* ignore */
      }

      return <OrderBook bids={book.bids} asks={book.asks} />;
    },
  });

  // Generative UI: render place_bet confirmation
  useRenderToolCall({
    name: "place_bet",
    parameters: [
      { name: "token_id", description: "Token ID", required: true },
      { name: "side", description: "BUY or SELL", required: true },
      { name: "price", description: "Limit price", required: true },
      { name: "size", description: "Number of shares", required: true },
    ],
    render: (props) => {
      const isExecuting =
        props.status === "executing" || props.status === "inProgress";

      let resultData: { status?: string; error?: string } = {};
      if (props.result) {
        try {
          resultData =
            typeof props.result === "string"
              ? JSON.parse(props.result)
              : props.result;
        } catch {
          /* ignore */
        }
      }

      return (
        <div className="bg-white rounded-2xl shadow-sm p-4 my-2 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#007AFF] text-xs font-medium uppercase tracking-wide">
              {isExecuting ? "Placing Order..." : "Order"}
            </span>
            {!isExecuting && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${resultData.error
                  ? "bg-red-500/20 text-red-300"
                  : "bg-green-500/20 text-green-300"
                  }`}
              >
                {resultData.error ? "Failed" : resultData.status || "Done"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Side</span>
              <p
                className={`font-medium ${props.args.side === "BUY" ? "text-[#34C759]" : "text-[#FF3B30]"}`}
              >
                {props.args.side}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Price</span>
              <p className="text-gray-900 font-medium">
                ${props.args.price}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Size</span>
              <p className="text-gray-900 font-medium">
                {props.args.size} shares
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Cost</span>
              <p className="text-gray-900 font-medium">
                ${(Number(props.args.price) * Number(props.args.size)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      );
    },
  });

  // Default tool render
  useDefaultTool({
    render: (props) => (
      <DefaultToolComponent themeColor={THEME} {...props} />
    ),
  });

  const markets = state.markets || [];
  const positions = state.positions || [];
  const lastAction = state.last_action || "";

  return (
    <div className="min-h-screen bg-[#f2f2f7] text-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center text-lg font-bold text-white">
              M
            </div>
            <h1 className="text-xl font-bold text-gray-900">Miss Fortune</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-[#34C759]" />
            Connected
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Markets grid */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Watchlist
          </h2>
          {markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((m, i) => (
                <MarketCard
                  key={m.id || i}
                  question={m.question}
                  outcomes={m.outcomes}
                  outcomePrices={m.outcome_prices}
                  volume={m.volume}
                  liquidity={m.liquidity}
                  endDate={m.end_date}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">
                No markets yet. Ask Miss Fortune to find some!
              </p>
            </div>
          )}
        </section>

        {/* Positions */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Positions
          </h2>
          {positions.length > 0 ? (
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="py-2 px-3 text-left">Market</th>
                    <th className="py-2 px-3 text-left">Outcome</th>
                    <th className="py-2 px-3 text-right">Size</th>
                    <th className="py-2 px-3 text-right">Avg Price</th>
                    <th className="py-2 px-3 text-right">Current</th>
                    <th className="py-2 px-3 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => (
                    <PositionRow
                      key={i}
                      marketQuestion={p.market_question}
                      outcome={p.outcome}
                      size={p.size}
                      avgPrice={p.avg_price}
                      currentPrice={p.current_price}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">
                No positions yet. Trading activates when wallet credentials are
                configured.
              </p>
            </div>
          )}
        </section>

        {/* Activity log */}
        {lastAction && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Last Activity
            </h2>
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 text-sm text-gray-500">
              {lastAction}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
