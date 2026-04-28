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
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [hoveredNode, setHoveredNode]   = useState<string | null>(null);
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef        = useRef<any>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track mouse for tooltip positioning — only used when something is selected
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    document.addEventListener('mousemove', h);
    return () => document.removeEventListener('mousemove', h);
  }, []);

  const handleEngineStop = useCallback(() => {
    setTimeout(() => fgRef.current?.zoomToFit(600, 50), 300);
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

  // Tighten d3 forces
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const lf = fg.d3Force('link');
    if (lf) lf.distance(50);
    const cf = fg.d3Force('charge');
    if (cf) cf.strength(-180);
  }, [triples]);

  const nodeRadius = (node: any) => Math.min(10 + (node.degree || 1) * 3, 44);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSel = selectedNode?.id === node.id;
    const isHov = hoveredNode === node.id;
    const r     = nodeRadius(node);
    const label = node.id as string;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = (isSel || isHov) ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = (isSel || isHov) ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = ((isSel || isHov) ? 3 : 1.8) / globalScale;
    ctx.fill();
    ctx.stroke();

    const fontSize = Math.max(9, Math.min(r * 0.42, 13));
    ctx.font         = `${(isSel || isHov) ? 700 : 600} ${fontSize}px 'Segoe UI',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = (isSel || isHov) ? '#00D7D2' : '#192E44';

    const maxW = r * 1.6;
    let txt = label;
    if (ctx.measureText(txt).width > maxW) {
      const firstWord = label.split(' ')[0];
      txt = firstWord;
      while (ctx.measureText(txt + '.').width > maxW && txt.length > 2) {
        txt = txt.slice(0, -1);
      }
      if (txt !== firstWord) txt += '.';
    }
    ctx.fillText(txt, node.x, node.y);
  }, [selectedNode, hoveredNode]);

  const handleLinkClick = useCallback((link: any) => {
    setSelectedLink(link);
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    setSelectedLink(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedLink(null);
  }, []);

  const ttLeft = mousePos.x > dims.w - 320 ? mousePos.x - 300 : mousePos.x + 14;
  const ttTop  = Math.max(10, mousePos.y - 20);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden', borderRadius: '8px' }}
      onClick={(e) => {
        // Only clear if clicking the background, not the graph itself handled by internal clicks
        if (e.target === containerRef.current) handleBackgroundClick();
      }}
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

      {/* Insight Panel (Click triggered) */}
      {(selectedLink || selectedNode) && (
        <div style={{
          position: 'absolute',
          left:  ttLeft,
          top:   ttTop,
          zIndex: 100,
          width: '300px',
          padding: '16px',
          background: '#fff',
          border: '1px solid #192E44',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(25,46,68,0.25)',
          fontSize: '13px',
          lineHeight: '1.6',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 800, color: '#192E44', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
              {selectedLink ? 'Relationship Insight' : 'Company Context'}
            </span>
            <button 
              onClick={handleBackgroundClick}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px', padding: '0 4px' }}
            >
              ×
            </button>
          </div>

          {selectedLink && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>
                {selectedLink.source.id} → {selectedLink.target.id}
              </div>
              <div style={{ color: '#3C4A5A' }}>
                {selectedLink.label || 'Deep structural relationship extracted from company filings.'}
              </div>
            </>
          )}

          {selectedNode && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>
                {selectedNode.id}
              </div>
              <div style={{ color: '#3C4A5A' }}>
                {selectedNode.degree > 3 
                  ? `Central industry hub with ${selectedNode.degree} active strategic connections in this scope.`
                  : `Strategic player with ${selectedNode.degree} direct relationship${selectedNode.degree === 1 ? '' : 's'} identified.`}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hint */}
      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
      }}>
        Click node or line for deep insights · Drag to move · Scroll to zoom
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodeVal={(node: any) => nodeRadius(node) ** 2}
        linkColor={(link: any) => link.color || '#96BED2'}
        linkWidth={selectedLink ? (l => l === selectedLink ? 6 : 2) : 4}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkHoverPrecision={15}
        onLinkClick={handleLinkClick}
        onNodeClick={handleNodeClick}
        onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
        onBackgroundClick={handleBackgroundClick}
        onEngineStop={handleEngineStop}
        backgroundColor="#F8F9FA"
        width={dims.w}
        height={dims.h}
        cooldownTicks={200}
      />
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
