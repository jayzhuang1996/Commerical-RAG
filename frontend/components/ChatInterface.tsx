'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Sparkles, BookOpen, Clock, Maximize2, Layout, List } from 'lucide-react';
import MermaidVisualizer from './MermaidVisualizer';
import TypewriterText from './TypewriterText';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  sources?: { index: number; video_id: string; title: string; text?: string; timestamp?: number }[];
  graph_data?: { source: string; label: string; target: string }[];
}

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
        body: JSON.stringify({ query: question }),
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
      
      {/* Left Pane: Chat & Text (Splits if active graph) */}
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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', paddingBottom: '60px' }}>
              <div style={{ textAlign: 'center' }}>
                <Sparkles size={48} color="var(--accent-main)" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Intelligence Chat</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', margin: '8px auto' }}>Analyze thematic clusters and relationship graphs in real-time.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '600px' }}>
                {SUGGESTED.map((s, i) => (
                  <button key={i} className="suggestion-chip" onClick={() => { setQuery(s); handleSubmit(s); }}>{s}</button>
                ))}
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
          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything..."
              disabled={loading}
              className="chat-input"
            />
            <button type="submit" disabled={loading || !query.trim()} className="send-button">
              <Send size={18} color={query.trim() ? '#fff' : 'var(--text-muted)'} />
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
            <MermaidVisualizer triples={activeMsg.graph_data} />
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
