from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="NABR Semiconductor Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List, Dict, Any

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    graph_data: List[Dict[str, str]]
    sources: List[Dict[str, Any]]

@app.on_event("startup")
async def startup_event():
    # Ensure Moonshot key is available for the underlying agent
    if os.getenv("MOONSHOT_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = os.getenv("MOONSHOT_API_KEY")
        print("🔑 Mapped MOONSHOT_API_KEY to OPENAI_API_KEY for compatibility.")
    
    print("🧠 Loading Knowledge Graph into Memory...")
    from retrieval.indexing_pipeline import rag
    await rag.initialize_storages()
    print("✅ Graph Ready. Handshaking with Railway.")

def get_generate_answer():
    global _generate_answer_func
    if _generate_answer_func is None:
        # Import the Phase 3 Agent
        from agent.reasoning_agent import run_intelligence_briefing
        _generate_answer_func = run_intelligence_briefing
    return _generate_answer_func

@app.get("/")
def read_root():
    return {"status": "online", "message": "NABR"}

@app.post("/api/chat", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    from retrieval.visual_utils import extract_visual_graph
    try:
        # 1. Get the intelligence briefing (await the async agent)
        get_ans = get_generate_answer()
        answer_text = await get_ans(request.query)
        
        # 2. Get the visual graph data
        from retrieval.indexing_pipeline import rag
        graph_viz = extract_visual_graph(rag, answer_text)
        
        return QueryResponse(
            answer=answer_text,
            graph_data=graph_viz["links"],
            sources=[]
        )
    except Exception as e:
        import traceback
        print("❌ CRITICAL ERROR IN CHAT ENDPOINT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/communities")
async def get_communities():
    """
    Returns the thematic clusters for the CommunityExplorer component.
    Groups companies by their vertical layering.
    """
    from retrieval.visual_utils import extract_cluster_data
    from retrieval.indexing_pipeline import rag
    
    # In a real run, this would be computed from the Graph
    clusters = extract_cluster_data(rag)
    print(f"📊 Clusters Found: {len(clusters)}")
    
    # Format for the frontend StrategicInsightCard
    formatted = []
    for i, group in enumerate(clusters):
        formatted.append({
            "id": i,
            "title": f"Thematic Group: {group['id']}",
            "summary": f"Strategic vertical containing key players focused on {group['id'].lower()}.",
            "nodes": [child["id"] for child in group["children"]]
        })
        
    return {"communities": formatted}

@app.get("/")
async def root():
    return {
        "name": "NABR Semiconductor Intelligence API",
        "status": "active",
        "version": "1.0",
        "message": "The Context Graph is live."
    }

@app.get("/health")
async def health_check():
    return {"status": "online", "engine": "NABR-v1"}

if __name__ == "__main__":
    import uvicorn
    # Hard-force 8000 for Railway stability
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 NABR Engine Hard-Locked to Port: {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
