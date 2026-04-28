'use client';

import dynamic from 'next/dynamic';
import { useMemo, useCallback, useState, useRef } from 'react';

// react-force-graph-2d uses browser APIs — must be dynamically imported
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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; html: string } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useMemo(() => {
    if (!triples || triples.length === 0) return { nodes: [], links: [] };

    const nodeMap = new Map<string, { id: string; degree: number }>();
    const links: any[] = [];

    triples.forEach(t => {
      if (!t.source || !t.target || t.source === t.target) return;
      if (!nodeMap.has(t.source)) nodeMap.set(t.source, { id: t.source, degree: 0 });
      if (!nodeMap.has(t.target)) nodeMap.set(t.target, { id: t.target, degree: 0 });
      nodeMap.get(t.source)!.degree++;
      nodeMap.get(t.target)!.degree++;
      links.push({
        source: t.source,
        target: t.target,
        label:  t.label  || '',
        type:   t.type   || 'related',
        color:  t.color  || TYPE_COLORS[t.type || 'related'] || '#96BED2',
      });
    });

    return { nodes: Array.from(nodeMap.values()), links };
  }, [triples]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = node.id === hoveredNode;
    const r = Math.min(5 + node.degree * 1.8, 20);
    const label = node.id as string;
    const fontSize = Math.max(10, 12 / globalScale);

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = isHov ? 2.5 / globalScale : 1.5 / globalScale;
    ctx.fill();
    ctx.stroke();

    // Label — only render when zoomed in enough or on hover
    if (globalScale > 0.6 || isHov) {
      ctx.font         = `${isHov ? 700 : 500} ${fontSize}px 'DIN','Segoe UI',sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = isHov ? '#FFFFFF' : '#192E44';

      // Clip long labels inside the circle
      const maxW = r * 1.6;
      let txt = label;
      while (ctx.measureText(txt).width > maxW && txt.length > 3) {
        txt = txt.slice(0, -1);
      }
      if (txt !== label) txt += '…';
      ctx.fillText(txt, node.x, node.y);
    }
  }, [hoveredNode]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node ? node.id : null);
  }, []);

  const handleLinkHover = useCallback((link: any, prevLink: any) => {
    if (!link || !containerRef.current) { setTooltip(null); return; }
    // We'll show tooltip at a fixed position — react-force-graph-2d doesn't expose
    // mouse position in onLinkHover, so we read from the canvas mouse event via onMouseMove
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    // Highlight by setting hovered
    setHoveredNode(node.id === hoveredNode ? null : node.id);
  }, [hoveredNode]);

  // Manual mouse-move for tooltip on links
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 } : null);
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
      style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-base)', overflow: 'hidden', borderRadius: '8px' }}
      onMouseMove={handleMouseMove}
    >
      {/* Legend */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
        background: 'rgba(255,255,255,0.92)', borderRadius: '8px',
        padding: '10px 12px', border: '1px solid var(--border)',
        backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--el-slate)', letterSpacing: '0.07em', marginBottom: '3px', textTransform: 'uppercase' }}>Relationship Type</div>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--el-navy)' }}>
            <div style={{ width: '18px', height: '2px', background: TYPE_COLORS[type], borderRadius: '1px', flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {/* Stats badge */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 10,
        fontSize: '10px', fontWeight: 700, color: 'var(--el-slate)',
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px',
        padding: '4px 10px', border: '1px solid var(--border)',
      }}>
        {graphData.nodes.length} companies · {graphData.links.length} edges
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: 'var(--el-slate)', zIndex: 10,
        background: 'rgba(255,255,255,0.8)', borderRadius: '20px', padding: '3px 10px',
      }}>
        Drag nodes · Scroll to zoom · Click to highlight
      </div>

      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodeVal={(node: any) => Math.min(5 + node.degree * 1.8, 20)}
        linkColor={(link: any) => link.color || '#96BED2'}
        linkWidth={(link: any) => link.type === 'supply' || link.type === 'partnership' ? 2 : 1.5}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link: any) => link.color || '#96BED2'}
        linkLabel={(link: any) => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          const lbl = (link.label || '').slice(0, 140);
          return `<div style="max-width:240px;padding:8px 10px;font-size:11px;line-height:1.5;background:#fff;border:1px solid #e3e3e3;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12)"><strong style="color:#192E44">${s} → ${t}</strong><br/>${lbl}</div>`;
        }}
        linkHoverPrecision={6}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        backgroundColor="transparent"
        width={containerRef.current?.clientWidth || 600}
        height={containerRef.current?.clientHeight || 400}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
