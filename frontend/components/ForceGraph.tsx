'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface GraphNode {
  id: string;
  degree?: number;
  // d3 simulation adds these at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  type?: string;
  color?: string;
}

interface Props {
  triples: { source: string; label: string; target: string; type?: string; color?: string }[];
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
  { type: 'partnership',  label: 'Partnership' },
  { type: 'competitive',  label: 'Competitive' },
  { type: 'geopolitical', label: 'Geopolitical Risk' },
  { type: 'investment',   label: 'Investment / M&A' },
  { type: 'related',      label: 'Related' },
];

export default function ForceGraph({ triples }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const simRef       = useRef<any>(null);

  const [tooltip, setTooltip]           = useState<{ x: number; y: number; text: string; type: string } | null>(null);
  const [hoveredNode, setHoveredNode]   = useState<string | null>(null);
  const [dimensions, setDimensions]     = useState({ w: 600, h: 400 });

  // Build graph data from triples
  const graphData = useCallback(() => {
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    (triples || []).forEach(t => {
      if (!t.source || !t.target || t.source === t.target) return;
      if (!nodeMap.has(t.source)) nodeMap.set(t.source, { id: t.source, degree: 0 });
      if (!nodeMap.has(t.target)) nodeMap.set(t.target, { id: t.target, degree: 0 });
      nodeMap.get(t.source)!.degree! += 1;
      nodeMap.get(t.target)!.degree! += 1;
      links.push({ source: t.source, target: t.target, label: t.label, type: t.type || 'related', color: t.color || '#96BED2' });
    });

    return { nodes: Array.from(nodeMap.values()), links };
  }, [triples]);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !triples || triples.length === 0) return;

    const { nodes, links } = graphData();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d')!;
    const W = dimensions.w;
    const H = dimensions.h;
    canvas.width  = W;
    canvas.height = H;

    // Lazy-load d3-force
    import('d3-force').then(d3 => {
      // Kill any existing simulation
      if (simRef.current) simRef.current.stop();

      const sim = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(120).strength(0.6))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide().radius((d: any) => nodeRadius(d) + 8));

      simRef.current = sim;

      function nodeRadius(n: GraphNode) {
        return Math.min(6 + (n.degree || 1) * 2, 22);
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);

        // Draw edges
        links.forEach((link: any) => {
          const s = link.source as GraphNode;
          const t = link.target as GraphNode;
          if (!s.x || !t.x) return;

          const isHovered = hoveredNode && (s.id === hoveredNode || t.id === hoveredNode);
          ctx.beginPath();
          ctx.moveTo(s.x, s.y!);
          ctx.lineTo(t.x, t.y!);
          ctx.strokeStyle = link.color || '#96BED2';
          ctx.globalAlpha = isHovered ? 1 : (hoveredNode ? 0.15 : 0.55);
          ctx.lineWidth   = isHovered ? 2.5 : 1.5;
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(t.y! - s.y!, t.x - s.x!);
          const ar = nodeRadius(t as GraphNode) + 3;
          const ax = t.x - ar * Math.cos(angle);
          const ay = t.y! - ar * Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - 8 * Math.cos(angle - 0.35), ay - 8 * Math.sin(angle - 0.35));
          ctx.lineTo(ax - 8 * Math.cos(angle + 0.35), ay - 8 * Math.sin(angle + 0.35));
          ctx.closePath();
          ctx.fillStyle = link.color || '#96BED2';
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Draw nodes
        nodes.forEach((node: any) => {
          if (!node.x) return;
          const r = nodeRadius(node);
          const isHov = node.id === hoveredNode;

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
          ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
          ctx.lineWidth   = isHov ? 2.5 : 1.5;
          ctx.globalAlpha = hoveredNode && !isHov ? 0.3 : 1;
          ctx.fill();
          ctx.stroke();

          // Label
          ctx.globalAlpha = hoveredNode && !isHov ? 0.2 : 1;
          ctx.font        = `${isHov ? 700 : 500} ${Math.max(9, Math.min(r * 0.85, 12))}px 'DIN', 'Segoe UI', sans-serif`;
          ctx.fillStyle   = isHov ? '#FFFFFF' : '#192E44';
          ctx.textAlign   = 'center';
          ctx.textBaseline = 'middle';
          // Clip long labels
          const maxChars = Math.floor(r * 2 / 5.5);
          const label = node.id.length > maxChars ? node.id.slice(0, maxChars) + '…' : node.id;
          ctx.fillText(label, node.x, node.y);
          ctx.globalAlpha = 1;
        });
      }

      sim.on('tick', draw);
      sim.on('end', draw);
    });

    return () => { if (simRef.current) simRef.current.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triples, dimensions]);

  // Hover detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !simRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { nodes, links } = graphData();
    const sim = simRef.current;
    const simNodes: GraphNode[] = sim.nodes();

    // Check node hover
    let found: GraphNode | null = null;
    for (const n of simNodes) {
      const r = Math.min(6 + ((n as any).degree || 1) * 2, 22);
      const dx = (n.x || 0) - mx;
      const dy = (n.y || 0) - my;
      if (Math.sqrt(dx * dx + dy * dy) < r + 4) { found = n; break; }
    }

    if (found) {
      setHoveredNode(found.id);
      // Find all edges touching this node
      const edgeDescs = links
        .filter((l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return s === found!.id || t === found!.id;
        })
        .slice(0, 3)
        .map((l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          const other = s === found!.id ? t : s;
          return `→ ${other}: ${(l.label || '').slice(0, 90)}${(l.label || '').length > 90 ? '…' : ''}`;
        });
      setTooltip({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 8,
        text: edgeDescs.join('\n'),
        type: found.id,
      });
    } else {
      setHoveredNode(null);
      setTooltip(null);
    }
  }, [graphData]);

  const handleMouseLeave = () => { setHoveredNode(null); setTooltip(null); };

  if (!triples || triples.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No cross-company relationships found for this query.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-base)', borderRadius: '8px', overflow: 'hidden' }}>

      {/* Legend */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border)', backdropFilter: 'blur(6px)' }}>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--el-navy)', fontWeight: 500 }}>
            <div style={{ width: '20px', height: '2px', background: TYPE_COLORS[type], borderRadius: '1px' }} />
            {label}
          </div>
        ))}
      </div>

      {/* Node count badge */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 700, color: 'var(--el-slate)', background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '4px 10px', border: '1px solid var(--border)', letterSpacing: '0.05em' }}>
        {graphData().nodes.length} companies · {triples.length} relationships
      </div>

      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: hoveredNode ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x, dimensions.w - 280),
          top: Math.max(tooltip.y, 8),
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '11.5px',
          lineHeight: 1.6,
          color: 'var(--el-navy)',
          maxWidth: '260px',
          boxShadow: '0 4px 16px rgba(25,46,68,0.12)',
          pointerEvents: 'none',
          zIndex: 20,
          whiteSpace: 'pre-line',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--el-navy)', fontSize: '12px' }}>{tooltip.type}</div>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
