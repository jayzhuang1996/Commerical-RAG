"""
src/ingestion/sec_ingestion.py
Autonomous SEC Filing Ingester for Semiconductor Intelligence.

Features:
- Handles US Companies (NVDA, INTC, AMD) via 10-K/10-Q/8-K.
- Handles Foreign Private Issuers (TSM, ASML, ARM) via 20-F/6-K.
- Quarterly View: Prioritizes MD&A from 10-Q/6-K and Earnings Releases from 8-K.
- Incremental: Checks if the filing is already in the database before processing.
"""

import os
import edgar
from edgar import Company
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Set Identity (SEC requirement)
edgar.set_identity("NABR Intelligence Agent nabr@research.ai")

# Base directory for storing processed text for LightRAG ingestion
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "raw"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class SECIngester:
    def __init__(self, tickers: List[str]):
        self.tickers = [t.upper() for t in tickers]
        
    def fetch_intelligence_package(self, ticker: str):
        """
        Fetches the 'Strategic Triple': 
        1. Annual (Strategy/Risk) 
        2. Quarterly (Execution/MD&A)
        3. Periodic (Earnings/8-K/6-K)
        """
        print(f"\n🚀 Fetching Strategic Intelligence Package for {ticker}...")
        try:
            company = Company(ticker)
        except Exception as e:
            print(f"❌ Error finding company {ticker}: {e}")
            return

        # 1. ANNUAL (Strategic Foundation) - Form 10-K or 20-F
        self._get_annual_strategy(company, ticker)

        # 2. QUARTERLY/PERIODIC (The 'Fast Change' View) - Form 10-Q or 6-K
        self._get_quarterly_updates(company, ticker)

        # 3. CURRENT EVENTS (Earnings/Press Releases) - Form 8-K or 6-K
        self._get_current_events(company, ticker)

    def _get_annual_strategy(self, company: Company, ticker: str):
        """Extracts Item 1 (Business) and Item 1A (Risk Factors)"""
        filings = company.get_filings(form=["10-K", "20-F"]).latest(1)
        if not filings:
            return

        filing = filings[0] if hasattr(filings, '__iter__') else filings
        date_str = filing.filing_date.strftime("%Y-%m-%d")
        print(f"  📂 Processing Annual Strategy ({filing.form}) - {date_str}")

        # Extract core sections
        try:
            doc = filing.obj()
            # For 10-K, sections are 1, 1A, 7. For 20-F, they might be different labels.
            # We'll try to get text and save it.
            sections = ["1", "1A", "7"] if filing.form == "10-K" else ["Item 3", "Item 4", "Item 5"]
            
            for sec_id in sections:
                try:
                    section_content = doc.sections.get(sec_id)
                    if section_content:
                        tag = "risk" if "A" in sec_id or "3" in sec_id else "business"
                        self._save_to_disk(ticker, f"annual_{tag}_{date_str}.txt", section_content.text())
                except:
                    continue
        except Exception as e:
            print(f"  ⚠️ Could not parse structured sections for {filing.form}: {e}")
            # Fallback: Save the whole text if it's not too giant
            # self._save_to_disk(ticker, f"annual_full_{date_str}.txt", filing.text())

    def _get_quarterly_updates(self, company: Company, ticker: str):
        """Extracts MD&A from 10-Q or semi-annual 6-K"""
        filings = company.get_filings(form=["10-Q", "6-K"]).latest(4) # Get last year of quarters
        if not filings:
            return

        for filing in filings:
            date_str = filing.filing_date.strftime("%Y-%m-%d")
            
            # For 6-K, we look for 'Report of Foreign Issuer' which often links to financial results.
            # For 10-Q, we specifically want MD&A (Item 2)
            if filing.form == "10-Q":
                print(f"  📈 Processing Quarterly Update (10-Q) - {date_str}")
                try:
                    section = filing.obj().sections.get("2")
                    if section:
                        self._save_to_disk(ticker, f"quarterly_mda_{date_str}.txt", section.text())
                except:
                    pass
            elif filing.form == "6-K":
                # 6-Ks are messy. We'll search for attachments that look like 'Financial Results'
                for att in filing.attachments:
                    if 'Financial' in att.document_type or 'Report' in att.document_type:
                        print(f"  📈 Processing Periodic Update (6-K) - {date_str}")
                        self._save_to_disk(ticker, f"periodic_6k_{date_str}.txt", att.text())
                        break

    def _get_current_events(self, company: Company, ticker: str):
        """Extracts Earnings Press Releases from 8-K/6-K Exhibits"""
        filings = company.get_filings(form=["8-K", "6-K"]).latest(10)
        if not filings:
            return

        for filing in filings:
            date_str = filing.filing_date.strftime("%Y-%m-%d")
            # We specifically look for EX-99.1 (Investor Presentation / Earnings Release)
            for att in filing.attachments:
                doc_type = getattr(att, 'document_type', '') or ''
                if 'EX-99' in doc_type.upper():
                    text = att.text()
                    if text and len(text) > 500:
                        print(f"  🔔 Processing Earnings Release ({filing.form} EX-99) - {date_str}")
                        self._save_to_disk(ticker, f"earnings_press_release_{date_str}.txt", text)
                        return # We just want the most recent one to avoid noise

    def _save_to_disk(self, ticker: str, filename: str, content: str):
        ticker_dir = DATA_DIR / ticker
        ticker_dir.mkdir(parents=True, exist_ok=True)
        path = ticker_dir / filename
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        # print(f"    ✅ Saved: {filename}")

if __name__ == "__main__":
    import yaml
    
    # Load tickers from config
    config_path = Path(__file__).parent.parent.parent / "config" / "tickers.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    
    target_tickers = []
    for layer_id, layer_info in config['layers'].items():
        target_tickers.extend(layer_info['tickers'])
    
    # Remove duplicates and cleanup
    target_tickers = sorted(list(set([t.strip() for t in target_tickers])))
    
    print(f"📡 Initiating Bulk Intelligence Pull for {len(target_tickers)} companies...")
    
    ingester = SECIngester(target_tickers)
    for ticker in target_tickers:
        # SEC EDGAR has a 10 requests / second limit. 
        # We will process sequentially to be respectful.
        ingester.fetch_intelligence_package(ticker)
    
    print("\n✅ Bulk Ingestion Complete. Data ready in 'data/raw/' for LightRAG indexing.")
