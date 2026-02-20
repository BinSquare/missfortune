"""Miss Fortune — Autonomous Polymarket Trading Agent.

Phase 1: Read-only market discovery, analysis, and watchlisting.
Phase 2: Trading (activates when POLYMARKET_PRIVATE_KEY is set).
"""

import json
import os

import requests
from ag_ui_strands import (
    StrandsAgent,
    StrandsAgentConfig,
    ToolBehavior,
    create_strands_app,
)
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from strands import Agent, tool
from strands.models.openai import OpenAIModel

load_dotenv()

# ---------------------------------------------------------------------------
# State models
# ---------------------------------------------------------------------------


class Market(BaseModel):
    id: str = ""
    question: str = ""
    outcomes: list[str] = Field(default_factory=list)
    outcome_prices: list[str] = Field(default_factory=list)
    volume: str = ""
    liquidity: str = ""
    end_date: str = ""


class Position(BaseModel):
    market_question: str = ""
    outcome: str = ""
    size: float = 0.0
    avg_price: float = 0.0
    current_price: float = 0.0


class AgentState(BaseModel):
    markets: list[Market] = Field(default_factory=list)
    positions: list[Position] = Field(default_factory=list)
    last_action: str = ""


# ---------------------------------------------------------------------------
# Read-only tools (no auth required)
# ---------------------------------------------------------------------------

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"


