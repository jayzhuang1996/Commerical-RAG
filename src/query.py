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

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "NABR"}

@app.get("/api/communities")
async def get_communities():
    """Return the 6 semiconductor vertical clusters derived from the knowledge graph."""
    from retrieval.indexing_pipeline import rag
    from retrieval.visual_utils import extract_cluster_data

    # Vertical → summary / insight descriptions drawn from ingested filings
    VERTICAL_META = {
        "AI / GPU": {
            "title": "AI & GPU Computing",
            "summary": "NVIDIA, AMD, and Intel are at the center of the AI compute race. Blackwell demand, data center GPU buildout, and export controls are defining dynamics.",
            "insight": "NVIDIA's data center revenue now exceeds 80% of total revenue, with Blackwell ramp driving FY26 growth. AMD is closing the gap with MI300X adoption.",
            "tensions": "U.S. export controls on H100/H200 equivalents to China constrain near-term TAM. Intel faces execution risk on its foundry pivot.",
        },
        "Foundry / EMS": {
            "title": "Foundry & Advanced Manufacturing",
            "summary": "TSMC dominates leading-edge capacity. Samsung and GlobalFoundries compete in trailing nodes. Geopolitical risk around Taiwan is a systemic overhang.",
            "insight": "TSMC's Arizona fabs (N4P) are ramping with Apple and NVIDIA as anchor customers. CoWoS advanced packaging capacity is a key bottleneck for AI chips.",
            "tensions": "TSMC Arizona yield parity with Taiwan is still uncertain. Samsung's 3nm yield issues persist. SMIC faces equipment sourcing constraints.",
        },
        "Equipment": {
            "title": "Semiconductor Equipment",
            "summary": "ASML, Applied Materials, Lam Research, and KLA supply the tools enabling advanced nodes. EUV lithography and etch/dep equipment are in tight supply.",
            "insight": "ASML's High-NA EUV is critical for sub-2nm nodes. AMAT and LRCX see strong demand from gate-all-around transistor transitions at 3nm and below.",
            "tensions": "Export controls restrict ASML EUV shipments to China. Long lead times (12–18 months) create supply rigidity in fast-growing AI capex cycles.",
        },
        "Memory": {
            "title": "Memory & Storage",
            "summary": "Micron, SK Hynix, and Samsung dominate DRAM and NAND. HBM3E is the fastest-growing segment, driven by AI accelerator demand.",
            "insight": "SK Hynix holds the leading HBM3E market share, shipping to NVIDIA. Micron is ramping its own HBM3E with competitive yield economics.",
            "tensions": "NAND oversupply persists through 2025, pressuring WDC and STX margins. HBM capacity is constrained and commands a significant premium over commodity DRAM.",
        },
        "Analog / Power": {
            "title": "Analog & Power Semiconductors",
            "summary": "TI, ADI, Microchip, and ON Semi serve industrial, automotive, and communications markets with long-lifecycle, high-margin analog products.",
            "insight": "EV and automotive content-per-vehicle is expanding rapidly, driving demand for power management and sensing ICs. TI's 300mm analog fabs are a structural cost advantage.",
            "tensions": "Industrial end-market destocking through 2025 is weighing on near-term revenue. Auto order visibility is improving but EV adoption pace remains uncertain.",
        },
        "Networking / RF": {
            "title": "Networking & RF Connectivity",
            "summary": "Broadcom, Qualcomm, and Marvell supply custom AI ASICs, network switching silicon, and RF front-ends for cloud and wireless infrastructure.",
            "insight": "Broadcom's custom XPU programs with Google and Meta are scaling rapidly. Marvell's DCI and cloud-optimized networking chips are benefiting from AI data center buildout.",
            "tensions": "Qualcomm faces smartphone RF market saturation and China handset exposure. Hyperscaler custom silicon programs are reducing merchant ASIC TAM over time.",
        },
    }

    clusters = extract_cluster_data(rag)

    communities = []
    for cluster in clusters:
        layer_id = cluster["id"]
        meta = VERTICAL_META.get(layer_id, {})
        nodes = [c["id"] for c in cluster.get("children", [])]
        communities.append({
            "id":      layer_id,
            "title":   meta.get("title", layer_id),
            "summary": json.dumps({
                "summary":      meta.get("summary", ""),
                "insight":      meta.get("insight", ""),
                "tensions":     meta.get("tensions", ""),
                "top_entities": nodes[:5],
            }),
            "nodes": nodes,
        })

    return {"communities": communities}


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
