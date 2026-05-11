"""
src/extraction/entity_extractor.py

Reads preprocessed SEC filings, extracts structured entities via LLM,
and writes/updates the knowledge/ directory as Markdown entity notes.
Reuses the same openai_model_complete() function already in indexing_pipeline.py.
"""

import json
import re
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

BASE_DIR      = Path(__file__).parent.parent.parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

EXTRACTION_PROMPT = """\
You are analyzing a semiconductor company's SEC filing.

Ticker: {ticker}
Layer: {layer}
Period: {period}
Doc Type: {doc_type}

Extract structured entities from the filing text below. Return ONLY valid JSON with these keys:

{{
  "KEY_FINANCIALS": [
    {{"metric": "Data Center Revenue", "value": "$47.5B", "period": "Q1_2026", "context": "beat estimates"}}
  ],
  "PRODUCTS": [
    {{"product_name": "H100", "category": "GPU", "status": "currently shipping", "description": "AI training GPU"}}
  ],
  "RELATIONSHIPS": [
    {{"target_entity": "TSMC", "relationship_type": "buys_from", "context": "CoWoS advanced packaging for H100/B200"}}
  ],
  "KEY_TRENDS": [
    {{"trend": "AI infrastructure buildout", "evidence_quote": "data center revenue grew 217% YoY", "direction": "up"}}
  ],
  "CHANGES_SINCE_LAST": "Brief summary of what changed vs prior period"
}}

Relationship types: competes_with, buys_from, supplies, partner, customer, vendor

Return ONLY valid JSON. No markdown fences, no explanation.

FILING TEXT:
{text}
"""


def _knowledge_dir_ready() -> bool:
    for sub in ["Companies", "Products", "Layers", "FinancialMetrics"]:
        (KNOWLEDGE_DIR / sub).mkdir(parents=True, exist_ok=True)
    return True


def _company_path(ticker: str) -> Path:
    return KNOWLEDGE_DIR / "Companies" / f"{ticker.upper()}.md"


def _read_company(ticker: str) -> Optional[dict]:
    path = _company_path(ticker)
    if not path.exists():
        return None
    content = path.read_text(encoding="utf-8")
    lines = content.split("\n")
    if not lines or not lines[0].startswith("---"):
        return {"frontmatter": {}, "body": content}
    try:
        end = next(i for i, l in enumerate(lines[1:], 1) if l.startswith("---"))
        import yaml
        fm = yaml.safe_load("\n".join(lines[1:end])) or {}
        body = "\n".join(lines[end + 1:])
        return {"frontmatter": fm, "body": body}
    except Exception:
        return {"frontmatter": {}, "body": content}


