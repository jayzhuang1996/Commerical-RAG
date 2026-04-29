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
  const [pinnedNode, setPinnedNode] = useState<any>(null);
  const [pinnedLink, setPinnedLink] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });
  const frozenRef = useRef(false);

  // Build graph data once — stable reference prevents re-simulation
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
      type: t.type || 'related',
    })),
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Set forces once on mount
  useEffect(() => {
    frozenRef.current = false;
    const fg = fgRef.current;
    if (!fg) return;
    const lf = fg.d3Force('link');
    if (lf) lf.distance(80).strength(0.6);
    const cf = fg.d3Force('charge');
    if (cf) cf.strength(-300);
    const center = fg.d3Force('center');
    if (center) center.strength(0.1);
  }, [triples]);

  // After simulation settles: freeze all node positions so hover can't restart it
  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || frozenRef.current) return;
    frozenRef.current = true;
    // Fix every node in place
    fg.graphData().nodes.forEach((n: any) => {
      n.fx = n.x;
      n.fy = n.y;
    });
    setTimeout(() => fg.zoomToFit(400, 40), 100);
  }, []);

  const nodeRadius = (node: any) => Math.min(10 + (node.degree || 1) * 3, 36);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isPinned = pinnedNode?.id === node.id;
    const r = nodeRadius(node);
    const label = node.id as string;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isPinned ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isPinned ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (isPinned ? 3 : 1.5) / globalScale;
    ctx.fill();
    ctx.stroke();

    const fontSize = Math.max(7, Math.min(r * 0.5, 11));
    ctx.font         = `${isPinned ? 700 : 600} ${fontSize}px 'Segoe UI',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = isPinned ? '#00D7D2' : '#192E44';

    const maxW = r * 1.6;
    let txt = label;
    while (ctx.measureText(txt).width > maxW && txt.length > 4) {
      txt = txt.slice(0, -2);
    }
    if (txt !== label) txt = txt.slice(0, -1) + '…';
    ctx.fillText(txt, node.x, node.y);
  }, [pinnedNode]);

  const nodeCanvasObjectMode = useCallback(() => 'replace' as const, []);
  const getLinkColor = useCallback((l: any) => {
    const isPinned = pinnedNode && (
      (l.source?.id || l.source) === pinnedNode.id ||
      (l.target?.id || l.target) === pinnedNode.id
    );
    return isPinned ? '#00D7D2' : (l.color || '#96BED2');
  }, [pinnedNode]);
  const getLinkWidth = useCallback((l: any) => {
    if (pinnedLink && l === pinnedLink) return 5;
    if (pinnedNode) {
      const src = l.source?.id || l.source;
      const tgt = l.target?.id || l.target;
      if (src === pinnedNode.id || tgt === pinnedNode.id) return 3;
    }
    return 1.5;
  }, [pinnedLink, pinnedNode]);

  const handleNodeClick = useCallback((node: any) => {
    setPinnedLink(null);
    setPinnedNode((prev: any) => prev?.id === node.id ? null : node);
  }, []);

  const handleLinkClick = useCallback((link: any) => {
    setPinnedNode(null);
    setPinnedLink((prev: any) => prev === link ? null : link);
  }, []);

  // Edges for the pinned node detail panel
  const pinnedEdges = pinnedNode
    ? triples.filter(t => t.source === pinnedNode.id || t.target === pinnedNode.id)
    : [];

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
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.004}
        cooldownTicks={120}
        onEngineStop={handleEngineStop}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        enableNodeDrag={true}
      />

      {/* Link click tooltip */}
      {pinnedLink && !pinnedNode && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          zIndex: 200, width: '290px',
          background: 'rgba(255,255,255,0.99)',
          border: '1.5px solid #192E44', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(25,46,68,0.18)',
          fontSize: '12px', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: '#192E44', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</div>
            <button onClick={() => setPinnedLink(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, color: '#192E44', fontSize: '13px', marginBottom: '8px' }}>
              {pinnedLink.source?.id || pinnedLink.source} ↔ {pinnedLink.target?.id || pinnedLink.target}
            </div>
            {pinnedLink.type && (
              <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', background: TYPE_COLORS[pinnedLink.type] + '20', color: TYPE_COLORS[pinnedLink.type], fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                {pinnedLink.type}
              </div>
            )}
            {pinnedLink.label && (
              <div style={{ color: '#3C4A5A', lineHeight: '1.55', fontSize: '12px' }}>
                {pinnedLink.label}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Node click detail panel */}
      {pinnedNode && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          zIndex: 200, width: '290px',
          maxHeight: 'calc(100% - 48px)', overflowY: 'auto',
          background: 'rgba(255,255,255,0.99)',
          border: '1.5px solid #192E44', borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(25,46,68,0.2)',
          fontSize: '12px',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <div>
              <div style={{ fontWeight: 800, color: '#192E44', fontSize: '14px' }}>{pinnedNode.id}</div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {pinnedEdges.length} connection{pinnedEdges.length !== 1 ? 's' : ''} in dataset
              </div>
            </div>
            <button onClick={() => setPinnedNode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pinnedEdges.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '12px' }}>No relationships found for this node.</div>
            ) : pinnedEdges.map((e, i) => {
              const other = e.source === pinnedNode.id ? e.target : e.source;
              const edgeColor = TYPE_COLORS[e.type || 'related'] || '#96BED2';
              return (
                <div key={i} style={{ borderLeft: `3px solid ${edgeColor}`, paddingLeft: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 700, color: '#192E44', fontSize: '12px' }}>↔ {other}</span>
                    {e.type && (
                      <span style={{ fontSize: '9px', color: edgeColor, textTransform: 'uppercase', fontWeight: 700, background: edgeColor + '18', padding: '1px 5px', borderRadius: '6px' }}>{e.type}</span>
                    )}
                  </div>
                  {e.label && (
                    <div style={{ color: '#3C4A5A', lineHeight: '1.5', fontSize: '11.5px' }}>{e.label}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
        fontSize: '10px', color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.85)', borderRadius: '20px', padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
      }}>
        Click node or edge for details · Drag to reposition · Scroll to zoom
      </div>
    </div>
  );
}
