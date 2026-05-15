'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

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

interface SimNode { id: string; degree: number; x: number; y: number; vx: number; vy: number; }
interface SimLink { source: SimNode; target: SimNode; label: string; type: string; color: string; }
interface PinnedLink { source: SimNode; target: SimNode; label: string; type: string; }

function nodeRadius(n: SimNode) { return Math.min(10 + n.degree * 3, 34); }

export default function ForceGraph({ triples }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef     = useRef<SimNode[]>([]);
  const linksRef     = useRef<SimLink[]>([]);
  const rafRef       = useRef<number>(0);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const alphaRef     = useRef(0);           // 0 = sim stopped
  const dimsRef      = useRef({ w: 800, h: 500 });

  // Interaction state kept in refs so draw never needs to re-subscribe
  const pinnedNodeRef = useRef<SimNode | null>(null);
  const pinnedLinkRef = useRef<PinnedLink | null>(null);

  // Mirror to React state only for panel rendering
  const [pinnedNode, setPinnedNode] = useState<SimNode | null>(null);
  const [pinnedLink, setPinnedLink] = useState<PinnedLink | null>(null);
  const [, forceRepaint] = useState(0);

  // ── Draw (reads all state from refs — never stale) ─────────────────────────
  const drawRef = useRef<() => void>(() => {});
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x: tx, y: ty, k } = transformRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const pn    = pinnedNodeRef.current;
    const pl    = pinnedLinkRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(k, k);

    // Edges
    links.forEach(l => {
      const isPL = pl && pl.source === l.source && pl.target === l.target;
      const isConn = pn && (l.source.id === pn.id || l.target.id === pn.id);
      const color = isPL ? '#00D7D2' : isConn ? '#00D7D2' : pn ? '#D1D5DB' : l.color;
      const width = isPL ? 3 : isConn ? 2 : pn ? 0.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
      // Short edge label when nothing is selected
      if (!pn && !pl && l.label) {
        const mx = (l.source.x + l.target.x) / 2;
        const my = (l.source.y + l.target.y) / 2;
        ctx.font = '7px sans-serif';
        ctx.fillStyle = '#B0BEC5';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const short = l.label.length > 22 ? l.label.slice(0, 22) + '…' : l.label;
        ctx.fillText(short, mx, my);
      }
    });

    // Nodes
    nodes.forEach(n => {
      const active = pn?.id === n.id;
      const r = nodeRadius(n);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle   = active ? '#192E44' : '#FFFFFF';
      ctx.strokeStyle = active ? '#00D7D2' : '#192E44';
      ctx.lineWidth   = active ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();

      const fs = Math.max(7, Math.min(r * 0.48, 11));
      ctx.font         = `${active ? 700 : 600} ${fs}px 'Segoe UI',sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = active ? '#00D7D2' : '#192E44';
      let txt = n.id;
      const maxW = r * 1.65;
      if (ctx.measureText(txt).width > maxW) {
        while (txt.length > 3 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
        txt += '…';
      }
      ctx.fillText(txt, n.x, n.y);
    });

    ctx.restore();
  };

  // ── Simulation tick loop (self-contained, reads/writes refs only) ───────────
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    if (alphaRef.current <= 0.001) {
      drawRef.current();
      return;
    }
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const { w, h } = dimsRef.current;
    const cx = w / 2, cy = h / 2;
    const alpha = alphaRef.current;

    // Link force
    links.forEach(l => {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - 150) / dist * 0.3 * alpha;
      l.source.vx += dx * f; l.source.vy += dy * f;
      l.target.vx -= dx * f; l.target.vy -= dy * f;
    });

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (-500 / dist) * alpha;
        const fx = dx / dist * f, fy = dy / dist * f;
        nodes[i].vx -= fx; nodes[i].vy -= fy;
        nodes[j].vx += fx; nodes[j].vy += fy;
      }
    }

    // Center gravity
    nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.015 * alpha;
      n.vy += (cy - n.y) * 0.015 * alpha;
    });

    // Integrate
    nodes.forEach(n => {
      n.vx *= 0.65;
      n.vy *= 0.65;
      n.x += n.vx;
      n.y += n.vy;
    });

    alphaRef.current -= 0.012;
    drawRef.current();
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  };

  // ── Start simulation only when triples actually change ─────────────────────
  const triplesKey = useMemo(() => triples.map(t => `${t.source}>${t.target}`).join('|'), [triples]);

  useEffect(() => {
    if (triples.length === 0) return;

    cancelAnimationFrame(rafRef.current);

    const nodeMap = new Map<string, number>();
    triples.forEach(t => {
      nodeMap.set(t.source, (nodeMap.get(t.source) || 0) + 1);
      nodeMap.set(t.target, (nodeMap.get(t.target) || 0) + 1);
    });

    const { w, h } = dimsRef.current;
    const cx = w / 2, cy = h / 2;
    const spreadR = Math.min(w, h) * 0.36;

    const nodes: SimNode[] = Array.from(nodeMap.entries()).map(([id, degree], i, arr) => {
      const angle = (i / arr.length) * Math.PI * 2;
      return {
        id, degree,
        x: cx + Math.cos(angle) * spreadR + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(angle) * spreadR + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0,
      };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links: SimLink[] = triples
      .filter(t => nodeById.has(t.source) && nodeById.has(t.target))
      .map(t => ({
        source: nodeById.get(t.source)!,
        target: nodeById.get(t.target)!,
        label: t.label || '',
        type:  t.type  || 'related',
        color: TYPE_COLORS[t.type || 'related'] || '#96BED2',
      }));

    nodesRef.current = nodes;
    linksRef.current = links;
    pinnedNodeRef.current = null;
    pinnedLinkRef.current = null;
    setPinnedNode(null);
    setPinnedLink(null);
    alphaRef.current = 1;

    rafRef.current = requestAnimationFrame(() => tickRef.current());
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triplesKey]);

  // ── Canvas size — update ref + resize canvas, no sim restart ───────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth, h = el.clientHeight;
      dimsRef.current = { w, h };
      if (canvasRef.current) {
        canvasRef.current.width  = w;
        canvasRef.current.height = h;
      }
      drawRef.current();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Interaction ─────────────────────────────────────────────────────────────
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
        const dx = n.x - wx, dy = n.y - wy;
        return Math.sqrt(dx * dx + dy * dy) <= nodeRadius(n);
      }) ?? null;

    const hitLink = (wx: number, wy: number) =>
      linksRef.current.find(l => {
        const ax = l.source.x, ay = l.source.y, bx = l.target.x, by = l.target.y;
        const abx = bx - ax, aby = by - ay;
        const len2 = abx * abx + aby * aby;
        if (!len2) return false;
        const t = Math.max(0, Math.min(1, ((wx - ax) * abx + (wy - ay) * aby) / len2));
        const px = ax + t * abx - wx, py = ay + t * aby - wy;
        return Math.sqrt(px * px + py * py) < 8;
      }) ?? null;

    const onDown = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const { x: wx, y: wy } = toWorld(e.clientX - r.left, e.clientY - r.top);
      didDrag = false;
      dragging = hitNode(wx, wy);
      if (!dragging) panStart = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      if (dragging) {
        didDrag = true;
        const { x: wx, y: wy } = toWorld(e.clientX - r.left, e.clientY - r.top);
        dragging.x = wx; dragging.y = wy; dragging.vx = 0; dragging.vy = 0;
        // Reheat sim slightly so connected nodes adjust
        if (alphaRef.current < 0.3) alphaRef.current = 0.3;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(() => tickRef.current());
        drawRef.current();
      } else if (panStart) {
        didDrag = true;
        transformRef.current.x = e.clientX - panStart.x;
        transformRef.current.y = e.clientY - panStart.y;
        drawRef.current();
      }
    };

    const onUp = (e: MouseEvent) => {
      if (!didDrag) {
        const r = canvas.getBoundingClientRect();
        const { x: wx, y: wy } = toWorld(e.clientX - r.left, e.clientY - r.top);
        const node = hitNode(wx, wy);
        if (node) {
          pinnedLinkRef.current = null;
          const next = pinnedNodeRef.current?.id === node.id ? null : node;
          pinnedNodeRef.current = next;
          setPinnedNode(next);
          setPinnedLink(null);
        } else {
          const link = hitLink(wx, wy);
          if (link) {
            pinnedNodeRef.current = null;
            const next = (pinnedLinkRef.current?.source === link.source && pinnedLinkRef.current?.target === link.target) ? null : link;
            pinnedLinkRef.current = next;
            setPinnedLink(next);
            setPinnedNode(null);
          } else {
            pinnedNodeRef.current = null;
            pinnedLinkRef.current = null;
            setPinnedNode(null);
            setPinnedLink(null);
          }
        }
        drawRef.current();
        forceRepaint(x => x + 1);
      }
      dragging = null;
      panStart = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const { x: tx, y: ty, k } = transformRef.current;
      const newK = Math.min(5, Math.max(0.15, k * (e.deltaY > 0 ? 0.9 : 1.1)));
      transformRef.current = { x: mx - (mx - tx) * (newK / k), y: my - (my - ty) * (newK / k), k: newK };
      drawRef.current();
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []); // runs once — all state via refs

  const pinnedEdges = pinnedNode
    ? triples.filter(t => t.source === pinnedNode.id || t.target === pinnedNode.id)
    : [];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#F8F9FA', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />

      {pinnedNode && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 200, width: 280, maxHeight: 'calc(100% - 48px)', overflowY: 'auto', background: '#fff', border: '1.5px solid #192E44', borderRadius: 12, boxShadow: '0 8px 24px rgba(25,46,68,0.18)', fontSize: 12 }}>
          <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#192E44', fontSize: 14 }}>{pinnedNode.id}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pinnedEdges.length} relationship{pinnedEdges.length !== 1 ? 's' : ''}</div>
            </div>
            <button onClick={() => { pinnedNodeRef.current = null; setPinnedNode(null); drawRef.current(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pinnedEdges.length === 0
              ? <div style={{ color: '#94A3B8' }}>No relationships in current dataset.</div>
              : pinnedEdges.map((e, i) => {
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

      {pinnedLink && !pinnedNode && (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 200, width: 280, background: '#fff', border: '1.5px solid #192E44', borderRadius: 12, boxShadow: '0 8px 24px rgba(25,46,68,0.18)', fontSize: 12 }}>
          <div style={{ padding: '11px 14px 9px', borderBottom: '1px solid #E3E6EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: '#192E44', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</div>
            <button onClick={() => { pinnedLinkRef.current = null; setPinnedLink(null); drawRef.current(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, color: '#192E44', fontSize: 13, marginBottom: 8 }}>{pinnedLink.source.id} ↔ {pinnedLink.target.id}</div>
            {pinnedLink.type && (
              <div style={{ display: 'inline-block', marginBottom: 8, padding: '2px 8px', borderRadius: 8, background: (TYPE_COLORS[pinnedLink.type] || '#96BED2') + '20', color: TYPE_COLORS[pinnedLink.type] || '#96BED2', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{pinnedLink.type}</div>
            )}
            {pinnedLink.label && <div style={{ color: '#3C4A5A', lineHeight: 1.55, fontSize: 12 }}>{pinnedLink.label}</div>}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#94A3B8', zIndex: 10, background: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: '3px 12px', border: '1px solid #E3E6EA', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        Click node or edge · Drag to reposition · Scroll to zoom
      </div>
    </div>
  );
}
