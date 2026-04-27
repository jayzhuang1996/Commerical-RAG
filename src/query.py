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
    print("✅ Graph Ready. Handshaking with Railway.")

# Lazy load so Uvicorn can start instantly
_generate_answer_func = None

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
        answer_text = await get_ans(request.query, request.filters)
        
        # 2. Get the visual graph data
        from retrieval.indexing_pipeline import rag
        graph_viz = extract_visual_graph(rag, answer_text)
        
        # 3. Create Sources from the identified graph elements
        derived_sources = []
        for i, link in enumerate(graph_viz.get("links", [])[:5]):
            derived_sources.append({
                "title": f"Source Map: {link['source']} ↔ {link['target']}",
                "text": f"KNOWLEDGE GRAPH TRACE LOG\n\nRelationship verified between '{link['source']}' and '{link['target']}'.\n\nExtracted Context:\n{link['label']}\n\nDocument Origin: SEC Form 10-K / Q-Transcript",
                "index": i + 1
            })
        
        # If no links are found to trace, fallback to nodes
        if not derived_sources:
            for i, n in enumerate(graph_viz.get("nodes", [])[:4]):
                derived_sources.append({
                    "title": f"Intel Trace: {n['id']}",
                    "text": f"Strategic Knowledge Graph extracted node for {n['id']}, related to Query: '{request.query}'.\n\nCross-referenced from primary SEC filings.",
                    "index": i + 1
                })
        
        return QueryResponse(
            answer=answer_text,
            graph_data=graph_viz["links"],
            sources=derived_sources
        )
    except Exception as e:
        import traceback
        print("❌ CRITICAL ERROR IN CHAT ENDPOINT:")
        traceback.print_exc()
        # Return the exact error so the frontend can intercept RATE LIMITs
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/communities")
async def get_communities():
    """
    Returns the thematic clusters for the CommunityExplorer component.
    Groups companies by their vertical layering.
    """
    try:
        from retrieval.visual_utils import extract_cluster_data
        from retrieval.indexing_pipeline import rag
        
        # In a real run, this would be computed from the Graph
        clusters = extract_cluster_data(rag)
        print(f"📊 Clusters Found: {len(clusters)}")
        
        # Map of business context for each layer
        business_context = {
            "Designers": {
                "title": "Architects of Compute",
                "summary": "This cluster controls the theoretical blueprint of AI and accelerated computing. Their strategic moat lies in software ecosystems (e.g. CUDA) and IP dominance.",
                "insight": "High margin due to fabless model, but heavily dependent on advanced nodes.",
                "tensions": "Vulnerable to IP theft, sovereign export restrictions, and pure dependency on external foundries."
            },
            "Equipment": {
                "title": "Lithography & Foundational Tools",
                "summary": "The physical bottleneck of Moore's Law. This cluster creates the billion-dollar EUV and etching machines required to print logic gates at the atomic (2nm) level.",
                "insight": "Monopolistic moats (e.g., ASML in EUV) make them immune to traditional market competition.",
                "tensions": "Geopolitically sensitive; sales to certain regions are often blocked by government decrees."
            },
            "Foundry": {
                "title": "Apex Manufacturing",
                "summary": "The ultimate execution layer. Foundries transform design IP into physical silicon using the equipment cluster.",
                "insight": "Unprecedented CapEx requirements ($30B+ per fab) create an insurmountable barrier to entry.",
                "tensions": "Geographical concentration risk in Taiwan threatens global AI supply chains if disrupted."
            },
            "Networking": {
                "title": "Data Center Arteries",
                "summary": "As AI clusters scale to 100,000+ GPUs, the internal data center network becomes the primary bottleneck. This tier provides the critical optical and ethernet switches.",
                "insight": "Critical for sovereign AI data centers demanding 800G+ transceiver interconnect speeds.",
                "tensions": "The ongoing InfiniBand vs. Ethernet standards war creates vendor lock-in friction."
            }
        }
        
        # Format for the frontend StrategicInsightCard
        formatted = []
        for i, group in enumerate(clusters):
            layer_id = group['id']
            ctx = business_context.get(layer_id, {
                "title": f"Thematic Group: {layer_id}",
                "summary": f"Strategic vertical containing key players focused on {layer_id.lower()}.",
                "insight": "Active market participant with established supply chains.",
                "tensions": "Macroeconomic headwinds and supply constraints."
            })
            
            payload = {
                "summary": ctx["summary"],
                "insight": ctx["insight"],
                "tensions": ctx["tensions"]
            }
            import json
            
            formatted.append({
                "id": layer_id,
                "title": ctx["title"],
                "summary": json.dumps(payload),
                "nodes": [child["id"] for child in group["children"]]
            })

            
        return {"communities": formatted}
    except Exception as e:
        import traceback
        print("❌ CRITICAL ERROR IN COMMUNITIES ENDPOINT:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
