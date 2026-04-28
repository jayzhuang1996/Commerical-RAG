'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, BarChart2, Github } from 'lucide-react';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const CommunityExplorer = dynamic(() => import('../components/CommunityExplorer'), { ssr: false });

const NAV = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquare },
  { id: 'communities', label: 'Knowledge Clusters', icon: Layers },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    const boxStyle = {
      padding: '32px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      textAlign: 'left' as const,
      flex: 1,
      minHeight: '260px',
      boxShadow: 'var(--shadow-sm)'
    };
    const titleStyle = { fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--text-primary)' };
    const listStyle = { fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px' };

    return (
      <div style={{ height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', background: 'var(--bg-base)' }}>
        
        {/* Page 1: Problem -> Opportunity -> Solution */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            The Strategic Context
          </h1>
          <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
            
            <div style={boxStyle}>
              <h3 style={titleStyle}>1. The Problem</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Element conducts 150+ in-depth Business Reviews annually.</li>
                <li style={{ marginBottom: '12px' }}>This high-signal qualitative data is trapped in fragmented PDFs, isolated slides, and localized notes.</li>
                <li>Strategic cross-client context physically dies after the presentation is delivered.</li>
              </ul>
            </div>

            <div style={boxStyle}>
              <h3 style={titleStyle}>2. The Opportunity</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Proprietary client intelligence is our ultimate moat against competitors.</li>
                <li style={{ marginBottom: '12px' }}>Aggregating macro-demands reveals hidden industry pain-points.</li>
                <li>SVP and Hunter teams can leverage cross-referenced intel to immediately pitch hyper-specific solutions.</li>
              </ul>
            </div>

            <div style={{...boxStyle, border: '2px solid var(--accent-main)', background: 'rgba(230,81,0,0.03)' }}>
              <h3 style={titleStyle}>3. The Solution</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>A Corporate Memory Bank.</strong></li>
                <li style={{ marginBottom: '12px' }}>An AI-native Knowledge Graph that mathematically ingests and links unstructured narratives.</li>
                <li>Hunters query a living database of client constraints, strategies, and pain-points.</li>
              </ul>
            </div>

          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 2: Use Cases & Urgency */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Deployment & Urgency
          </h1>
          <div style={{ display: 'flex', gap: '24px', width: '100%', marginBottom: '24px' }}>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Business Development</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>Hunters instantly find relevant stories, cross-reference industry constraints, and walk into pitches with unparalleled, data-backed insights.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Commercial Leadership</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>SVPs gain a top-down, mathematically derived view of shifting demands across the entire managed fleet portfolio.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Qualitative Flywheel</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>The more Business Reviews we ingest, the denser the vector network becomes. The intelligence mathematically scales.</p>
            </div>
          </div>
          <div style={{ padding: '32px', background: 'var(--text-primary)', color: 'var(--bg-base)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '12px' }}>Why Now?</h3>
            <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, maxWidth: '800px' }}>Every quarter we operate without this data pipeline is a quarter where thousands of unstructured insights are permanently left on the table. The technology to structure this organically is finally here.</p>
          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 3: The Sandbox Architecture */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            The Sandbox Concept
          </h1>
          <div style={{ display: 'flex', gap: '40px', width: '100%' }}>
            {/* Left Box */}
            <div style={{ flex: 1, padding: '40px', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--border)', borderRadius: '24px', fontSize: '12px', fontWeight: 700, marginBottom: '24px' }}>CURRENT BARRIERS</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '24px', color: 'var(--text-primary)' }}>Why Semiconductors?</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}><strong>IT Permissions:</strong> Proprietary BR forms are locked behind strict infosec compliance.</li>
                <li style={{ marginBottom: '16px' }}><strong>Data Pipeline:</strong> No existing unified dump of Element Client BRs to experiment on.</li>
                <li><strong>The Proxy:</strong> We are using public Semiconductor Earnings as our "mock portfolio" to definitively prove the AI's structural extraction capabilities.</li>
              </ul>
            </div>
            
            {/* VS divider */}
            <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>VS</div>

            {/* Right Box */}
            <div style={{ flex: 1, padding: '40px', border: '2px solid var(--accent-main)', borderRadius: '12px', background: '#fff', boxShadow: '0 20px 40px rgba(230,81,0,0.08)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', color: 'var(--accent-main)', borderRadius: '24px', fontSize: '12px', fontWeight: 700, marginBottom: '24px' }}>THE TARGET END-STATE</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '24px', color: '#111' }}>Real Element Database</h3>
              <ul style={{ ...listStyle, color: '#444' }}>
                <li style={{ marginBottom: '16px' }}><strong>Resolution:</strong> A private Knowledge Graph explicitly mapping Element clients, fleets, and demands.</li>
                <li style={{ marginBottom: '16px' }}><strong>Output:</strong> SVP asks "Which clients are delaying EV transition due to infrastructure?", and receives an exact, sourced map of specific accounts.</li>
              </ul>
            </div>
          </div>
          
          <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)' }}>
            <button 
              onClick={() => setShowIntro(false)} 
              style={{ padding: '16px 40px', fontSize: '16px', fontWeight: 600, background: 'var(--accent-main)', color: '#fff', border: 'none', borderRadius: '32px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(230,81,0,0.3)' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Initialize Semiconductor Demo →
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'transparent',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '4px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--accent-main)',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-display)' }}>NABR</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semiconductor Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
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
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--bg-panel)'
      }}>
        {/* Top bar */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: '12px',
          flexShrink: 0,
          background: 'var(--bg-panel)',
        }}>
          <div style={{ flexShrink: 0 }}>
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Intelligence Chat</span>
              </div>
            )}
            {activeTab === 'communities' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          </div>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          padding: '24px 32px',
        }}>
          {activeTab === 'chat' && (
            <div style={{ height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
              <ChatInterface />
            </div>
          )}
          {activeTab === 'communities' && (
            <div style={{
              height: '100%',
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
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
    </div>
  );
}
