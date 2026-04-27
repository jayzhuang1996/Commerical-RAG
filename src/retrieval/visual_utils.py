"""
src/retrieval/visual_utils.py
Utilities to convert LightRAG graphs into Frontend-ready JSONs.
Calculates clusters and relationship maps for ForceGraph and ClusterVisualizer.
"""

import networkx as nx
from typing import List, Dict, Any

def extract_visual_graph(rag_index, query_results: str) -> Dict[str, Any]:
    """
    Sub-samples the Master Graph based on the entities found in the query results.
    Prevents the frontend from being overwhelmed by 10,000 nodes.
    """
    # 1. Access the internal NetworkX graph from LightRAG
    # This assumes the graphml has been loaded/built
    full_graph = rag_index.chunk_entity_relation_graph
    
    # 2. Find mention of entities in the results (simplistic for now)
    # In Phase 3, we can get the actual nodes from LightRAG's query result
    nodes_to_include = []
    for node in full_graph.nodes():
        if node.lower() in query_results.lower():
            nodes_to_include.append(node)
    
    # If no nodes found, pick the most central ones
    if not nodes_to_include:
        centrality = nx.degree_centrality(full_graph)
        nodes_to_include = sorted(centrality, key=centrality.get, reverse=True)[:15]

    # 3. Build sub-graph
    subgraph = full_graph.subgraph(nodes_to_include)
    
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
        visual_data["links"].append({
            "source": source,
            "target": target,
            "value": 1,
            "label": data.get("description", "connected")
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
        full_graph = rag_index.chunk_entity_relation_graph
        all_nodes = list(full_graph.nodes())
    except:
        all_nodes = []

    # Map nodes to layers
    layers = {
        "Designers": ["NVDA", "AMD", "AVGO", "ARM"],
        "Equipment": ["ASML", "AMAT", "LRCX", "KLAC"],
        "Foundry": ["TSM", "INTC"],
        "Networking": ["MRVL", "ANET", "ANET"]
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
