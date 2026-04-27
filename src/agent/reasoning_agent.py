"""
src/agent/reasoning_agent.py
The Phase 3 "Librarian" for NABR.
Uses LangGraph to orchestrate complex strategic queries against the LightRAG index.
- Temporal Intelligence: Prioritizes recent filings.
- Supply-Chain Synthesis: Connects disparate layers.
- Stable Execution: Uses the Moonshot Semaphore lock.
"""

import os
import asyncio
from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, START, END
from src.retrieval.indexing_pipeline import rag, moonshot_model_complete
from lightrag import QueryParam

# Define Agent State
class AgentState(TypedDict):
    query: str
    search_mode: str  # 'local', 'global', or 'hybrid'
    raw_context: str
    synthesized_answer: str
    sources: List[str]

# --- NODE: The Architect (Decision Logic) ---
async def architect_node(state: AgentState):
    """Determines the best search strategy based on the query."""
    query = state['query'].lower()
    
    # Simple logic: If query mentions multiple companies or "industry/macro", use Global.
    # Otherwise, use Local for deep-dives.
    if any(word in query for word in ["industry", "market", "trend", "bottleneck", "global", "supply chain"]):
        mode = "global"
    else:
        mode = "local"
        
    print(f"🗺️ [Architect] Selected Search Mode: {mode.upper()}")
    return {"search_mode": mode}

# --- NODE: The Researcher (Graph Retrieval) ---
async def researcher_node(state: AgentState):
    """Queries the LightRAG index using the selected mode."""
    print(f"🔎 [Researcher] Querying Context Graph for: '{state['query']}'")
    
    # Configure Query Parameters
    # We use a high 'top_k' to ensure we capture cross-layer links
    param = QueryParam(
        mode=state['search_mode'],
        top_k=20
    )
    
    # Call the LightRAG query engine
    # This uses our stable moonshot_model_complete under the hood
    response = await rag.aquery(state['query'], param=param)
    
    return {"raw_context": response}

# --- NODE: The Analyst (Synthesis Logic) ---
async def analyst_node(state: AgentState):
    """Synthesizes raw graph nodes into a professional briefing."""
    print("🧠 [Analyst] Synthesizing Strategic Intelligence...")
    
    prompt = f"""You are the Head of Semiconductor Advisory. Synthesize the following raw intelligence into a high-level strategic briefing.
    
    USER QUERY: {state['query']}
    RAW INTELLIGENCE TRACE:
    {state['raw_context']}
    
    ADVISORY STANDARDS:
    1. PRIORITIZE RECENCY: If you see conflicting data, the document with the most recent date (e.g. 2026 vs 2025) is the truth.
    2. MAP THE IMPACT: If a bottleneck is found in Layer D (Equipment), explain how it will eventually hurt Layer A (Designers like NVIDIA).
    3. NO BOILERPLATE: Start immediately with the answer. Use bolding for entities and metrics.
    4. CITE SOURCES: Mention the Ticker and Filing Date when providing facts.
    """
    
    # Use our stable LLM function
    briefing = await moonshot_model_complete(prompt, system_prompt="You are an elite semiconductor investment analyst.")
    
    return {"synthesized_answer": briefing}

# --- BUILD THE GRAPH ---
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("architect", architect_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("analyst", analyst_node)

# Define Edges
workflow.add_edge(START, "architect")
workflow.add_edge("architect", "researcher")
workflow.add_edge("researcher", "analyst")
workflow.add_edge("analyst", END)

# Compile the Engine
engine = workflow.compile()

async def run_intelligence_briefing(query: str):
    """Entry point for the Phase 3 Agent."""
    initial_state = {
        "query": query,
        "search_mode": "local",
        "raw_context": "",
        "synthesized_answer": "",
        "sources": []
    }
    
    print("\n" + "═"*60)
    print("🚀 [NABR ENGINE] INITIATING STRATEGIC SYNTHESIS")
    print("═"*60)
    
    # Ensure the Graph is loaded from disk
    from src.retrieval.indexing_pipeline import rag
    await rag.initialize_storages()
    
    final_state = await engine.ainvoke(initial_state)
    
    print("\n" + "═"*60)
    print("✅ [NABR ENGINE] BRIEFING COMPLETE")
    print("═"*60 + "\n")
    
    return final_state['synthesized_answer']

if __name__ == "__main__":
    # Test Query
    asyncio.run(run_intelligence_briefing("What is the outlook for NVIDIA's Blackwell and Rubin platforms according to 2026 filings?"))