def _write_company(ticker: str, data: dict) -> None:
    import yaml
    path = _company_path(ticker)
    fm = data.get("frontmatter", {})
    fm["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    body = data.get("body", f"# {ticker}\n")
    content = "---\n" + yaml.dump(fm, default_flow_style=False, allow_unicode=True) + "---\n\n" + body
    path.write_text(content, encoding="utf-8")


def _merge_company(existing: dict, ticker: str, layer: str, period: str, doc_type: str, extracted: dict) -> dict:
    """Merge extracted data into existing company note without overwriting."""
    fm = existing.get("frontmatter", {})
    fm.setdefault("ticker", ticker)
    fm.setdefault("layer", layer)
    fm.setdefault("relationships", [])
    fm.setdefault("source_filings", [])

    filing_key = f"{doc_type}_{period}"
    if filing_key not in fm["source_filings"]:
        fm["source_filings"].append(filing_key)

    # Merge relationships — deduplicate by (target, type)
    existing_rels = {(r.get("target"), r.get("type")) for r in fm["relationships"]}
    for rel in extracted.get("RELATIONSHIPS", []):
        key = (rel.get("target_entity", ""), rel.get("relationship_type", ""))
        if key not in existing_rels:
            fm["relationships"].append({
                "target":  rel.get("target_entity", ""),
                "type":    rel.get("relationship_type", "related"),
                "context": rel.get("context", ""),
                "source":  filing_key,
            })
            existing_rels.add(key)

    # Build body additions — skip if this filing_key was already written
    body = existing.get("body", f"# {ticker}\n\n")
    section_marker = f"<!-- {filing_key} -->"
    if section_marker in body:
        return {"frontmatter": fm, "body": body}  # Already written, only relationships updated above

    additions = [f"\n{section_marker}"]

    changes = extracted.get("CHANGES_SINCE_LAST", "")
    if changes and "brief summary" not in changes.lower() and len(changes) > 20:
        additions.append(f"\n### Update ({period})\n{changes}\n")

    if extracted.get("KEY_FINANCIALS"):
        rows = "\n".join(
            f"| {f.get('metric','')} | {f.get('value','')} | {f.get('period', period)} | {f.get('context','')} |"
            for f in extracted["KEY_FINANCIALS"]
        )
        additions.append(f"\n### Key Financials ({period})\n| Metric | Value | Period | Context |\n|--------|-------|--------|---------|\n{rows}\n")

    if extracted.get("KEY_TRENDS"):
        trend_lines = "\n".join(
            f"- **{t.get('trend','')}** ({t.get('direction','')}) — {t.get('evidence_quote','')}"
            for t in extracted["KEY_TRENDS"]
        )
        additions.append(f"\n### Key Trends ({period})\n{trend_lines}\n")

    if len(additions) > 1:  # more than just the marker
        body = body.rstrip() + "\n" + "".join(additions)

    return {"frontmatter": fm, "body": body}


def _write_product(product_name: str, ticker: str, info: dict) -> None:
    safe_name = re.sub(r"[^\w\-]", "_", product_name)
    path = KNOWLEDGE_DIR / "Products" / f"{safe_name}.md"
    if path.exists():
        return  # Don't overwrite existing product notes
    content = (
        f"# {product_name}\n\n"
        f"- **Company:** {ticker}\n"
        f"- **Category:** {info.get('category', '')}\n"
        f"- **Status:** {info.get('status', '')}\n\n"
        f"{info.get('description', '')}\n"
    )
    path.write_text(content, encoding="utf-8")


def _regenerate_index() -> None:
    lines = [f"# NABR Knowledge Graph Index\n\n_Last generated: {datetime.now().strftime('%Y-%m-%d')}_\n"]

    companies_dir = KNOWLEDGE_DIR / "Companies"
    if companies_dir.exists():
        files = sorted(companies_dir.glob("*.md"))
        lines.append(f"\n## Companies ({len(files)})\n")
        for f in files:
            lines.append(f"- [[{f.stem}]]")

    products_dir = KNOWLEDGE_DIR / "Products"
    if products_dir.exists():
        files = sorted(products_dir.glob("*.md"))
        lines.append(f"\n## Products ({len(files)})\n")
        for f in files:
            lines.append(f"- [[{f.stem}]]")

    (KNOWLEDGE_DIR / "Index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


async def process_filing(ticker: str, layer: str, period: str, doc_type: str, filing_text: str) -> dict:
    """Extract entities from one filing and update knowledge/ notes."""
    try:
        from retrieval.indexing_pipeline import openai_model_complete
    except ImportError:
        from src.retrieval.indexing_pipeline import openai_model_complete

    _knowledge_dir_ready()

    # Trim filing to first 25k chars — enough for key financials/relationships
    text_sample = filing_text[:25000]

    prompt = EXTRACTION_PROMPT.format(
        ticker=ticker, layer=layer, period=period, doc_type=doc_type, text=text_sample
    )

    raw = await openai_model_complete(prompt, system_prompt="Return only valid JSON. No markdown, no explanation.")

    try:
        # Strip any accidental markdown fences
        cleaned = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip())
        extracted = json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"  ⚠️  JSON parse error for {ticker} {period}: {e}")
        extracted = {}

    existing = _read_company(ticker) or {
        "frontmatter": {"ticker": ticker, "layer": layer, "source_filings": [], "relationships": []},
        "body": f"# {ticker}\n\n",
    }

    merged = _merge_company(existing, ticker, layer, period, doc_type, extracted)
    _write_company(ticker, merged)

    for product in extracted.get("PRODUCTS", []):
        name = product.get("product_name", "").strip()
        if name:
            _write_product(name, ticker, product)

    n_financials   = len(extracted.get("KEY_FINANCIALS", []))
    n_relationships = len(extracted.get("RELATIONSHIPS", []))
    n_products     = len(extracted.get("PRODUCTS", []))
    print(f"  ✅ {ticker} {period} — {n_financials} financials, {n_relationships} relationships, {n_products} products")

    return {"ticker": ticker, "period": period, "financials": n_financials, "relationships": n_relationships}


async def run_extraction_on_processed(ticker_filter: Optional[str] = None) -> None:
    """
    Main entry point. Reads all files in data/processed/ and extracts entities.
    Pass ticker_filter="NVDA" to run on a single ticker for testing.
    """
    import yaml
    config_path = BASE_DIR / "config" / "tickers.yaml"
    with open(config_path) as f:
        config = yaml.safe_load(f)

    ticker_to_layer: dict = {}
    for layer_id, layer_info in config["layers"].items():
        for t in layer_info.get("tickers", []):
            ticker_to_layer[t.upper()] = layer_info.get("name", layer_id)

    _knowledge_dir_ready()

    ticker_dirs = sorted(PROCESSED_DIR.iterdir())
    results = []

    for ticker_dir in ticker_dirs:
        if not ticker_dir.is_dir():
            continue
        ticker = ticker_dir.name.upper()
        if ticker_filter and ticker != ticker_filter.upper():
            continue

        layer = ticker_to_layer.get(ticker, "Semiconductor")
        print(f"\n📄 Processing {ticker} ({layer})...")

        for file_path in sorted(ticker_dir.glob("*.txt")):
            parts = file_path.stem.split("_")
            if len(parts) < 2:
                continue
            doc_type = "_".join(parts[:-1])
            date_str = parts[-1]

            # Infer period from date
            try:
                from datetime import datetime as dt
                d = dt.strptime(date_str, "%Y-%m-%d")
                q = ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2", "Q3", "Q3", "Q3", "Q4", "Q4", "Q4"][d.month - 1]
                period = f"{q}_{d.year}"
            except Exception:
                period = "UNKNOWN_PERIOD"

            text = file_path.read_text(encoding="utf-8")
            result = await process_filing(ticker, layer, period, doc_type, text)
            results.append(result)

    _regenerate_index()
    print(f"\n✨ Extraction complete. {len(results)} filings processed.")
    print(f"   knowledge/ index written to {KNOWLEDGE_DIR / 'Index.md'}")


if __name__ == "__main__":
    import sys
    ticker_arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(run_extraction_on_processed(ticker_arg))
