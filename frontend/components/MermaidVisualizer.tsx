'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface Triple {
  source: string;
  label: string;
  target: string;
}

export default function MermaidVisualizer({ triples }: { triples: Triple[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    if (!triples || triples.length === 0) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'var(--font-mono)',
        primaryColor: '#FDF9F3',
        primaryTextColor: '#2C2A28',
        primaryBorderColor: '#D94F30',
        lineColor: '#A8A29E',
        secondaryColor: '#FAF7F2',
        tertiaryColor: '#FFFFFF',
      },
    });

    if (containerRef.current) {
      setErrorVisible(false);
      // Unique ID for each render to prevent Mermaid caching issues
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Build flowchart syntax
      let graphDefinition = 'flowchart LR\n';
      
      // Clean function to make valid mermaid IDs (extremely strict)
      const clean = (s: string) => s.toString().replace(/[^a-zA-Z]/g, '_');
      
      // Keep it minimal and readable (max 10 core relationships for split-screen)
      const visibleTriples = triples.slice(0, 10);
      
      visibleTriples.forEach(t => {
        const subId = clean(t.source) + Math.floor(Math.random() * 1000);
        const objId = clean(t.target) + Math.floor(Math.random() * 1000);
        // Clean labels as well to avoid breaking the string literal syntax
        const subStr = t.source.replace(/["()\[\]\{\}]/g, '');
        const objStr = t.target.replace(/["()\[\]\{\}]/g, '');
        const verbStr = t.label.substring(0, 30).replace(/["()\[\]\{\}]/g, '');
        
        graphDefinition += `    ${subId}["${subStr}"] -->|"${verbStr}"| ${objId}["${objStr}"]\n`;
      });

      mermaid.render(id, graphDefinition).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch(err => {
        console.error("Mermaid rendering failed", err);
        setErrorVisible(true);
      });
    }
  }, [triples]);

  if (!triples || triples.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-panel)' }}>
        No specific relationship triples found for this query context.
      </div>
    );
  }

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'auto', 
        background: 'var(--bg-panel)',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {errorVisible ? (
         <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
           Unable to draw complex relationship map.<br/>
           Some node labels may contain unsupported characters.
         </p>
      ) : (
        <div ref={containerRef} style={{ width: '100%' }} />
      )}
    </div>
  );
}
