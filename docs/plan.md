# Project Plan: Advisory RAG (Earnings Call Intelligence)

**Goal:** Build a high-impact demo for the Head of Advisory using public earnings call transcripts as a surrogate for proprietary client business reviews.

---

## 1. Project Folder Structure
Located at: `/Users/jayzhuang/Desktop/Personal Agent projects/NABR/advisory_rag/`

- `data/raw/` - Raw transcript text files
- `data/processed/` - LightRAG JSON extraction (Nodes/Edges)
- `src/indexing/` - LightRAG ingestion & clustering scripts
- `src/agent/` - LangGraph state machine & reasoning logic
- `frontend/` - D3.js visualization dashboard

---

## 2. Technical Stack
- **Graph Engine:** [LightRAG](https://github.com/HKUDS/LightRAG) (Iterative, dual-indexed graph mapping).
- **Orchestration:** [LangGraph](https://github.com/langchain-ai/langgraph) (Multi-agent loops: Router, Grader, Generator).
- **Database:** Neo4j (Graph) + ChromaDB (Vector) + SQLite (Metadata).
- **Visualization:** D3.js (Force-directed clustering).

---

## 3. Scraping Strategy (Gathering Data)
To prove the "Macro Trend" value prop, we need ~100-150 transcripts from a specific sector (e.g., Retail or Tech).

### **Method A: The Professional Way (API)**
- **Tool:** [Financial Modeling Prep (FMP) API](https://site.financialmodelingprep.com/developer/docs#Earnings-Call-Transcript)
- **Efficiency:** 10/10. One Python function can pull 5 years of transcripts for a whole ticker list in seconds.
- **Cost:** Paid subscription required for full history, but has a generous free tier for trial tickers.

### **Method B: The Open Source Way (Scraping)**
- **Tool:** [EarningsCall Scraper (GitHub)](https://github.com/topics/earnings-call-scraper) or [Motley Fool Scraper](https://github.com/ranaroussi/yfinance/issues/1319).
- **Efficiency:** 6/10. Requires handling rate limits and anti-bot measures from sites like Seeking Alpha.
- **Library:** `yfinance` can sometimes fetch metadata, but for full text, specialized scrapers like `fin-data` are preferred.

---

## 4. Phase-by-Phase Roadmap

### **Phase 1: Ingestion (The Context Graph)**
- Script a bulk downloader for [Tech Sector Tickers].
- Feed 150 `.txt` files into LightRAG.
- Enforce strict ontology: `[RISK_FACTOR]`, `[STRATEGIC_GOAL]`, `[RATIONALE]`.

### **Phase 2: Reasoning (The Analyst Brain)**
- Build the LangGraph State Machine.
- Implement the "Precedent Search" loop (searching for how previous issues were resolved).

### **Phase 3: Visual Demo (The Pitch)**
- Connect D3.js to show "Pain Point Constellations."
- Record a walkthrough of a "Share of Wallet" query.
