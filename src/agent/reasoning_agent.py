"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — MAXIMUM RECALL MODE.
Removed ALL restrictive filters and denial logic.
"""

import os
import asyncio
import re
from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, START, END
from src.retrieval.indexing_pipeline import rag, openai_model_complete
from lightrag import QueryParam

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
    synthesized_answer: str
    sources: List[str]

async def architect_node(state: AgentState):
    query = state['query'].lower()
    
    # Simple mode detection
    if any(w in query for w in ["industry", "market", "trend", "bottleneck", "global", "supply chain"]):
        mode = "global"
    else:
        mode = "local"

    # Minimal augmentation — just help with typos and vertical bias
    aug = state['query']
    
    # If a vertical keyword is found, help the search engine
    for vertical, tickers in VERTICAL_TICKER_MAP.items():
        v_norm = vertical.lower().replace('/', ' ').split()
        if any(word in query for word in v_norm if len(word) > 3):
            aug += f" (Specifically look for {', '.join(tickers)} context)"
    
    # Typo correction for common companies
    if "navidia" in query or "nvidia" in query:
        aug += " (Focus on NVIDIA / NVDA)"
    if "micron" in query:
        aug += " (Focus on MU)"

    print(f"📐 [Architect] AugQuery: {aug}")
    return {"search_mode": mode, "augmented_query": aug}

async def researcher_node(state: AgentState):
    print(f"🔎 [Researcher] Querying: '{state['augmented_query'][:80]}'")
    param = QueryParam(mode=state['search_mode'], top_k=30, only_need_context=True)
    response = await rag.aquery(state['augmented_query'], param=param)
    raw = response if isinstance(response, str) else str(response)
    return {"raw_context": raw}

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing...")
    context = state.get('raw_context', '').strip()
    
    # The system prompt is now more encouraging.
    prompt = f"""You are a Strategic Analyst at element. Summarize the provided Raw Intelligence into a detailed briefing.

USER QUERY: {state['query']}

RULES:
1. Synthesize all relevant facts found in the context.
2. Cite sources using (TICKER PERIOD) where possible.
3. If the context is sparse but contains mentions, summarize those mentions.
4. Do not apologize for missing data unless you find absolutely nothing.

RAW INTELLIGENCE:
{context}
"""
    briefing = await openai_model_complete(
        prompt, 
        system_prompt="You are a helpful and insightful analyst. You speak from provided context but you are detailed and strategic. You do not give short, dismissive answers."
    )
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
    final_state = await engine.ainvoke(initial_state)
    return final_state['synthesized_answer']
