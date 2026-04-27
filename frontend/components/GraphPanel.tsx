'use client';

import { X, Share2, Grid, List as ListIcon } from 'lucide-react';
import { useState } from 'react';
import ForceGraphVisualizer from './ForceGraphVisualizer';

interface Triple {
  subject: string;
  verb: string;
  object: string;
}

interface Props {
  triples: Triple[];
  onClose: () => void;
}

const VERB_COLORS: Record<string, string> = {
  founded: '#f59e0b',
  co_founded: '#f59e0b',
  works_at: '#4f8ef7',
  advises: '#2dd4bf',
  advocates_for: '#9b6dff',
  warns_against: '#ef4444',
  criticizes: '#ef4444',
  disagrees_with: '#f97316',
  collaborated_with: '#22c55e',
  researches: '#06b6d4',
  mentors: '#8b5cf6',
  left: '#94a3b8',
  primarily_covers: '#4f8ef7',
  briefly_mentions: '#64748b',
};

export default function GraphPanel({ triples, onClose }: Props) {
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  
  // Group by subject for text mode
  const grouped: Record<string, Triple[]> = {};
  triples.forEach(t => {
    if (!grouped[t.subject]) grouped[t.subject] = [];
    grouped[t.subject].push(t);
  });

  const entities = Object.keys(grouped);

  return (
    <div style={{
      height: '100%',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <Share2 size={18} color="var(--accent-main)" />
        <span style={{ fontWeight: 600, fontSize: '16px', flex: 1, fontFamily: 'var(--font-display)' }}>
          Knowledge Graph
        </span>
        <button
          onClick={() => setViewMode(viewMode === 'visual' ? 'text' : 'visual')}
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {viewMode === 'visual' ? <><ListIcon size={12} /> List</> : <><Grid size={12} /> Graph</>}
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
          }}
        >
          <X size={15} color="var(--text-muted)" />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: viewMode === 'text' ? 'auto' : 'hidden',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {viewMode === 'visual' ? (
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
             <ForceGraphVisualizer triples={triples} width={348} height={typeof window !== 'undefined' ? window.innerHeight - 150 : 500} />
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {entities.map(entity => (
              <div key={entity}>
                {/* Entity header */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  padding: '6px 10px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  {entity}
                </div>

                {/* Relationships */}
                <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {grouped[entity].map((t, i) => {
                    const verbColor = VERB_COLORS[t.verb] || '#8a8a9a';
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                      }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: verbColor,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          background: `${verbColor}20`,
                          border: `1px solid ${verbColor}50`,
                          color: verbColor,
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          flexShrink: 0,
                        }}>
                          {t.verb.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', flexShrink: 1, minWidth: 0 }}>
                          {t.object}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)'
      }}>
        {triples.length} edges extracted via Moonshot AI
      </div>
    </div>
  );
}
