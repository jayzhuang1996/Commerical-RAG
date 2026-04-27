'use client';

import { useMemo } from 'react';

interface Community {
  id: string;
  title: string;
  summary: string;
  nodes: string | string[];
}

interface Props {
  communities: Community[];
  height?: number;
}

const PALETTE = [
  '#2A7B9B', '#7B6DAA', '#2D8B55', '#D4A843', '#D94F30', '#E5BA73', '#9DC08B', '#6096B4'
];

export default function ClusterVisualizer({ communities, height = 600 }: Props) {
  const bubbles = useMemo(() => {
    // Top 10 clusters
    const data = communities.slice(0, 10).map((c, i) => {
      const color = PALETTE[i % PALETTE.length];
      let nodesArray: string[] = [];
      if (Array.isArray(c.nodes)) nodesArray = c.nodes;
      else {
        try { nodesArray = JSON.parse(c.nodes || '[]'); } catch { nodesArray = []; }
      }
      
      return {
        id: c.id,
        title: c.title,
        size: 50 + (nodesArray.length * 4), 
        color,
        nodes: nodesArray
      };
    });

    // 1) Calculate Parent Macros
    const macros = data.map((b, i) => {
      const angle = (i / data.length) * Math.PI * 2;
      const dist = i === 0 ? 0 : 160 + (i * 30);
      const x = 400 + Math.cos(angle) * dist;
      const y = 300 + Math.sin(angle) * dist;
      
      // 2) Calculate Child Orbits (the actual companies)
      const children = b.nodes.map((nodeName, j) => {
        const childAngle = (j / b.nodes.length) * Math.PI * 2 + (i * 0.5); // staggered rotation
        const orbitRadius = b.size + 30 + (Math.random() * 10);
        return {
          id: `${b.id}-${j}`,
          name: nodeName,
          x: x + Math.cos(childAngle) * orbitRadius,
          y: y + Math.sin(childAngle) * orbitRadius,
          size: 14 + (Math.random() * 8), // slightly randomized sizes for visual diversity
          color: b.color
        };
      });
      
      return {
        ...b,
        x,
        y,
        children
      };
    });
    
    return macros;
  }, [communities]);

  return (
    <div style={{ background: 'var(--bg-panel)', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg viewBox="0 0 800 600" style={{ width: '100%', height: '100%' }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid)" opacity="0.5" />

        {/* 1. Macro Connections */}
        {bubbles.slice(1).map((b, i) => (
          <line
            key={`macro-line-${i}`}
            x1="400" y1="300"
            x2={b.x} y2={b.y}
            stroke={b.color} strokeWidth="1" strokeDasharray="4 4" opacity="0.4"
          />
        ))}

        {bubbles.map((b) => (
          <g key={b.id} className="cluster-group">
            {/* 2. Orbit Rings */}
            <circle cx={b.x} cy={b.y} r={b.size + 35} fill="none" stroke={b.color} strokeWidth="1" strokeDasharray="2 6" opacity="0.2" />
            
            {/* 3. Child Connections */}
            {b.children.map(child => (
              <line key={`child-link-${child.id}`} x1={b.x} y1={b.y} x2={child.x} y2={child.y} stroke={b.color} strokeWidth="1" opacity="0.2" />
            ))}
            
            {/* 4. Child Nodes */}
            {b.children.map(child => (
              <g key={`child-${child.id}`} className="child-node">
                <circle cx={child.x} cy={child.y} r={child.size} fill="var(--bg-card)" stroke={child.color} strokeWidth="2" />
                <text x={child.x} y={child.y + 4} textAnchor="middle" fill="var(--text-primary)" fontSize="9px" fontWeight="700" fontFamily="var(--font-mono)">
                  {child.name}
                </text>
              </g>
            ))}

            {/* 5. Macro Bubble */}
            <circle cx={b.x} cy={b.y} r={b.size} fill={`${b.color}15`} stroke={b.color} strokeWidth="2" style={{ transition: 'all 0.3s' }} className="macro-circle" />
            
            <foreignObject x={b.x - b.size * 0.8} y={b.y - 12} width={b.size * 1.6} height={24}>
              <div style={{
                textAlign: 'center', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-display)', textShadow: '0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none'
              }}>
                {b.title}
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>

      <style jsx>{`
        .cluster-group:hover .macro-circle {
          fill: rgba(0,0,0,0.05);
          stroke-width: 3px;
        }
        .child-node {
          cursor: crosshair;
          transition: all 0.2s;
        }
        .child-node:hover circle {
          fill: var(--text-primary);
          stroke-width: 3px;
          transform: scale(1.1);
          transform-origin: center;
        }
        .child-node:hover text {
          fill: var(--bg-card);
        }
      `}</style>
    </div>
  );
}
