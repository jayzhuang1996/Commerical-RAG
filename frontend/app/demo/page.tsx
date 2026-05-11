'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, Maximize2 } from 'lucide-react';
import ForceGraph from '../../components/ForceGraph';

const ChatInterface = dynamic(() => import('../../components/ChatInterface'), { ssr: false });
const CommunityExplorer = dynamic(() => import('../../components/CommunityExplorer'), { ssr: false });

const NAV = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquare },
  { id: 'communities', label: 'Knowledge Clusters', icon: Layers },
];

export default function Demo() {
  const [activeTab, setActiveTab] = useState('chat');
  const [graphTriples, setGraphTriples] = useState<{ source: string; target: string; label?: string; type?: string; color?: string }[]>([]);
  const [chatWidth, setChatWidth] = useState(55);
  const isResizing = useRef(false);

  const handleGraphData = useCallback((triples: { source: string; target: string; label?: string; type?: string; color?: string }[]) => {
    setGraphTriples(triples);
  }, []);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const offsetLeft = 240;
    const containerWidth = window.innerWidth - offsetLeft;
    const newChatWidth = ((e.clientX - offsetLeft) / containerWidth) * 100;
    setChatWidth(Math.min(80, Math.max(30, newChatWidth)));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0, background: 'transparent',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', padding: '24px 16px',
      }}>
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{
              width: '36px', height: '36px', background: 'var(--accent-main)', color: 'white',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: 'var(--shadow-sm)',
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-display)' }}>NABR</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semiconductor Intelligence</div>
            </div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              style={{ border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--bg-panel)' }}>
        {/* Top bar */}
        <div style={{
          height: '64px', borderBottom: '1px solid var(--border)', display: 'flex',
          alignItems: 'center', padding: '0 32px', gap: '12px', flexShrink: 0,
          background: 'var(--bg-panel)',
        }}>
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--el-teal)" />
              <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Semiconductor Intelligence Database</span>
            </div>
          )}
          {activeTab === 'communities' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--el-teal)" />
              <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
            </div>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'hidden', padding: activeTab === 'chat' ? '0' : '24px 32px' }}>
          <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', width: '100%', flexDirection: 'row', position: 'relative' }}>
            <div style={{
              flex: graphTriples.length > 0 ? `0 0 ${chatWidth}%` : '1 1 100%',
              minWidth: 0, height: '100%', overflow: 'hidden',
              transition: isResizing.current ? 'none' : 'flex-basis 0.2s ease',
            }}>
              <ChatInterface onGraphData={handleGraphData} />
            </div>

            {graphTriples.length > 0 && (
              <div
                onMouseDown={startResizing}
                style={{ width: '8px', margin: '0 -4px', cursor: 'col-resize', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', position: 'relative' }}
              >
                <div style={{ width: '2px', height: '100%', background: 'var(--border)', transition: 'background 0.2s' }} className="resizer-line" />
              </div>
            )}

            {graphTriples.length > 0 && (
              <div style={{
                flex: `0 0 ${100 - chatWidth}%`, minWidth: '200px', display: 'flex',
                flexDirection: 'column', background: 'var(--bg-base)', height: '100%',
                borderLeft: '1px solid var(--border)',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <Maximize2 size={15} color="var(--accent-main)" />
                  <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-display)' }}>Structural Relationship Map</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ForceGraph triples={graphTriples} />
                </div>
              </div>
            )}
          </div>

          {activeTab === 'communities' && (
            <div style={{
              height: '100%', maxWidth: '900px', margin: '0 auto',
              background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: '16px', boxShadow: 'var(--shadow-md)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Layers size={18} color="var(--accent-main)" />
                <span style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CommunityExplorer />
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .resizer-line:hover { background: var(--el-teal) !important; width: 4px !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
