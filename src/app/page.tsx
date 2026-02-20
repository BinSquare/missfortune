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

const THEME = "#7c3aed";

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
            title: "Trending Markets",
            message: "Find trending prediction markets",
          },
          {
            title: "Crypto Markets",
            message: "Analyze the top crypto markets",
          },
          {
            title: "Opportunities",
            message: "What markets have the best opportunities?",
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

  // Generative UI: render search_markets results as a grid
  useRenderToolCall({
    name: "search_markets",
    parameters: [
      { name: "query", description: "Search query", required: true },
    ],
    render: (props) => {
      if (props.status === "executing" || props.status === "inProgress") {
        return (
          <div className="text-purple-300 text-sm py-2 flex items-center gap-2">
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
          <div className="text-purple-300 text-sm py-2">
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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 my-2 max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400 text-xs font-medium uppercase tracking-wide">
              {isExecuting ? "Placing Order..." : "Order"}
            </span>
            {!isExecuting && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  resultData.error
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
                className={`font-medium ${props.args.side === "BUY" ? "text-green-400" : "text-red-400"}`}
              >
                {props.args.side}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Price</span>
              <p className="text-gray-300 font-medium">
                ${props.args.price}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Size</span>
              <p className="text-gray-300 font-medium">
                {props.args.size} shares
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Cost</span>
              <p className="text-gray-300 font-medium">
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-lg font-bold">
              M
            </div>
            <h1 className="text-xl font-bold text-white">Miss Fortune</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Markets grid */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">
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
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
              <p className="text-gray-500">
                No markets yet. Ask Miss Fortune to find some!
              </p>
            </div>
          )}
        </section>

        {/* Positions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-3">
            Positions
          </h2>
          {positions.length > 0 ? (
            <div className="overflow-x-auto bg-gray-800/50 border border-gray-700/50 rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-xs text-gray-500 uppercase">
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
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center">
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
            <h2 className="text-lg font-semibold text-gray-300 mb-3">
              Last Activity
            </h2>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-400">
              {lastAction}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
