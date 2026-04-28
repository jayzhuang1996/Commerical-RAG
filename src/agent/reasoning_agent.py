"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — MAXIMUM VERACITY MODE.
Uses direct quotes and perfectly aligned numeric citations.
"""

import os
import asyncio
import re
import json
from typing import TypedDict, List, Dict, Any
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
    sources: List[Dict[str, Any]]

async def architect_node(state: AgentState):
    query = state['query'].lower()
    if any(w in query for w in ["industry", "market", "trend", "bottleneck", "global", "supply chain"]):
        mode = "global"
    else:
        mode = "local"

    aug = state['query']
    for vertical, tickers in VERTICAL_TICKER_MAP.items():
        v_norm = vertical.lower().replace('/', ' ').split()
        if any(word in query for word in v_norm if len(word) > 3):
            aug += f" (Specifically look for {', '.join(tickers)} context)"
    
    if "navidia" in query or "nvidia" in query:
        aug += " (Focus on NVIDIA / NVDA)"
    if "micron" in query:
        aug += " (Focus on MU)"

    return {"search_mode": mode, "augmented_query": aug}

async def researcher_node(state: AgentState):
    print(f"🔎 [Researcher] Querying: '{state['augmented_query'][:80]}'")
    param = QueryParam(mode=state['search_mode'], top_k=20, only_need_context=True)
    response = await rag.aquery(state['augmented_query'], param=param)
    raw = response if isinstance(response, str) else str(response)
    
    # Parse the raw context into a list of structured sources for the UI
    # This ensures the [1], [2] in the LLM output matches the UI sources list.
    blocks = re.split(r'(?=--- SOURCE INFO ---)', raw)
    sources = []
    clean_context_parts = []
    
    for block in blocks:
        if "--- SOURCE INFO ---" not in block: continue
        
        ticker = re.search(r"Ticker:\s*(\w+)",    block)
        period = re.search(r"Period:\s*([\w_]+)", block)
        dtype  = re.search(r"Doc Type:\s*([\w_]+)", block)
        
        t = ticker.group(1) if ticker else "Unknown"
        p = period.group(1).replace("_", " ") if period else "Unknown"
        d = dtype.group(1).replace("_", " ") if dtype else "Filing"
        
        # Clean the text (remove the header)
        text = re.sub(r"--- SOURCE INFO ---.*?--- END INFO ---\s*", "", block, flags=re.DOTALL).strip()
        if not text: continue
        
        idx = len(sources) + 1
        sources.append({
            "title": f"{t} · {d} · {p}",
            "text": text,
            "index": idx
        })
        # Add a numeric label to the context so the LLM knows which index is which
        clean_context_parts.append(f"SOURCE [{idx}] ({t} {p}):\n{text}\n")

    return {
        "raw_context": "\n".join(clean_context_parts),
        "sources": sources
    }

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing with strict evidentiary grounding...")
    context = state['raw_context']
    
    prompt = f"""You are a Strategic Analyst. Summarize the provided Raw Intelligence into a detailed briefing.

USER QUERY: {state['query']}

STRICT RULES FOR VERACITY:
1. Use direct quotations for every major metric or fact.
2. Every sentence MUST be cited with the numeric source marker, e.g., "NVIDIA reported that 'Blackwell demand is strong' [1]."
3. Ensure the numeric marker [x] matches the SOURCE [x] label in the Raw Intelligence below.
4. If you use a quote, enclose it in double quotes.

RAW INTELLIGENCE:
{context}

FORMAT:
- Bold key findings.
- Bullet points for each major insight.
"""
    briefing = await openai_model_complete(
        prompt, 
        system_prompt="You are a high-fidelity analyst. You prioritize direct evidence and quotations. You never synthesize without a citation."
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

async def run_intelligence_briefing_stateful(query: str, filters: dict = None):
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
    return final_state['synthesized_answer'], final_state['sources']
