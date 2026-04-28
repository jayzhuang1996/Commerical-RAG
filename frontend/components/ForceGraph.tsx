'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useRef, useEffect } from 'react';

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

export default function ForceGraph({ triples }: Props) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const lf = fg.d3Force('link');
    if (lf) lf.distance(30).strength(1);
    const cf = fg.d3Force('charge');
    if (cf) cf.strength(-400);
    const center = fg.d3Force('center');
    if (center) center.strength(0.15);
  }, [triples]);

  // Build graph data from triples
  const nodeSet = new Set<string>();
  const degreeMap: Record<string, number> = {};
  triples.forEach(t => {
    nodeSet.add(t.source);
    nodeSet.add(t.target);
    degreeMap[t.source] = (degreeMap[t.source] || 0) + 1;
    degreeMap[t.target] = (degreeMap[t.target] || 0) + 1;
  });
  const graphData = {
    nodes: Array.from(nodeSet).map(id => ({ id, degree: degreeMap[id] || 1 })),
    links: triples.map(t => ({
      source: t.source,
      target: t.target,
      label: t.label,
      color: t.color || TYPE_COLORS[t.type || 'related'] || '#96BED2',
    })),
  };

  const nodeRadius = (node: any) => Math.min(8 + (node.degree || 1) * 2.5, 40);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = selectedNode?.id === node.id;
    const r = nodeRadius(node);
    const label = node.id as string;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (isHov ? 3 : 1.5) / globalScale;
    ctx.fill();
    ctx.stroke();

    const fontSize = Math.max(8, Math.min(r * 0.45, 12));
    ctx.font         = `${isHov ? 700 : 600} ${fontSize}px 'Segoe UI',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = isHov ? '#00D7D2' : '#192E44';

    const maxW = r * 1.7;
    let txt = label;
    if (ctx.measureText(txt).width > maxW) {
      txt = label.slice(0, 6) + '..';
    }
    ctx.fillText(txt, node.x, node.y);
  }, [selectedNode]);

  const nodeCanvasObjectMode = useCallback((_node: any) => 'replace' as const, []);
  const getLinkColor = useCallback((l: any) => l.color || '#96BED2', []);
  const getLinkWidth = useCallback((l: any) => l === selectedLink ? 5 : 2.5, [selectedLink]);

  const ttLeft = mousePos.x > dims.w - 320 ? mousePos.x - 300 : mousePos.x + 14;
  const ttTop  = Math.max(10, mousePos.y - 20);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden' }}
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={nodeCanvasObjectMode}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        cooldownTicks={100}
        onNodeHover={(node: any) => { setSelectedNode(node); setSelectedLink(null); }}
        onLinkHover={(link: any) => { setSelectedLink(link); setSelectedNode(null); }}
        onEngineStop={handleEngineStop}
      />

      {(selectedLink || selectedNode) && (
        <div style={{
          position: 'absolute',
          left: ttLeft,
          top: ttTop,
          zIndex: 100,
          width: '280px',
          padding: '14px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #192E44',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(25,46,68,0.15)',
          fontSize: '12px',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 800, color: '#192E44', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {selectedLink ? 'Relationship Insight' : 'Company Context'}
          </div>

          {selectedLink && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>
                {selectedLink.source.id || selectedLink.source} ↔ {selectedLink.target.id || selectedLink.target}
              </div>
              <div style={{ color: '#3C4A5A', fontStyle: 'italic' }}>
                "{selectedLink.label || 'Direct industry dependency identified in company transcripts.'}"
              </div>
            </>
          )}

          {selectedNode && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '4px', fontSize: '13px' }}>
                {selectedNode.id}
              </div>
              <div style={{ color: '#3C4A5A' }}>
                {selectedNode.degree > 3
                  ? `Central hub with ${selectedNode.degree} active strategic connections.`
                  : `Strategic player with ${selectedNode.degree} direct relationship${selectedNode.degree === 1 ? '' : 's'} identified.`}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
      }}>
        Hover node or line for insights · Drag to move · Scroll to zoom
      </div>
    </div>
  );
}
