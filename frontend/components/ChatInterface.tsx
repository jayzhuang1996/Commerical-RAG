'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  // Graph data stored separately — never cleared, persists across re-renders
  const [graphTriples, setGraphTriples] = useState<{ source: string; label: string; target: string; type?: string; color?: string }[]>([]);

  // Filters State
  const [activeQuarters, setActiveQuarters] = useState<string[]>([]);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  // Draggable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isSidebarDragging = useRef(false);

  // Draggable split ratio between chat pane and graph pane (0–1)
  const [splitRatio, setSplitRatio] = useState(0.58);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => { isDragging.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; };
  const handleDragEnd   = () => {
    isDragging.current = false;
    isSidebarDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  const handleDragMove  = useCallback((e: MouseEvent) => {
    if (isSidebarDragging.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newW = e.clientX - rect.left;
      setSidebarWidth(Math.min(420, Math.max(180, newW)));
      return;
    }
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const usable = rect.width - sidebarWidth;
    const raw = (e.clientX - rect.left - sidebarWidth) / usable;
    setSplitRatio(Math.min(0.8, Math.max(0.35, raw)));
  }, [sidebarWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup',   handleDragEnd);
    return () => { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
  }, [handleDragMove]);

  const toggleFilter = (setFn: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setFn(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  };
  
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = async (q?: string) => {
    const question = q || query;
    if (!question.trim()) return;

    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

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
      if (data.graph_data && data.graph_data.length > 0) {
        setGraphTriples(data.graph_data);
      }
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


  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100%', width: '100%', gap: '0', position: 'relative', background: 'var(--bg-panel)' }}>
      
      {/* Far-Left Pane: Intelligence Filters (resizable) */}
      <div style={{ 
        width: `${sidebarWidth}px`,
        flexShrink: 0,
        borderRight: 'none',
        background: 'var(--bg-card)', 
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: 'auto',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          <Filter size={14} /> Global Filters
        </div>

        <details open>
          <summary style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', outline: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>
            REPORTING PERIOD
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            {['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'].map(q => (
              <button 
                key={q} 
                onClick={() => toggleFilter(setActiveQuarters, q)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: activeQuarters.includes(q) ? 'var(--accent-main)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: activeQuarters.includes(q) ? 700 : 500, textAlign: 'left', padding: '5px 0', whiteSpace: 'nowrap' }}
              >
                {activeQuarters.includes(q) ? <CheckSquare size={14} /> : <Square size={14} />}
                {q}
              </button>
            ))}
          </div>
        </details>

        <details open>
          <summary style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', outline: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>
            SEMICONDUCTOR VERTICAL
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
            {[
              { id: 'AI / GPU',       tickers: 'NVDA · AMD · INTC' },
              { id: 'Foundry / EMS',  tickers: 'TSM · SSNLF · GFS'  },
              { id: 'Equipment',      tickers: 'AMAT · LRCX · KLAC'  },
              { id: 'Memory',         tickers: 'MU · WDC · STX'      },
              { id: 'Analog / Power', tickers: 'TXN · ADI · MCHP'    },
              { id: 'Networking / RF',tickers: 'AVGO · QCOM · MRVL'  },
            ].map(({ id: l, tickers }) => (
              <button
                key={l}
                onClick={() => toggleFilter(setActiveLayers, l)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', background: activeLayers.includes(l) ? 'rgba(0,215,210,0.07)' : 'none', border: activeLayers.includes(l) ? '1px solid var(--el-teal)' : '1px solid transparent', borderRadius: '6px', color: activeLayers.includes(l) ? 'var(--accent-main)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: activeLayers.includes(l) ? 700 : 500, textAlign: 'left', padding: '5px 8px', whiteSpace: 'nowrap', width: '100%', transition: 'all 0.15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {activeLayers.includes(l) ? <CheckSquare size={12} /> : <Square size={12} />}
                  {l}
                </div>
                <div style={{ fontSize: '10px', color: activeLayers.includes(l) ? 'var(--el-teal)' : 'var(--text-muted)', paddingLeft: '18px', fontWeight: 400 }}>{tickers}</div>
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Sidebar resize handle */}
      <div
        onMouseDown={() => { isSidebarDragging.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        style={{
          width: '6px', flexShrink: 0, cursor: 'col-resize',
          background: 'transparent',
          borderRight: '2px solid var(--border)',
          transition: 'border-color 0.15s',
          zIndex: 5,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--el-teal)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      />

      {/* Center Pane: Chat & Text */}
      <div style={{ 
        flexBasis: graphTriples.length > 0 ? `${Math.round(splitRatio * 100)}%` : '100%',
        flexShrink: 0,
        flexGrow: 0,
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRight: graphTriples.length > 0 ? '1px solid var(--border)' : 'none',
        transition: isDragging.current ? 'none' : 'flex-basis 0.3s ease',
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

      {/* Right Pane: Structural Relationship Map — shown once graph data arrives, never hidden */}
      {graphTriples.length > 0 && (
        <>
          <div
            onMouseDown={handleDragStart}
            style={{
              width: '6px', flexShrink: 0, cursor: 'col-resize',
              background: 'transparent',
              borderLeft: '2px solid var(--border)',
              transition: 'border-color 0.15s',
              zIndex: 5,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--el-teal)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <div style={{
            flex: 1,
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-base)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Maximize2 size={16} color="var(--accent-main)" />
              <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-display)' }}>Structural Relationship Map</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ForceGraph triples={graphTriples} />
            </div>
          </div>
        </>
      )}

      {/* Source Modal */}
      {selectedSource && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 8, 5, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '80%', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-display)', color: 'var(--el-navy)', display: 'block' }}>{selectedSource.title}</span>
                {selectedSource.timestamp !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-main)', marginTop: '4px' }}>
                    <Clock size={12} />
                    Starts at {Math.floor(selectedSource.timestamp / 60)}m {Math.floor(selectedSource.timestamp % 60)}s
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedSource(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>
            {/* Raw filing text */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', fontSize: '14px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Original Filing Extract</p>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0, padding: '16px 20px', background: 'var(--bg-card)', borderRadius: '10px', borderLeft: '3px solid var(--el-teal)', color: 'var(--el-navy)', fontSize: '13.5px', lineHeight: '1.75' }}>{selectedSource.text}</pre>
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
