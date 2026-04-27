# NABR: Semiconductor Intelligence Platform (Development Roadmap)

This project evolved from the **RAG (Podcast Scraper)** project. While we reuse the frontend chassis and backend infra, the **Brain** is upgraded to handle **Supply Chain Synthesis** and **Temporal (Quarterly) Reasoning.**

---

## 🏗️ Phase 1: Knowledge Acquisition (Data Ingestion)
**Goal:** Build a clean, massive library of semiconductor "Truth Documents" for free.

- [ ] **Infrastructure Setup**:
    - [x] Scaffold `/NABR` folder structure (`src`, `frontend`, `data`, `config`).
    - [x] Migrate "Gold Standard" React components from `/RAG`.
- [ ] **SEC Bulk Ingestion**:
    - [x] Create `sec_ingestion.py` with multi-form support (10-K, 10-Q, 8-K, 20-F, 6-K).
    - [ ] Populate `tickers.yaml` with the "Bottleneck 40" target list.
    - [ ] Run bulk download for NVIDIA, TSMC, ASML, Broadcom, etc. (Last 12-18 months).
- [ ] **Data Pre-processing**:
    - [ ] Clean HTML noise from filings.
    - [ ] Segment filings by "Quarter/Period" for the temporal view.

---

## 🧠 Phase 2: Graph Construction (LightRAG Indexing)
**Goal:** Map the "Web of Tensions" between the 40 companies.

### Milestone 2: Context Graph Construction ⚙️ (IN PROGRESS)
*   **Phase 3: Graph Indexing Engine**
    - [x] Set up LightRAG with Moonshot AI + Local Embeddings
    - [x] Implement "Nuclear" Sequential Semaphore (1.5s delay) for stability
    - [x] Success: Initial NVIDIA / AMAT / ASML graph built
    - [ ] Complete full 20-company Master Index (Active Build)

---

## 🤖 Phase 3: Agentic Reasoning (LangGraph)
**Goal:** Build the "Intelligence Officer" that can synthesize across layers.

### Milestone 3: Agentic Reasoning & Synthesis ✅ (COMPLETE)
*   **Phase 4: The Intelligence Agent (LangGraph)**
    - [x] Implement Temporal Priority logic (Recency = Truth)
    - [x] Implement Supply-Chain "Vertical Hopping" logic
    - [x] Connect Agent to FastAPI backend

- [ ] **The "Temporal" Search Agent**:
    - [ ] Modify `retrieval.py` to support `period` (Q1 vs Q2) metadata filtering.
    - [ ] Implement "Recency Weighting" (prioritizing current 8-Ks).
- [ ] **The "Cross-Layer" Reasoning Agent**:
    - [ ] Implement LangGraph nodes for **Strategic Synthesis**.
    - [ ] Create the **"Precedent/Rationale"** detector (The "Why" logic).
- [ ] **The "Grader" Node**: 
    - [ ] Build a fact-check loop to ensure a "TSMC Bottleneck" claim is backed by a specific filing quote.

---

## 🎨 Phase 4: Intelligence Dashboard (Frontend UI)
**Goal:** Create a "War Room" interface for the Head of Advisory.

### Milestone 4: Frontend Intelligence Dashboard ✅ (COMPLETE)
*   **Phase 5: Visual Hub Integration**
    - [x] Link LightRAG nodes to ForceGraphVisualizer
    - [x] Connect Community detection to Economic Constellation view
    - [x] Update Branding/UI to "NABR Semiconductor Intelligence"

---

## 🚀 Future Horizons (Post-MVP Roadmap)
*These specialized "Lenses" will allow the user to filter the same data through different Strategic Archetypes:*

1.  **Physical Supply Chain Lens**: Focuses on `[FACTORY]`, `[LOGISTICS]`, and `[YIELD]` nodes to track material flow.
2.  **"Share of Wallet" Economic Lens**: Focuses on `[REVENUE_SEGMENT]`, `[TAM]`, and `[ASP]` nodes to track cash flow and competition.
3.  **Geopolitical "Fortress" Lens**: Focuses on `[TRADE_RESTRICTION]`, `[EXPORT_CONTROL]`, and `[SUBSIDY]` nodes to track legal and governmental risks.
4.  **Temporal Shift Map**: A slider to compare the "Web of Tensions" between 2024 and 2026 filings to show direction of travel.

- [ ] **Universal Navigation**:
    - [ ] Add the **"Time Slider"** (Switching between quarterly views).
    - [ ] Implement the **"Vertical Filter"** (Selecting Layer A, B, C, etc.).
- [ ] **Visual Overhaul**:
    - [ ] Update `MermaidVisualizer` to show supply chain data flows (Upstream -> Downstream).
    - [ ] Adapt `ClusterVisualizer` to show "Economic Constellations" (Bubble size = centrality).
- [ ] **Detail Panels**:
    - [ ] Show the **"Decision Trace"** (Why the AI is recommending a specific bottleneck play).

---

## 🚀 Phase 5: Testing & Pitch
**Goal:** Prove the ROI to management.

- [ ] **Stress Test**: Query the system on the "Networking/Optical" bottleneck theory.
- [ ] **Benchmarking**: Compare NABR's "Bottleneck Analysis" vs a generic ChatGPT search.
- [ ] **The "Boardroom" Demo**: Record a walkthrough identifying a hidden "Share of Wallet" opportunity in Layer D.
