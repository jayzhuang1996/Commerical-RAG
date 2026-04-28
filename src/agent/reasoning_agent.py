"""
src/agent/reasoning_agent.py
NABR Intelligence Agent — MAXIMUM VERACITY MODE.
Uses direct quotes and perfectly aligned numeric citations.
"""

import os
import asyncio
import re
import json
from pathlib import Path
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
try:
    from retrieval.indexing_pipeline import rag, openai_model_complete
except ImportError:
    from src.retrieval.indexing_pipeline import rag, openai_model_complete
from lightrag import QueryParam

CHUNK_STORE_PATH = Path(__file__).parent.parent.parent / "data" / "index" / "kv_store_text_chunks.json"
_chunk_store: dict = {}

def _load_chunk_store():
    global _chunk_store
    if not _chunk_store and CHUNK_STORE_PATH.exists():
        with open(CHUNK_STORE_PATH) as f:
            _chunk_store = json.load(f)

def _lookup_chunk_metadata(content_snippet: str) -> dict:
    """Find SOURCE INFO metadata by matching a content snippet against the chunk store."""
    _load_chunk_store()
    # Try progressively shorter snippets for a match
    for length in (120, 60, 30):
        needle = content_snippet[:length].strip()
        if not needle:
            continue
        for chunk in _chunk_store.values():
            c = chunk.get("content", "")
            clean = re.sub(r"--- SOURCE INFO ---.*?--- END INFO ---\s*", "", c, flags=re.DOTALL).strip()
            if needle in clean:
                ticker = re.search(r"Ticker:\s*(\w+)", c)
                period = re.search(r"Period:\s*([\w_]+)", c)
                dtype  = re.search(r"Doc Type:\s*([\w_]+)", c)
                return {
                    "ticker": ticker.group(1) if ticker else "Unknown",
                    "period": period.group(1).replace("_", " ") if period else "Unknown",
                    "doc_type": dtype.group(1).replace("_", " ") if dtype else "Filing",
                }
    return {"ticker": "Unknown", "period": "Unknown", "doc_type": "Filing"}

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

    sources = []
    clean_context_parts = []

    # LightRAG returns chunks as JSON objects in the context string.
    # Extract them and resolve metadata from the chunk store.
    chunk_pattern = re.compile(r'\{[^{}]*?"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}', re.DOTALL)
    seen_snippets = set()
    for m in chunk_pattern.finditer(raw):
        text = m.group(1).replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t').strip()
        if not text or len(text) < 50:
            continue
        snippet_key = text[:80]
        if snippet_key in seen_snippets:
            continue
        seen_snippets.add(snippet_key)

        # If the chunk itself contains the SOURCE INFO header, parse it directly.
        inline_ticker = re.search(r"Ticker:\s*(\w+)", text)
        inline_period = re.search(r"Period:\s*([\w_]+)", text)
        inline_dtype  = re.search(r"Doc Type:\s*([\w_]+)", text)
        if inline_ticker:
            t = inline_ticker.group(1)
            p = inline_period.group(1).replace("_", " ") if inline_period else "Unknown"
            d = inline_dtype.group(1).replace("_", " ") if inline_dtype else "Filing"
        else:
            meta = _lookup_chunk_metadata(text)
            t = meta["ticker"]
            p = meta["period"]
            d = meta["doc_type"]

        # Strip any header from the display text
        display_text = re.sub(r"--- SOURCE INFO ---.*?--- END INFO ---\s*", "", text, flags=re.DOTALL).strip()
        if not display_text:
            continue

        idx = len(sources) + 1
        sources.append({
            "title": f"{t} · {d} · {p}",
            "text": display_text[:2000],
            "index": idx,
        })
        clean_context_parts.append(f"SOURCE [{idx}] ({t} {d} {p}):\n{display_text[:2000]}\n")

    # If chunk parsing found nothing, fall back to passing raw context so the
    # LLM always has content (avoids "no Raw Intelligence" response).
    if not clean_context_parts:
        print("⚠️  [Researcher] No structured chunks found – using raw context as fallback.")
        clean_context_parts = [raw]

    return {
        "raw_context": "\n".join(clean_context_parts),
        "sources": sources,
    }

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing with strict evidentiary grounding...")
    context = state['raw_context']
    
    prompt = f"""You are a Strategic Analyst. Answer ONLY using the Raw Intelligence sources below.

USER QUERY: {state['query']}

STRICT RULES — VIOLATION IS NOT ALLOWED:
1. ONLY use information that appears in the Raw Intelligence sources below. Do NOT use any external knowledge.
2. If the Raw Intelligence does not contain information relevant to the query, respond ONLY with: "No data available in the current dataset for this query."
3. Every factual sentence MUST cite its source with [x] matching the SOURCE [x] label below.
4. Use direct quotes for metrics and key claims.
5. Never invent, infer, or extrapolate facts not present in the sources.

RAW INTELLIGENCE:
{context}

FORMAT:
- Bold key findings.
- Bullet points for each major insight.
"""
    briefing = await openai_model_complete(
        prompt,
        system_prompt="You are a strict evidence-only analyst. You never use knowledge outside the provided sources. If sources are empty or irrelevant, say so directly."
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
