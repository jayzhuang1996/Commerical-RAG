# NABR Knowledge Graph Transformation Plan

> **Objective:** Transform NABR from a pure vector-RAG system into a persistent, editable, compounding knowledge graph — inspired by [Rowboat](https://github.com/rowboatlabs/rowboat)'s entity-extraction architecture.
>
> **Status:** Design doc for implementation by a new coding agent.
> **Estimated effort:** ~310 lines across 5 files (1 new, 4 modified).

---

## Table of Contents

1. [The Problem: Why Current NABR Doesn't Compound](#1-the-problem)
2. [The Rowboat Inspiration](#2-the-rowboat-inspiration)
3. [Target Architecture](#3-target-architecture)
4. [Entity Types & Templates](#4-entity-types--templates)
5. [Data Flow: Before vs. After](#5-data-flow-before-vs-after)
6. [File-by-File Changes](#6-file-by-file-changes)
    - 6.1 New: `src/extraction/entity_extractor.py`
    - 6.2 Modify: `src/ingestion/preprocess.py`
    - 6.3 Modify: `src/retrieval/retrieval.py`
    - 6.4 Modify: `src/query.py`
    - 6.5 Modify: `src/retrieval/visual_utils.py`
7. [Implementation Order](#7-implementation-order)
8. [Testing Approach](#8-testing-approach)
9. [Visualization Impact](#9-visualization-impact)

---

## 1. The Problem: Why Current NABR Doesn't Compound

### Current Architecture (Simplified)

```
SEC filing → preprocess → LightRAG index (vector + entity graph) → query time:
  1. Vector search finds similar chunks
  2. LangGraph agent reads chunks, synthesizes answer
  3. Answer is returned → forgotten until next query
```

### Three Specific Problems

**Problem 1: Zero persistence between queries**
Every query pays the full cost: vector search + LLM re-reads chunks + LLM re-synthesizes. If the same question is asked twice, both calls cost the same. The system never "remembers" what it already figured out.

```
Query 1: "What is NVIDIA's data center revenue trend?"
  → Vector search (5-15s) → LLM reads 20 chunks → synthesizes answer ($0.02-0.05)
  
Query 2: "What is NVIDIA's data center revenue trend?" (same question, same day)
  → Vector search (5-15s) → LLM reads 20 chunks → synthesizes answer ($0.02-0.05)
  → Zero cost savings. System learned nothing from Query 1.
```

**Problem 2: No editability**
The LightRAG graph is a black box. You cannot:
- Open a node and fix an incorrect entity extraction
- Manually add a known relationship ("NVDA buys from TSM")
- Delete a spam/irrelevant entity
- Verify what entities exist without grepping binary index files

**Problem 3: Hardcoded vertical summaries**
The 6 semiconductor layers in `src/query.py` are hardcoded strings:
```python
# query.py:55 — hardcoded, never updated by the system
VERTICAL_META = {
    "AI / GPU": {
        "summary": "NVIDIA, AMD, and Intel are at the center...",
        "insight": "NVIDIA's data center revenue now exceeds 80%...",
        ...
    },
    ...
}
```
When new filings change the dynamics (e.g., AMD MI300X market share shifts), these strings stay frozen until a human edits query.py.

---

## 2. The Rowboat Inspiration

[Rowboat](https://github.com/rowboatlabs/rowboat) is an open-source AI coworker that solves the same class of problem for work context (emails, meetings, decisions). Its core innovation is applicable to NABR:

### Rowboat's Core Pattern

Instead of embedding everything into a vector index, Rowboat runs an **LLM extraction pass** on incoming data and writes **typed entity notes as Markdown files**. Subsequent data attaches to the same entity notes, compounding knowledge.

```
Incoming email → LLM extracts:
  - People mentioned
  - Decisions made  
  - Commitments made
  → Writes/updates:
    knowledge/People/Sarah Chen.md
    knowledge/Decisions/Series B Terms.md
    knowledge/Projects/Series A.md

Next email about same topic → extends existing notes, doesn't create new ones.
```

### What NABR Should Borrow

| Rowboat Concept | NABR Equivalent |
|---|---|
| `knowledge/People/` | `knowledge/Companies/{TICKER}.md` |
| `knowledge/Projects/` | `knowledge/Products/{ProductName}.md` |
| `knowledge/Organizations/` | `knowledge/Layers/{LayerName}.md` |
| `knowledge/Topics/` | `knowledge/FinancialMetrics/{Metric}.md` |
| YAML frontmatter on every note | Structured metadata per entity (ticker, layer, last updated, source filings) |
| `Today.md` as query entry point | `knowledge/Index.md` auto-generated entity map |
| Live notes (auto-updating background agent) | Scheduled entity refresh on each filing batch |
| Git-based version history on `knowledge/` | Auto-commit entity changes to track what changed per quarter |

### GitHub Reference

- Rowboat source: https://github.com/rowboatlabs/rowboat
- Relevant files for pattern reference:
  - `apps/x/packages/core/src/agent/note_creation.ts` — entity extraction logic
  - `apps/x/packages/core/src/note_system.ts` — entity type definitions and templates
  - `apps/x/packages/core/src/knowledge/` — vault structure on disk

---

## 3. Target Architecture

### High-Level Design

```
SEC filing batch arrives
  │
  ├──→ Path A: LightRAG indexing (existing, UNCHANGED)
  │       Continues to build vector index for fallback search
  │
  └──→ Path B: Entity extraction (NEW)
          For each filing:
            1. Call GPT-4o-mini with extraction prompt
            2. Extract: companies, products, financial metrics, relationships
            3. Resolve against existing knowledge/ entities
            4. Create new entity notes or extend existing ones
            5. Git-commit the knowledge/ directory

On query:
  1. Check knowledge/ for pre-compiled entity briefs (fast path)
  2. If entity notes cover the query → return immediately, no vector search
  3. If query is novel → fall back to LightRAG vector search (slow path, existing)
  4. Agent synthesizes answer from entity notes + vector chunks together
```

### Directory Structure (New)

```
NABR/
├── knowledge/                          # NEW — entity knowledge base
│   ├── Index.md                        # Auto-generated map of all entities
│   ├── Companies/                      # One file per ticker/company
│   │   ├── NVDA.md
│   │   ├── AMD.md
│   │   ├── TSM.md
│   │   ├── ASML.md
│   │   └── ... (39 tickers, auto-populated)
│   ├── Products/                       # Extracted products from filings
│   │   ├── H100_B200.md
│   │   ├── MI300X.md
│   │   ├── CoWoS.md
│   │   ├── HBM3E.md
│   │   └── ... (auto-populated from filing text)
│   ├── Layers/                         # One per semiconductor vertical
│   │   ├── AI_GPU.md
│   │   ├── Foundry.md
│   │   ├── Equipment.md
│   │   ├── Memory.md
│   │   ├── Analog_Power.md
│   │   └── Networking_RF.md
│   ├── FinancialMetrics/               # Cross-company metric comparisons
│   │   ├── Data_Center_Revenue.md
│   │   ├── HBM_Revenue.md
│   │   ├── Gross_Margin_Trends.md
│   │   └── ... (auto-populated quarterly)
│   └── .git/                           # Auto-initialized git repo for versioning
│
├── src/
│   ├── extraction/                     # NEW directory
│   │   └── entity_extractor.py         # NEW — LLM entity extraction pipeline
│   ├── ingestion/                      # UNCHANGED
│   ├── retrieval/                      # MODIFIED — add knowledge/ read path
│   ├── agent/                          # UNCHANGED
│   └── query.py                        # MODIFIED — remove hardcoded strings
```

---

## 4. Entity Types & Templates

### 4.1 Company entity (`knowledge/Companies/NVDA.md`)

```markdown
---
ticker: NVDA
layer: AI / GPU
full_name: NVIDIA Corporation
last_updated: 2026-05-10
source_filings:
  - 10-K_2026-01-15
  - 10-Q_2026-03-20
aliases:
  - NVIDIA
  - Nvidia Corporation
  - NVDA
relationships:
  - type: competes_with
    target: AMD
    context: Data center GPU market (H100 vs MI300X)
    source: 10-K_2026.md
  - type: buys_from
    target: TSM
    context: CoWoS advanced packaging for H100/B200
    source: 10-Q_Q1_2026.md
  - type: supplies
    target: Microsoft
    context: Data center GPU contracts
    source: 10-K_2026.md
---

# NVIDIA Corporation

## Business Overview
NVIDIA designs GPUs and AI accelerators. Primary products include H100, B200 (Blackwell). Data center revenue exceeds 80% of total.

## Key Financials
| Metric | Value | Period | Source |
|--------|-------|--------|--------|
| Data Center Revenue | $47.5B | FY2026 | 10-K_2026.md |
| Gross Margin | 78.5% | Q1 FY2026 | 10-Q_Q1_2026.md |
| H100 Revenue | $32B (est.) | FY2026 | 10-K_2026.md |

## Key Relationships
- **Competes with:** AMD (MI300X), Intel (Gaudi 3)
- **Supplies:** Microsoft, Google, Amazon, Meta
- **Manufactured by:** TSMC (CoWoS packaging)
- **Depends on:** ASML (EUV lithography), SK Hynix (HBM3E memory)

## Activity Log
- 2026-03-20: Q1 FY2026 earnings — data center revenue beat, Blackwell ramp on track
- 2026-01-15: FY2026 10-K filed — H100 remains primary revenue driver
```

### 4.2 Layer entity (`knowledge/Layers/AI_GPU.md`)

```markdown
---
layer_id: AI_GPU
last_updated: 2026-05-10
member_tickers:
  - NVDA
  - AMD
  - INTC
---

# AI & GPU Computing

## Companies
| Company | Market Cap | Key Product | Role |
|---------|-----------|-------------|------|
| NVIDIA | $2.8T | H100, B200 | Market leader |
| AMD | $350B | MI300X, MI350 | #2 competitor |
| Intel | $180B | Gaudi 3 | Emerging competitor |

## Key Dynamics
- NVIDIA data center revenue grew 217% YoY (FY2026)
- AMD MI300X is the primary competitive alternative
- Export controls to China constrain ~15-20% of addressable market
- CoWoS packaging capacity is the binding constraint for all players

## Cross-Company Trends
- All three companies cited AI infrastructure buildout as primary demand driver
- Supply chain bottleneck: CoWoS packaging, HBM3E memory
- Geopolitical risk: Taiwan export controls, China semiconductor policy
```

### 4.3 Product entity (`knowledge/Products/H100_B200.md`)

```markdown
---
product_name: H100 / B200
company: NVIDIA
category: GPU / AI Accelerator
last_updated: 2026-05-10
---

# H100 & B200

## H100 (Current Gen)
- Node: TSMC 4N
- Memory: 80GB HBM3
- Key metric: Industry-standard AI training GPU
- Status: Currently shipping, high demand

## B200 (Blackwell, Next Gen)
- Node: TSMC 4NP (enhanced)
- Memory: 192GB HBM3E
- Key metric: 2.5x training perf vs H100
- Status: Ramping production Q1-Q2 FY2026
```

### 4.4 FinancialMetric entity (`knowledge/FinancialMetrics/Data_Center_Revenue.md`)

```markdown
---
metric: Data Center Revenue
last_updated: 2026-05-10
---

# Data Center Revenue (Cross-Company Comparison)

| Company | Q1 FY2026 | FY2025 | YoY Growth | Source |
|---------|-----------|--------|------------|--------|
| NVIDIA | $28.5B | $47.5B | +217% | 10-K_2026 |
| AMD | $5.2B | $12.5B | +89% | 10-K_2026 |
| Intel | $3.8B | $12.0B | +15% | 10-K_2026 |
```

### 4.5 Index.md (Auto-generated map)

```markdown
# NABR Knowledge Graph Index

_Last generated: 2026-05-10_

## Companies (39)
- [[NVDA]] — AI / GPU — $2.8T
- [[AMD]] — AI / GPU — $350B
- [[TSM]] — Foundry — $750B
- ... (full list auto-generated)

## Layers (6)
- [[AI_GPU]] — 3 companies
- [[Foundry]] — 5 companies
- [[Equipment]] — 5 companies
- [[Memory]] — 3 companies
- [[Analog_Power]] — 4 companies
- [[Networking_RF]] — 4 companies

## Products (auto-extracted)
- [[H100_B200]] — NVIDIA
- [[MI300X]] — AMD
- [[CoWoS]] — TSMC
- ... (full list)

## Financial Metrics (auto-extracted)
- [[Data_Center_Revenue]]
- [[HBM_Revenue]]
- [[Gross_Margin_Trends]]
- ... (full list)
```

---

## 5. Data Flow: Before vs. After

### Before (Current NABR)

```
SEC EDGAR → sec_ingestion.py → data/raw/ → preprocess.py → data/processed/
  → indexing_pipeline.py (LightRAG) → binary vector index
  → query → LightRAG search → LangGraph synthesizes → answer
                                      ↑
                              Every query pays full cost
```

### After (Transformed NABR)

```
SEC EDGAR → sec_ingestion.py → data/raw/ → preprocess.py → data/processed/
  │
  ├──→ indexing_pipeline.py (LightRAG) → binary vector index
  │       [unchanged — fallback for novel queries]
  │
  └──→ entity_extractor.py (NEW)
           For each filing:
           1. Read preprocessed text
           2. Call GPT-4o-mini with extraction prompt
           3. Extract entities: companies, products, metrics, relationships
           4. Compare with existing knowledge/ entities
           5. Create new entity notes or extend existing ones
           6. Regenerate Index.md
           7. Git commit knowledge/ with changeset

  On query:
    1. Check knowledge/Index.md + relevant entity notes (FAST PATH — ~0.1s)
    2. If query is novel/not in entities → fall back to LightRAG (SLOW PATH)
    3. If both available → agent enriches entity notes with vector search context
```

### When the Fast Path Activates

The entity notes cover most common queries directly:

| Query Type | Fast Path? | What Happens |
|---|---|---|
| "What is NVIDIA's data center revenue?" | YES | Read `Companies/NVDA.md` → answer immediately |
| "Compare NVIDIA and AMD in AI" | YES | Read both entity notes + `Layers/AI_GPU.md` |
| "What are the tensions in the AI supply chain?" | YES | Read `Layers/AI_GPU.md` tensions section |
| "How does CoWoS affect H100 production?" | PARTIAL | Read `Products/H100_B200.md` + `Products/CoWoS.md` |
| "What is the market share of ASML in EUV?" | NO (novel) | Fall back to LightRAG vector search |
| "Show me the revenue trend for AI data centers" | YES | Read `FinancialMetrics/Data_Center_Revenue.md` |

---

## 6. File-by-File Changes

### 6.1 NEW FILE: `src/extraction/entity_extractor.py`

**Purpose:** After SEC filings are preprocessed, this module extracts entities and writes/updates the `knowledge/` entity notes.

**Location:** `NABR/src/extraction/entity_extractor.py`

**Interface:**

```python
async def process_filing(
    ticker: str,
    layer: str,
    period: str,
    doc_type: str,
    filing_text: str,
    knowledge_base: KnowledgeBase,
) -> ExtractionResult:
    """
    Extract entities from a single SEC filing and update the knowledge graph.
    
    Args:
        ticker: Stock ticker (e.g., "NVDA")
        layer: Semiconductor layer (e.g., "AI / GPU")
        period: Quarter/year (e.g., "Q1_2026")
        doc_type: Filing type (e.g., "10-K", "10-Q")
        filing_text: Preprocessed filing text
        knowledge_base: Interface to knowledge/ directory
    
    Returns:
        ExtractionResult with created/updated/unchanged entity counts
    """
```

**Extraction Prompt (to GPT-4o-mini):**

```
You are analyzing a semiconductor company's SEC filing.
Ticker: {ticker}
Layer: {layer}
Period: {period}
Doc Type: {doc_type}

Extract the following entities from this filing text. Return valid JSON.

1. KEY FINANCIALS: Array of {metric, value, period, context}
   Examples: data center revenue, gross margin, HBM revenue, R&D spend
   
2. PRODUCTS: Array of {product_name, category, description, status}
   Examples: H100 (GPU, currently shipping), B200 (GPU, ramping)
   
3. RELATIONSHIPS: Array of {target_entity, relationship_type, context}
   relationship_types: competes_with, supplies, buys_from, partner, customer, vendor
   Examples: AMD (competes_with, "data center GPU market"), TSMC (buys_from, "CoWoS packaging")
   
4. KEY TRENDS: Array of {trend, evidence_quote, direction}
   Examples: AI infrastructure buildout, export control impact, CoWoS capacity constraint

5. CHANGES_SINCE_LAST: What changed vs the previous period for this ticker
   Examples: Revenue grew 10% QoQ, New product announcement, Guidance change

Return ONLY valid JSON. No markdown, no explanation.
```

**LLM Configuration:**
- Model: `gpt-4o-mini` (same as indexing pipeline, keeps cost low)
- Max tokens: 4000
- Temperature: 0.1 (deterministic extraction)
- Rate limit: Use same semaphore as `indexing_pipeline.py` (1 concurrent request)

**KnowledgeBase Class:**

```python
class KnowledgeBase:
    """
    Interface to the knowledge/ directory.
    Handles reading, writing, and versioning entity notes.
    """
    
    BASE_PATH = Path("knowledge/")
    
    def get_company(self, ticker: str) -> CompanyNote | None:
        """Read existing company note, return None if not exists."""
    
    def update_company(self, ticker: str, data: dict) -> None:
        """Create or update a company note with new data."""
    
    def get_layer(self, layer_id: str) -> LayerNote | None:
        """Read existing layer note."""
    
    def update_layer(self, layer_id: str, data: dict) -> None:
        """Create or update a layer note."""
    
    def get_product(self, product_name: str) -> ProductNote | None:
        """Read existing product note."""
    
    def update_product(self, product_name: str, company: str, data: dict) -> None:
        """Create or update a product note."""
    
    def update_financial_metric(self, metric_name: str, row: dict) -> None:
        """Append a row to a cross-company financial metric table."""
    
    def regenerate_index(self) -> None:
        """Scan all entities and regenerate knowledge/Index.md."""
    
    def commit(self, message: str) -> None:
        """Git commit all changes to knowledge/ with a descriptive message."""
```

**Handling Updates (Crucial Detail):**

When a new filing arrives, the extractor must NOT overwrite existing notes. It must:

1. Read the existing note
2. Compare period — if the filing covers a period already in the note, update that row
3. If the period is new, append new rows
4. If a relationship already exists, skip duplicates
5. Update `last_updated` and append to `source_filings` list

**Example update logic for company note:**

```python
# Pseudocode for update flow
existing = kb.get_company("NVDA")
if existing:
    # Merge new financials with existing (update same-period rows, add new periods)
    for new_row in new_financials:
        if new_row["metric"] in existing.financials:
            existing.financials[new_row["metric"]].append(new_row)
        else:
            existing.financials[new_row["metric"]] = [new_row]
    
    # Merge relationships (deduplicate by target + type)
    for new_rel in new_relationships:
        if not any(r.target == new_rel.target and r.type == new_rel.type 
                  for r in existing.relationships):
            existing.relationships.append(new_rel)
    
    # Update activity log
    existing.activity_log.append({
        "date": today,
        "event": f"{doc_type} filed for {period}",
        "source": filename
    })
    
    kb.update_company("NVDA", existing.to_dict())
else:
    kb.create_company("NVDA", { ... new note ... })
```

**Full skeleton:**

```python
"""
src/extraction/entity_extractor.py

Entity extraction pipeline for NABR knowledge graph.
Reads preprocessed SEC filings, extracts structured entities via LLM,
and writes/updates the knowledge/ directory as Markdown entity notes.

Inspired by Rowboat's entity extraction pattern:
https://github.com/rowboatlabs/rowboat
"""

import os
import json
import yaml
import git
import re
from pathlib import Path
from datetime import datetime
from typing import Optional
from openai import AsyncOpenAI

KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

EXTRACTION_PROMPT = """You are analyzing a semiconductor company's SEC filing.
Ticker: {ticker}
Layer: {layer}
Period: {period}
Doc Type: {doc_type}

Extract the following entities from this filing text. Return valid JSON.

1. KEY FINANCIALS: Array of {{"metric", "value", "period", "context"}}
2. PRODUCTS: Array of {{"product_name", "category", "description", "status"}}
3. RELATIONSHIPS: Array of {{"target_entity", "relationship_type", "context"}}
   Types: competes_with, supplies, buys_from, partner, customer, vendor
4. KEY_TRENDS: Array of {{"trend", "evidence_quote", "direction"}}
5. CHANGES_SINCE_LAST: What changed vs previous period

Return ONLY valid JSON. No markdown, no explanation."""


class KnowledgeBase:
    BASE = KNOWLEDGE_DIR
    
    def __init__(self):
        self.BASE.mkdir(parents=True, exist_ok=True)
        for sub in ["Companies", "Products", "Layers", "FinancialMetrics"]:
            (self.BASE / sub).mkdir(exist_ok=True)
        self._init_git()
    
    def _init_git(self):
        try:
            repo = git.Repo(self.BASE)
        except git.InvalidGitRepositoryError:
            repo = git.Repo.init(self.BASE)
            repo.index.commit("Initialize knowledge graph")
    
    def get_company_path(self, ticker: str) -> Path:
        return self.BASE / "Companies" / f"{ticker.upper()}.md"
    
    def read_company(self, ticker: str) -> Optional[dict]:
        path = self.get_company_path(ticker)
        if not path.exists():
            return None
        content = path.read_text(encoding="utf-8")
        return self._parse_markdown(content)
    
    def write_company(self, ticker: str, data: dict):
        path = self.get_company_path(ticker)
        md = self._render_company_markdown(ticker, data)
        path.write_text(md, encoding="utf-8")
    
    def _parse_markdown(self, content: str) -> dict:
        lines = content.split("\n")
        if lines[0].startswith("---"):
            end = next(i for i, l in enumerate(lines[1:], 1) if l.startswith("---"))
            frontmatter = yaml.safe_load("\n".join(lines[1:end]))
            body = "\n".join(lines[end+1:])
            return {"frontmatter": frontmatter, "body": body}
        return {"frontmatter": {}, "body": content}
    
    def _render_company_markdown(self, ticker: str, data: dict) -> str:
        fm = data.get("frontmatter", {})
        body = data.get("body", f"# {ticker}\n")
        fm["last_updated"] = datetime.now().strftime("%Y-%m-%d")
        return "---\n" + yaml.dump(fm, default_flow_style=False) + "---\n\n" + body
    
    def commit(self, message: str):
        repo = git.Repo(self.BASE)
        repo.index.add("*")
        if repo.index.diff("HEAD"):
            repo.index.commit(message)


async def extract_entities(filing_text: str, ticker: str, layer: str, period: str, doc_type: str) -> dict:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    text_sample = filing_text[:30000]
    
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": EXTRACTION_PROMPT.format(
                ticker=ticker, layer=layer, period=period, doc_type=doc_type
            ) + "\n\n" + text_sample
        }],
        temperature=0.1,
        max_tokens=4000,
        response_format={"type": "json_object"},
    )
    
    return json.loads(response.choices[0].message.content)


async def process_filing(ticker: str, layer: str, period: str, doc_type: str, filing_text: str, kb: KnowledgeBase):
    extracted = await extract_entities(filing_text, ticker, layer, period, doc_type)
    
    existing = kb.read_company(ticker) or {
        "frontmatter": {"ticker": ticker, "layer": layer, "source_filings": []},
        "body": f"# {ticker}\n\n## Key Financials\n\n| Metric | Value | Period |\n|--------|-------|--------|\n\n## Key Relationships\n\n"
    }
    
    fm = existing["frontmatter"]
    if doc_type not in [d.get("doc_type") for d in fm.get("source_filings", [])]:
        fm.setdefault("source_filings", []).append(f"{doc_type}_{period}")
    fm["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    
    body_parts = [existing["body"]]
    
    if extracted.get("CHANGES_SINCE_LAST"):
        body_parts.insert(0, f"\n## Update: {period}\n{extracted['CHANGES_SINCE_LAST']}\n")
    
    if extracted.get("KEY_FINANCIALS"):
        body_parts.append(f"\n## Financials ({period})\n")
        for f in extracted["KEY_FINANCIALS"]:
            body_parts.append(f"- **{f['metric']}:** {f['value']} ({f['context']})")
    
    if extracted.get("RELATIONSHIPS"):
        body_parts.append(f"\n## Relationships ({period})\n")
        for r in extracted["RELATIONSHIPS"]:
            body_parts.append(f"- **{r['relationship_type']}** → {r['target_entity']}: {r['context']}")
    
    if extracted.get("PRODUCTS"):
        for p in extracted["PRODUCTS"]:
            product_path = kb.BASE / "Products" / f"{p['product_name'].replace(' ', '_')}.md"
            if not product_path.exists():
                product_path.write_text(
                    f"# {p['product_name']}\n\n- **Company:** {ticker}\n- **Category:** {p.get('category', '')}\n- **Status:** {p.get('status', '')}\n\n{p.get('description', '')}\n",
                    encoding="utf-8"
                )
    
    kb.write_company(ticker, {"frontmatter": fm, "body": "\n".join(body_parts)})
    kb.commit(f"Update {ticker} from {doc_type} {period}")
    
    return {
        "ticker": ticker,
        "entities_extracted": len(extracted.get("KEY_FINANCIALS", [])) + len(extracted.get("RELATIONSHIPS", [])),
        "products_found": len(extracted.get("PRODUCTS", [])),
    }


async def process_filing_batch(filings: list[dict], kb: KnowledgeBase):
    """Process a batch of filings. Each item: {ticker, layer, period, doc_type, text}"""
    results = []
    for filing in filings:
        result = await process_filing(**filing, kb=kb)
        results.append(result)
    return results


if __name__ == "__main__":
    import asyncio
    print("Run this module via the ingestion pipeline. See preprocess.py for integration.")
```

---

### 6.2 MODIFY: `src/ingestion/preprocess.py`

**Changes:** After preprocessing each filing, call the entity extractor.

**Add at the end of `preprocess_all()` function:**

```python
# --- Entity extraction pass (NEW) ---
from extraction.entity_extractor import KnowledgeBase, process_filing_batch

kb = KnowledgeBase()
filings_batch = []

for ticker_dir in PROCESSED_DIR.iterdir():
    if not ticker_dir.is_dir():
        continue
    ticker = ticker_dir.name.upper()
    layer = ticker_to_layer.get(ticker, "UNKNOWN_LAYER")
    
    for file_path in ticker_dir.glob("*.txt"):
        parts = file_path.stem.split("_")
        if len(parts) < 2:
            continue
        doc_type = "_".join(parts[:-1])
        date_str = parts[-1]
        period = get_quarter(date_str)
        
        text = file_path.read_text(encoding="utf-8")
        filings_batch.append({
            "ticker": ticker,
            "layer": layer,
            "period": period,
            "doc_type": doc_type,
            "text": text
        })

print(f"🔍 Extracting entities from {len(filings_batch)} filings...")
asyncio.run(process_filing_batch(filings_batch, kb))
print(f"✅ Entity extraction complete. knowledge/ updated.")
```

**Full new import section:**

```python
# Add to the imports at the top of preprocess.py
import asyncio
try:
    from extraction.entity_extractor import KnowledgeBase, process_filing_batch
    ENTITY_EXTRACTION_ENABLED = True
except ImportError:
    print("⚠️ entity_extractor not available. Skipping entity extraction.")
    ENTITY_EXTRACTION_ENABLED = False
```

---

### 6.3 MODIFY: `src/retrieval/retrieval.py`

**Changes:** Add a `retrieve_entities()` method that reads from `knowledge/` before falling back to vector search.

**Add new method to the `HybridRetriever` class:**

```python
import yaml
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge"

def retrieve_entities(self, query: str) -> dict | None:
    """
    Fast path: check if the query targets a known entity in knowledge/.
    Returns pre-compiled entity context if found, None otherwise.
    
    Examples:
      "What is NVIDIA's data center revenue?" → reads Companies/NVDA.md
      "Compare AMD and NVIDIA in AI" → reads both + Layers/AI_GPU.md
    """
    query_lower = query.lower()
    
    # Check for specific ticker mentions
    ticker_dir = KNOWLEDGE_DIR / "Companies"
    if ticker_dir.exists():
        for md_file in ticker_dir.glob("*.md"):
            ticker = md_file.stem.upper()
            if ticker.lower() in query_lower:
                content = md_file.read_text(encoding="utf-8")
                return {"source": "knowledge", "type": "company", "ticker": ticker, "content": content}
    
    # Check for layer mentions
    layer_dir = KNOWLEDGE_DIR / "Layers"
    if layer_dir.exists():
        for md_file in layer_dir.glob("*.md"):
            layer_name = md_file.stem.replace("_", " ").lower()
            if layer_name in query_lower or any(word in query_lower for word in layer_name.split()):
                content = md_file.read_text(encoding="utf-8")
                return {"source": "knowledge", "type": "layer", "content": content}
    
    # Check for product mentions
    product_dir = KNOWLEDGE_DIR / "Products"
    if product_dir.exists():
        for md_file in product_dir.glob("*.md"):
            product_name = md_file.stem.replace("_", " ").lower()
            if product_name in query_lower:
                content = md_file.read_text(encoding="utf-8")
                return {"source": "knowledge", "type": "product", "content": content}
    
    return None
```

**Modify `retrieve()` method to use fast path:**

```python
def retrieve(self, query: str):
    """Two-path retrieval: entity notes first, then vector fallback."""
    
    # 1. Fast path: pre-compiled entity notes
    entity_result = self.retrieve_entities(query)
    if entity_result:
        print(f"⚡ Fast path: found {entity_result['type']} entity '{entity_result.get('ticker', '')}'")
        return {
            'text_context': [],  # empty — entity notes are self-sufficient
            'graph_context': [],
            'entities': [entity_result.get('ticker', '')] if 'ticker' in entity_result else [],
            'knowledge_note': entity_result,  # NEW: pre-compiled entity note
        }
    
    # 2. Slow path: vector search (existing behavior)
    vector_results = self.search_vector(query)
    reranked = self.rerank(query, vector_results)
    text_context = self.get_context(reranked)
    entities = self.get_entities(query)
    graph_context = self.get_graph_context(entities)
    
    return {
        'text_context': text_context,
        'graph_context': graph_context,
        'entities': entities,
        'knowledge_note': None,
    }
```

---

### 6.4 MODIFY: `src/query.py`

**Changes:** 
1. Remove the 6 hardcoded `VERTICAL_META` strings
2. Replace with auto-generated summaries from `knowledge/Layers/`
3. Update `/api/chat` to handle `knowledge_note` in retrieval result

**Replace the `VERTICAL_META` dict with a loader:**

```python
# Remove the hardcoded VERTICAL_META dict (lines 55-91 in current file)
# Add this instead:

def load_layer_metadata():
    """Load layer summaries from knowledge/Layers/ entity notes."""
    layers_dir = Path("knowledge/Layers")
    if not layers_dir.exists():
        return {}  # Fallback: will be populated after first filing ingestion
    
    metadata = {}
    for md_file in sorted(layers_dir.glob("*.md")):
        layer_id = md_file.stem.replace("_", " / ")
        content = md_file.read_text(encoding="utf-8")
        
        # Parse basic info from YAML frontmatter
        lines = content.split("\n")
        fm_end = None
        for i, line in enumerate(lines[1:], 1):
            if line.startswith("---"):
                fm_end = i
                break
        
        member_tickers = []
        if fm_end:
            fm = yaml.safe_load("\n".join(lines[1:fm_end]))
            member_tickers = fm.get("member_tickers", [])
        
        # The body gives us summary and insights
        body = "\n".join(lines[fm_end+1:]) if fm_end else content
        
        # Extract company list from markdown table
        companies = []
        for line in body.split("\n"):
            if line.startswith("|") and "Company" not in line and "---" not in line:
                cells = [c.strip() for c in line.split("|")]
                if len(cells) >= 2:
                    companies.append(cells[1])
        
        metadata[layer_id] = {
            "title": layer_id,
            "summary": body[:500] if len(body) > 500 else body,
            "insight": body,
            "member_tickers": member_tickers,
            "companies": companies,
        }
    
    return metadata
```

**Update `get_communities()` to use dynamic load:**

```python
@app.get("/api/communities")
async def get_communities():
    from retrieval.visual_utils import extract_cluster_data
    from retrieval.indexing_pipeline import rag
    
    VERTICAL_META = load_layer_metadata()  # Dynamic, not hardcoded
    
    clusters = extract_cluster_data(rag)
    communities = []
    for cluster in clusters:
        layer_id = cluster["id"]
        meta = VERTICAL_META.get(layer_id, {})
        nodes = [c["id"] for c in cluster.get("children", [])]
        communities.append({
            "id": layer_id,
            "title": meta.get("title", layer_id),
            "summary": json.dumps({
                "summary": meta.get("summary", ""),
                "insight": meta.get("insight", ""),
                "tensions": meta.get("tensions", ""),
                "top_entities": nodes[:5],
            }),
            "nodes": nodes,
        })
    
    return {"communities": communities}
```

**Update `/api/chat` to leverage knowledge notes:**

```python
@app.post("/api/chat", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    from retrieval.visual_utils import extract_visual_graph
    from agent.reasoning_agent import run_intelligence_briefing_stateful
    from retrieval.indexing_pipeline import rag
    
    try:
        # 1. Get retrieval result (may include knowledge_note)
        from retrieval.retrieval import HybridRetriever
        retriever = HybridRetriever()
        retrieval_result = retriever.retrieve(request.query)
        
        # 2. If knowledge note found, use it directly (bypass LangGraph)
        knowledge_note = retrieval_result.get('knowledge_note')
        if knowledge_note and len(knowledge_note.get('content', '')) > 100:
            answer_text = knowledge_note['content']
            # No vector search needed, no LangGraph cost
            agent_sources = [{
                "title": f"Knowledge Graph: {knowledge_note['type']}",
                "text": knowledge_note['content'][:2000],
                "index": 1,
            }]
        else:
            # Fall back to LangGraph pipeline (existing behavior)
            answer_text, agent_sources = await run_intelligence_briefing_stateful(
                request.query, request.filters
            )
        
        # 3. Visual graph (unchanged)
        graph_viz = extract_visual_graph(rag, request.query, filters=dict(request.filters))
        
        # 4. Format sources (unchanged)
        formatted_sources = []
        for src in agent_sources:
            formatted_sources.append({
                "title": src["title"],
                "text": src["text"],
                "index": src["index"],
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
```

---

### 6.5 MODIFY: `src/retrieval/visual_utils.py`

**Changes:** Add entity-relationship edges from `knowledge/` to supplement the LightRAG similarity edges.

**Add new function:**

```python
def extract_knowledge_graph_edges() -> list[dict]:
    """
    Read entity relationships from knowledge/ entity notes.
    Returns typed, labeled edges for the force-directed visualization.
    
    These edges are EXPLICIT (typed relationships from filings)
    not IMPLICIT (cosine similarity between chunks).
    """
    knowledge_dir = Path(__file__).parent.parent.parent / "knowledge"
    edges = []
    
    # Read each company note for its relationship section
    companies_dir = knowledge_dir / "Companies"
    if not companies_dir.exists():
        return edges
    
    for md_file in companies_dir.glob("*.md"):
        ticker = md_file.stem.upper()
        content = md_file.read_text(encoding="utf-8")
        
        # Parse YAML frontmatter for structured relationships
        lines = content.split("\n")
        if not lines[0].startswith("---"):
            continue
        
        end_idx = None
        for i, line in enumerate(lines[1:], 1):
            if line.startswith("---"):
                end_idx = i
                break
        
        if end_idx is None:
            continue
        
        fm = yaml.safe_load("\n".join(lines[1:end_idx]))
        relationships = fm.get("relationships", [])
        
        for rel in relationships:
            target = rel.get("target", "")
            rel_type = rel.get("type", "related")
            context = rel.get("context", "")
            
            if not target:
                continue
            
            # Map Rowboat-style types to visual_utils edge types
            type_map = {
                "competes_with": "competitive",
                "buys_from": "supply",
                "supplies": "supply",
                "partner": "partnership",
                "customer": "supply",
                "vendor": "supply",
            }
            viz_type = type_map.get(rel_type, "related")
            
            edges.append({
                "source": ticker,
                "target": target.upper() if target.isupper() else target,
                "description": context,
                "type": viz_type,
                "source_type": "knowledge_graph",  # Tag to distinguish from LightRAG edges
            })
    
    return edges
```

**Modify `extract_visual_graph()` to merge both edge sources:**

```python
def extract_visual_graph(rag_index, original_query: str, filters: dict = None) -> Dict[str, Any]:
    """
    Returns cross-company edges from TWO sources:
    1. LightRAG chunk similarity edges (existing — fuzzy, implied)
    2. Knowledge graph entity edges (NEW — explicit, typed)
    """
    
    # Source 1: LightRAG edges (existing behavior, unchanged)
    lightrag_edges = _extract_lightrag_edges(rag_index, original_query, filters)
    
    # Source 2: Knowledge graph edges (NEW)
    kg_edges = extract_knowledge_graph_edges()
    
    # Apply query relevance filter to kg_edges
    if original_query:
        q_lower = original_query.lower()
        kg_edges = [
            e for e in kg_edges
            if e["source"].lower() in q_lower or e["target"].lower() in q_lower
        ]
    
    # Merge both sources, deduplicate by source-target pair
    seen_pairs = set()
    all_edges = []
    
    for edge in lightrag_edges + kg_edges:
        pair = tuple(sorted([edge["source"], edge["target"]]))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        all_edges.append(edge)
    
    # Prioritize knowledge graph edges (they have higher confidence)
    all_edges.sort(key=lambda e: 0 if e.get("source_type") == "knowledge_graph" else 1)
    
    # Cap for readability
    edges = all_edges[:50]
    
    # Build node degree map and return (same as existing code)
    degree = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1
    
    nodes = [{"id": nid, "degree": degree.get(nid, 1)} for nid in degree]
    links = [
        {
            "source": e["source"],
            "target": e["target"],
            "label": e["description"][:200],
            "type": e["type"],
            "color": EDGE_COLORS.get(e["type"], EDGE_COLORS["related"]),
        }
        for e in edges
    ]
    return {"nodes": nodes, "links": links}
```

**Add helper to keep existing `extract_visual_graph()` clean:**

```python
def _extract_lightrag_edges(rag_index, original_query, filters):
    """Extract edges from LightRAG (moved from original extract_visual_graph)."""
    full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
    if not full_graph:
        return []
    
    # ... (move all existing LightRAG edge extraction code here) ...
    # The existing logic for building quarter_periods, chunk_period_map,
    # canonical name resolution, company whitelist, edge type classification
    # all stays here. See the current extract_visual_graph() implementation.
    
    # Return list of edges with source, target, description, type keys
    
    return []  # Placeholder — copy from existing implementation
```

---

## 7. Implementation Order

Implement in this order to get incremental value at each step:

### Step 1: Create `knowledge/` + entity extractor (1-2 hours)
- Create `src/extraction/entity_extractor.py` with `KnowledgeBase` class
- Run on a single filing (NVDA's latest 10-K) to verify it produces a valid entity note
- **Verify:** `cat knowledge/Companies/NVDA.md` shows populated entity data

### Step 2: Wire into preprocessing pipeline (30 min)
- Modify `src/ingestion/preprocess.py` to call entity extractor after preprocessing
- Run ingestion for all 39 tickers
- **Verify:** `knowledge/` has 39 company notes, 6 layer notes, product notes

### Step 3: Fast-path retrieval (30 min)
- Add `retrieve_entities()` to `HybridRetriever`
- Test: "What is NVIDIA's data center revenue?" → should return entity note, not hit vector DB
- **Verify:** Response time drops from 5-15s to <1s for entity queries

### Step 4: Remove hardcoded strings (15 min)
- Replace `VERTICAL_META` in `query.py` with `load_layer_metadata()`
- Restart server → verify `/api/communities` returns dynamic data
- **Verify:** Communities page shows layer summaries sourced from entity notes, not code

### Step 5: Enhance visualization (30 min)
- Add `extract_knowledge_graph_edges()` to `visual_utils.py`
- Test: query "NVDA" → force graph shows typed edges (competes_with, buys_from)
- **Verify:** Clicking an edge shows the relationship type and source context

### Step 6: Integration test (30 min)
- Run full pipeline: fetch new filing → preprocess → extract entities → query
- Verify: new entity data appears in queries without re-indexing LightRAG
- **Verify:** `knowledge/.git/log` shows auto-commits with descriptive messages

---

## 8. Testing Approach

### Unit Tests (in `tests/`)

```python
# tests/test_entity_extractor.py
import pytest
from extraction.entity_extractor import KnowledgeBase, extract_entities

class TestKnowledgeBase:
    def test_write_and_read_company(self, tmp_path):
        kb = KnowledgeBase()
        ticker = "NVDA"
        data = {
            "frontmatter": {"ticker": ticker, "layer": "AI_GPU"},
            "body": "# NVIDIA\nData center revenue: $47.5B",
        }
        kb.write_company(ticker, data)
        result = kb.read_company(ticker)
        assert result["frontmatter"]["ticker"] == "NVDA"
        assert "Data center revenue" in result["body"]

class TestEntityExtraction:
    @pytest.mark.asyncio
    async def test_extract_from_real_filing(self):
        # Use a small real NVDA 10-Q snippet
        text = open("tests/fixtures/nvda_10q_snippet.txt").read()
        result = await extract_entities(text, "NVDA", "AI / GPU", "Q1_2026", "10-Q")
        assert "KEY_FINANCIALS" in result
        assert len(result["KEY_FINANCIALS"]) > 0
```

### Integration Test

```python
# tests/test_knowledge_graph_integration.py
"""
End-to-end test:
1. Process a real filing through preprocess
2. Verify entity extraction creates knowledge/ note
3. Verify retrieval finds it via fast path
4. Verify visualization includes typed edges
"""

def test_full_pipeline():
    # 1. Run preprocess on one filing
    # 2. Check knowledge/Companies/NVDA.md exists
    # 3. Query retriever → verify fast path hit
    # 4. Check visual_utils returns knowledge_graph edges
    pass
```

### Manual Verification Checklist

After implementing each step, manually verify:

- [ ] `knowledge/Companies/NVDA.md` has YAML frontmatter + populated body
- [ ] `knowledge/.git/log` shows commits with entity update messages
- [ ] Query "what is NVIDIA's data center revenue" returns answer in <1s
- [ ] Query "compare AMD and NVIDIA" returns cross-company entity data
- [ ] `/api/communities` shows dynamic layer data (not hardcoded strings)
- [ ] Force graph shows colored, typed edges (competitive = amber, supply = blue)
- [ ] Clicking a knowledge-graph edge shows relationship type and source context

---

## 9. Visualization Impact

### Before (Current Force Graph)

```
  [chunk_472] ──── similarity 0.83 ──── [chunk_891]
  
  What the user sees:
    - Circular nodes (company names)
    - Grey lines between them
    - No indication of WHY two companies are connected
    - No distinction between "competes with" vs "supplies" vs "partners"
  
  What's actually happening:
    - LightRAG found that two text chunks have similar embeddings
    - Could be anything: both mention "revenue", both mention "AI"
    - The relationship is IMPLICIT (statistical, not factual)
```

### After (Transformed Force Graph)

```
  [NVDA] ──── competes_with (amber) ──── [AMD]
     │                                         
     ├─── buys_from (blue) ──── [TSM]          
     │                                         
     ├─── supplies (blue) ──── [Microsoft]     
     │                                         
     └─── depends_on (blue) ─── [SK Hynix]     
  
  What the user sees:
    - Colored edges:
      - Amber = competitive tension
      - Blue = supply chain (buys from / supplies)
      - Teal = partnership
      - Red = geopolitical risk
      - Green = investment/M&A
    - Edge labels showing the specific context
    - Clicking a node shows detail panel with all typed relationships
    
  What's actually happening:
    - Relationships are EXPLICIT (extracted from filing text)
    - "competes_with" comes from: "NVIDIA faces competition from AMD's MI300X"
    - "buys_from" comes from: "We purchase advanced packaging from TSMC"
    - These are facts, not statistical correlations
```

### Specific Changes to the Frontend ForceGraph Component

No changes needed to the `ForceGraph.tsx` component. It already handles:
- Colored edges (via `type` → `color` mapping)
- Edge labels (via `label` field)
- Click-to-inspect panels
- Node degree sizing

The data coming from `extract_visual_graph()` now includes knowledge-graph edges alongside LightRAG edges. The frontend renders both transparently.

However, you may want to add one enhancement:

```tsx
// In ForceGraph.tsx, add a legend toggle:
const [showLegend, setShowLegend] = useState(true);

// Add at the top of the graph:
{showLegend && (
  <div style={{
    position: 'absolute', top: 12, left: 12, zIndex: 200,
    padding: '10px 14px', background: '#fff', borderRadius: 8,
    border: '1px solid #E3E6EA', fontSize: 11,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  }}>
    <div style={{ fontWeight: 700, marginBottom: 6, color: '#192E44' }}>Edge Types</div>
    {[
      { color: '#F59E0B', label: 'Competitive' },
      { color: '#05AFDC', label: 'Supply Chain' },
      { color: '#00D7D2', label: 'Partnership' },
      { color: '#BF2E2E', label: 'Geopolitical Risk' },
      { color: '#82C341', label: 'Investment' },
    ].map(({ color, label }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <div style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
        <span style={{ color: '#3C4A5A' }}>{label}</span>
      </div>
    ))}
  </div>
)}
```
