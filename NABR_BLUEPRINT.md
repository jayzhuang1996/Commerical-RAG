# NABR: Semiconductor Intelligence Platform (Blueprint)

> [!IMPORTANT]
> **Source Project Context**: `/Users/jayzhuang/Desktop/Personal Agent projects/RAG` (Phase 16)
> This blueprint is designed for **Claude Code** or other CLI agents to rapidly migrate the GraphRAG architecture to the NABR folder.

---

## 🚀 Quick Migration Summary (Read First)
You are building an Intelligence Dashboard for semiconductor earing calls. The **RAG** folder contains the "Gold Standard" implementation for the UI, Retrieval, and Agentic logic. You can copy the following items directly:

### 📥 1. The "Copy-Paste" Inventory (100% Reusable)
- **Frontend Components**: 
    - `components/MermaidVisualizer.tsx`: The core flowchart engine.
    - `components/TypewriterText.tsx`: The streaming text effect.
    - `components/ClusterVisualizer.tsx`: The Semantic Bubble Map (SVG).
    - `components/StrategicInsightCard.tsx`: The high-fidelity briefing cards.
- **Agentic Core**:
    - `src/agent.py`: The LangGraph synthesis pipeline.
    - `src/db.py`: The database connection logic.

### ⚙️ 2. The "Adaptation" Points (Modify for NABR)
- **Ingestion**: Replace `src/ingestion.py` (YouTube focus) with a new FMP API client.
- **Metadata**: Update `viking_videos` records to include `quarter`, `year`, and `ticker`.
- **Prompts**: Update the `Strategic Intelligence` prompt in `src/communities.py` to focus on semiconductor-specific insights (Supply chain, Fab capacity).

---

## 1. Core Architecture: "The GraphRAG Loop"
The system utilizes a **Hybrid Retrieval** strategy:
1.  **Vector Search**: Finds semantically relevant paragraph chunks (ChromaDB/Supabase pgvector).
2.  **Structural Search**: Fetches Subject-Verb-Object triples from a Knowledge Graph to identify inter-entity connections.
3.  **Synthesis**: Uses a **LangGraph** pipeline to merge text and graph data into a boardroom-ready briefing.

---

## 2. Ingestion Pipeline (FMP Upgrade)
Instead of YouTube transcripts, the system parses Earning Calls from FMP.

### Step A: Data Fetching
- **Source**: `https://financialmodelingprep.com/api/v3/earning_call_transcript/{ticker}?quarter={q}&year={y}&apikey={key}`
- **Metadata**: Store Ticker, Quarter (Q1-Q4), Year, and Sub-Industry (e.g., Foundry, Logic, Memory).

### Step B: Chunking & Relationship Extraction
- **Parent-Child Chunking**:
    - **Parent**: ~1000 tokens (for full context).
    - **Child**: ~200 tokens (for high-scored vector matching).
- **Triple Extraction**: For every parent chunk, use an LLM (Moonshot/GPT-4) to extract 5-10 triples:
    - `(NVIDIA) --[increased production of]--> (H100 GPUs)`
    - `(TSMC) --[experiencing constraints in]--> (CoWoS Packaging)`

### Step C: Global Knowledge Clusters (Communities)
- **Algorithm**: Greedy Modularity / Leiden on the full graph.
- **Analysis**: For each community, generate a "Strategic Briefing" JSON:
    - `Insight`: The core macro trend.
    - `Tensions`: Any operational bottlenecks or competitive friction.
    - `Key Figures`: Influential leaders or companies in that cluster.

---

## 3. Backend Stack (FastAPI + Supabase)
- **Database Tables**:
    - `viking_videos` (Renamed to `viking_earnings`): `id, ticker, quarter, year, title`.
    - `viking_transcripts`: `video_id, full_text, raw_json`.
    - `viking_chunks`: `id, parent_id, text, embedding`.
    - `viking_relationships`: `subject, verb, object`.
    - `viking_communities`: `title, summary (JSON), nodes`.

---

## 4. Frontend Specs (Next.js + Tailwind)
The UX is an "Intelligence Command Center" with two primary views:

### View 1: Intelligence Chat (Split-Screen)
- **Typewriter Effect**: Reveal AI text word-by-word for conversational feel.
*   **Dual-Pane Monitoring**: 
    - **Left**: Markdown-rendered briefing with [Source N] pills.
    - **Right**: `MermaidVisualizer` showing the 10 most relevant triples for the query.
- **Source Modal**: Displays the transcript chunk with a **Quarter/Year timestamp** (equivalent to podcast timestamps).

### View 2: Knowledge Clusters (Strategic Explorer)
*   **Strategic Briefing Mode**: High-fidelity cards (Radial charts + Insight text).
*   **Thematic Map Mode**: **Organic Semantic Bubbles** (SVG Packed Layout). Bubbles are sized by centrality and connected to a central hub.

---

## 5. Key Logic Replacements for NABR
- **Timestamping**: Map transcript sentences to "Minute:Second" offset or "Paragraph Number" for source verification.
- **Industry Sorting**: Add a sidebar filter for tickers (NVDA, TSM, ASML) or sub-sectors (Equipment, Design, Foundry).

---

## 6. Repository Structure
```bash
/NABR
  /frontend
    /app
    /components
      - ChatInterface.tsx (Split Screen)
      - MermaidVisualizer.tsx (Graph Rendering)
      - CommunityExplorer.tsx (Toggles between cards/bubbles)
      - ClusterVisualizer.tsx (Semantic Bubbles - SVG)
  /src
    - ingestion.py (FMP API Integration)
    - retrieval.py (Hybrid Vector + Graph)
    - agent.py (LangGraph Synthesis Pipeline)
    - query.py (Endpoint Logic)
  /config
    - tickers.yaml (List of semiconductor targets)
```

**Final Goal**: Move from "transcribing podcasts" to "mapping the global semiconductor supply chain" through earning call synthesis.
