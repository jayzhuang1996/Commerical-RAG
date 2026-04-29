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
  const [pinnedNode, setPinnedNode] = useState<any>(null);
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
        onNodeHover={(node: any) => { if (!pinnedNode) { setSelectedNode(node); setSelectedLink(null); } }}
        onLinkHover={(link: any) => { if (!pinnedNode) { setSelectedLink(link); setSelectedNode(null); } }}
        onNodeClick={(node: any) => {
          if (pinnedNode?.id === node.id) {
            setPinnedNode(null);
            setSelectedNode(null);
          } else {
            setPinnedNode(node);
            setSelectedNode(node);
            setSelectedLink(null);
          }
        }}
        onEngineStop={handleEngineStop}
      />

      {/* Hover / pinned tooltip */}
      {(selectedLink || selectedNode) && !pinnedNode && (
        <div style={{
          position: 'absolute',
          left: ttLeft,
          top: ttTop,
          zIndex: 100,
          width: '300px',
          padding: '14px',
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #192E44',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(25,46,68,0.15)',
          fontSize: '12px',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 800, color: '#192E44', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {selectedLink ? 'Relationship' : 'Company'}
          </div>
          {selectedLink && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>
                {selectedLink.source.id || selectedLink.source} ↔ {selectedLink.target.id || selectedLink.target}
              </div>
              <div style={{ color: '#3C4A5A', fontStyle: 'italic', lineHeight: '1.5' }}>
                "{selectedLink.label || 'Direct industry dependency identified in filings.'}"
              </div>
            </>
          )}
          {selectedNode && (
            <div style={{ color: '#192E44', fontWeight: 700, fontSize: '13px' }}>{selectedNode.id}</div>
          )}
        </div>
      )}

      {/* Pinned node panel — shows all connected edges with real labels */}
      {pinnedNode && (() => {
        const nodeId = pinnedNode.id;
        const edges = triples.filter(t => t.source === nodeId || t.target === nodeId);
        return (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 200,
            width: '300px',
            maxHeight: 'calc(100% - 48px)',
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.99)',
            border: '1.5px solid #192E44',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(25,46,68,0.2)',
            fontSize: '12px',
          }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#192E44', fontSize: '14px' }}>{nodeId}</div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {edges.length} relationship{edges.length !== 1 ? 's' : ''} in dataset
                </div>
              </div>
              <button
                onClick={() => { setPinnedNode(null); setSelectedNode(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94A3B8', lineHeight: 1, padding: '2px 4px' }}
              >×</button>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {edges.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: '12px' }}>No relationships found for this node.</div>
              ) : edges.map((e, i) => {
                const other = e.source === nodeId ? e.target : e.source;
                const edgeColor = TYPE_COLORS[e.type || 'related'] || '#96BED2';
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${edgeColor}`, paddingLeft: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#192E44', fontSize: '12px', marginBottom: '3px' }}>
                      ↔ {other}
                      {e.type && <span style={{ marginLeft: '6px', fontSize: '10px', color: edgeColor, textTransform: 'uppercase', fontWeight: 600 }}>{e.type}</span>}
                    </div>
                    {e.label && (
                      <div style={{ color: '#3C4A5A', lineHeight: '1.5', fontSize: '11.5px' }}>
                        {e.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
      }}>
        Click node for details · Hover edge for relationship · Scroll to zoom
      </div>
    </div>
  );
}