@tool
def search_markets(query: str, limit: int = 10):
    """Search Polymarket for prediction markets matching a query.

    Args:
        query: Search term (e.g. "crypto", "election", "AI").
        limit: Maximum number of results to return (default 10).

    Returns:
        JSON string of matching markets with outcomes and prices.
    """
    try:
        resp = requests.get(
            f"{GAMMA_API}/events",
            params={"title": query, "limit": limit, "active": True, "closed": False},
            timeout=15,
        )
        resp.raise_for_status()
        events = resp.json()

        results = []
        for event in events:
            for mkt in event.get("markets", []):
                results.append(
                    {
                        "id": mkt.get("id", ""),
                        "question": mkt.get("question", ""),
                        "outcomes": json.loads(mkt.get("outcomes", "[]")),
                        "outcome_prices": json.loads(
                            mkt.get("outcomePrices", "[]")
                        ),
                        "volume": mkt.get("volume", "0"),
                        "liquidity": mkt.get("liquidity", "0"),
                        "end_date": mkt.get("endDate", ""),
                    }
                )
        return json.dumps(results[:limit], indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_market_details(market_id: str):
    """Get full details for a specific Polymarket market.

    Args:
        market_id: The market ID to look up.

    Returns:
        JSON string with full market info including clobTokenIds and tick size.
    """
    try:
        resp = requests.get(f"{GAMMA_API}/markets/{market_id}", timeout=15)
        resp.raise_for_status()
        mkt = resp.json()
        return json.dumps(
            {
                "id": mkt.get("id", ""),
                "question": mkt.get("question", ""),
                "description": mkt.get("description", "")[:500],
                "outcomes": json.loads(mkt.get("outcomes", "[]")),
                "outcome_prices": json.loads(mkt.get("outcomePrices", "[]")),
                "volume": mkt.get("volume", "0"),
                "liquidity": mkt.get("liquidity", "0"),
                "end_date": mkt.get("endDate", ""),
                "clob_token_ids": json.loads(mkt.get("clobTokenIds", "[]")),
                "neg_risk": mkt.get("negRisk", False),
            },
            indent=2,
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_order_book(token_id: str):
    """Get the order book (bid/ask depth) for a market outcome token.

    Args:
        token_id: The CLOB token ID for the outcome.

    Returns:
        JSON string with bids and asks arrays.
    """
    try:
        resp = requests.get(
            f"{CLOB_API}/book", params={"token_id": token_id}, timeout=15
        )
        resp.raise_for_status()
        book = resp.json()
        return json.dumps(book, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_price_history(token_id: str):
    """Get historical price data for a market outcome token.

    Args:
        token_id: The CLOB token ID for the outcome.

    Returns:
        JSON string with historical price points.
    """
    try:
        resp = requests.get(
            f"{CLOB_API}/prices-history",
            params={"market": token_id, "interval": "all"},
            timeout=15,
        )
        resp.raise_for_status()
        history = resp.json()
        return json.dumps(history, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def update_watchlist(markets: AgentState):
    """Update the shared watchlist/state with discovered markets and positions.

    IMPORTANT: Always provide the entire state, not just new items.

    Args:
        markets: The complete updated agent state.

    Returns:
        Success message.
    """
    return "Watchlist updated successfully"


# ---------------------------------------------------------------------------
# Phase 2: Trading tools (require POLYMARKET_PRIVATE_KEY)
# ---------------------------------------------------------------------------

clob_client = None
if os.getenv("POLYMARKET_PRIVATE_KEY"):
    try:
        from py_clob_client.client import ClobClient

        _temp = ClobClient(
            "https://clob.polymarket.com",
            key=os.getenv("POLYMARKET_PRIVATE_KEY"),
            chain_id=137,
        )
        _creds = _temp.create_or_derive_api_creds()
        clob_client = ClobClient(
            "https://clob.polymarket.com",
            key=os.getenv("POLYMARKET_PRIVATE_KEY"),
            chain_id=137,
            creds=_creds,
            signature_type=0,
            funder=os.getenv("POLYMARKET_FUNDER_ADDRESS"),
        )
    except Exception as e:
        print(f"Warning: Could not initialize trading client: {e}")


@tool
def get_positions():
    """Fetch current positions for the configured wallet.

    Returns:
        JSON string of current positions or error message.
    """
    if clob_client is None:
        return "Trading not configured. Set POLYMARKET_PRIVATE_KEY."
    try:
        positions = clob_client.get_positions()
        return json.dumps(positions, indent=2, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def place_bet(token_id: str, side: str, price: float, size: float):
    """Place a limit order on a Polymarket outcome.

    Args:
        token_id: The CLOB token ID for the outcome to bet on.
        side: "BUY" or "SELL".
        price: Limit price (0.01 to 0.99).
        size: Number of shares.

    Returns:
        Order confirmation or error message.
    """
    if clob_client is None:
        return "Trading not configured. Set POLYMARKET_PRIVATE_KEY."
    try:
        from py_clob_client.order_builder.constants import BUY, SELL

        order_side = BUY if side.upper() == "BUY" else SELL
        order = clob_client.create_and_post_order(
            {
                "token_id": token_id,
                "price": price,
                "size": size,
                "side": order_side,
            }
        )
        return json.dumps(
            {"status": "placed", "order": order}, indent=2, default=str
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def cancel_order(order_id: str):
    """Cancel an open order.

    Args:
        order_id: The order ID to cancel.

    Returns:
        Cancellation confirmation or error message.
    """
    if clob_client is None:
        return "Trading not configured. Set POLYMARKET_PRIVATE_KEY."
    try:
        result = clob_client.cancel(order_id)
        return json.dumps(
            {"status": "cancelled", "result": result}, indent=2, default=str
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


# ---------------------------------------------------------------------------
# State management (AG-UI pattern)
# ---------------------------------------------------------------------------


def build_market_prompt(input_data, user_message: str) -> str:
    """Inject current watchlist and positions into the prompt context."""
    state_dict = getattr(input_data, "state", None)
    if isinstance(state_dict, dict):
        parts = []
        if state_dict.get("markets"):
            parts.append(
                f"Current watchlist:\n{json.dumps(state_dict['markets'], indent=2)}"
            )
        if state_dict.get("positions"):
            parts.append(
                f"Current positions:\n{json.dumps(state_dict['positions'], indent=2)}"
            )
        if state_dict.get("last_action"):
            parts.append(f"Last action: {state_dict['last_action']}")
        if parts:
            return "\n\n".join(parts) + f"\n\nUser request: {user_message}"
    return user_message


async def market_state_from_args(context):
    """Extract market state from update_watchlist tool arguments."""
    try:
        tool_input = context.tool_input
        if isinstance(tool_input, str):
            tool_input = json.loads(tool_input)

        markets_data = tool_input.get("markets", tool_input)

        if isinstance(markets_data, dict):
            return {
                "markets": markets_data.get("markets", []),
                "positions": markets_data.get("positions", []),
                "last_action": markets_data.get("last_action", ""),
            }
        return None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Agent configuration
# ---------------------------------------------------------------------------

shared_state_config = StrandsAgentConfig(
    state_context_builder=build_market_prompt,
    tool_behaviors={
        "update_watchlist": ToolBehavior(
            skip_messages_snapshot=True,
            state_from_args=market_state_from_args,
        )
    },
)

api_key = os.getenv("OPENAI_API_KEY", "")
model = OpenAIModel(
    client_args={"api_key": api_key},
    model_id="gpt-4o",
)

system_prompt = (
    "You are Miss Fortune, an autonomous Polymarket trading agent. You analyze prediction markets, "
    "evaluate probabilities, and make betting decisions. You have access to real-time market data "
    "from Polymarket. When the user asks you to find opportunities, analyze markets thoroughly — "
    "look at current prices, liquidity, and recent price movements before making recommendations "
    "or placing bets. Always explain your reasoning."
)

all_tools = [
    search_markets,
    get_market_details,
    get_order_book,
    get_price_history,
    update_watchlist,
    get_positions,
    place_bet,
    cancel_order,
]

strands_agent = Agent(
    model=model,
    system_prompt=system_prompt,
    tools=all_tools,
)

agui_agent = StrandsAgent(
    agent=strands_agent,
    name="strands_agent",
    description="Miss Fortune — an autonomous Polymarket trading agent that discovers markets, analyzes odds, and places bets",
    config=shared_state_config,
)

agent_path = os.getenv("AGENT_PATH", "/")
app = create_strands_app(agui_agent, agent_path)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("AGENT_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
