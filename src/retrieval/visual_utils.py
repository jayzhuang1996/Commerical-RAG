"""
src/retrieval/visual_utils.py
Produces clean, insight-rich graph data:
  - Only cross-company edges (filters out generic concept nodes)
  - Classifies edge type from description keywords
  - Returns compact JSON for the force-directed frontend graph
"""

import networkx as nx
import re
from typing import List, Dict, Any

# ── Company whitelist ──────────────────────────────────────────────────────────
# All canonical forms found in the graph (case-insensitive matching)
COMPANIES = [
    "nvidia", "tsmc", "taiwan semiconductor", "amd", "intel", "intel corporation",
    "asml", "lam research", "lam research corporation", "applied materials", "amat",
    "kla", "klac", "broadcom", "broadcom inc", "cadence", "cdns", "synopsys",
    "arm", "qualcomm", "qcom", "samsung", "micron", "sk hynix", "hynix",
    "smic", "globalfoundries", "marvell", "mrvl", "on semiconductor", "on semi",
    "texas instruments", "analog devices", "microchip technology", "infineon",
    "nxp", "stmicroelectronics", "renesas", "mediatek", "meta", "microsoft",
    "google", "amazon", "apple", "ibm", "umc", "tower semiconductor",
]

def _is_company(name: str) -> bool:
    n = name.lower().strip()
    return any(c in n for c in COMPANIES)

# ── Edge type classifier ───────────────────────────────────────────────────────
SUPPLY_KEYWORDS    = ["supplies", "supply", "manufactures", "fabricates", "produces",
                      "award", "customer", "sells to", "contract", "foundry", "node"]
PARTNER_KEYWORDS   = ["partnership", "partner", "collaboration", "collaborat", "joint",
                      "alliance", "integrat", "support", "selected", "deploy"]
COMPETE_KEYWORDS   = ["compet", "rival", "alternative", "versus", "against", "challenges"]
EXPOSE_KEYWORDS    = ["risk", "export", "geopolit", "sanction", "restrict", "regulation",
                      "ban", "china", "government", "compliance"]
INVEST_KEYWORDS    = ["invest", "acqui", "merger", "stake", "fund", "capital", "financing"]

def _classify_edge(description: str) -> str:
    d = description.lower()
    if any(k in d for k in SUPPLY_KEYWORDS):    return "supply"
    if any(k in d for k in PARTNER_KEYWORDS):   return "partnership"
    if any(k in d for k in COMPETE_KEYWORDS):   return "competitive"
    if any(k in d for k in EXPOSE_KEYWORDS):    return "geopolitical"
    if any(k in d for k in INVEST_KEYWORDS):    return "investment"
    return "related"

# ── Edge type → UI color (Element brand palette) ──────────────────────────────
EDGE_COLORS = {
    "supply":       "#05AFDC",   # Element blue  — supply chain
    "partnership":  "#00D7D2",   # Element teal  — partnership
    "competitive":  "#F59E0B",   # Amber         — competitive tension
    "geopolitical": "#BF2E2E",   # Red           — risk / exposure
    "investment":   "#82C341",   # Green         — investment / M&A
    "related":      "#96BED2",   # Blue-mist     — generic
}

# ── Main extraction ────────────────────────────────────────────────────────────
def extract_visual_graph(rag_index, query_results: str) -> Dict[str, Any]:
    """
    Returns ONLY cross-company edges, classified by relationship type.
    Used by the ForceGraph frontend visualizer.
    """
    full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
    if not full_graph:
        return {"nodes": [], "links": []}

    # 1. Collect all cross-company edges from the full graph
    all_cross_edges = []
    for u, v, data in full_graph.edges(data=True):
        if _is_company(u) and _is_company(v) and u.lower() != v.lower():
            desc = data.get("description", "")
            all_cross_edges.append({
                "source": u,
                "target": v,
                "description": desc,
                "type": _classify_edge(desc),
            })

    # 2. If a query was made, prioritise edges whose nodes appear in the answer
    if query_results:
        q_lower = query_results.lower()
        def relevance(e):
            score = 0
            if e["source"].lower() in q_lower: score += 2
            if e["target"].lower() in q_lower: score += 2
            if e["type"] in ("supply", "partnership"): score += 1
            return score
        all_cross_edges.sort(key=relevance, reverse=True)

    # Limit to top 60 for performance
    edges = all_cross_edges[:60]

    # 3. Build unique node list from the kept edges
    node_ids = set()
    for e in edges:
        node_ids.add(e["source"])
        node_ids.add(e["target"])

    # Degree within this subgraph (for node sizing)
    degree: Dict[str, int] = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1

    nodes = [{"id": nid, "degree": degree.get(nid, 1)} for nid in node_ids]

    links = [
        {
            "source": e["source"],
            "target": e["target"],
            "label":  e["description"][:200],   # truncate for JSON size
            "type":   e["type"],
            "color":  EDGE_COLORS[e["type"]],
        }
        for e in edges
    ]

    return {"nodes": nodes, "links": links}


# ── Cluster extraction (unchanged, used by CommunityExplorer) ─────────────────
def extract_cluster_data(rag_index) -> List[Dict[str, Any]]:
    try:
        full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
        all_nodes = list(full_graph.nodes()) if full_graph else []
    except:
        all_nodes = []

    layers = {
        "Designers":  ["NVDA", "AMD", "AVGO", "ARM", "QCOM", "MRVL", "SNPS", "CDNS",
                       "INTC", "Apple", "Google", "Amazon", "Mellanox"],
        "Equipment":  ["ASML", "AMAT", "LRCX", "KLAC", "TOKYO ELECTRON", "KLA",
                       "Applied Materials", "Lam Research", "Advantest", "Teradyne"],
        "Foundry":    ["TSM", "INTC", "Samsung", "GlobalFoundries", "UMC", "SMIC", "TSMC"],
        "Networking": ["MRVL", "ANET", "CSCO", "Broadcom", "Cisco", "Arista",
                       "Supermicro", "Dell", "HPE", "SMCI"],
    }

    clusters = []
    for layer_name, members in layers.items():
        found = [m for m in members
                 if any(m.lower() in node.lower() for node in all_nodes)]
        if found:
            clusters.append({
                "id": layer_name,
                "children": [{"id": m} for m in found],
            })
    return clusters


def get_file_origin_mapping(rag_index) -> Dict[str, str]:
    mapping = {}
    doc_status = getattr(rag_index, 'doc_status', None)
    if not doc_status:
        return mapping
    data = getattr(doc_status, '_data', {})
    if not data:
        try:
            import json
            with open(doc_status.namespace_path, 'r') as f:
                data = json.load(f)
        except:
            return {}
    for doc_id, info in data.items():
        summary = info.get('content_summary', '')
        ticker   = re.search(r"Ticker:\s*(\w+)", summary)
        period   = re.search(r"Period:\s*([\w_]+)", summary)
        doc_type = re.search(r"Doc Type:\s*([\w_]+)", summary)
        nice_name = "Global Intelligence"
        if ticker and period:
            t  = ticker.group(1)
            p  = period.group(1).replace('_', ' ')
            dt = doc_type.group(1).replace('_', ' ') if doc_type else "Filing"
            nice_name = f"{t} {dt} {p}"
        for chunk_id in info.get('chunks_list', []):
            mapping[chunk_id] = nice_name
    return mapping
