"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — fixed filter enforcement at retrieval layer.
"""

import os
import asyncio
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

class AgentState(TypedDict):
    query: str
    filters: dict
    search_mode: str
    augmented_query: str   # query enriched with filter context for retrieval
    raw_context: str
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

    aug = state['query']
    if quarters:
        # Append date terms so LightRAG's similarity search biases toward those chunks
        date_terms = []
        for q in quarters:
            date_terms.extend(QUARTER_DATE_MAP.get(q, [q]))
        aug += f" (focusing on: {', '.join(quarters)}, period markers: {', '.join(date_terms[:6])})"
    if layers:
        aug += f" (restrict to semiconductor layers: {', '.join(layers)})"

    print(f"🗺️  [Architect] Mode={mode.upper()} | Quarters={quarters} | Layers={layers}")
    print(f"🔑  [Architect] Augmented query: {aug[:120]}...")
    return {"search_mode": mode, "augmented_query": aug}

async def researcher_node(state: AgentState):
    print(f"🔎 [Researcher] Querying for: '{state['augmented_query'][:80]}'")
    param = QueryParam(
        mode=state['search_mode'],
        top_k=20,
        only_need_context=True
    )
    response = await rag.aquery(state['augmented_query'], param=param)
    return {"raw_context": response}

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing...")
    f = state.get('filters', {})
    quarters = f.get('quarters', [])
    layers   = f.get('layers',   [])

    restriction = ""
    if quarters or layers:
        restriction = f"""
⚠️  CRITICAL FILTER — YOU MUST OBEY THIS:
- Only cite facts from these reporting periods: {', '.join(quarters) if quarters else 'all'}
- Only discuss these semiconductor layers: {', '.join(layers) if layers else 'all'}
- If a data point is from an excluded period, DO NOT include it. Say "outside filter scope" instead.
"""

    prompt = f"""You are the Head of Semiconductor Advisory at Element. Synthesize the following raw intelligence into a high-level strategic briefing.

USER QUERY: {state['query']}
{restriction}
RAW INTELLIGENCE (retrieved from filings):
{state['raw_context']}

ADVISORY STANDARDS:
1. PRIORITIZE RECENCY: If conflicting data, the most recent filing date wins.
2. MAP THE IMPACT: Explain how macro trends affect connected layers.
3. NO BOILERPLATE: Start immediately with the answer. Use bolding for entities and metrics.
4. CITE SOURCES: Always mention Ticker and Filing Period (e.g. NVDA Q1 2026) for every fact.
5. FILTER COMPLIANCE: If quarters filter is set, only cite data from those periods.
"""
    briefing = await openai_model_complete(prompt, system_prompt="You are an elite semiconductor investment analyst.")
    return {"synthesized_answer": briefing}

workflow = StateGraph(AgentState)
workflow.add_node("architect",  architect_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("analyst",    analyst_node)
workflow.add_edge(START, "architect")
workflow.add_edge("architect", "researcher")
workflow.add_edge("researcher", "analyst")
workflow.add_edge("analyst", END)
engine = workflow.compile()

async def run_intelligence_briefing(query: str, filters: dict = None):
    initial_state = {
        "query": query,
        "filters": filters or {},
        "search_mode": "local",
        "augmented_query": query,
        "raw_context": "",
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
