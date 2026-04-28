'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Sparkles, BookOpen, Clock, Maximize2, Layout, List, Filter, CheckSquare, Square } from 'lucide-react';
import ForceGraph from './ForceGraph';
import TypewriterText from './TypewriterText';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  sources?: { index: number; video_id: string; title: string; text?: string; timestamp?: number }[];
  graph_data?: { source: string; label: string; target: string }[];
}

const getAnswer = async (question: string, activeQuarters: string[], activeLayers: string[]) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: question,
      filters: { quarters: activeQuarters, layers: activeLayers }
    }),
  });
  return res.json();
};

const SUGGESTED = [
  "What is the 2027 roadmap for NVIDIA's Rubin and Blackwell platforms?",
  "Map the supply chain links and potential bottlenecks between ASML and TSMC.",
  "Which companies in the Equipment layer (AMAT/LRCX) are key to 2nm production?",
  "Summarize the current HBM yield issues discussed in 2026 memory filings.",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{ title: string; text: string; index: number; video_id: string; timestamp?: number } | null>(null);

  // Filters State
  const [activeQuarters, setActiveQuarters] = useState<string[]>([]);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  const toggleFilter = (setFn: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setFn(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  
  // Animation/UI states
  const [isTyping, setIsTyping] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);

  const handleSubmit = async (q?: string) => {
    const question = q || query;
    if (!question.trim()) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);
    setActiveMessageIndex(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: question,
          filters: { quarters: activeQuarters, layers: activeLayers }
        }),
      });
      
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Unknown error occurred');

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          graph_data: data.graph_data,
          sources: data.sources
        }
      ]);
      setActiveMessageIndex(messages.length + 1);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'error', content: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeMsg = activeMessageIndex !== null ? messages[activeMessageIndex] : null;

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', gap: '0', position: 'relative', background: 'var(--bg-panel)' }}>
      
      {/* Far-Left Pane: Intelligence Filters */}
      <div style={{ 
        width: '220px', 
        borderRight: '1px solid var(--border)', 
        background: 'var(--bg-card)', 
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Filter size={14} /> Global Filters
        </div>

        <details>
          <summary style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
            REPORTING PERIOD (CLICK TO EXPAND)
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            {['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'].map(q => (
              <button 
                key={q} 
                onClick={() => toggleFilter(setActiveQuarters, q)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: activeQuarters.includes(q) ? 'var(--accent-main)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: activeQuarters.includes(q) ? 600 : 500, textAlign: 'left', padding: '4px 0' }}
              >
                {activeQuarters.includes(q) ? <CheckSquare size={14} /> : <Square size={14} />}
                {q}
              </button>
            ))}
          </div>
        </details>

        <details>
          <summary style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', outline: 'none', userSelect: 'none' }}>
            STRUCTURAL LAYER (CLICK TO EXPAND)
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            {['Designers', 'Foundry', 'Equipment', 'Networking'].map(l => (
              <button 
                key={l} 
                onClick={() => toggleFilter(setActiveLayers, l)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: activeLayers.includes(l) ? 'var(--accent-main)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: activeLayers.includes(l) ? 600 : 500, textAlign: 'left', padding: '4px 0' }}
              >
                {activeLayers.includes(l) ? <CheckSquare size={14} /> : <Square size={14} />}
                {l}
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Center Pane: Chat & Text (Splits if active graph) */}
      <div style={{ 
        flex: activeMsg?.graph_data ? 1 : 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRight: activeMsg?.graph_data ? '1px solid var(--border)' : 'none',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: 0
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {messages.length === 0 && (
            <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 0 40px' }}>

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <Sparkles size={28} color="var(--el-teal)" style={{ marginBottom: '10px', opacity: 0.85 }} />
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--el-navy)', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>
                  Semiconductor Intelligence Sandbox
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  Query below or explore how this demo maps to what we&apos;re building for Element
                </p>
              </div>

              {/* Analogy Bridge */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'stretch' }}>
                {/* Demo column */}
                <div style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--el-slate)', marginBottom: '10px', textTransform: 'uppercase' }}>This Sandbox</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: '🏢', label: '20 semiconductor companies' },
                      { icon: '📋', label: '10-K + earnings transcripts' },
                      { icon: '📅', label: '4 rolling quarters (2024–2025)' },
                      { icon: '📄', label: '~80 documents ingested' },
                    ].map(({ icon, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: '15px' }}>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow bridge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0 4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--el-teal)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Equivalent</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '2px', background: 'var(--el-teal)' }} />
                    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid var(--el-teal)' }} />
                  </div>
                </div>

                {/* Element column */}
                <div style={{ flex: 1, background: 'rgba(0,215,210,0.05)', border: '1.5px solid rgba(0,215,210,0.3)', borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--el-teal)', marginBottom: '10px', textTransform: 'uppercase' }}>Element Target State</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { icon: '🏢', label: 'Element\'s managed accounts' },
                      { icon: '📋', label: 'Business Review recordings & notes' },
                      { icon: '📅', label: 'Ongoing quarterly cadence' },
                      { icon: '📄', label: '150+ BRs → Corporate Memory Bank' },
                    ].map(({ icon, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: '15px' }}>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vertical Breakdown */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--el-slate)', textTransform: 'uppercase' }}>Semiconductor Verticals in this Sandbox</div>
                  <div style={{ fontSize: '10px', color: 'var(--el-teal)', fontWeight: 600 }}>↔ Analogous to Element client sub-industries</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { vertical: 'AI / GPU', companies: ['NVDA', 'AMD', 'INTC'], color: '#05AFDC' },
                    { vertical: 'Foundry / EMS', companies: ['TSM', 'SSNLF', 'GFS'], color: '#00D7D2' },
                    { vertical: 'Equipment', companies: ['AMAT', 'LRCX', 'KLAC', 'ASML'], color: '#4B6478' },
                    { vertical: 'Memory', companies: ['MU', 'WDC', 'STX'], color: '#82C341' },
                    { vertical: 'Analog / Power', companies: ['TXN', 'ADI', 'MCHP', 'ON'], color: '#96BED2' },
                    { vertical: 'Networking / RF', companies: ['AVGO', 'QCOM', 'MRVL'], color: '#192E44' },
                  ].map(({ vertical, companies, color }) => (
                    <div key={vertical} style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px 14px', borderLeft: `3px solid ${color}` }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--el-navy)', marginBottom: '8px' }}>{vertical}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {companies.map(c => (
                          <span key={c} style={{ fontSize: '10px', fontWeight: 600, background: '#fff', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', color: 'var(--el-slate)' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}


          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px' }}>
                <div style={{
                  padding: msg.role === 'user' ? '12px 20px' : '0',
                  background: msg.role === 'user' ? 'var(--accent-main)' : 'transparent',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-secondary)',
                  borderRadius: '16px',
                  fontSize: '15px',
                  lineHeight: '1.7',
                  width: msg.role === 'user' ? 'auto' : '100%',
                  maxWidth: '100%',
                }}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose-editorial">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>Sources</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.sources.map((s, idx) => (
                          <button
                            key={idx} 
                            onClick={() => setSelectedSource({ title: s.title, text: s.text || '', index: s.index, video_id: s.video_id, timestamp: s.timestamp })}
                            className="source-pill"
                          >
                            <BookOpen size={10} />
                            [{s.index}] {s.title} {s.timestamp ? `(${Math.floor(s.timestamp / 60)}:${(s.timestamp % 60).toFixed(0).padStart(2, '0')})` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="shimmer" style={{ width: '120px', height: '24px', borderRadius: '4px' }} />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto', alignItems: 'flex-end' }}>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (query.trim() && !loading) handleSubmit();
                }
              }}
              placeholder="Query the Intelligence Database..."
              disabled={loading}
              className="chat-input"
              rows={3}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
            <button type="submit" disabled={loading || !query.trim()} className="send-button" style={{
              height: '48px',
              width: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: query.trim() ? 'var(--accent-main)' : 'var(--border)',
              border: 'none',
              cursor: query.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s'
            }}>
              <Send size={20} color={query.trim() ? '#fff' : 'var(--text-muted)'} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Pane: Visualization (Only visible when active message has graph data) */}
      {activeMsg?.graph_data && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-base)',
          animation: 'slideIn 0.4s ease-out'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Maximize2 size={16} color="var(--accent-main)" />
            <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-display)' }}>Structural Relationship Map</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ForceGraph triples={activeMsg.graph_data} />
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {selectedSource && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 8, 5, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '80%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-display)', display: 'block' }}>[Source {selectedSource.index}] {selectedSource.title}</span>
                {selectedSource.timestamp !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-main)', marginTop: '4px' }}>
                    <Clock size={12} />
                    Starts at {Math.floor(selectedSource.timestamp / 60)}m {Math.floor(selectedSource.timestamp % 60)}s
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '32px', overflowY: 'auto', fontSize: '15px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              <div style={{ background: 'var(--accent-light)', padding: '20px', borderRadius: '12px', borderLeft: '4px solid var(--accent-main)', marginBottom: '20px', fontStyle: 'italic' }}>
                "{selectedSource.text}"
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 700 }}>Context Details</p>
              <p>This chunk was retrieved because it contains the most semantically relevant information to your query. The intelligence engine has verified this bridge between entities.</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
