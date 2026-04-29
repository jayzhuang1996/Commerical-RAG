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

CHUNK_STORE_PATH  = Path(__file__).parent.parent.parent / "data" / "index" / "kv_store_text_chunks.json"
DOC_STATUS_PATH   = Path(__file__).parent.parent.parent / "data" / "index" / "kv_store_doc_status.json"
_chunk_store:  dict = {}
_doc_status:   dict = {}
# Maps full_doc_id → {ticker, period, doc_type}
_doc_meta_cache: dict = {}

def _load_stores():
    global _chunk_store, _doc_status
    if not _chunk_store and CHUNK_STORE_PATH.exists():
        with open(CHUNK_STORE_PATH) as f:
            _chunk_store = json.load(f)
    if not _doc_status and DOC_STATUS_PATH.exists():
        with open(DOC_STATUS_PATH) as f:
            _doc_status = json.load(f)

def _meta_from_doc(doc_id: str) -> dict:
    """Parse ticker/period/doc_type from a doc_status content_summary."""
    if doc_id in _doc_meta_cache:
        return _doc_meta_cache[doc_id]
    summary = _doc_status.get(doc_id, {}).get("content_summary", "")
    ticker = re.search(r"Ticker:\s*(\w+)", summary)
    period = re.search(r"Period:\s*([\w_]+)", summary)
    dtype  = re.search(r"Doc Type:\s*([\w_]+)", summary)
    result = {
        "ticker":   ticker.group(1) if ticker else "Unknown",
        "period":   period.group(1).replace("_", " ") if period else "Unknown",
        "doc_type": dtype.group(1).replace("_", " ") if dtype else "Filing",
    }
    _doc_meta_cache[doc_id] = result
    return result

def _lookup_chunk_metadata(content_snippet: str) -> dict:
    """Resolve metadata for a chunk by matching content → chunk store → doc_status."""
    _load_stores()
    for length in (120, 60, 30):
        needle = content_snippet[:length].strip()
        if not needle:
            continue
        for chunk in _chunk_store.values():
            c = chunk.get("content", "")
            clean = re.sub(r"--- SOURCE INFO ---.*?--- END INFO ---\s*", "", c, flags=re.DOTALL).strip()
            if needle in clean:
                # First try inline header in the stored chunk
                ticker = re.search(r"Ticker:\s*(\w+)", c)
                if ticker:
                    period = re.search(r"Period:\s*([\w_]+)", c)
                    dtype  = re.search(r"Doc Type:\s*([\w_]+)", c)
                    return {
                        "ticker":   ticker.group(1),
                        "period":   period.group(1).replace("_", " ") if period else "Unknown",
                        "doc_type": dtype.group(1).replace("_", " ") if dtype else "Filing",
                    }
                # Fall through to doc_status lookup
                doc_id = chunk.get("full_doc_id", "")
                if doc_id:
                    return _meta_from_doc(doc_id)
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

    # LightRAG returns chunks as JSON lines: {"reference_id": "...", "content": "..."}
    # We can't use [^{}]* because content values contain nested text with braces.
    # Instead parse each line that looks like a JSON object.
    seen_snippets: set = set()
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith('{') or '"content"' not in line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        text = obj.get("content", "").strip()
        if not text or len(text) < 50:
            continue
        snippet_key = text[:80]
        if snippet_key in seen_snippets:
            continue
        seen_snippets.add(snippet_key)

        # If the chunk itself embeds SOURCE INFO header, parse inline.
        inline_ticker = re.search(r"Ticker:\s*(\w+)", text)
        inline_period = re.search(r"Period:\s*([\w_]+)", text)
        inline_dtype  = re.search(r"Doc Type:\s*([\w_]+)", text)
        if inline_ticker:
            t = inline_ticker.group(1)
            p = inline_period.group(1).replace("_", " ") if inline_period else "Unknown"
            d = inline_dtype.group(1).replace("_", " ") if inline_dtype else "Filing"
        else:
            # Fall back to scanning the chunk store by content similarity.
            meta = _lookup_chunk_metadata(text)
            t = meta["ticker"]
            p = meta["period"]
            d = meta["doc_type"]

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

    print(f"✅ [Researcher] Parsed {len(sources)} source chunks.")

    # Always pass something to the analyst — use raw as last resort.
    if not clean_context_parts:
        print("⚠️  [Researcher] No JSON chunks parsed — using raw context as fallback.")
        clean_context_parts = [raw]

    return {
        "raw_context": "\n".join(clean_context_parts),
        "sources": sources,
    }

async def analyst_node(state: AgentState):
    print("🧠 [Analyst] Synthesizing with strict evidentiary grounding...")
    context = state['raw_context']
    
    prompt = f"""You are a Strategic Analyst. Synthesize the Raw Intelligence below into a clear briefing.

USER QUERY: {state['query']}

RULES:
1. Base your answer on the Raw Intelligence sources provided. Prioritize direct evidence over inference.
2. Cite every factual claim with its numeric source marker, e.g. [1], [2].
3. Use direct quotes for key metrics and figures.
4. If the sources are truly empty or completely irrelevant to the query, say so briefly — but do NOT refuse if relevant data exists.

RAW INTELLIGENCE:
{context}

FORMAT:
- **Bold** key findings.
- Bullet points for each major insight.
"""
    briefing = await openai_model_complete(
        prompt,
        system_prompt="You are a senior semiconductor industry analyst. Synthesize evidence from provided sources into a concise, cited briefing. Never fabricate facts not in the sources, but always answer if relevant data is present."
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
