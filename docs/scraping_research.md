# Research: Efficient Earnings Call Scraping (2024-2025)

To build a high-quality demo for the Head of Advisory, we need to gather 100-150 transcripts across a single industry (e.g., Tech or Retail). Here is the most efficient engineering path.

## 1. The "Golden Path" (Official APIs)
These are the most efficient ways to get clean, pre-parsed JSON.

### A. Financial Modeling Prep (FMP) API
- **Efficiency:** 10/10. Clean JSON delivery.
- **Python Implementation:**
```python
import requests

def get_transcript_fmp(ticker, year, quarter, api_key):
    url = f"https://financialmodelingprep.com/api/v3/earning_call_transcript/{ticker}?quarter={quarter}&year={year}&apikey={api_key}"
    return requests.get(url).json()[0]['content']
```
- **Cost:** ~$19/mo (Starter Plan).

### B. Alpha Vantage API
- **Efficiency:** 9/10.
- **Python Implementation:**
```python
# function=EARNINGS_CALL_TRANSCRIPT
url = f"https://www.alphavantage.co/query?function=EARNINGS_CALL_TRANSCRIPT&symbol={ticker}&year={year}&quarter={quarter}&apikey={api_key}"
```
- **Note:** Their free tier is often restricted to sample tickers (like IBM). Full access requires a Premium key.

## 2. The "Hacker Path" (Open Source Scraping)
If you must do it for free, avoid Seeking Alpha (which uses Cloudflare/DataDome) and target **Motley Fool** or **Quartr**.

### Open Source Projects to leverage:
1. **[yfinance](https://github.com/ranaroussi/yfinance):** Has some support for metadata, but full-text transcripts are inconsistent.
2. **[fin-data-api](https://github.com/topics/earnings-call-scraper):** Check GitHub for recent repositories using `Playwright` or `Selenium` to scrape Motley Fool.
3. **[SEC EDGAR]:** Technically free, but parsing transcripts out of 10-Qs is a nightmare because they aren't standardized.

## 3. Recommended Workflow for the Demo
1. **Ticker Selection:** Get the list of the S&P 500 Tech or Retail tickers.
2. **Bulk Retrieval:** Use the FMP API (or a Motley Fool scraper) to download `Last 4 Quarters` for the top 40 companies in that ticker list (~160 transcripts).
3. **Storage:** Save each as a `.txt` file in `data/raw/` named `TICKER_YYYY_QX.txt`.
4. **Ingestion:** Point LightRAG at the `data/raw/` folder.

## Summary: Efficiency Comparison
| Method | Speed | Maintenance | Reliability |
| :--- | :--- | :--- | :--- |
| **FMP API** | 10/10 | Zero | High |
| **Custom Scraper**| 3/10 | High | Low |
| **GitHub Scraper**| 5/10 | Moderate | Moderate |
