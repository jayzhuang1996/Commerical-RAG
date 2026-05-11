'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

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

interface SimNode {
  id: string;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  label: string;
  type: string;
  color: string;
}

interface PinnedLink {
  source: SimNode;
  target: SimNode;
  label: string;
  type: string;
}

export default function ForceGraph({ triples }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const animFrameRef = useRef<number>(0);
  const simRef = useRef<any>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });

  const [pinnedNode, setPinnedNode] = useState<SimNode | null>(null);
  const [pinnedLink, setPinnedLink] = useState<PinnedLink | null>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });

  const pinnedNodeRef = useRef<SimNode | null>(null);
  const pinnedLinkRef = useRef<PinnedLink | null>(null);
  pinnedNodeRef.current = pinnedNode;
  pinnedLinkRef.current = pinnedLink;

  // Build graph data when triples change
  const { nodes: initNodes, links: initLinks } = useMemo(() => {
    const nodeMap = new Map<string, { degree: number }>();
    triples.forEach(t => {
      nodeMap.set(t.source, { degree: (nodeMap.get(t.source)?.degree || 0) + 1 });
      nodeMap.set(t.target, { degree: (nodeMap.get(t.target)?.degree || 0) + 1 });
    });
    const nodes: SimNode[] = Array.from(nodeMap.entries()).map(([id, { degree }]) => ({
      id, degree, x: Math.random() * 400 + 100, y: Math.random() * 300 + 50, vx: 0, vy: 0,
    }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links = triples
      .filter(t => nodeById.has(t.source) && nodeById.has(t.target))
      .map(t => ({
        source: nodeById.get(t.source)!,
        target: nodeById.get(t.target)!,
        label: t.label || '',
        type: t.type || 'related',
        color: TYPE_COLORS[t.type || 'related'] || '#96BED2',
      }));
    return { nodes, links };
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

  const nodeRadius = (n: SimNode) => Math.min(10 + n.degree * 3, 34);

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x: tx, y: ty, k } = transformRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const pn = pinnedNodeRef.current;
    const pl = pinnedLinkRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(k, k);

    // Draw edges
    links.forEach(l => {
      const isPinnedLink = pl && pl.source === l.source && pl.target === l.target;
      const isConnected = pn && (l.source.id === pn.id || l.target.id === pn.id);
      const color = isPinnedLink ? '#00D7D2' : isConnected ? '#00D7D2' : pn ? '#D1D5DB' : l.color;
      const width = isPinnedLink ? 3 : isConnected ? 2 : pn ? 0.6 : 1.5;
      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();

      // Edge label at midpoint
      if (!pn && !pl && l.label) {
        const mx = (l.source.x + l.target.x) / 2;
        const my = (l.source.y + l.target.y) / 2;
        ctx.font = '8px sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxLen = 24;
        const short = l.label.length > maxLen ? l.label.slice(0, maxLen) + '…' : l.label;
        ctx.fillText(short, mx, my);
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      const active = pn?.id === n.id;
      const r = nodeRadius(n);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = active ? '#192E44' : '#FFFFFF';
      ctx.strokeStyle = active ? '#00D7D2' : '#192E44';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();

      const fs = Math.max(7, Math.min(r * 0.48, 11));
      ctx.font = `${active ? 700 : 600} ${fs}px 'Segoe UI',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? '#00D7D2' : '#192E44';
      let txt = n.id;
      const maxW = r * 1.65;
      if (ctx.measureText(txt).width > maxW) {
        while (txt.length > 3 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
        txt += '…';
      }
      ctx.fillText(txt, n.x, n.y);
    });

    ctx.restore();
  }, []);

  // Pure JS force simulation — no external library, no dynamic import
  useEffect(() => {
    if (initNodes.length === 0) return;

    nodesRef.current = initNodes.map(n => ({ ...n }));
    linksRef.current = initLinks.map(l => {
      const srcId = typeof l.source === 'object' ? (l.source as SimNode).id : l.source as string;
      const tgtId = typeof l.target === 'object' ? (l.target as SimNode).id : l.target as string;
      const src = nodesRef.current.find(n => n.id === srcId)!;
      const tgt = nodesRef.current.find(n => n.id === tgtId)!;
      return { ...l, source: src, target: tgt };
    });

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const cx = dims.w / 2;
    const cy = dims.h / 2;

    // Spread nodes in a wide circle initially so they never start bunched
    const spreadR = Math.min(dims.w, dims.h) * 0.38;
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      n.x = cx + Math.cos(angle) * spreadR + (Math.random() - 0.5) * 40;
      n.y = cy + Math.sin(angle) * spreadR + (Math.random() - 0.5) * 40;
      n.vx = 0; n.vy = 0;
    });

    let alpha = 1;
    const alphaDecay = 0.015;   // slower cool-down → more time to spread
    const velocityDecay = 0.6;  // more momentum retained per tick

    const tick = () => {
      if (alpha < 0.001) {
        draw();
        return;
      }

      // Link force — longer rest length so linked nodes stay readable
      links.forEach(l => {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 160;
        const strength = 0.25;
        const f = (dist - targetDist) / dist * strength * alpha;
        l.source.vx += dx * f; l.source.vy += dy * f;
        l.target.vx -= dx * f; l.target.vy -= dy * f;
      });

      // Many-body repulsion — use dist (not dist²) for longer-range push
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (-600 / dist) * alpha;  // linear falloff → nodes spread far
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }

      // Soft center gravity — keeps graph from drifting off canvas

      nodes.forEach(n => {
        n.vx += (cx - n.x) * 0.02 * alpha;
        n.vy += (cy - n.y) * 0.02 * alpha;
      });

      // Integrate
      nodes.forEach(n => {
        n.vx *= velocityDecay;
        n.vy *= velocityDecay;
        n.x += n.vx;
        n.y += n.vy;
      });

      alpha -= alphaDecay;
      draw();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [initNodes, initLinks, dims, draw]);

  // Interaction: drag, click, scroll-zoom, pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging: SimNode | null = null;
    let panStart: { x: number; y: number } | null = null;
    let didDrag = false;

    const toWorld = (cx: number, cy: number) => {
      const { x: tx, y: ty, k } = transformRef.current;
      return { x: (cx - tx) / k, y: (cy - ty) / k };
    };

    const hitNode = (wx: number, wy: number) =>
      nodesRef.current.find(n => {
        const dx = n.x - wx; const dy = n.y - wy;
        return Math.sqrt(dx * dx + dy * dy) <= nodeRadius(n);
      }) || null;

    const hitLink = (wx: number, wy: number) =>
      linksRef.current.find(l => {
        const ax = l.source.x, ay = l.source.y;
        const bx = l.target.x, by = l.target.y;
        const abx = bx - ax, aby = by - ay;
        const len2 = abx * abx + aby * aby;
        if (len2 === 0) return false;
        const t = Math.max(0, Math.min(1, ((wx - ax) * abx + (wy - ay) * aby) / len2));
        const px = ax + t * abx - wx, py = ay + t * aby - wy;
        return Math.sqrt(px * px + py * py) < 8;
      }) || null;

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const { x: wx, y: wy } = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const node = hitNode(wx, wy);
      didDrag = false;
      if (node) { dragging = node; }
      else { panStart = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y }; }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (dragging) {
        didDrag = true;
        const { x: wx, y: wy } = toWorld(e.clientX - rect.left, e.clientY - rect.top);
        dragging.x = wx; dragging.y = wy;
        dragging.vx = 0; dragging.vy = 0;
        draw();
      } else if (panStart) {
        didDrag = true;
        transformRef.current.x = e.clientX - panStart.x;
        transformRef.current.y = e.clientY - panStart.y;
        draw();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!didDrag) {
        const { x: wx, y: wy } = toWorld(e.clientX - rect.left, e.clientY - rect.top);
        const node = hitNode(wx, wy);
        if (node) {
          setPinnedLink(null);
          setPinnedNode(p => p?.id === node.id ? null : node);
        } else {
          const link = hitLink(wx, wy);
          if (link) {
            setPinnedNode(null);
            setPinnedLink(p => p?.source === link.source && p?.target === link.target ? null : link);
          } else {
            setPinnedNode(null);
            setPinnedLink(null);
          }
        }
        draw();
      }
      dragging = null;
      panStart = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const { x: tx, y: ty, k } = transformRef.current;
      const newK = Math.min(5, Math.max(0.2, k * delta));
      transformRef.current = {
        x: mx - (mx - tx) * (newK / k),
        y: my - (my - ty) * (newK / k),
        k: newK,
      };
      draw();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [draw]);

  const pinnedEdges = pinnedNode
    ? triples.filter(t => t.source === pinnedNode.id || t.target === pinnedNode.id)
    : [];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* Node detail panel */}
      {pinnedNode && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 200,
          width: 280, maxHeight: 'calc(100% - 48px)', overflowY: 'auto',
          background: '#fff', border: '1.5px solid #192E44',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(25,46,68,0.18)', fontSize: 12,
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
              {pinnedLink.source.id} ↔ {pinnedLink.target.id}
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
        border: '1px solid #E3E6EA', whiteSpace: 'nowrap', pointerEvents: 'none',
      }}>
        Click node or edge · Drag to reposition · Scroll to zoom
      </div>
    </div>
  );
}
