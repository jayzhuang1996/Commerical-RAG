"""
src/retrieval/visual_utils.py
Utilities to convert LightRAG graphs into Frontend-ready JSONs.
Calculates clusters and relationship maps for ForceGraph and ClusterVisualizer.
"""

import networkx as nx
import re
from typing import List, Dict, Any

def get_file_origin_mapping(rag_index) -> Dict[str, str]:
    """
    Parses the internal LightRAG doc_status storage to create a chunk-to-filename mapping.
    Uses the 'SOURCE INFO' block in the content_summary.
    """
    mapping = {}
    doc_status = getattr(rag_index, 'doc_status', None)
    if not doc_status:
        return mapping
        
    # Standard internal storage is a dict or has a filter_keys method
    # For now, we assume it's a dict-like accessible via doc_status.data or similar
    # In earlier runs we saw it might not have .data but is iterable or has keys
    
    # Let's try to get the raw data
    data = getattr(doc_status, '_data', {})
    if not data:
        # Fallback: maybe it's the object itself if it wraps a dict
        try:
            # We used view_file and saw it's a JSON structure
            import json
            with open(doc_status.namespace_path, 'r') as f:
                data = json.load(f)
        except:
            return {}

    for doc_id, info in data.items():
        summary = info.get('content_summary', '')
        # Extract Ticker, Period, Doc Type
        ticker = re.search(r"Ticker:\s*(\w+)", summary)
        period = re.search(r"Period:\s*([\w_]+)", summary)
        doc_type = re.search(r"Doc Type:\s*([\w_]+)", summary)
        
        nice_name = "Global Intelligence"
        if ticker and period:
            t = ticker.group(1)
            p = period.group(1).replace('_', ' ')
            dt = doc_type.group(1).replace('_', ' ') if doc_type else "Filing"
            nice_name = f"{t} {dt} {p}"
            
        for chunk_id in info.get('chunks_list', []):
            mapping[chunk_id] = nice_name
            
    return mapping

def extract_visual_graph(rag_index, query_results: str) -> Dict[str, Any]:
    """
    Sub-samples the Master Graph based on the entities found in the query results.
    Prevents the frontend from being overwhelmed by 10,000 nodes.
    """
    # 1. Access the internal NetworkX graph from LightRAG
    # This assumes the graphml has been loaded/built
    full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
    
    if not full_graph:
        return {"nodes": [], "links": []}
    
    # Get the file mapping for better tooltips/sources
    source_map = get_file_origin_mapping(rag_index)
    
    # 2. Find mention of entities in the results (simplistic for now)
    seed_nodes = []
    for node in full_graph.nodes():
        if node.lower() in query_results.lower():
            seed_nodes.append(node)
    
    # If no nodes found natively, pick central ones
    if not seed_nodes:
        centrality = nx.degree_centrality(full_graph)
        seed_nodes = sorted(centrality, key=centrality.get, reverse=True)[:3]

    # 3. Build a CONNECTED sub-graph. Instead of just grabbing isolated seeds,
    # we expand 1 degree outwards from the seeds to ensure relationships exist.
    connected_subgraph_nodes = set()
    for seed in seed_nodes[:4]: # Limit to top 4 seeds to prevent blowout
        try:
            ego = nx.ego_graph(full_graph, seed, radius=1)
            connected_subgraph_nodes.update(ego.nodes())
        except:
            pass
            
    subgraph = full_graph.subgraph(list(connected_subgraph_nodes))
    
    # 4. Format for ForceGraphVisualizer
    visual_data = {
        "nodes": [],
        "links": []
    }
    
    for node in subgraph.nodes():
        # Assign 'group' based on Layer if available in metadata
        group = 1 
        visual_data["nodes"].append({"id": node, "group": group})
        
    for source, target, data in subgraph.edges(data=True):
        chunk_id = data.get("source_id", "unknown")
        origin = source_map.get(chunk_id, "SEC Integrated Filing")
        
        visual_data["links"].append({
            "source": source,
            "target": target,
            "value": 1,
            "label": data.get("description", "connected"),
            "origin": origin
        })
        
    return visual_data

def extract_cluster_data(rag_index) -> List[Dict[str, Any]]:
    """
    Extracts high-level clusters for the CommunityExplorer.
    Groups companies found in the graph by their vertical.
    """
    import networkx as nx
    
    # Try to load the graph if index exists
    try:
        full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
        all_nodes = list(full_graph.nodes()) if full_graph else []
    except:
        all_nodes = []

    # Map nodes to layers (Expanded with deeper relationships for UI density)
    layers = {
        "Designers": ["NVDA", "AMD", "AVGO", "ARM", "QCOM", "MRVL", "SNPS", "CDNS", "ALTR", "INTC", "Apple", "Google", "Amazon", "Mellanox"],
        "Equipment": ["ASML", "AMAT", "LRCX", "KLAC", "TOKYO ELECTRON", "Zeiss", "Trumpf", "KLA", "Applied Materials", "Lam Research", "Lasertec", "Advantest", "Teradyne"],
        "Foundry": ["TSM", "INTC", "Samsung", "GlobalFoundries", "UMC", "SMIC", "Tower", "Epiworks", "Win Semi", "TSMC"],
        "Networking": ["MRVL", "ANET", "CSCO", "JNPR", "Broadcom", "Infiniband", "Mellanox", "Cisco", "Arista", "Foxconn", "Supermicro", "Dell", "HPE", "SMCI"]
    }
    
    clusters = []
    for layer_name, members in layers.items():
        # Find which members of this layer are actually in our graph right now (case-insensitive check)
        found = []
        for m in members:
            if any(m.lower() in node.lower() for node in all_nodes):
                found.append(m)
        
        if found:
            clusters.append({
                "id": layer_name,
                "children": [{"id": m} for m in found]
            })
            
    return clusters
