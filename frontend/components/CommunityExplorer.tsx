'use client';

import { useEffect, useState } from 'react';
import { Layers, Sparkles, BrainCircuit, Layout, Grid } from 'lucide-react';
import StrategicInsightCard from './StrategicInsightCard';
import ClusterVisualizer from './ClusterVisualizer';

interface Community {
  id: number;
  title: string;
  summary: string;
  nodes: string | string[];
}

export default function CommunityExplorer() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'briefing' | 'visualization'>('briefing');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/communities`)
      .then(r => r.json())
      .then(d => {
        setCommunities(d.communities || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="shimmer" style={{ height: '350px', borderRadius: '24px' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Editorial Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-main)', marginBottom: '8px' }}>
            <BrainCircuit size={20} />
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Thematic Intelligence Mapping
            </span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', maxWidth: '600px' }}>
            Macro Trends & Strategic Clusters
          </h2>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <button 
            onClick={() => setViewMode('briefing')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: viewMode === 'briefing' ? 'var(--accent-main)' : 'transparent',
              color: viewMode === 'briefing' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Layout size={14} />
            Strategic Briefing
          </button>
          <button 
            onClick={() => setViewMode('visualization')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: viewMode === 'visualization' ? 'var(--accent-main)' : 'transparent',
              color: viewMode === 'visualization' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Grid size={14} />
            Thematic Map
          </button>
        </div>
      </div>

      {viewMode === 'briefing' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          {communities.map((c, i) => (
            <StrategicInsightCard key={c.id} community={c} index={i} />
          ))}
        </div>
      ) : (
        <div style={{ 
          height: '600px', 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border)', 
          borderRadius: '24px', 
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <ClusterVisualizer communities={communities} height={600} />
        </div>
      )}

    </div>
  );
}
