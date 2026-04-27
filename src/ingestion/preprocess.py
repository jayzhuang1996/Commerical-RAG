"""
src/ingestion/preprocess.py
Pre-processes raw SEC text filings for LightRAG ingestion.
- Adds metadata headers (Ticker, Layer, Period).
- Cleans out legal boilerplate and noise.
- Prepares files in data/processed/
"""

import os
import re
import yaml
from pathlib import Path
from datetime import datetime

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
CONFIG_PATH = BASE_DIR / "config" / "tickers.yaml"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

def get_quarter(date_str):
    """Infers quarter from date string YYYY-MM-DD"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        month = dt.month
        year = dt.year
        if 1 <= month <= 3: q = "Q1"
        elif 4 <= month <= 6: q = "Q2"
        elif 7 <= month <= 9: q = "Q3"
        else: q = "Q4"
        return f"{q}_{year}"
    except:
        return "UNKNOWN_PERIOD"

def clean_text(text):
    """Basic cleaning for SEC filings"""
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove 'Table of Contents' and page numbers if simple
    text = re.sub(r'Table of Contents', '', text, flags=re.IGNORECASE)
    # Remove common SEC boilerplate markers if they are alone on a line
    text = re.sub(r'^\s*Item\s+\d+[A-Z]?\.\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    return text.strip()

def preprocess_all():
    # Load ticker-to-layer mapping
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)
    
    ticker_to_layer = {}
    for layer_id, layer_info in config['layers'].items():
        for ticker in layer_info['tickers']:
            ticker_to_layer[ticker.upper()] = layer_id.upper()

    print(f"🧹 Starting pre-processing of raw filings...")
    
    for ticker_dir in RAW_DIR.iterdir():
        if not ticker_dir.is_dir(): continue
        ticker = ticker_dir.name.upper()
        layer = ticker_to_layer.get(ticker, "UNKNOWN_LAYER")
        
        # Output dir for this ticker
        out_ticker_dir = PROCESSED_DIR / ticker
        out_ticker_dir.mkdir(parents=True, exist_ok=True)
        
        for file_path in ticker_dir.glob("*.txt"):
            # Filename format: [type]_[date].txt
            parts = file_path.stem.split("_")
            if len(parts) < 2: continue
            
            doc_type = "_".join(parts[:-1])
            date_str = parts[-1]
            period = get_quarter(date_str)
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            cleaned_content = clean_text(content)
            
            # Create a combined header for LightRAG/Vector context
            header = f"--- SOURCE INFO ---\nTicker: {ticker}\nLayer: {layer}\nPeriod: {period}\nDate: {date_str}\nDoc Type: {doc_type}\n--- END INFO ---\n\n"
            
            final_content = header + cleaned_content
            
            out_file = out_ticker_dir / file_path.name
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(final_content)
            
            print(f"  ✅ Processed {ticker} - {file_path.name}")

if __name__ == "__main__":
    preprocess_all()
    print("\n✨ Pre-processing complete. Data ready in 'data/processed/'.")
