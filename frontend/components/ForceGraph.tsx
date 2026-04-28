'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState, useRef } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Triple {
  source: string;
  target: string;
  label?: string;
  type?: string;
  color?: string;
}

interface Props {
  triples: Triple[];
}

const TYPE_COLORS: Record<string, string> = {
  supply:       '#05AFDC',
  partnership:  '#00D7D2',
  competitive:  '#F59E0B',
  geopolitical: '#BF2E2E',
  investment:   '#82C341',
  related:      '#96BED2',
};

const LEGEND = [
  { type: 'supply',       label: 'Supply Chain' },
  { type: 'partnership',  label: 'Partnership'  },
  { type: 'competitive',  label: 'Competitive'  },
  { type: 'geopolitical', label: 'Geopolitical' },
  { type: 'investment',   label: 'Investment'   },
  { type: 'related',      label: 'Related'      },
];

export default function ForceGraph({ triples }: Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useMemo(() => {
    if (!triples || triples.length === 0) return { nodes: [], links: [] };

    // Count degree for each node
    const degree = new Map<string, number>();
    triples.forEach(t => {
      if (!t.source || !t.target || t.source === t.target) return;
      degree.set(t.source, (degree.get(t.source) || 0) + 1);
      degree.set(t.target, (degree.get(t.target) || 0) + 1);
    });

    // Only include nodes with degree >= 2 (remove isolated singletons)
    const validNodes = new Set<string>();
    degree.forEach((deg, id) => { if (deg >= 2) validNodes.add(id); });

    // Filter links to only those where BOTH endpoints are valid
    const links = triples
      .filter(t => t.source && t.target && t.source !== t.target
                && validNodes.has(t.source) && validNodes.has(t.target))
      .map(t => ({
        source: t.source,
        target: t.target,
        label:  t.label  || '',
        type:   t.type   || 'related',
        color:  t.color  || TYPE_COLORS[t.type || 'related'] || '#96BED2',
      }));

    const nodes = Array.from(validNodes).map(id => ({
      id,
      degree: degree.get(id) || 1,
    }));

    return { nodes, links };
  }, [triples]);

  // Node radius — generous sizing so labels are readable inside large hubs
  const nodeRadius = (node: any) => Math.min(14 + node.degree * 3.5, 44);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = node.id === hoveredNode;
    const r = nodeRadius(node);
    const label = node.id as string;

    // ── Circle fill ──────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = isHov ? 2.5 / globalScale : 1.5 / globalScale;
    ctx.fill();
    ctx.stroke();

    // ── Label BELOW the circle (outside) ─────────────────────────────────────
    const fontSize  = Math.max(10, Math.min(13, 13 / globalScale));
    ctx.font        = `${isHov ? 700 : 600} ${fontSize}px 'DIN','Segoe UI',sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle   = isHov ? '#00D7D2' : '#192E44';

    // Clip if needed
    const maxChars = Math.floor((r * 2 + 8) / (fontSize * 0.6));
    let txt = label;
    if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';

    ctx.fillText(txt, node.x, node.y + r + 3 / globalScale);
  }, [hoveredNode]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node ? node.id : null);
  }, []);

  if (!triples || triples.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No cross-company relationships found for this query.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden', borderRadius: '8px' }}
    >
      {/* Legend */}
      <div style={{
        position: 'absolute', top: '12px', left: '12px', zIndex: 10,
        background: 'rgba(255,255,255,0.95)', borderRadius: '8px',
        padding: '10px 14px', border: '1px solid #E3E6EA',
        boxShadow: '0 2px 8px rgba(25,46,68,0.08)',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', marginBottom: '2px', textTransform: 'uppercase' }}>Relationship Type</div>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#192E44', fontWeight: 500 }}>
            <div style={{ width: '20px', height: '2.5px', background: TYPE_COLORS[type], borderRadius: '2px', flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px', zIndex: 10,
        fontSize: '11px', fontWeight: 600, color: '#64748B',
        background: 'rgba(255,255,255,0.92)', borderRadius: '20px',
        padding: '5px 12px', border: '1px solid #E3E6EA',
      }}>
        {graphData.nodes.length} companies · {graphData.links.length} connections
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA',
      }}>
        Drag · Scroll to zoom · Hover edge for detail
      </div>

      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodeVal={(node: any) => nodeRadius(node) * nodeRadius(node)}
        linkColor={(link: any) => link.color || '#96BED2'}
        linkWidth={(link: any) => link.type === 'supply' || link.type === 'partnership' ? 2.5 : 1.5}
        linkDirectionalArrowLength={8}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: any) => link.color || '#96BED2'}
        linkLabel={(link: any) => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          const lbl = (link.label || '').slice(0, 180);
          return `<div style="max-width:280px;padding:10px 14px;font-family:'Segoe UI',sans-serif;font-size:12px;line-height:1.65;background:#fff;border:1px solid #E3E6EA;border-radius:10px;box-shadow:0 4px 16px rgba(25,46,68,0.12)"><strong style="color:#192E44;display:block;margin-bottom:5px;font-size:12.5px">${s} → ${t}</strong><span style="color:#3C3C3C">${lbl}</span></div>`;
        }}
        linkHoverPrecision={8}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeHover}
        backgroundColor="#F8F9FA"
        width={containerRef.current?.clientWidth || 600}
        height={containerRef.current?.clientHeight || 400}
        cooldownTicks={150}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.35}
      />
    </div>
  );
}
