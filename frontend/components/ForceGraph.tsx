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
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [mousePos, setMousePos]       = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef        = useRef<any>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });


  // ResizeObserver — drives canvas size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mouse position for tooltip
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('mousemove', h);
    return () => el.removeEventListener('mousemove', h);
  }, []);

  const handleEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit(400, 40);
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
      .slice(0, 60)
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

  // Tighten d3 forces whenever graph data changes
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const lf = fg.d3Force('link');
    if (lf) lf.distance(50);
    const cf = fg.d3Force('charge');
    if (cf) cf.strength(-180);
  }, [triples]);

  // Radius — hub nodes larger, leaves small — matches screenshot
  const nodeRadius = (node: any) => Math.min(10 + node.degree * 3, 44);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = node.id === hoveredNode;
    const r     = nodeRadius(node);
    const label = node.id as string;

    // ── Circle ──────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (isHov ? 2.5 : 1.8) / globalScale;
    ctx.fill();
    ctx.stroke();

    // ── Label inside, fits to circle ─────────────────────────────────────────
    const fontSize = Math.max(9, Math.min(r * 0.42, 13));
    ctx.font         = `${isHov ? 700 : 600} ${fontSize}px 'Segoe UI',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = isHov ? '#00D7D2' : '#192E44';

    const maxW = r * 1.6;
    // Try full label first
    let txt = label;
    if (ctx.measureText(txt).width > maxW) {
      // Try first word only
      const firstWord = label.split(' ')[0];
      txt = firstWord;
      // Still truncate if needed
      while (ctx.measureText(txt + '.').width > maxW && txt.length > 2) {
        txt = txt.slice(0, -1);
      }
      if (txt !== firstWord) txt += '.';
    }
    ctx.fillText(txt, node.x, node.y);
  }, [hoveredNode]);

  if (!triples || triples.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No cross-company relationships found for this query.
      </div>
    );
  }

  // Tooltip: flip left if near right edge
  const ttLeft = mousePos.x > dims.w - 320 ? mousePos.x - 300 : mousePos.x + 14;
  const ttTop  = Math.max(10, mousePos.y - 20);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden', borderRadius: '8px' }}
    >
      {/* Legend */}
      <div style={{
        position: 'absolute', top: '12px', left: '12px', zIndex: 10,
        background: 'rgba(255,255,255,0.96)', borderRadius: '8px',
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

      {/* Edge insight tooltip */}
      {hoveredLink && (
        <div style={{
          position: 'absolute',
          left:  ttLeft,
          top:   ttTop,
          zIndex: 20,
          maxWidth: '290px',
          padding: '10px 14px',
          background: '#fff',
          border: '1px solid #D1D9E0',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(25,46,68,0.15)',
          pointerEvents: 'none',
          fontSize: '12px',
          lineHeight: '1.7',
        }}>
          <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '5px', fontSize: '12.5px' }}>
            {(typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source)}
            {' → '}
            {(typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target)}
          </div>
          <div style={{ color: '#3C4A5A' }}>
            {((hoveredLink.label as string) || 'Relationship detected from filings').slice(0, 240)}
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodeVal={(node: any) => nodeRadius(node) ** 2}
        linkColor={(link: any) => link.color || '#96BED2'}
        linkWidth={3}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: any) => link.color || '#96BED2'}
        linkHoverPrecision={12}
        onLinkHover={(link: any) => setHoveredLink(link ?? null)}
        onNodeHover={(node: any) => setHoveredNode(node ? (node.id as string) : null)}
        onNodeClick={(node: any) => setHoveredNode(node?.id === hoveredNode ? null : node?.id)}
        onEngineStop={handleEngineStop}
        backgroundColor="#F8F9FA"
        width={dims.w}
        height={dims.h}
        cooldownTicks={200}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.25}
      />
    </div>
  );
}
