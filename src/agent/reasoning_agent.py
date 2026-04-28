"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — fixed filter enforcement at retrieval layer.
"""

import os
import asyncio
import re
from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, START, END
from src.retrieval.indexing_pipeline import rag, openai_model_complete
from lightrag import QueryParam

# Quarter → date range keywords injected into query to bias retrieval
QUARTER_DATE_MAP = {
    "Q1 2025": ["Q1_2025", "2025-01", "2025-02", "2025-03", "January 2025", "February 2025", "March 2025"],
    "Q2 2025": ["Q2_2025", "2025-04", "2025-05", "2025-06", "April 2025", "May 2025", "June 2025"],
    "Q3 2025": ["Q3_2025", "2025-07", "2025-08", "2025-09", "July 2025", "August 2025", "September 2025"],
    "Q4 2025": ["Q4_2025", "2025-10", "2025-11", "2025-12", "October 2025", "November 2025", "December 2025"],
    "Q1 2026": ["Q1_2026", "2026-01", "2026-02", "2026-03", "January 2026", "February 2026", "March 2026"],
    "Q2 2026": ["Q2_2026", "2026-04", "2026-05", "2026-06", "April 2026", "May 2026", "June 2026"],
}

# Maps each semiconductor vertical → company tickers in the dataset
VERTICAL_TICKER_MAP = {
    "AI / GPU":        ["NVDA", "AMD", "INTC"],
    "Foundry / EMS":   ["TSM", "SSNLF", "GFS", "TSMC"],
    "Equipment":       ["AMAT", "LRCX", "KLAC", "ASML"],
    "Memory":          ["MU", "WDC", "STX"],
    "Analog / Power":  ["TXN", "ADI", "MCHP", "ON"],
    "Networking / RF": ["AVGO", "QCOM", "MRVL"],
}

class AgentState(TypedDict):
    query: str
    filters: dict
    search_mode: str
    augmented_query: str
    raw_context: str
    filtered_context: str   # deterministically stripped
    synthesized_answer: str
    sources: List[str]

async def architect_node(state: AgentState):
    query = state['query'].lower()
    if any(w in query for w in ["industry", "market", "trend", "bottleneck", "global", "supply chain", "compare"]):
        mode = "global"
    else:
        mode = "local"

    # --- Build augmented query with temporal/layer context ---
    f = state.get('filters', {})
    quarters = f.get('quarters', [])
    layers   = f.get('layers',   [])

    # If the user query mentions a vertical (e.g. "memory") but the filter isn't checked,
    # we automatically check it for the retrieval step to bias results.
    detected_layers = list(layers)
    for l_key, l_tickers in VERTICAL_TICKER_MAP.items():
        if l_key.lower().replace(' ', '').split('/')[0] in query.replace(' ', ''):
            if l_key not in detected_layers:
                detected_layers.append(l_key)

    aug = state['query']
    if quarters:
        date_terms = []
        for q in quarters:
            date_terms.extend(QUARTER_DATE_MAP.get(q, [q]))
        aug += f" (Focus on periods: {', '.join(date_terms)})"
    
    if detected_layers:
        ticker_bias = []
        for l in detected_layers:
            ticker_bias.extend(VERTICAL_TICKER_MAP.get(l, []))
        if ticker_bias:
            aug += f" (Prioritize data for: {', '.join(ticker_bias)})"

    print(f"📐 [Architect] Mode: {mode} | AugQuery: {aug}")
    return {"search_mode": mode, "augmented_query": aug}

async def researcher_node(state: AgentState):
    print(f"🔎 [Researcher] Querying for: '{state['augmented_query'][:80]}'")
    param = QueryParam(
        mode=state['search_mode'],
        top_k=20,
        only_need_context=True
    )
    response = await rag.aquery(state['augmented_query'], param=param)
    # aquery with only_need_context=True may return a QueryContext object — always coerce to str
    raw = response if isinstance(response, str) else str(response)
    return {"raw_context": raw}


# ── DETERMINISTIC FILTER NODE ─────────────────────────────────────────────────
# Strips chunks whose Period tag doesn't match active quarters.
# LightRAG returns raw_context as a text block that includes SOURCE INFO headers
# from each retrieved chunk. We split on those headers and drop non-matching ones.
QUARTER_PERIOD_MAP = {
    "Q1 2025": "Q1_2025", "Q2 2025": "Q2_2025",
    "Q3 2025": "Q3_2025", "Q4 2025": "Q4_2025",
    "Q1 2026": "Q1_2026", "Q2 2026": "Q2_2026",
}

async def filter_node(state: AgentState):
    quarters = state.get('filters', {}).get('quarters', [])
    raw = state['raw_context']

    # If neither quarter nor layer filters active, pass everything through
    layers_raw = state.get('filters', {}).get('layers', [])
    if not quarters and not layers_raw:
        print("🔓 [Filter] No filters active — passing full context")
        return {"filtered_context": raw}

    allowed_periods = {QUARTER_PERIOD_MAP.get(q, q.replace(' ', '_')) for q in quarters}
    if allowed_periods:
        print(f"🔒 [Filter] Enforcing periods: {allowed_periods}")

    # Also build allowed tickers from vertical filter
    f = state.get('filters', {})
    layers = f.get('layers', [])
    allowed_tickers: set = set()
    for layer in layers:
        for ticker in VERTICAL_TICKER_MAP.get(layer, []):
            allowed_tickers.add(ticker.upper())
    if allowed_tickers:
        print(f"🔒 [Filter] Enforcing verticals → tickers: {allowed_tickers}")

    # Split on SOURCE INFO headers — enforce period AND ticker filters
    blocks = re.split(r'(?=--- SOURCE INFO ---)', raw)
    kept, dropped = [], 0
    for block in blocks:
        period_match = re.search(r'Period:\s*([\w_]+)', block)
        ticker_match = re.search(r'Ticker:\s*(\w+)',    block)

        if period_match:
            period    = period_match.group(1)
            ticker    = ticker_match.group(1).upper() if ticker_match else None
            period_ok = (not allowed_periods) or period in allowed_periods
            ticker_ok = (not allowed_tickers) or (ticker and ticker in allowed_tickers)
            if period_ok and ticker_ok:
                kept.append(block)
            else:
                dropped += 1
        else:
            # No SOURCE INFO header — keep (LightRAG connector blocks)
            kept.append(block)

    filtered = ''.join(kept)
    print(f"🔒 [Filter] Kept {len(kept)} blocks, dropped {dropped} out-of-scope blocks")

    if not filtered.strip():
        scope = ', '.join(quarters) if quarters else 'all periods'
        if allowed_tickers:
            scope += f" | {', '.join(layers)}"
        filtered = f"[No data found for the selected scope: {scope}.]"

    return {"filtered_context": filtered}

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing...")
    context = state.get('filtered_context', '').strip()
    
    # HARD BLOCK: Only if context is genuinely empty or a failure message.
    if not context or "[No data found" in context:
        # If the user specifically asked for 2023, be firm but helpful.
        if "2023" in state['query']:
            return {"synthesized_answer": "I'm sorry, but we don't have historical data for 2023 in the database. I can provide insights for 2025 and 2026 if you'd like."}
        return {"synthesized_answer": "I found some sources, but they don't contain specific facts for that query. Try broadening your vertical filters."}

    f = state.get('filters', {})
    quarters = f.get('quarters', [])
    layers   = f.get('layers',   [])

    layer_note  = f"\n- VERTICALS: {', '.join(layers)}" if layers else ""
    period_note = f"\n- PERIODS: {', '.join(quarters)}" if quarters else ""

    prompt = f"""You are the Head of Semiconductor Advisory at Element. Synthesize the context below into a strategic briefing.

