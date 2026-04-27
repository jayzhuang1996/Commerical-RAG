# Guide: High-Value Data Sources & Comparative Projects

To build a "Staff Level" demo, you need to go beyond raw text and find data that contains **Conflict, Reasoning, and Goal-Setting.**

## 1. Availability of Earnings Transcripts
- **Coverage:** ~90% of US-listed public companies (NYSE/NASDAQ) with a market cap over $2B generate transcripts every 90 days.
- **The "Demo Trap":** Smaller companies often have very dry, short transcripts. For the demo, target **Big Tech (Mag 7)** or **Retail Goliaths (Walmart/Target)**. Their transcripts are 60+ minutes long and contain heated "Analyst Q&A" sessions where the real "Decision Traces" are hidden.

## 2. Beyond Transcripts: Alternative High-Value Sources
If transcripts are the "What," these sources are the "Hidden Why."

| Source | Why it makes your RAG "Smarter" | Where to get it |
| :--- | :--- | :--- |
| **SEC 10-K / 10-Q** | Contains the literal "Risk Factors" section written by lawyers. Perfect for `[CONCERN]` nodes. | [SEC EDGAR (Free)](https://www.sec.gov/edgar/searchedgar/companysearch) |
| **Expert Network Interviews** | Transcripts of former VPs/Engineers explaining *why* a project failed. Extremely high signal. | [Tegus / AlphaSense (Expensive)](https://www.tegus.com/) |
| **G2 / Capterra Reviews** | Unfiltered client pain points about specific products. Perfect for mapping `[PRODUCT] -> [HAS_ISSUE]`. | [Scrape using Playwright] |
| **Glassdoor Reviews** | If employees are complaining about "slow tech debt," it's a huge "Macro Weakness" alert for your boss. | [Scrape using Apify] |
| **Reddit (r/Investing)**| Captures the "Market Sentiment" which often contradicts the CEO's official words. | [Reddit API] |

## 3. Notable Open Source Projects in this Space
You aren't reinventing the wheel, but you are specializing it. 

1. **[FinGPT](https://github.com/AI4Finance-Foundation/FinGPT):** The industry leader in open-source financial LLMs. They provide high-quality datasets of earnings calls and 10-Ks already formatted for AI.
2. **[OpenBB](https://github.com/OpenBB-finance/OpenBBTerminal):** An open-source "Bloomberg Terminal." They have a massive library for fetching data that you can use to feed your LightRAG.
3. **[RAGFlow](https://github.com/infiniflow/ragflow):** Specifically designed for "Deep Document Parsing." Use this if you want to parse complex tables inside a 200-page PDF 10-K correctly.
4. **[Verba](https://github.com/weaviate/Verba):** A very polished UI for RAG that you could use as inspiration for your frontend.

## 4. Why your approach is different
Most of these projects focus on **"Information Retrieval"** (finding a fact). 
**Your project** focuses on **"Graph Discovery"** (finding a pattern). 

By using **LightRAG + LangGraph**, you are building a system that can say: *"Company A's CEO said 'Inflation is over,' but their employees on Glassdoor are complaining about 'Salary freezes,' and their 10-K lists 'Wage Pressure' as a Top 3 Risk."* 

**That level of "Cross-System Synthesis" is what will impress your boss.**
