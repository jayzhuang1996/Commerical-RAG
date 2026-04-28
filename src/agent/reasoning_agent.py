"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — REVERTED TO STABILITY.
Removed aggressive hard-blocks to prevent "false positive" data denials.
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
    filtered_context: str
    synthesized_answer: str
    sources: List[str]

async def architect_node(state: AgentState):
    query = state['query'].lower()
    if any(w in query for w in ["industry", "market", "trend", "bottleneck", "global", "supply chain", "compare"]):
        mode = "global"
    else:
        mode = "local"

    f = state.get('filters', {})
    quarters = f.get('quarters', [])
    layers   = f.get('layers',   [])

    # Simple bias injection
    aug = state['query']
    if quarters:
        date_terms = []
        for q in quarters:
            date_terms.extend(QUARTER_DATE_MAP.get(q, [q]))
        aug += f" (Focus on: {', '.join(date_terms)})"
    
    # Vertical bias
    bias_layers = list(layers)
    for l_key, l_tickers in VERTICAL_TICKER_MAP.items():
        if l_key.lower().split('/')[0].strip() in query:
            if l_key not in bias_layers:
                bias_layers.append(l_key)

    if bias_layers:
        tickers = []
        for bl in bias_layers:
            tickers.extend(VERTICAL_TICKER_MAP.get(bl, []))
        if tickers:
            aug += f" (Prioritize: {', '.join(tickers)})"

    print(f"📐 [Architect] Mode: {mode} | AugQuery: {aug}")
    return {"search_mode": mode, "augmented_query": aug}

async def researcher_node(state: AgentState):
    print(f"🔎 [Researcher] Querying: '{state['augmented_query'][:80]}'")
    param = QueryParam(mode=state['search_mode'], top_k=20, only_need_context=True)
    response = await rag.aquery(state['augmented_query'], param=param)
    raw = response if isinstance(response, str) else str(response)
    return {"raw_context": raw}

QUARTER_PERIOD_MAP = {
    "Q1 2025": "Q1_2025", "Q2 2025": "Q2_2025",
    "Q3 2025": "Q3_2025", "Q4 2025": "Q4_2025",
    "Q1 2026": "Q1_2026", "Q2 2026": "Q2_2026",
}

async def filter_node(state: AgentState):
    quarters = state.get('filters', {}).get('quarters', [])
    raw = state['raw_context']

    # If no period filters, pass through (no aggressive ticker filtering)
    if not quarters:
        return {"filtered_context": raw}

    allowed_periods = {QUARTER_PERIOD_MAP.get(q, q.replace(' ', '_')) for q in quarters}
    
    # Relaxed split
    blocks = re.split(r'(?=--- SOURCE INFO ---)', raw)
    kept = []
    for block in blocks:
        period_match = re.search(r'Period:\s*([\w_]+)', block)
        if period_match:
            period = period_match.group(1)
            if period in allowed_periods:
                kept.append(block)
        else:
            kept.append(block)

    filtered = ''.join(kept)
    if not filtered.strip():
        filtered = f"[Note: No direct filings match the selected periods. Context below is for general reference.]\n\n{raw}"

    return {"filtered_context": filtered}

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing...")
    context = state.get('filtered_context', '').strip()
    
    # NO HARD BLOCK. Let the LLM handle empty context.

    prompt = f"""You are the Head of Semiconductor Advisory at Element. Synthesize the provided context into a strategic briefing.

USER QUERY: {state['query']}

STRICT RULE: USE ONLY THE RAW INTELLIGENCE PROVIDED BELOW. Do NOT use outside training data.
CITE EVERY FACT with (TICKER PERIOD).

RAW INTELLIGENCE:
{context}

If the context does not contain enough information to answer, state that clearly and mention what periods the available data covers.
"""
    briefing = await openai_model_complete(prompt, system_prompt="You are an elite analyst. You only speak from provided context.")
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
        "filtered_context": "",
        "synthesized_answer": "",
        "sources": []
    }
    final_state = await engine.ainvoke(initial_state)
    return final_state['synthesized_answer']
