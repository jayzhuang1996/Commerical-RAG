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

# ── Canonical company name normalization ─────────────────────────────────────
# Collapses variants like "Lam Research Corporation" → "Lam Research"
CANONICAL = {
    "lam research corporation": "Lam Research",
    "lam research": "Lam Research",
    "intel corporation": "Intel",
    "intel": "Intel",
    "nvidia corporation": "NVIDIA",
    "nvidia": "NVIDIA",
    "applied materials, inc.": "Applied Materials",
    "applied materials": "Applied Materials",
    "taiwan semiconductor manufacturing": "TSMC",
    "taiwan semiconductor": "TSMC",
    "tsmc": "TSMC",
    "tsm": "TSMC",
    "broadcom inc.": "Broadcom",
    "broadcom inc": "Broadcom",
    "broadcom": "Broadcom",
    "arm holdings": "Arm",
    "arm": "Arm",
    "kla corporation": "KLA",
    "klac": "KLA",
    "kla": "KLA",
    "qualcomm incorporated": "Qualcomm",
    "qualcomm": "Qualcomm",
    "qcom": "Qualcomm",
    "marvell technology": "Marvell",
    "mrvl": "Marvell",
    "advanced micro devices": "AMD",
    "amd": "AMD",
    "sk hynix": "SK Hynix",
    "hynix": "SK Hynix",
    "micron technology": "Micron",
    "micron": "Micron",
    "samsung electronics": "Samsung",
    "samsung": "Samsung",
    "globalfoundries": "GlobalFoundries",
    "global foundries": "GlobalFoundries",
    "asml holding": "ASML",
    "asml holding n.v.": "ASML",
    "asml": "ASML",
    "synopsys": "Synopsys",
    "cadence design": "Cadence",
    "cadence design systems": "Cadence",
    "cadence": "Cadence",
    "cdns": "Cadence",
    "microsoft": "Microsoft",
    "microsoft corporation": "Microsoft",
    "meta platforms": "Meta",
    "meta platforms, inc.": "Meta",
    "meta": "Meta",
    "google": "Google",
    "alphabet": "Google",
    "amazon": "Amazon",
    "apple": "Apple",
    "apple inc.": "Apple",
    "apple inc": "Apple",
    # ticker aliases
    "intc": "Intel",
    "nvda": "NVIDIA",
    "tsm": "TSMC",
    "mu": "Micron",
    "amat": "Applied Materials",
    "lrcx": "Lam Research",
    "avgo": "Broadcom",
    "qcom": "Qualcomm",
    "mrvl": "Marvell",
    "smci": "Super Micro",
    "snps": "Synopsys",
    "anet": "Arista Networks",
    "vrt": "Vertiv",
    "super micro": "Super Micro",
    "supermicro": "Super Micro",
    "micron technology, inc.": "Micron",
    "qualcomm incorporated": "Qualcomm",
    "qualcomm technologies": "Qualcomm",
    "marvell technology group": "Marvell",
}

def _canonical(name: str) -> str:
    return CANONICAL.get(name.lower().strip(), name.strip())


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
def extract_visual_graph(rag_index, query_results: str, filters: dict = None) -> Dict[str, Any]:
    """
    Returns ONLY cross-company edges, classified by type, deduplicated,
    and filtered by quarter if active.
    """
    full_graph = getattr(rag_index.chunk_entity_relation_graph, '_graph', None)
    if not full_graph:
        return {"nodes": [], "links": []}

    # Build chunk→period map for edge filtering
    quarter_periods: set = set()
    if filters:
        qmap = {
            "Q1 2025": "Q1_2025", "Q2 2025": "Q2_2025",
            "Q3 2025": "Q3_2025", "Q4 2025": "Q4_2025",
            "Q1 2026": "Q1_2026", "Q2 2026": "Q2_2026",
        }
        for q in filters.get("quarters", []):
            quarter_periods.add(qmap.get(q, q.replace(" ", "_")))

    # Build chunk_id → period mapping from the text chunk store
    chunk_period_map: Dict[str, str] = {}
    try:
        import json, os
        store_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..", "..", "data", "index", "kv_store_text_chunks.json"
        )
        with open(store_path) as f:
            store = json.load(f)
        for cid, cdata in store.items():
            if isinstance(cdata, dict):
                content = cdata.get("content", "")
                m = re.search(r"Period:\s*([\w_]+)", content)
                if m:
                    chunk_period_map[cid] = m.group(1)
    except Exception:
        pass

    # Collect cross-company edges, applying canonical names and period filter
    seen_pairs: set = set()
    all_cross_edges = []
    for u, v, data in full_graph.edges(data=True):
        cu, cv = _canonical(u), _canonical(v)
        if not _is_company(cu) or not _is_company(cv): continue
        if cu == cv: continue
        pair = tuple(sorted([cu, cv]))
        if pair in seen_pairs: continue  # deduplicate undirected duplicates

        # Period filter: check if any source chunk matches
        if quarter_periods:
            raw_chunk_ids = data.get("source_id", "")
            chunk_ids = [c.strip().strip('"').strip("'") for c in raw_chunk_ids.split(",") if c.strip()]
            periods = {chunk_period_map.get(cid) for cid in chunk_ids if cid in chunk_period_map}
            if not periods.intersection(quarter_periods):
                continue  # edge not from a matching quarter

        seen_pairs.add(pair)
        desc = data.get("description", "")
        all_cross_edges.append({
            "source": cu, "target": cv,
            "description": desc,
            "type": _classify_edge(desc),
        })

    # Sort by query relevance
    if query_results:
        q_lower = query_results.lower()
        def relevance(e):
            score = 0
            if e["source"].lower() in q_lower: score += 2
            if e["target"].lower() in q_lower: score += 2
            if e["type"] in ("supply", "partnership"): score += 1
            return score
        all_cross_edges.sort(key=relevance, reverse=True)

    edges = all_cross_edges[:50]  # cap for readability

    # Build node degree map
    degree: Dict[str, int] = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1

    nodes = [{"id": nid, "degree": degree.get(nid, 1)} for nid in degree]
    links = [
        {
            "source": e["source"],
            "target": e["target"],
            "label":  e["description"][:200],
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
        "AI / GPU":        ["NVDA", "AMD", "INTC", "Apple", "Google", "Amazon", "Meta", "Microsoft"],
        "Foundry / EMS":   ["TSMC", "Samsung", "GlobalFoundries", "UMC", "SMIC", "TSM"],
        "Equipment":       ["ASML", "Applied Materials", "Lam Research", "KLA", "AMAT", "LRCX", "KLAC"],
        "Memory":          ["Micron", "SK Hynix", "Western Digital", "Seagate", "MU", "WDC", "STX"],
        "Analog / Power":  ["Texas Instruments", "Analog Devices", "Microchip", "ON Semiconductor", "TXN", "ADI", "MCHP", "ON"],
        "Networking / RF": ["Broadcom", "Qualcomm", "Marvell", "Arista", "AVGO", "QCOM", "MRVL", "ANET"],
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
