'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Require dynaminc import with no SSR because react-force-graph uses canvas/window
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Triple {
  subject: string;
  verb: string;
  object: string;
}

interface Props {
  triples: Triple[];
  width?: number;
  height?: number;
}

const VERB_COLORS: Record<string, string> = {
  founded: '#f59e0b',
  works_at: '#4f8ef7',
  advises: '#2dd4bf',
  advocates_for: '#9b6dff',
  warns_against: '#ef4444',
  criticizes: '#ef4444',
  disagrees_with: '#f97316',
  collaborated_with: '#22c55e',
  researches: '#06b6d4',
  mentors: '#8b5cf6',
  primarily_covers: '#4f8ef7',
};

export default function ForceGraphVisualizer({ triples, width = 350, height = 500 }: Props) {
  const graphData = useMemo(() => {
    const nodesMap = new Map<string, any>();
    const links: any[] = [];

    triples.forEach(t => {
      if (!nodesMap.has(t.subject)) {
        nodesMap.set(t.subject, { id: t.subject, name: t.subject, val: 1.5 });
      } else {
        nodesMap.get(t.subject).val += 0.5; // increase node size roughly based on connections
      }

      if (!nodesMap.has(t.object)) {
        nodesMap.set(t.object, { id: t.object, name: t.object, val: 1 });
      } else {
        nodesMap.get(t.object).val += 0.5;
      }

      links.push({
        source: t.subject,
        target: t.object,
        label: t.verb,
        color: VERB_COLORS[t.verb] || '#8a8a9a'
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links
    };
  }, [triples]);

  return (
    <div style={{ background: '#0a0a0f', width: '100%', height: '100%', position: 'relative' }}>
      <ForceGraph2D
        width={width}
        height={height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={() => '#4f8ef7'}
        nodeRelSize={4}
        linkColor={(link: any) => link.color}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node: any) => {
          // Can add interactions in the future
          console.log(node);
        }}
        // Custom text drawing for node names directly on the canvas
        nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          
          // Only draw text if zoom level is decent or node is large enough
          if (globalScale > 1.5 || node.val > 2) {
             const textWidth = ctx.measureText(label).width;
             const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 
             
             // Base node
             ctx.beginPath();
             ctx.arc(node.x, node.y, node.val * 2, 0, 2 * Math.PI, false);
             ctx.fillStyle = '#4f8ef7';
             ctx.fill();

             // Label background
             ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
             ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + (node.val * 2) + 2, bckgDimensions[0], bckgDimensions[1]);

             // Label text
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillStyle = '#e8e8f0';
             ctx.fillText(label, node.x, node.y + (node.val * 2) + 2 + bckgDimensions[1]/2);
          } else {
             // Just draw the node circle
             ctx.beginPath();
             ctx.arc(node.x, node.y, node.val * 2, 0, 2 * Math.PI, false);
             ctx.fillStyle = '#4f8ef7';
             ctx.fill();
          }
        }}
      />
    </div>
  );
}
