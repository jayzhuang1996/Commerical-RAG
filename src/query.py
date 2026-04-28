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
    import json, re, os
    try:
        # 1. Intelligence briefing
        get_ans = get_generate_answer()
        answer_text = await get_ans(request.query, request.filters)

        # 2. Visual graph (cross-company relationships)
        from retrieval.indexing_pipeline import rag
        graph_viz = extract_visual_graph(rag, request.query, filters=dict(request.filters))

        # 3. Real source chunks ─────────────────────────────────────────────
        chunk_store_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "data", "index", "kv_store_text_chunks.json"
        )
        chunk_store = {}
        try:
            with open(chunk_store_path, "r") as f:
                chunk_store = json.load(f)
        except Exception:
            pass

        # Map internal doc type codes → human-readable SEC form names
        DOC_TYPE_LABELS = {
            "annual_business":        "10-K",
            "annual_risk":            "10-K (Risk)",
            "quarterly_mda":          "10-Q",
            "earnings_press_release": "Press Release",
            "8k":                     "8-K",
        }

        def _parse_source_info(content: str) -> dict:
            has_info = "--- SOURCE INFO ---" in content
            ticker = re.search(r"Ticker:\s*(\w+)",    content)
            period = re.search(r"Period:\s*([\w_]+)", content)
            dtype  = re.search(r"Doc Type:\s*([\w_]+)", content)
            date   = re.search(r"Date:\s*([\d-]+)",   content)
            raw_dt = dtype.group(1) if dtype else ""
            return {
                "ticker":   ticker.group(1) if ticker else None,
                "period":   period.group(1).replace("_", " ") if period else "",
                "doctype":  DOC_TYPE_LABELS.get(raw_dt, raw_dt.replace("_", " ")) if raw_dt else "",
                "date":     date.group(1) if date else "",
                "has_info": has_info,
            }

        def _clean_content(content: str) -> str:
            content = re.sub(r"--- SOURCE INFO ---.*?--- END INFO ---\s*", "", content, flags=re.DOTALL)
            return content.strip()

        answer_lower = answer_text.lower()
        quarters = request.filters.get("quarters", [])
        scored: list = []

        for cid, cdata in chunk_store.items():
            if not isinstance(cdata, dict):
                continue
            raw = cdata.get("content", "")
            if not raw:
                continue
            info = _parse_source_info(raw)
            # Skip chunks without SOURCE INFO — no attribution possible
            if not info["has_info"] or not info["ticker"]:
                continue
            text = _clean_content(raw)
            if not text:
                continue
            # Score: word overlap with answer
            score = sum(1 for word in answer_lower.split() if len(word) > 5 and word in text.lower())
            # Boost if ticker appears in answer
            if info["ticker"].lower() in answer_lower:
                score += 5
            # Boost if period matches active filter
            if quarters and any(q.replace(" ", "_") in info["period"].replace(" ", "_") for q in quarters):
                score += 8
            scored.append((score, cid, info, text))

        scored.sort(key=lambda x: x[0], reverse=True)
        
        # FILTER: Only keep chunks with a baseline relevancy score
        # Prevents showing 2025/2026 sources for an empty 2023 query.
        scored = [s for s in scored if s[0] >= 10]

        # Pick top 5, max 2 chunks per ticker
        # FILTER: Only keep chunks with a baseline relevancy score
        scored = [s for s in scored if s[0] >= 10]

        # Pick top 5, max 2 chunks per ticker
        seen_tickers: dict = {}
        top_chunks = []
        for entry in scored:
            t = entry[2]["ticker"] or "?"
            seen_tickers[t] = seen_tickers.get(t, 0)
            if seen_tickers[t] < 2:
                top_chunks.append(entry)
                seen_tickers[t] += 1
            if len(top_chunks) >= 5:
                break

        derived_sources = []
        for i, (score, cid, info, text) in enumerate(top_chunks):
            label   = f"{info['ticker']} · {info['doctype']} · {info['period']}"
            snippet = text[:700] + ("…" if len(text) > 700 else "")
            derived_sources.append({
                "title":    label,
                "text":     snippet,
                "index":    i + 1,
                "video_id": cid,
            })

        # CRITICAL FIX: Do NOT fall back to relationship graph labels if text retrieval failed.
        # This was causing "random" sources to appear for 2023 queries.

        return QueryResponse(
            answer=answer_text,
            graph_data=graph_viz["links"],
            sources=derived_sources
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
    try:
        from retrieval.visual_utils import extract_cluster_data
        from retrieval.indexing_pipeline import rag
        
        # In a real run, this would be computed from the Graph
        clusters = extract_cluster_data(rag)
        print(f"📊 Clusters Found: {len(clusters)}")
        
        # Map of business context for each layer
        business_context = {
            "AI / GPU": {
                "title": "Architects of Compute",
                "summary": "This cluster controls the theoretical blueprint of AI and accelerated computing. Their strategic moat lies in software ecosystems (e.g., CUDA) and IP dominance.",
                "insight": "High margin due to fabless model, but heavily dependent on advanced nodes.",
                "tensions": "Vulnerable to IP theft, sovereign export restrictions, and pure dependency on external foundries."
            },
            "Foundry / EMS": {
                "title": "Apex Manufacturing",
                "summary": "The ultimate execution layer. Foundries transform design IP into physical silicon using the equipment cluster.",
                "insight": "Unprecedented CapEx requirements ($30B+ per fab) create an insurmountable barrier to entry.",
                "tensions": "Geographical concentration risk in Taiwan threatens global AI supply chains if disrupted."
            },
            "Equipment": {
                "title": "Lithography & Foundational Tools",
                "summary": "The physical bottleneck of Moore's Law. This cluster creates the billion-dollar EUV and etching machines required to print logic gates at the atomic level.",
                "insight": "Monopolistic moats (e.g., ASML in EUV) make them immune to traditional market competition.",
                "tensions": "Geopolitically sensitive; sales to certain regions are often blocked by government decrees."
            },
            "Memory": {
                "title": "Data Retention & Storage",
                "summary": "Provides the essential high-bandwidth memory (HBM) and storage architectures necessary to feed data to advanced GPUs.",
                "insight": "Currently experiencing a super-cycle driven by AI demand for HBM3 and HBM3E.",
                "tensions": "Historically highly cyclical and capital intensive; extremely sensitive to supply-demand imbalances."
            },
            "Analog / Power": {
                "title": "Real-World Interfaces & Power",
                "summary": "Translates continuous real-world signals into digital data and manages power delivery for high-performance computing systems.",
                "insight": "Less dependent on bleeding-edge nodes, offering longer product lifecycles and stable cash flows.",
                "tensions": "Highly exposed to automotive and industrial macroeconomic cycles."
            },
            "Networking / RF": {
                "title": "Data Center Arteries",
                "summary": "As AI clusters scale, the internal network becomes the primary bottleneck. This tier provides critical optical and ethernet switches.",
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
