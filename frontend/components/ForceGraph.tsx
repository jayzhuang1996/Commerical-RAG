'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';

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

  // Memoize graph data — only recomputes when triples reference changes (i.e. new query)
  const graphData = useMemo(() => {
    const nodeSet = new Set<string>();
    const degreeMap: Record<string, number> = {};
    triples.forEach(t => {
      nodeSet.add(t.source);
      nodeSet.add(t.target);
      degreeMap[t.source] = (degreeMap[t.source] || 0) + 1;
      degreeMap[t.target] = (degreeMap[t.target] || 0) + 1;
    });
    return {
      nodes: Array.from(nodeSet).map(id => ({ id, degree: degreeMap[id] || 1 })),
      links: triples.map(t => ({
        source: t.source,
        target: t.target,
        label:  t.label || '',
        type:   t.type  || 'related',
        color:  TYPE_COLORS[t.type || 'related'] || '#96BED2',
      })),
    };
  }, [triples]);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tune forces once per new graph data, then freeze after simulation ends
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || typeof fg.graphData !== 'function') return;
    
    try {
      // Unfix nodes from previous run to allow new simulation
      const data = fg.graphData();
      if (data && data.nodes) {
        data.nodes.forEach((n: any) => { n.fx = undefined; n.fy = undefined; });
      }
      
      const lf = fg.d3Force('link');
      if (lf) lf.distance(90).strength(0.5);
      const cf = fg.d3Force('charge');
      if (cf) cf.strength(-250);
      const center = fg.d3Force('center');
      if (center) center.strength(0.08);
    } catch (e) {
      console.warn("ForceGraph: Failed to initialize forces", e);
    }
  }, [graphData]);

  // Once simulation settles: pin every node in place so nothing ever moves again
  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || typeof fg.graphData !== 'function') return;
    
    try {
      const data = fg.graphData();
      if (data && data.nodes) {
        data.nodes.forEach((n: any) => { n.fx = n.x; n.fy = n.y; });
      }
      if (typeof fg.zoomToFit === 'function') {
        setTimeout(() => fg.zoomToFit(300, 32), 50);
      }
    } catch (e) {
      console.warn("ForceGraph: Failed to pin nodes on engine stop", e);
    }
  }, []);

  const nodeRadius = (node: any) => Math.min(10 + (node.degree || 1) * 3, 34);

  // Draw nodes — no hover state, only click state matters
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, gs: number) => {
    const active = pinnedNode?.id === node.id;
    const r = nodeRadius(node);
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = active ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = active ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (active ? 2.5 : 1.5) / gs;
    ctx.fill();
    ctx.stroke();

    const fs = Math.max(7, Math.min(r * 0.48, 11));
    ctx.font         = `${active ? 700 : 600} ${fs}px 'Segoe UI',sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = active ? '#00D7D2' : '#192E44';

    let txt = node.id as string;
    const maxW = r * 1.65;
    if (ctx.measureText(txt).width > maxW) {
      while (txt.length > 3 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
      txt = txt + '…';
    }
    ctx.fillText(txt, node.x, node.y);
  }, [pinnedNode]);

  const nodeCanvasObjectMode = useCallback(() => 'replace' as const, []);

  const getLinkColor = useCallback((l: any): string => {
    if (pinnedNode) {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === pinnedNode.id || tgt === pinnedNode.id) return '#00D7D2';
      return '#D1D5DB'; // dim unrelated edges
    }
    return l.color || '#96BED2';
  }, [pinnedNode]);

  const getLinkWidth = useCallback((l: any): number => {
    if (l === pinnedLink) return 4;
    if (pinnedNode) {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === pinnedNode.id || tgt === pinnedNode.id) return 2.5;
      return 0.8;
    }
    return 1.5;
  }, [pinnedLink, pinnedNode]);

  const handleNodeClick = useCallback((node: any) => {
    setPinnedLink(null);
    setPinnedNode((p: any) => p?.id === node.id ? null : node);
  }, []);

  const handleLinkClick = useCallback((link: any) => {
    setPinnedNode(null);
    setPinnedLink((p: any) => p === link ? null : link);
  }, []);

  const pinnedEdges = pinnedNode
    ? triples.filter(t => t.source === pinnedNode.id || t.target === pinnedNode.id)
    : [];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={nodeCanvasObjectMode}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={0}
        cooldownTicks={150}
        onEngineStop={handleEngineStop}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        enableNodeDrag={true}
      />

      {/* Node detail panel */}
      {pinnedNode && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 200,
          width: 280, maxHeight: 'calc(100% - 48px)', overflowY: 'auto',
          background: '#fff', border: '1.5px solid #192E44',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(25,46,68,0.18)',
          fontSize: 12,
        }}>
          <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#192E44', fontSize: 14 }}>{pinnedNode.id}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {pinnedEdges.length} relationship{pinnedEdges.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button onClick={() => setPinnedNode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pinnedEdges.length === 0 ? (
              <div style={{ color: '#94A3B8' }}>No relationships in current dataset.</div>
            ) : pinnedEdges.map((e, i) => {
              const other = e.source === pinnedNode.id ? e.target : e.source;
              const ec = TYPE_COLORS[e.type || 'related'] || '#96BED2';
              return (
                <div key={i} style={{ borderLeft: `3px solid ${ec}`, paddingLeft: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: '#192E44' }}>↔ {other}</span>
                    <span style={{ fontSize: 9, color: ec, background: ec + '18', padding: '1px 5px', borderRadius: 6, textTransform: 'uppercase', fontWeight: 700 }}>{e.type || 'related'}</span>
                  </div>
                  {e.label && <div style={{ color: '#3C4A5A', lineHeight: 1.5, fontSize: 11.5 }}>{e.label}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edge detail panel */}
      {pinnedLink && !pinnedNode && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 200,
          width: 280, background: '#fff', border: '1.5px solid #192E44',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(25,46,68,0.18)', fontSize: 12,
        }}>
          <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: '#192E44', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</div>
            <button onClick={() => setPinnedLink(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, color: '#192E44', fontSize: 13, marginBottom: 8 }}>
              {(typeof pinnedLink.source === 'object' ? pinnedLink.source.id : pinnedLink.source)}
              {' ↔ '}
              {(typeof pinnedLink.target === 'object' ? pinnedLink.target.id : pinnedLink.target)}
            </div>
            {pinnedLink.type && (
              <div style={{ display: 'inline-block', marginBottom: 8, padding: '2px 8px', borderRadius: 8, background: (TYPE_COLORS[pinnedLink.type] || '#96BED2') + '20', color: TYPE_COLORS[pinnedLink.type] || '#96BED2', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                {pinnedLink.type}
              </div>
            )}
            {pinnedLink.label && <div style={{ color: '#3C4A5A', lineHeight: 1.55, fontSize: 12 }}>{pinnedLink.label}</div>}
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, color: '#94A3B8', zIndex: 10,
        background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '3px 12px',
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        Click node or edge · Drag to reposition · Scroll to zoom
      </div>
    </div>
  );
}
