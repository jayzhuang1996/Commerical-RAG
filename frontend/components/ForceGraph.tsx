'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState, useRef, useEffect } from 'react';

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
  const [dims, setDims] = useState({ w: 600, h: 400 });

  // Measure container on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!triples || triples.length === 0) return { nodes: [], links: [] };

    const degree = new Map<string, number>();
    triples.forEach(t => {
      if (!t.source || !t.target || t.source === t.target) return;
      degree.set(t.source, (degree.get(t.source) || 0) + 1);
      degree.set(t.target, (degree.get(t.target) || 0) + 1);
    });

    const validNodes = new Set<string>();
    degree.forEach((deg, id) => { if (deg >= 1) validNodes.add(id); });

    const links = triples
      .filter(t => t.source && t.target && t.source !== t.target
                && validNodes.has(t.source) && validNodes.has(t.target))
      .slice(0, 50)
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

  // Radius: hub nodes get substantially bigger
  const nodeRadius = (node: any) => Math.min(10 + node.degree * 2.8, 38);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = node.id === hoveredNode;
    const r     = nodeRadius(node);
    const label = node.id as string;

    // ── Circle ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (isHov ? 2.5 : 1.5) / globalScale;
    ctx.fill();
    ctx.stroke();

    // ── Label INSIDE circle, centered ────────────────────────────────────────
    // Font scales with zoom but has floor/ceiling
    const baseFontSize = Math.min(r * 0.52, 12);
    const fontSize     = Math.max(8, baseFontSize);
    ctx.font           = `${isHov ? 700 : 600} ${fontSize}px 'DIN','Segoe UI',sans-serif`;
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.fillStyle      = isHov ? '#00D7D2' : '#192E44';

    // Truncate to fit inside circle diameter
    const maxWidth = r * 1.7;
    let txt = label;
    while (ctx.measureText(txt).width > maxWidth && txt.length > 2) {
      txt = txt.slice(0, -1);
    }
    if (txt !== label) txt += '…';
    ctx.fillText(txt, node.x, node.y);
  }, [hoveredNode]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node ? (node.id as string) : null);
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
        {graphData.nodes.length} companies · {graphData.links.length} edges
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
      }}>
        Drag · Scroll to zoom · Hover edge for insight
      </div>

      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodeVal={(node: any) => nodeRadius(node) ** 2}
        linkColor={(link: any) => link.color || '#96BED2'}
        linkWidth={(link: any) => ['supply', 'partnership'].includes(link.type) ? 2.5 : 1.5}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: any) => link.color || '#96BED2'}
        linkLabel={(link: any) => {
          const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
          const lbl = ((link.label as string) || '').slice(0, 200);
          return `<div style="max-width:280px;padding:10px 14px;font-family:'Segoe UI',sans-serif;font-size:12px;line-height:1.7;background:#fff;border:1px solid #dde3ea;border-radius:10px;box-shadow:0 4px 18px rgba(25,46,68,0.13);pointer-events:none"><strong style="color:#192E44;display:block;margin-bottom:5px">${s} → ${t}</strong><span style="color:#3C4A5A">${lbl}</span></div>`;
        }}
        linkHoverPrecision={6}
        onNodeHover={handleNodeHover}
        onNodeClick={(node: any) => setHoveredNode(node?.id === hoveredNode ? null : node?.id)}
        backgroundColor="#F8F9FA"
        width={dims.w}
        height={dims.h}
        cooldownTicks={180}
        d3AlphaDecay={0.012}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
