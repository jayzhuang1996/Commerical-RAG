'use client';

import { Users, Info, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface Props {
  community: {
    id: number;
    title: string;
    summary: string;
    nodes: string | string[];
  };
  index: number;
}

export default function StrategicInsightCard({ community, index }: Props) {
  // Parse the rich summary if it's JSON, or use defaults
  let data: any = { summary: community.summary };
  try {
    if (community.summary.startsWith('{')) {
      data = JSON.parse(community.summary);
    }
  } catch (e) {
    // Fallback if not JSON yet
  }

  const nodes = Array.isArray(community.nodes) ? community.nodes : JSON.parse(community.nodes || '[]');
  const color = [
    '#2A7B9B', '#7B6DAA', '#2D8B55', '#D4A843', '#D94F30', '#22c55e', '#f97316', '#06b6d4'
  ][index % 8];

  // Mock score for the radial bar (based on entity count for a stable visual)
  const score = Math.min(60 + (nodes.length * 2), 98);
  const chartData = [{ name: 'Importance', value: score, fill: color }];

  return (
    <div className="strategic-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '24px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Accent */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: `${color}08`,
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 0
      }} />

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            background: `${color}15`, 
            color: color,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '16px'
          }}>
            <TrendingUp size={12} />
            Strategic Cluster {index + 1}
          </div>
          <h3 style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            fontFamily: 'var(--font-display)',
            lineHeight: 1.2,
            marginBottom: '12px'
          }}>
            {community.title}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {data.summary}
          </p>
        </div>

        <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="70%" 
              outerRadius="100%" 
              barSize={10} 
              data={chartData}
              startAngle={90}
              endAngle={450}
            >
              <RadialBar 
                background 
                dataKey="value" 
                cornerRadius={5}
              />
              <text 
                x="50%" 
                y="50%" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill={color} 
                style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
              >
                {score}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        zIndex: 1
      }}>
        {/* Insight Box */}
        {data.insight && (
          <div style={{ 
            padding: '20px', 
            background: 'var(--bg-panel)', 
            borderRadius: '16px', 
            border: '1px solid var(--border)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-main)' }}>
              <Info size={14} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Strategic Insight</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.insight}
            </p>
          </div>
        )}

        {/* Tension Box */}
        {data.tensions && (
          <div style={{ 
            padding: '20px', 
            background: 'var(--bg-panel)', 
            borderRadius: '16px', 
            border: '1px solid var(--border)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#d97706' }}>
              <AlertTriangle size={14} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Operational Tensions</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {data.tensions}
            </p>
          </div>
        )}
      </div>

      {/* Figures & Entities */}
      <div style={{ zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Users size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Key Network Figures</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(data.top_entities || nodes.slice(0, 5)).map((n: string, i: number) => (
            <div key={i} style={{ 
              padding: '6px 14px', 
              borderRadius: '12px', 
              background: 'white', 
              border: '1px solid var(--border)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              {n}
            </div>
          ))}
          {nodes.length > 5 && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              +{nodes.length - 5} others
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
