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
    // Only visualize the top 10 clusters for clarity
    const data = communities.slice(0, 10).map((c, i) => {
      const color = PALETTE[i % PALETTE.length];
      let nodeCount = 0;
      if (Array.isArray(c.nodes)) nodeCount = c.nodes.length;
      else {
        try { nodeCount = JSON.parse(c.nodes || '[]').length; } catch { nodeCount = 0; }
      }
      
      return {
        id: c.id,
        title: c.title,
        size: 50 + (nodeCount * 5), // Base size + scaling
        color,
        summary: c.summary
      };
    });

    // Simple physics-less "spiral" layout for bubbles
    return data.map((b, i) => {
      const angle = (i / data.length) * Math.PI * 2;
      const dist = i === 0 ? 0 : 160 + (i * 20); // Center the largest, spiral out others
      return {
        ...b,
        x: 400 + Math.cos(angle) * dist,
        y: 300 + Math.sin(angle) * dist
      };
    });
  }, [communities]);

  return (
    <div style={{ background: 'var(--bg-panel)', width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg viewBox="0 0 800 600" style={{ width: '100%', height: '100%' }}>
        {/* Background Grid/Mesh for "Technical" look */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#grid)" opacity="0.5" />

        {/* Lines connecting everything to the center hub */}
        {bubbles.slice(1).map((b, i) => (
          <line
            key={`line-${i}`}
            x1="400"
            y1="300"
            x2={b.x}
            y2={b.y}
            stroke={b.color}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.3"
          />
        ))}

        {/* The Bubbles */}
        {bubbles.map((b, i) => (
          <g key={b.id} style={{ cursor: 'pointer' }} className="bubble-group">
            <circle
              cx={b.x}
              cy={b.y}
              r={b.size}
              fill={`${b.color}20`}
              stroke={b.color}
              strokeWidth="2"
              style={{ transition: 'all 0.3s' }}
            />
            {/* Glossy overlay */}
            <circle
              cx={b.x - b.size/3}
              cy={b.y - b.size/3}
              r={b.size/4}
              fill="rgba(255,255,255,0.1)"
              pointerEvents="none"
            />
            
            {/* Label */}
            <foreignObject
              x={b.x - b.size * 0.8}
              y={b.y - b.size * 0.4}
              width={b.size * 1.6}
              height={b.size * 0.8}
            >
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'var(--text-primary)',
                fontSize: b.size > 80 ? '13px' : '11px',
                fontWeight: 700,
                lineHeight: 1.2,
                fontFamily: 'var(--font-display)',
                padding: '4px',
                pointerEvents: 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {b.title}
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>

      <style jsx>{`
        .bubble-group:hover circle {
          fill: rgba(0,0,0,0.05);
          stroke-width: 4px;
          transform: scale(1.05);
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