USER QUERY: {state['query']}{period_note}{layer_note}

⛔ ANTI-HALLUCINATION RULES:
1. USE ONLY THE RAW INTELLIGENCE BELOW. NEVER use training data (especially about 2023).
2. Every fact MUST be cited with (TICKER PERIOD).
3. If the context is sparse, provide the best summary possible based on what IS there (e.g. mentions from equipment suppliers), but clearly state any data gaps.

RAW INTELLIGENCE:
{context}

FORMAT:
- Bold key findings.
- Use bullet points.
- Cited sources on every line.
"""
    briefing = await openai_model_complete(prompt, system_prompt="You are an elite analyst. You only speak from provided context. You refuse to use outside knowledge.")
    return {"synthesized_answer": briefing}

workflow = StateGraph(AgentState)
workflow.add_node("architect",  architect_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("filter",     filter_node)
workflow.add_node("analyst",    analyst_node)
workflow.add_edge(START, "architect")
workflow.add_edge("architect", "researcher")
workflow.add_edge("researcher", "filter")
workflow.add_edge("filter", "analyst")
workflow.add_edge("analyst", END)
engine = workflow.compile()

async def run_intelligence_briefing(query: str, filters: dict = None):
    initial_state = {
        "query": query,
        "filters": filters or {},
        "search_mode": "local",
        "augmented_query": query,
        "raw_context": "",
        "filtered_context": "",   # must be initialised — analyst_node reads this
        "synthesized_answer": "",
        "sources": []
    }
    print("\n" + "═"*60)
    print("🚀 [NABR ENGINE] INITIATING STRATEGIC SYNTHESIS")
    print("═"*60)
    final_state = await engine.ainvoke(initial_state)
    print("✅ [NABR ENGINE] BRIEFING COMPLETE\n")
    return final_state['synthesized_answer']

if __name__ == "__main__":
    asyncio.run(run_intelligence_briefing(
        "What is NVIDIA's Blackwell outlook?",
        filters={"quarters": ["Q1 2026"], "layers": []}
    ))
