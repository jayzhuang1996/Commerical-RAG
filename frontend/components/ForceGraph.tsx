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

  // Track mouse for tooltip positioning
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

  // Tighten d3 forces for "closely connected" look
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

  const nodeRadius = (node: any) => Math.min(8 + (node.degree || 1) * 2.5, 40);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHov = hoveredNode === node.id || selectedNode?.id === node.id;
    const r     = nodeRadius(node);
    const label = node.id as string;

    // Node Body
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle   = isHov ? '#192E44' : '#FFFFFF';
    ctx.strokeStyle = isHov ? '#00D7D2' : '#192E44';
    ctx.lineWidth   = (isHov ? 3 : 1.5) / globalScale;
    ctx.fill();
    ctx.stroke();

    // Text
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
  }, [selectedNode, hoveredNode]);

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
        onNodeHover={(node) => {
          setHoveredNode(node?.id || null);
          setSelectedNode(node);
          setSelectedLink(null);
        }}
        onLinkHover={(link) => {
          setSelectedLink(link);
          setSelectedNode(null);
        }}
        onEngineStop={handleEngineStop}
        cooldownTicks={100}
        linkColor={(l: any) => l.color}
        linkWidth={(l: any) => (l === selectedLink ? 5 : 2.5)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
      />

      {/* Insight Panel (Hover triggered) */}
      {(selectedLink || selectedNode) && (
        <div style={{
          position: 'absolute',
          left:  ttLeft,
          top:   ttTop,
          zIndex: 100,
          width: '280px',
          padding: '14px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(4px)',
          border: '1px solid #192E44',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(25,46,68,0.15)',
          fontSize: '12px',
          pointerEvents: 'none', // Allow cursor to pass through to graph
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{ fontWeight: 800, color: '#192E44', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {selectedLink ? 'Relationship Insight' : 'Company Context'}
          </div>

          {selectedLink && (
            <>
              <div style={{ color: '#192E44', fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>
                {selectedLink.source.id} ↔ {selectedLink.target.id}
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
                Strategic node with <b>{selectedNode.degree}</b> deep-link relationships in the current vertical.
              </div>
            </>
          )}
        </div>
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
        nodeCanvasObjectMode={(_node: any) => 'replace'}
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
