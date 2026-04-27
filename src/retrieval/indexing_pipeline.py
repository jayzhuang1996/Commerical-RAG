"""
src/retrieval/indexing_pipeline.py
Constructs the Semiconductor Intelligence Graph using LightRAG.
- Ingests processed SEC filings.
- Uses local sentence-transformers for embeddings (FREE/OFFLINE).
- Uses Moonshot AI for entity/relationship extraction.
"""

import os
import asyncio
from pathlib import Path
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import openai_complete
from lightrag.utils import EmbeddingFunc
import numpy as np
from dotenv import load_dotenv
from openai import AsyncOpenAI
from transformers import AutoModel, AutoTokenizer
import torch

load_dotenv()

# Configuration
WORKING_DIR = Path(__file__).parent.parent.parent / "data" / "index"
PROCESSED_DATA_DIR = Path(__file__).parent.parent.parent / "data" / "processed"
WORKING_DIR.mkdir(parents=True, exist_ok=True)

# API Keys
MOONSHOT_API_KEY = os.environ.get("MOONSHOT_API_KEY")
MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1"

# Force LightRAG's internal OpenAI clients to use Moonshot
os.environ["OPENAI_API_KEY"] = MOONSHOT_API_KEY
os.environ["OPENAI_BASE_URL"] = MOONSHOT_BASE_URL

# --- LLM Setup (Moonshot) ---
# Global Semaphore to stay within Moonshot's concurrency limit (3)
# Setting to 1 for absolute sequential safety during extraction
moonshot_semaphore = asyncio.Semaphore(1)

async def moonshot_model_complete(
    prompt, system_prompt=None, history_messages=[], **kwargs
) -> str:
    """OpenAI-compatible wrapper for Moonshot with Strict Sequential Locking & Retry"""
    
    async with moonshot_semaphore:
        for attempt in range(5): # Up to 5 attempts
            try:
                # Hard cooldown to clear any lingering organization concurrency
                await asyncio.sleep(5.0)
                
                client = AsyncOpenAI(api_key=MOONSHOT_API_KEY, base_url=MOONSHOT_BASE_URL)
                
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.extend(history_messages)
                messages.append({"role": "user", "content": prompt})

                allowed_kwargs = {k: v for k, v in kwargs.items() if k in ["temperature", "top_p", "max_tokens"]}
                
                response = await client.chat.completions.create(
                    model="moonshot-v1-8k",
                    messages=messages,
                    **allowed_kwargs
                )
                return response.choices[0].message.content
            except Exception as e:
                if "429" in str(e) and attempt < 4:
                    print(f"⚠️ Rate limited. Cooling down for 10s... (Attempt {attempt+1}/5)")
                    await asyncio.sleep(10.0)
                    continue
                raise e

# --- Embedding Setup (Local Sentence-Transformers) ---
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_tokenizer = AutoTokenizer.from_pretrained(EMBED_MODEL_NAME)
_model = AutoModel.from_pretrained(EMBED_MODEL_NAME)

async def local_embedding(texts: list[str]) -> np.ndarray:
    """Computes embeddings locally using sentence-transformers"""
    inputs = _tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        outputs = _model(**inputs)
    # Mean pooling
    embeddings = outputs.last_hidden_state.mean(dim=1)
    return embeddings.cpu().numpy()

# Initialize LightRAG
rag = LightRAG(
    working_dir=str(WORKING_DIR),
    llm_model_func=moonshot_model_complete,
    llm_model_name="moonshot-v1-8k",
    embedding_func=EmbeddingFunc(
        embedding_dim=384, # all-MiniLM-L6-v2 dimension
        max_token_size=512,
        func=local_embedding
    ),
    addon_params={"max_async_tasks": 1} # Stay within Moonshot's 3-concurrency limit
)

async def build_graph():
    print(f"🕸️ Starting Graph Construction (LightRAG)...")
    
    # Collect all processed files
    all_files = sorted(list(PROCESSED_DATA_DIR.rglob("*.txt")))
    print(f"  Found {len(all_files)} processed filings to index.")
    
    # Initialize storage backends (Required)
    await rag.initialize_storages()
    
    # Ingest files
    for i, file_path in enumerate(all_files):
        ticker = file_path.parent.name
        print(f"  [{i+1}/{len(all_files)}] Indexing {ticker} - {file_path.name}...")
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Insert into LightRAG
        # This will trigger LLM extraction of entities and relationships
        await rag.ainsert(content)

    print("\n✅ Graph Construction Complete.")
    print(f"📍 Index stored in: {WORKING_DIR}")

if __name__ == "__main__":
    asyncio.run(build_graph())
