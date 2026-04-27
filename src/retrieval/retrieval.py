import os
import sys
from rank_bm25 import BM25Okapi
import cohere
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.db import get_connection, get_supabase_client
from src.embeddings import get_collection
load_dotenv()

# Constants
VECTOR_TOP_K = 20
BM25_TOP_K   = 20
RERANK_TOP_N = 5
USE_SUPABASE = os.getenv("USE_SUPABASE", "false").lower() == "true"

class HybridRetriever:
    """
    Hybrid search: BM25 + (ChromaDB or Supabase) fused via RRF,
    then reranked by Cohere.
    """

    def __init__(self):
        self._bm25_index = None
        self._bm25_corpus = None
        self._cohere_client = None
        self._supabase = get_supabase_client() if USE_SUPABASE else None

    def build_bm25_index(self):
        """BM25 is disabled in Cloud Mode to prevent 500MB OOM crashes."""
        pass

    def search_bm25(self, query: str, top_k=BM25_TOP_K):
        # Disabled for Cloud. We rely entirely on Vector Similarity + Cohere Rerank.
        return []

    def search_vector(self, query: str, top_k=VECTOR_TOP_K):
        from src.embeddings import get_collection, get_embeddings
        query_embedding = get_embeddings([query])[0]

        if USE_SUPABASE:
            res = self._supabase.rpc('match_chunks', {
                'query_embedding': query_embedding,
                'match_threshold': 0.1,
                'match_count': top_k
            }).execute()
            return [{'id': r['id'], 'score': r['similarity']} for r in res.data]
        else:
            collection = get_collection()
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["distances"]
            )
            ids = results['ids'][0]
            scores = [1 / (1 + d) for d in results['distances'][0]]
            return [{'id': chunk_id, 'score': score} for chunk_id, score in zip(ids, scores)]

    def rrf_fusion(self, bm25_results, vector_results, k=60):
        scores = {}
        for rank, item in enumerate(bm25_results):
            scores[item['id']] = scores.get(item['id'], 0.0) + 1.0 / (k + rank + 1)
        for rank, item in enumerate(vector_results):
            scores[item['id']] = scores.get(item['id'], 0.0) + 1.0 / (k + rank + 1)
        fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [{'id': chunk_id, 'score': score} for chunk_id, score in fused]

    def rerank(self, query: str, fused_results, top_n=RERANK_TOP_N):
        if not fused_results:
            return []
        chunk_ids = [r['id'] for r in fused_results]

        if USE_SUPABASE:
            res = self._supabase.table("viking_chunks").select("id, text").in_("id", chunk_ids).execute()
            chunks_by_id = {r['id']: r['text'] for r in res.data}
        else:
            conn = get_connection()
            cursor = conn.cursor()
            placeholders = ','.join('?' * len(chunk_ids))
            cursor.execute(f"SELECT id, text FROM chunks WHERE id IN ({placeholders})", chunk_ids)
            chunks_by_id = {r['id']: r['text'] for r in cursor.fetchall()}
            conn.close()

        documents = [chunks_by_id.get(cid, '') for cid in chunk_ids]
        api_key = os.getenv("COHERE_API_KEY")
        if not api_key:
            raise ValueError("COHERE_API_KEY not set.")
        co = cohere.ClientV2(api_key=api_key)
        response = co.rerank(model="rerank-v3.5", query=query, documents=documents, top_n=top_n)
        
        reranked = []
        for result in response.results:
            original_idx = result.index
            reranked.append({
                'id': chunk_ids[original_idx],
                'text': documents[original_idx],
                'score': result.relevance_score
            })
        return reranked

    def get_context(self, reranked_results):
        if not reranked_results:
            return []
        child_ids = [r['id'] for r in reranked_results]

        if USE_SUPABASE:
            res = self._supabase.table("viking_chunks").select("id, parent_id, video_id").in_("id", child_ids).execute()
            child_rows = {r['id']: r for r in res.data}
            parent_ids = list({r['parent_id'] for r in child_rows.values() if r['parent_id']})
            if not parent_ids: return []
            res_p = self._supabase.table("viking_chunks").select("id, text, video_id").in_("id", parent_ids).execute()
            parent_rows = {r['id']: r for r in res_p.data}
        else:
            conn = get_connection()
            cursor = conn.cursor()
            placeholders = ','.join('?' * len(child_ids))
            cursor.execute(f"SELECT id, parent_id, video_id FROM chunks WHERE id IN ({placeholders})", child_ids)
            child_rows = {r['id']: r for r in cursor.fetchall()}
            parent_ids = list({r['parent_id'] for r in child_rows.values() if r['parent_id']})
            if not parent_ids: conn.close(); return []
            placeholders2 = ','.join('?' * len(parent_ids))
            cursor.execute(f"SELECT id, text, video_id FROM chunks WHERE id IN ({placeholders2})", parent_ids)
            parent_rows = {r['id']: dict(r) for r in cursor.fetchall()}
            conn.close()

        context = []
        for res in reranked_results:
            child_id = res['id']
            child_row = child_rows.get(child_id)
            if not child_row: continue
            p_id = child_row['parent_id']
            p_row = parent_rows.get(p_id, {})
            context.append({
                'video_id': child_row['video_id'],
                'parent_id': p_id,
                'parent_text': p_row.get('text', res['text']),
                'child_text': res['text'],
                'child_score': res['score']
            })
        return context

    def get_entities(self, query: str):
        """Extract key entities from the user query to query the graph."""
        from openai import OpenAI
        moonshot_key = os.getenv("MOONSHOT_API_KEY")
        if not moonshot_key: return []
        
        client = OpenAI(api_key=moonshot_key, base_url="https://api.moonshot.ai/v1")
        prompt = f"Extract exactly 1-3 key technology entities (names, products, companies) from this question. Return only a comma-separated list of terms: '{query}'"
        
        try:
            res = client.chat.completions.create(
                model="moonshot-v1-8k",
                messages=[{"role": "user", "content": prompt}]
            )
            entities = [e.strip() for e in res.choices[0].message.content.split(",")]
            return [e for e in entities if e]
        except:
            return []

    def get_graph_context(self, entities):
        """Fetch Subject-Verb-Object triples from Supabase for a set of entities."""
        if not USE_SUPABASE or not entities:
            return []
        
        all_triples = []
        for entity in entities:
            # Search both as subject and object
            res = self._supabase.table("viking_relationships")\
                .select("subject, verb, object")\
                .or_(f"subject.ilike.%{entity}%,object.ilike.%{entity}%")\
                .limit(10)\
                .execute()
            all_triples.extend(res.data)
        
        # Deduplicate
        seen = set()
        unique = []
        for t in all_triples:
            key = (t['subject'], t['verb'], t['object'])
            if key not in seen:
                seen.add(key)
                unique.append({
                    "subject": t['subject'], 
                    "verb": t['verb'], 
                    "object": t['object']
                })
        return unique

    def retrieve(self, query: str):
        """Perform vector retrieval + graph augmentation."""
        # 1. Text Retrieval
        vector_results = self.search_vector(query)
        reranked = self.rerank(query, vector_results)
        text_context = self.get_context(reranked)

        # 2. Graph Retrieval
        entities = self.get_entities(query)
        graph_context = self.get_graph_context(entities)

        return {
            'text_context': text_context,
            'graph_context': graph_context,
            'entities': entities
        }
