"""
src/query.py
NABR FastAPI — Overhauled for Veracity and Correlation.
Ensures clicked sources match the LLM's numeric citations exactly.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json, re, os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    filters: Dict[str, List[str]] = {}

class QueryResponse(BaseModel):
    answer: str
    graph_data: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]

@app.on_event("startup")
async def startup_event():
    print("🧠 Loading Knowledge Graph into Memory...")
    from retrieval.indexing_pipeline import rag
    await rag.initialize_storages()
    print("✅ Graph Ready.")

@app.get("/")
def read_root():
    return {"status": "online", "message": "NABR"}

@app.post("/api/chat", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    from retrieval.visual_utils import extract_visual_graph
    from agent.reasoning_agent import run_intelligence_briefing_stateful
    from retrieval.indexing_pipeline import rag
    
    try:
        # 1. Unified Intelligence Briefing
        # Returns (answer_text, list_of_parsed_sources)
        answer_text, agent_sources = await run_intelligence_briefing_stateful(request.query, request.filters)

        # 2. Visual graph (cross-company relationships)
        graph_viz = extract_visual_graph(rag, request.query, filters=dict(request.filters))

        # 3. Format sources for the UI
        # agent_sources is already ordered [1, 2, 3] matching the LLM citations
        formatted_sources = []
        for src in agent_sources:
            formatted_sources.append({
                "title":    src["title"],
                "text":     src["text"],
                "index":    src["index"],
                "video_id": "", # Placeholder for backward compatibility
            })

        # Fallback to graph links only if NO text sources found
        if not formatted_sources:
            for i, link in enumerate(graph_viz.get("links", [])[:5]):
                formatted_sources.append({
                    "title":    f"{link.get('source','')} ↔ {link.get('target','')}",
                    "text":     link.get("description", "No detail available."),
                    "index":    i + 1,
                    "video_id": "",
                })

        return QueryResponse(
            answer=answer_text,
            graph_data=graph_viz["links"],
            sources=formatted_sources
        )

    except Exception as e:
        print(f"❌ Error in /api/chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
